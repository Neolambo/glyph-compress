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
var token_estimator_exports = {};
__export(token_estimator_exports, {
  PROVIDER_TOKEN_PROFILES: () => PROVIDER_TOKEN_PROFILES,
  compareTokenEstimates: () => compareTokenEstimates,
  estimateGlyphTokenCost: () => estimateGlyphTokenCost,
  estimateProviderTokens: () => estimateProviderTokens,
  normalizeProvider: () => normalizeProvider
});
module.exports = __toCommonJS(token_estimator_exports);
const DEFAULT_PROFILE = "raw";
const PROVIDER_ALIASES = {
  auto: DEFAULT_PROFILE,
  raw: DEFAULT_PROFILE,
  openai: "openai",
  gpt: "openai",
  anthropic: "anthropic",
  claude: "anthropic",
  gemini: "gemini",
  google: "gemini",
  local: "local",
  ollama: "local"
};
const PROVIDER_TOKEN_PROFILES = {
  raw: {
    charsPerToken: 4,
    messageOverhead: 0,
    systemOverhead: 0,
    name: "Generic text estimate"
  },
  openai: {
    // Measured live with js-tiktoken (o200k_base) across five real files
    // from this repository — see docs/benchmark-methodology.md. The
    // previous 3.8 was an unverified guess that happened to roughly match
    // code (real: ~3.8-3.9 chars/token for src/compressor.js and
    // src/workspace-intelligence.js) but badly underestimated real
    // tokenizer efficiency on prose/markdown (real: ~4.2-5.3 chars/token
    // for README.md/ROADMAP.md/docs/architecture.md), overestimating
    // originalTokens enough that the net-negative compression fallback —
    // which compares two heuristic numbers — could miss a genuine
    // real-token regression. 4.2 is the char-weighted blended average
    // across all five measured files (total chars / total real tokens),
    // not a per-content-type split — GlyphCompress payloads are typically
    // a prose/code mix, and a single constant can't be exactly right for
    // both; this trades a small new code-side underestimate for
    // meaningfully closing the much larger prose-side overestimate.
    charsPerToken: 4.2,
    messageOverhead: 4,
    systemOverhead: 2,
    name: "OpenAI chat estimate"
  },
  anthropic: {
    charsPerToken: 3.6,
    messageOverhead: 3,
    systemOverhead: 5,
    name: "Anthropic Messages estimate"
  },
  gemini: {
    charsPerToken: 4.1,
    messageOverhead: 3,
    systemOverhead: 2,
    name: "Gemini-compatible estimate"
  },
  local: {
    charsPerToken: 3.5,
    messageOverhead: 2,
    systemOverhead: 1,
    name: "Local model estimate"
  }
};
function normalizeProvider(provider = DEFAULT_PROFILE) {
  const key = String(provider || DEFAULT_PROFILE).toLowerCase();
  return PROVIDER_ALIASES[key] || DEFAULT_PROFILE;
}
function stringifyContent(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
function normalizeMessages(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object" && "content" in item) return item;
      return { role: "user", content: item };
    });
  }
  return [{ role: "user", content: value }];
}
const BMP_NON_ASCII_TOKEN_PENALTY = 0.8;
const ASTRAL_TOKEN_PENALTY = 1.8;
function countNonAsciiCodepoints(text) {
  let bmpCount = 0;
  let astralCount = 0;
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint <= 127) continue;
    if (codePoint > 65535) astralCount++;
    else bmpCount++;
  }
  return { bmpCount, astralCount };
}
function estimateProviderTokens(value, provider = DEFAULT_PROFILE) {
  const profileName = normalizeProvider(provider);
  const profile = PROVIDER_TOKEN_PROFILES[profileName];
  const messages = normalizeMessages(value);
  let estimated = 0;
  for (const message of messages) {
    const content = stringifyContent(message.content);
    const baseTokens = Math.ceil(content.length / profile.charsPerToken);
    const { bmpCount, astralCount } = countNonAsciiCodepoints(content);
    const unicodePenalty = bmpCount * BMP_NON_ASCII_TOKEN_PENALTY + astralCount * ASTRAL_TOKEN_PENALTY;
    estimated += baseTokens + Math.ceil(unicodePenalty);
    estimated += profile.messageOverhead;
    if (message.role === "system") estimated += profile.systemOverhead;
  }
  return Math.max(1, Math.ceil(estimated));
}
function estimateGlyphTokenCost(glyph, charsPerToken) {
  const { bmpCount, astralCount } = countNonAsciiCodepoints(glyph);
  return glyph.length / charsPerToken + bmpCount * BMP_NON_ASCII_TOKEN_PENALTY + astralCount * ASTRAL_TOKEN_PENALTY;
}
function compareTokenEstimates(original, compressed, provider = DEFAULT_PROFILE) {
  const originalTokens = estimateProviderTokens(original, provider);
  const compressedTokens = estimateProviderTokens(compressed, provider);
  const saved = originalTokens - compressedTokens;
  return {
    provider: normalizeProvider(provider),
    originalTokens,
    compressedTokens,
    saved,
    ratio: `${(originalTokens / Math.max(1, compressedTokens)).toFixed(1)}x`,
    savedPct: `${((1 - compressedTokens / Math.max(1, originalTokens)) * 100).toFixed(0)}%`
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PROVIDER_TOKEN_PROFILES,
  compareTokenEstimates,
  estimateGlyphTokenCost,
  estimateProviderTokens,
  normalizeProvider
});
