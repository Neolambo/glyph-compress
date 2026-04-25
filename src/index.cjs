const middleware = require('../vscode-ext/glyph-middleware.cjs');
const workspaceIntelligence = require('./workspace-intelligence.cjs');

module.exports = {
  ...middleware,
  ...workspaceIntelligence,
};
