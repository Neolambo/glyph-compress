/**
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

  // Tech glyphs (most important ones)
  const topTechs = ['typescript', 'javascript', 'python', 'rust', 'go', 'react', 'nextjs', 'vue',
    'docker', 'kubernetes', 'postgres', 'redis', 'llm', 'agent'];
  const techStr = topTechs
    .filter(t => TECH_GLYPHS[t])
    .map(t => `${TECH_GLYPHS[t]}=${t}`).join(' ');
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
