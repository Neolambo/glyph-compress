/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Structured Diagnostics
 *
 * The proxy previously logged with ad-hoc `console.log`/`console.error`
 * calls: no consistent timestamps (the dashboard's log history only had
 * a locale time string with no date, not sortable/parseable), and
 * redaction was only ever applied to upstream error response bodies —
 * every other log line (including one that echoes the intercepted
 * request URL, or a forwarding error message that could embed a
 * malformed Authorization header) went out unredacted.
 *
 * This module centralizes both: every entry gets an ISO timestamp and a
 * level, and redaction runs on every string field before it reaches any
 * sink — not just the one call site that happened to remember to do it.
 */
import fs from 'fs';
import path from 'path';

const REDACTION_PATTERNS = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]{10,}/gi, 'Bearer [REDACTED]'],
  [/"api[_-]?key"\s*:\s*"[^"]+"/gi, '"apiKey":"[REDACTED]"'],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, 'sk-[REDACTED]'],
  [/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_GH_TOKEN]'],
  [/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_AWS_KEY]'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_JWT]'],
];

/**
 * @param {unknown} value
 * @param {number} [maxLength]
 */
export function redactForLog(value = '', maxLength = 2000) {
  let text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const [pattern, replacement] of REDACTION_PATTERNS) {
    text = text.replace(pattern, replacement);
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}…[truncated]` : text;
}

function redactMeta(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const redacted = {};
  for (const [key, value] of Object.entries(meta)) {
    redacted[key] = typeof value === 'string' ? redactForLog(value, 500) : value;
  }
  return redacted;
}

/**
 * @param {Object} [options]
 * @param {string} [options.logFile] - append structured JSONL entries here
 * @param {{appendLine: (line: string) => void}} [options.outputChannel] - e.g. a VS Code OutputChannel
 * @param {(entry: object) => void} [options.onEntry] - additional sink, e.g. an in-memory ring buffer for a dashboard
 * @param {boolean} [options.console] - write human-readable lines to the console (default true)
 */
export function createStructuredLogger(options = {}) {
  const { logFile, outputChannel, onEntry, console: toConsole = true } = options;
  let fileReady = false;
  if (logFile) {
    try {
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      fileReady = true;
    } catch {
      // Fail silently — logging must never crash the caller.
      fileReady = false;
    }
  }

  function log(level, message, meta) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: redactForLog(message),
      ...(meta ? { meta: redactMeta(meta) } : {}),
    };

    if (toConsole) {
      const line = `[${entry.timestamp}] [${level.toUpperCase()}] ${entry.message}`;
      if (level === 'error') console.error(line);
      else if (level === 'warn') console.warn(line);
      else console.log(line);
    }
    if (outputChannel) {
      outputChannel.appendLine(`[${entry.timestamp}] [${level.toUpperCase()}] ${entry.message}`);
    }
    if (fileReady) {
      // A diagnostic logger favors durability and simplicity over
      // throughput here — a buffered WriteStream opens its file
      // descriptor asynchronously, so a call that logs and immediately
      // reads the file back (or process exit right after logging) can
      // race an unopened/unflushed stream. Synchronous appends make
      // every entry fully written before the call returns, with no
      // stream lifecycle or unhandled 'error' events to manage.
      try {
        fs.appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
      } catch {
        // Fail silently — logging must never crash the caller.
      }
    }
    if (onEntry) onEntry(entry);

    return entry;
  }

  return {
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    close: () => {},
  };
}
