const middleware = require('../vscode-ext/glyph-middleware.cjs');
const workspaceIntelligence = require('./workspace-intelligence.cjs');
const tokenEstimator = require('./token-estimator.cjs');
const { RADICALS, DOMAIN_GLYPHS, ACTION_GLYPHS, TECH_GLYPHS, STRUCTURE_GLYPHS, ERROR_CODES, getAlphabetStats } = require('./radical-alphabet.cjs');
const { Compressor, Codebook } = require('./compressor.cjs');
const { generateSystemPrompt, estimateOverhead } = require('./system-prompt-generator.cjs');

module.exports = {
  ...middleware,
  ...workspaceIntelligence,
  ...tokenEstimator,
  RADICALS,
  DOMAIN_GLYPHS,
  ACTION_GLYPHS,
  TECH_GLYPHS,
  STRUCTURE_GLYPHS,
  ERROR_CODES,
  getAlphabetStats,
  Compressor,
  Codebook,
  generateSystemPrompt,
  estimateOverhead,
};
