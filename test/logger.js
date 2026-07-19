/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Structured Diagnostics Suite
 *
 * Before this module, redaction was only ever applied at one call site in
 * the proxy (the upstream error-body log line) — every other log line,
 * including ones that could embed a request URL, an Authorization header
 * echoed back by a misbehaving upstream, or a forwarding error message,
 * went out unredacted, with no timestamp finer than a locale time string.
 * This suite locks in that every sink now gets a consistently redacted,
 * ISO-timestamped entry.
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createStructuredLogger, redactForLog } from '../src/logger.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

test('redactForLog strips bearer tokens, API keys, and known secret formats', () => {
  assert(!redactForLog('Authorization: Bearer sk-abcdefghijklmnopqrstuvwx1234').includes('sk-abcdefghijklmnopqrstuvwx1234'));
  assert(redactForLog('"apiKey": "abcdef123456"').includes('[REDACTED]'));
  assert(redactForLog('token=ghp_1234567890abcdefghij1234567890abcdef').includes('[REDACTED_GH_TOKEN]'));
  assert(redactForLog('key=AKIAABCDEFGHIJKLMNOP').includes('[REDACTED_AWS_KEY]'));
});

test('redactForLog truncates very long values instead of logging them in full', () => {
  const long = 'x'.repeat(5000);
  const result = redactForLog(long, 100);
  assert(result.length < 200, `should truncate, got length ${result.length}`);
  assert(result.includes('[truncated]'));
});

test('createStructuredLogger entries carry an ISO timestamp and level', () => {
  const entries = [];
  const logger = createStructuredLogger({ console: false, onEntry: (e) => entries.push(e) });
  logger.info('hello');
  logger.warn('careful');
  logger.error('boom');
  assert.strictEqual(entries.length, 3);
  assert.strictEqual(entries[0].level, 'info');
  assert.strictEqual(entries[1].level, 'warn');
  assert.strictEqual(entries[2].level, 'error');
  for (const entry of entries) {
    assert(!Number.isNaN(Date.parse(entry.timestamp)), `timestamp should be a parseable ISO string, got: ${entry.timestamp}`);
  }
});

test('createStructuredLogger redacts secrets in both message and meta before they reach any sink', () => {
  const entries = [];
  const logger = createStructuredLogger({ console: false, onEntry: (e) => entries.push(e) });
  logger.error('Forwarding error: Authorization: Bearer sk-live-abcdefghijklmnopqrstuvwx', {
    upstreamHeader: 'Bearer sk-live-abcdefghijklmnopqrstuvwx',
  });
  const raw = JSON.stringify(entries[0]);
  assert(!raw.includes('sk-live-abcdefghijklmnopqrstuvwx'), `secret must not survive into any field, got: ${raw}`);
});

test('createStructuredLogger writes valid, redacted JSONL to a file sink', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyph-logger-suite-'));
  const logFile = path.join(dir, 'nested', 'glyphcompress.log');
  try {
    const logger = createStructuredLogger({ console: false, logFile });
    logger.info('request started', { requestId: 1 });
    logger.error('upstream failed: Bearer sk-should-not-leak-1234567890', { requestId: 1 });
    logger.close();
    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
    assert.strictEqual(lines.length, 2, `expected 2 log lines, got ${lines.length}`);
    for (const line of lines) {
      const parsed = JSON.parse(line);
      assert(parsed.timestamp && parsed.level && parsed.message, `each JSONL line must be a complete structured entry, got: ${line}`);
    }
    assert(!fs.readFileSync(logFile, 'utf8').includes('sk-should-not-leak-1234567890'), 'secret must not appear in the log file');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a logger with no sinks configured never throws', () => {
  const logger = createStructuredLogger({ console: false });
  assert.doesNotThrow(() => {
    logger.info('noop');
    logger.close();
  });
});

console.log(`\nlogger: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log('logger suite ok');
}
