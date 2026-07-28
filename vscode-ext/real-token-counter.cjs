var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/real-token-counter.js
var real_token_counter_exports = {};
__export(real_token_counter_exports, {
  conservativeWordTokens: () => conservativeWordTokens,
  countGlyphTokens: () => countGlyphTokens,
  countRealTokens: () => countRealTokens,
  countWordTokens: () => countWordTokens,
  hasRealTokenizer: () => hasRealTokenizer
});
module.exports = __toCommonJS(real_token_counter_exports);
var import_module = require("module");
var import_meta = {};
var encoder;
var loadAttempted = false;
function resolveRequire() {
  if (typeof require === "function") return require;
  try {
    return (0, import_module.createRequire)(import_meta.url);
  } catch {
    return null;
  }
}
function loadEncoder() {
  if (loadAttempted) return encoder;
  loadAttempted = true;
  try {
    const req = resolveRequire();
    const tiktoken = req ? req("js-tiktoken") : null;
    encoder = tiktoken ? tiktoken.getEncoding("o200k_base") : null;
  } catch {
    encoder = null;
  }
  return encoder;
}
function hasRealTokenizer() {
  return loadEncoder() != null;
}
function countRealTokens(text) {
  if (typeof text !== "string" || text.length === 0) return 0;
  const enc = loadEncoder();
  if (!enc) return null;
  try {
    return enc.encode(text).length;
  } catch {
    return null;
  }
}
function countWordTokens(word) {
  if (typeof word !== "string" || word.length === 0) return 0;
  return countRealTokens(` ${word}`);
}
function conservativeWordTokens(word) {
  if (typeof word !== "string" || word.length === 0) return 0;
  return Math.max(1, Math.floor(word.length / 8));
}
function countGlyphTokens(glyph) {
  const measured = countRealTokens(` ${glyph}`);
  return measured == null ? 3 : measured;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  conservativeWordTokens,
  countGlyphTokens,
  countRealTokens,
  countWordTokens,
  hasRealTokenizer
});
