#!/usr/bin/env node

/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — MCP Server
 *
 * Exposes GlyphCompress as a Model Context Protocol server over stdio, so
 * any MCP-compatible client (Claude Code, Claude Desktop, and other MCP
 * hosts) can call compression directly with zero IDE-specific integration
 * work — the same motivation as the VS Code extension and CLI, on a
 * different distribution channel.
 *
 * Tools:
 *   - compress_text:       compress an arbitrary text/context blob
 *   - compress_file:       compress a file's content by path
 *   - compress_to_budget:  compress with the least destructive level that fits
 *                           a hard token budget (Context Budget Planner, v1.32.0)
 *   - route_context:       rank + compress relevant workspace files for a query
 *                           within a token budget (Context Router, v1.17.0)
 *   - get_codebook:        return the glyph codebook prompt for manual injection
 *
 * Run directly: `npx glyph-compress-mcp` (see package.json "bin").
 * Add to an MCP client config, e.g. Claude Code:
 *   claude mcp add glyph-compress -- npx glyph-compress-mcp
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { GlyphCompressor } from '../src/glyph-middleware.js';

const server = new McpServer({ name: 'glyph-compress', version: '1.34.1' });

const LEVEL_ENUM = z.enum(['light', 'standard', 'aggressive', 'ultra', 'auto']);
const PROVIDER_ENUM = z.enum(['raw', 'openai', 'anthropic', 'gemini', 'local']);

function textResult(value) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] };
}

function errorResult(message) {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

server.registerTool(
  'compress_text',
  {
    title: 'Compress text',
    description: 'Compress an arbitrary text/context blob using GlyphCompress semantic radicals. Returns the compressed text, the codebook needed to decode it, and token-savings stats.',
    inputSchema: {
      text: z.string().describe('The text/context to compress'),
      level: LEVEL_ENUM.optional().describe("Compression level (default 'standard'; 'auto' picks per-content)"),
      provider: PROVIDER_ENUM.optional().describe("Target LLM provider for token-aware breakeven checks (default 'raw')"),
    },
  },
  async ({ text, level, provider }) => {
    const gc = new GlyphCompressor({ level: level || 'standard', provider: provider || 'raw' });
    const result = gc.compressText(text, provider || 'raw');
    return textResult({
      codebook: gc.getCodebookPrompt(),
      compressed: result.compressed,
      stats: result.stats,
    });
  },
);

server.registerTool(
  'compress_file',
  {
    title: 'Compress a file',
    description: 'Read a file from disk and compress its content using GlyphCompress. Returns the compressed content, the codebook needed to decode it, and token-savings stats.',
    inputSchema: {
      filePath: z.string().describe('Absolute or working-directory-relative path to the file'),
      level: LEVEL_ENUM.optional(),
      provider: PROVIDER_ENUM.optional(),
    },
  },
  async ({ filePath, level, provider }) => {
    const resolved = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolved)) return errorResult(`File not found: ${resolved}`);
    const content = fs.readFileSync(resolved, 'utf8');
    const ext = path.extname(resolved).slice(1);
    const gc = new GlyphCompressor({ level: level || 'standard', provider: provider || 'raw' });
    const result = gc.compressText(`File: ${filePath}\n\n\`\`\`${ext}\n${content}\n\`\`\``, provider || 'raw');
    return textResult({
      codebook: gc.getCodebookPrompt(),
      compressed: result.compressed,
      stats: result.stats,
    });
  },
);

server.registerTool(
  'compress_to_budget',
  {
    title: 'Compress text to fit a token budget',
    description: 'Compress text with the least destructive compression level whose payload (compressed body + decoding codebook) fits a hard token budget. Escalates light -> standard -> aggressive -> ultra and stops at the first level that fits, so it never spends fidelity on space it does not need. Returns the level chosen, every level tried, and whether the budget was actually met — if no level fits it returns the smallest candidate with withinBudget=false rather than silently overflowing. Note that reaching "ultra" replaces code with structural summaries; check the returned trustWarnings.',
    inputSchema: {
      text: z.string().describe('The text/context to compress'),
      budget: z.number().int().positive().describe('Hard token budget for the transmitted payload (body + codebook)'),
      provider: PROVIDER_ENUM.optional().describe("Target LLM provider for token estimation (default 'raw')"),
      includeCodebook: z.boolean().optional().describe('Count the injected codebook against the budget (default true)'),
    },
  },
  async ({ text, budget, provider, includeCodebook }) => {
    const gc = new GlyphCompressor({ provider: provider || 'raw' });
    const plan = gc.compressToBudget(text, { budget, provider: provider || 'raw', includeCodebook });
    return textResult({
      codebook: plan.codebook,
      compressed: plan.compressed,
      level: plan.level,
      withinBudget: plan.withinBudget,
      budget: plan.budget,
      tokens: plan.tokens,
      bodyTokens: plan.bodyTokens,
      codebookTokens: plan.codebookTokens,
      overflowTokens: plan.overflowTokens,
      fallback: plan.fallback,
      trials: plan.trials,
      trustWarnings: plan.sourceMap?.trustWarnings || [],
    });
  },
);

server.registerTool(
  'route_context',
  {
    title: 'Route and compress relevant workspace context',
    description: 'Rank workspace files by relevance to a query (intent detection + scoring) and compress as many as fit inside a token budget, instead of manually picking which files to send. Reports which files were selected/excluded and why.',
    inputSchema: {
      query: z.string().describe("The user's task/prompt, used for intent detection and relevance ranking"),
      rootDir: z.string().optional().describe('Workspace root directory (default: current working directory)'),
      tokenBudget: z.number().int().positive().optional().describe('Max tokens to spend on routed file context (default 2000)'),
      maxFiles: z.number().int().positive().optional().describe('Max candidate files to rank before budgeting (default 8)'),
      level: LEVEL_ENUM.optional(),
      provider: PROVIDER_ENUM.optional(),
    },
  },
  async ({ query, rootDir, tokenBudget, maxFiles, level, provider }) => {
    const gc = new GlyphCompressor({ level: level || 'standard', provider: provider || 'raw' });
    const result = gc.routeAndCompress(query, {
      rootDir: rootDir || process.cwd(),
      tokenBudget,
      maxFiles,
      provider: provider || 'raw',
    });
    return textResult({
      codebook: gc.getCodebookPrompt(),
      ...result,
    });
  },
);

server.registerTool(
  'get_codebook',
  {
    title: 'Get the glyph codebook',
    description: 'Return the GlyphCompress codebook system-prompt text, which teaches the model how to decode compressed glyph output. Inject this once into a system prompt before sending compressed content.',
    inputSchema: {
      provider: PROVIDER_ENUM.optional(),
    },
  },
  async ({ provider }) => {
    const gc = new GlyphCompressor({ provider: provider || 'raw' });
    return textResult(gc.getCodebookPrompt());
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
