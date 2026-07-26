import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const middleware = require('../vscode-ext/glyph-middleware.cjs');

export const GlyphCompressor = middleware.GlyphCompressor;
export const wrapOpenAI = middleware.wrapOpenAI;
export const wrapAnthropic = middleware.wrapAnthropic;
export const CODEBOOK_PROMPT = middleware.CODEBOOK_PROMPT;
export const DOMAIN_GLYPHS = middleware.DOMAIN_GLYPHS;
export const TECH_GLYPHS = middleware.TECH_GLYPHS;
export const PROVIDER_COMPRESSION_PROFILES = middleware.PROVIDER_COMPRESSION_PROFILES;
export const TRUST_POLICY_PROFILES = middleware.TRUST_POLICY_PROFILES;
export const selectCompressionLevel = middleware.selectCompressionLevel;
export const planCompressionForBudget = middleware.planCompressionForBudget;
export const buildTrustWarnings = middleware.buildTrustWarnings;
