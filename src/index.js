/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 * 
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 * 
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Main entry point
 */

export { RADICALS, DOMAIN_GLYPHS, ACTION_GLYPHS, TECH_GLYPHS, STRUCTURE_GLYPHS, ERROR_CODES, getAlphabetStats } from './radical-alphabet.js';
export { Compressor, Codebook } from './compressor.js';
export { generateSystemPrompt, estimateOverhead } from './system-prompt-generator.js';
export { GlyphCompressor, wrapOpenAI, wrapAnthropic, CODEBOOK_PROMPT } from '../vscode-ext/glyph-middleware.js';
export { buildWorkspaceCodebook, saveWorkspaceCodebook, loadWorkspaceCodebook, selectRelevantFiles, detectIntent, runDoctor } from './workspace-intelligence.js';
export { PROVIDER_TOKEN_PROFILES, normalizeProvider, estimateProviderTokens, compareTokenEstimates } from './token-estimator.js';
