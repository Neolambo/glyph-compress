/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Anthropic Proxy Bridge (v1.24.0)
 *
 * Every documented GlyphProxy integration (Cursor, Cline/RooCode, Continue)
 * configures the IDE in "OpenAI Compatible" mode — the client always sends
 * an OpenAI chat/completions-shaped request, regardless of which upstream
 * `targetApiUrl` GlyphCompress is pointed at. That was already correctly
 * handled for OpenAI and for Gemini (which offers a real OpenAI-compatible
 * endpoint). It was never handled for Anthropic: `api.anthropic.com` does
 * not accept OpenAI's request shape at all (system belongs in a top-level
 * `system` field, not a `role: "system"` message; auth uses `x-api-key` +
 * `anthropic-version`, not `Authorization: Bearer`; the endpoint is
 * `/v1/messages`, not `/v1/chat/completions`). Every real request sent
 * through the proxy to an Anthropic target was being corrupted and would
 * be rejected by the real API — found by reproducing it directly rather
 * than assuming the existing `wrapAnthropic()` SDK-wrapper logic covered
 * the proxy path too (it doesn't; the proxy never called it).
 *
 * This module translates OpenAI-shaped requests/responses to and from
 * Anthropic's native Messages API shape, reusing the same compression and
 * cache_control logic `wrapAnthropic()` already relies on
 * (`GlyphCompressor._prepareAnthropicPayload`) so proxy users get the same
 * cache-stable structured system blocks as direct SDK-wrapper users.
 *
 * Known limitations (documented, not attempted here): multi-modal image
 * content is stripped to a text placeholder rather than translated to
 * Anthropic's image blocks; OpenAI tool-result (`role: "tool"`) messages
 * are coerced to a labeled `user` message rather than a proper
 * `tool_result` content block, since Anthropic's tool-result shape needs
 * the original `tool_use_id` and the OpenAI shape doesn't carry equivalent
 * structure through this simple per-message translation; streamed tool-call
 * argument deltas are not translated (non-streaming tool calls work fully).
 */
import { Transform } from 'stream';

const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 4096;

export function isAnthropicNativeTarget(targetApiUrl = '') {
  return String(targetApiUrl).toLowerCase().includes('api.anthropic.com');
}

function markUntranslatableParts(content) {
  if (!Array.isArray(content)) return content;
  return content.map((part) => {
    if (part && typeof part === 'object' && part.type && part.type !== 'text') {
      return { type: 'text', text: `[${part.type} omitted: not yet supported by the GlyphCompress Anthropic proxy bridge]` };
    }
    return part;
  });
}

function mapOpenAITools(tools) {
  if (!Array.isArray(tools)) return [];
  return tools
    .filter((tool) => tool && tool.type === 'function' && tool.function && tool.function.name)
    .map((tool) => ({
      name: tool.function.name,
      description: tool.function.description || '',
      input_schema: tool.function.parameters || { type: 'object', properties: {} },
    }));
}

/**
 * Translate an OpenAI chat/completions request body into an Anthropic
 * Messages API request body, running it through the compressor's existing
 * Anthropic-specific compression + cache_control logic on the way.
 * @param {object} payload - parsed OpenAI-shaped request body
 * @param {import('./glyph-middleware.js').GlyphCompressor} compressor
 * @returns {{ body: object, stats: object|undefined }}
 */
export function openaiRequestToAnthropic(payload, compressor) {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const systemMessages = messages.filter((message) => message.role === 'system');
  const systemText = systemMessages
    .map((message) => compressor._anthropicSystemText(markUntranslatableParts(message.content)))
    .filter(Boolean)
    .join('\n\n');
  const otherMessages = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: markUntranslatableParts(message.content),
    }));

  const { system, messages: anthropicMessages, stats } = compressor._prepareAnthropicPayload(systemText, otherMessages);

  const body = {
    model: payload.model,
    max_tokens: payload.max_tokens || payload.max_completion_tokens || DEFAULT_MAX_TOKENS,
    messages: anthropicMessages,
  };
  if (system) body.system = system;
  if (typeof payload.temperature === 'number') body.temperature = payload.temperature;
  if (typeof payload.top_p === 'number') body.top_p = payload.top_p;
  if (payload.stop !== undefined && payload.stop !== null) {
    body.stop_sequences = Array.isArray(payload.stop) ? payload.stop : [payload.stop];
  }
  if (payload.stream === true) body.stream = true;
  const tools = mapOpenAITools(payload.tools);
  if (tools.length) body.tools = tools;

  return { body, stats };
}

function extractApiKey(value) {
  if (!value) return '';
  const match = /^Bearer\s+(.+)$/i.exec(String(value).trim());
  return match ? match[1].trim() : String(value).trim();
}

/**
 * The IDE sends the user's real upstream key as an OpenAI-style
 * `Authorization: Bearer <key>` header (that's what the docs mean by
 * "API Key: Your real OpenAI/Anthropic key" — the key goes wherever the
 * IDE's OpenAI-compatible provider form puts it). Anthropic requires that
 * same key as `x-api-key` plus an `anthropic-version` header instead.
 */
export function anthropicHeadersFromOpenAI(headers = {}) {
  const next = { ...headers };
  delete next.authorization;
  delete next.Authorization;
  delete next.host;
  delete next.Host;
  delete next['content-length'];
  delete next['Content-Length'];

  const apiKey = extractApiKey(headers.authorization || headers.Authorization) || headers['x-api-key'] || headers['X-Api-Key'];
  if (apiKey) next['x-api-key'] = apiKey;
  next['anthropic-version'] = headers['anthropic-version'] || DEFAULT_ANTHROPIC_VERSION;
  next['content-type'] = 'application/json';
  return next;
}

export function mapAnthropicStopReason(reason) {
  switch (reason) {
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_calls';
    case 'end_turn':
    case 'stop_sequence':
    default:
      return 'stop';
  }
}

/** Translate a non-streaming Anthropic Messages API response into an OpenAI chat/completions response. */
export function anthropicResponseToOpenAI(anthropicJson, requestedModel) {
  const blocks = Array.isArray(anthropicJson.content) ? anthropicJson.content : [];
  const text = blocks.filter((block) => block.type === 'text').map((block) => block.text).join('');
  const toolUseBlocks = blocks.filter((block) => block.type === 'tool_use');

  const message = { role: 'assistant', content: text || null };
  if (toolUseBlocks.length) {
    message.tool_calls = toolUseBlocks.map((block, index) => ({
      id: block.id || `call_${index}`,
      type: 'function',
      function: {
        name: block.name,
        arguments: JSON.stringify(block.input || {}),
      },
    }));
  }

  const inputTokens = anthropicJson.usage?.input_tokens || 0;
  const outputTokens = anthropicJson.usage?.output_tokens || 0;

  return {
    id: anthropicJson.id || `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: anthropicJson.model || requestedModel,
    choices: [{
      index: 0,
      message,
      finish_reason: mapAnthropicStopReason(anthropicJson.stop_reason),
    }],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
    },
  };
}

/**
 * Split a buffered SSE byte stream into complete `event:`/`data:` blocks,
 * returning any incomplete trailing bytes to be prepended to the next
 * chunk — HTTP chunk boundaries never line up with SSE event boundaries.
 */
export function extractSSEEvents(buffer) {
  const events = [];
  let rest = buffer;
  let boundary = rest.indexOf('\n\n');
  while (boundary !== -1) {
    const rawEvent = rest.slice(0, boundary);
    rest = rest.slice(boundary + 2);
    let eventType = 'message';
    const dataLines = [];
    for (const line of rawEvent.split('\n')) {
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length > 0) {
      try {
        events.push({ event: eventType, data: JSON.parse(dataLines.join('\n')) });
      } catch {
        // Malformed/partial data line — skip rather than crash the stream.
      }
    }
    boundary = rest.indexOf('\n\n');
  }
  return { events, rest };
}

function formatOpenAIChunk({ id, model, delta, finishReason = null }) {
  const chunk = {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: model || 'unknown',
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * A Transform stream that consumes Anthropic's SSE event stream and emits
 * an OpenAI-compatible SSE chunk stream, so IDE clients that only speak
 * the OpenAI streaming format keep working against an Anthropic upstream.
 * Text streaming is fully translated; streamed tool-call argument deltas
 * are not (see module-level known-limitations note).
 */
export function createAnthropicToOpenAISSETransform({ model } = {}) {
  let buffer = '';
  let responseId = `chatcmpl-${Date.now()}`;
  let sentRoleChunk = false;
  let resolvedModel = model;

  function handleEvent(stream, event, data) {
    if (event === 'message_start') {
      responseId = data.message?.id || responseId;
      resolvedModel = resolvedModel || data.message?.model;
      if (!sentRoleChunk) {
        stream.push(formatOpenAIChunk({ id: responseId, model: resolvedModel, delta: { role: 'assistant' } }));
        sentRoleChunk = true;
      }
      return;
    }
    if (event === 'content_block_delta' && data.delta?.type === 'text_delta') {
      stream.push(formatOpenAIChunk({ id: responseId, model: resolvedModel, delta: { content: data.delta.text } }));
      return;
    }
    if (event === 'message_delta') {
      const finishReason = mapAnthropicStopReason(data.delta?.stop_reason);
      stream.push(formatOpenAIChunk({ id: responseId, model: resolvedModel, delta: {}, finishReason }));
      return;
    }
    if (event === 'message_stop') {
      stream.push('data: [DONE]\n\n');
    }
    // content_block_start / content_block_stop / ping / error: no OpenAI
    // chunk equivalent needed for the text-streaming case handled here.
  }

  return new Transform({
    transform(chunk, _enc, callback) {
      buffer += chunk.toString('utf8');
      const { events, rest } = extractSSEEvents(buffer);
      buffer = rest;
      for (const { event, data } of events) handleEvent(this, event, data);
      callback();
    },
    flush(callback) {
      if (buffer.trim()) {
        const { events } = extractSSEEvents(buffer + '\n\n');
        for (const { event, data } of events) handleEvent(this, event, data);
      }
      callback();
    },
  });
}
