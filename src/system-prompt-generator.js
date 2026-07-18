/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 * 
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 * 
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — System Prompt Generator
 * 
 * Generates a compressed system prompt that teaches the LLM
 * to understand our glyph notation.
 */

import { DOMAIN_GLYPHS, ACTION_GLYPHS, TECH_GLYPHS, STRUCTURE_GLYPHS, ERROR_CODES } from './radical-alphabet.js';

/**
 * Generate a system prompt header that teaches the LLM the glyph codebook.
 * This is included once at the start of the conversation.
 * @param {import('./compressor.js').Codebook} codebook - Project codebook
 * @returns {string} System prompt with glyph definitions
 */
export function generateSystemPrompt(codebook) {
  const parts = [];

  parts.push(`[GLYPH PROTOCOL v0.1]
Context uses compressed glyphs. Decode with this codebook:`);

  // Domain glyphs (compact table)
  const domainStr = Object.entries(DOMAIN_GLYPHS)
    .map(([k, v]) => `${v}=${k}`).join(' ');
  parts.push(`DOM: ${domainStr}`);

  // Action glyphs
  const actionStr = Object.entries(ACTION_GLYPHS)
    .map(([k, v]) => `${v}=${k}`).join(' ');
  parts.push(`ACT: ${actionStr}`);

  // Tech glyphs: every entry in TECH_GLYPHS, since _replaceTechNames() in
  // compressor.js applies all of them, not just a curated subset. Printing
  // only a hand-picked "most important" slice here previously let 19/33
  // glyphs (Java, C#, Swift, Ruby, Angular, Svelte, Django, Rails, Express,
  // FastAPI, NestJS, AWS, Azure, GCP, MySQL, MongoDB, embedding, prompt,
  // and others) reach the model completely undocumented.
  const techStr = Object.entries(TECH_GLYPHS)
    .map(([name, glyph]) => `${glyph}=${name}`).join(' ');
  parts.push(`TECH: ${techStr}`);

  // Structure glyphs
  parts.push(`SYM: ✗=error ⚠=warn ∉=type_mismatch ∅=not_found →=returns ƒ=func 𝒞=class ◇=state ⟿=effect`);

  // File index if available
  if (codebook && codebook.fileIndex.size > 0) {
    parts.push(codebook.getFileIndexHeader());
  }

  parts.push(`[/GLYPH]`);

  return parts.join('\n');
}

/**
 * Calculate how many tokens the system prompt overhead costs.
 * @returns {Object} Token estimates
 */
export function estimateOverhead() {
  const prompt = generateSystemPrompt(null);
  // Rough estimate: 1 token ≈ 4 chars for English
  const tokenEstimate = Math.ceil(prompt.length / 4);
  return {
    chars: prompt.length,
    estimatedTokens: tokenEstimate,
    note: 'This overhead is paid once per conversation, amortized over all messages',
  };
}
