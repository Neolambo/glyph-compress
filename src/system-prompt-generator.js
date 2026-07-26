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

  // Structure glyphs: generated from STRUCTURE_GLYPHS for the same reason
  // TECH is generated above. This line used to be a hand-written string
  // listing 9 of the table's 21 entries, so `📄 📁 : ~ ℹ 💡 ≡ ⟨⟩ 𝒾 ⊞ ⟳` all
  // reached the model with no definition — the identical drift the TECH
  // comment above describes, in the line right beneath it.
  const structureStr = Object.entries(STRUCTURE_GLYPHS)
    .map(([name, glyph]) => `${glyph}=${name}`).join(' ');
  parts.push(`SYM: ${structureStr}`);

  // Diagnostic codes compress to composite glyphs (`∉prop`, `⏱timeout`,
  // `○denied`), which introduce symbols that appear in no other table.
  // ERROR_CODES was imported here but never rendered, so those were
  // undocumented too.
  const errorGlyphs = [...new Set(Object.values(ERROR_CODES))].join(' ');
  parts.push(`ERR: ${errorGlyphs}`);

  // The action glyphs PROMPT_PATTERNS emits in compressor.js. They are not
  // part of ACTION_GLYPHS, so nothing above covers them.
  parts.push(`PAT: ⺌=fix ⺎=review/explain ⺏=deploy`);

  // The file-reference notation itself, stated unconditionally. It was only
  // ever mentioned via getFileIndexHeader() when a file happened to be
  // indexed — but the `₍N₎` subscript form is the single most load-bearing
  // construct in the output, and a model that has not been told what the
  // subscripts mean cannot resolve a reference even when the index is present.
  parts.push(`FILE: ◈₍N₎=indexed file reference :L=line ~=range`);

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
