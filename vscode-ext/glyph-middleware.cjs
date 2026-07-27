var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// vscode-ext/glyph-middleware.js
var glyph_middleware_exports = {};
__export(glyph_middleware_exports, {
  CODEBOOK_PROMPT: () => CODEBOOK_PROMPT,
  DOMAIN_GLYPHS: () => DOMAIN_GLYPHS,
  GlyphCompressor: () => GlyphCompressor,
  PROVIDER_COMPRESSION_PROFILES: () => PROVIDER_COMPRESSION_PROFILES,
  TECH_GLYPHS: () => TECH_GLYPHS,
  TRUST_POLICY_PROFILES: () => TRUST_POLICY_PROFILES,
  buildTrustWarnings: () => buildTrustWarnings,
  planCompressionForBudget: () => planCompressionForBudget,
  selectCompressionLevel: () => selectCompressionLevel,
  wrapAnthropic: () => wrapAnthropic,
  wrapOpenAI: () => wrapOpenAI
});
module.exports = __toCommonJS(glyph_middleware_exports);
var import_node_crypto = require("node:crypto");
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var import_node_os = __toESM(require("node:os"));
var import_token_estimator = require("./token-estimator.cjs");
var import_workspace_intelligence = require("./workspace-intelligence.cjs");
var import_team_codebook = require("./team-codebook.cjs");
var DOMAIN_GLYPHS = {
  frontend: "\u25C8",
  ai_ml: "\u25C9",
  devops: "\u25CA",
  database: "\u25C6",
  language: "\u25C7",
  automation: "\u2295",
  architecture: "\u2297",
  mobile: "\u2299",
  cloud: "\u2298",
  data: "\u229A",
  testing: "\u229B",
  backend: "\u229C",
  security: "\u229D",
  documentation: "\u229E",
  optimization: "\u229F",
  networking: "\u22A0"
};
var TECH_GLYPHS = {
  typescript: "\u1D57",
  javascript: "\u02B2\u02E2",
  python: "\u1D56",
  rust: "\u02B3",
  go: "\u1D4D",
  java: "\u02B2",
  csharp: "\u1D9C",
  swift: "\u02E2",
  ruby: "\u1D47",
  react: "\u211C",
  nextjs: "\u2115",
  vue: "\u{1D54D}",
  angular: "\u{1D538}",
  svelte: "\u{1D54A}",
  django: "\u{1D53B}",
  rails: "\u211D",
  express: "\u{1D53C}\u02E3",
  fastapi: "\u{1D53D}",
  docker: "\u{1D49F}",
  kubernetes: "\u{1D4A6}",
  terraform: "\u{1D4AF}",
  postgres: "\u2119",
  mysql: "\u2133",
  mongodb: "\u2098",
  redis: "\u1D63",
  llm: "\u2112",
  agent: "\u03B1",
  prompt: "\u03C0"
};
var MEASURED_TECH_GLYPH_TOKENS_OPENAI = {
  typescript: [1, 1, 3, 3],
  javascript: [1, 1, 4, 4],
  python: [1, 1, 3, 3],
  rust: [1, 1, 2, 2],
  go: [1, 1, 3, 3],
  java: [1, 1, 2, 2],
  csharp: [2, 2, 3, 3],
  swift: [1, 1, 2, 2],
  ruby: [1, 1, 3, 3],
  react: [1, 1, 2, 2],
  nextjs: [2, 2, 2, 2],
  vue: [1, 1, 3, 3],
  angular: [1, 1, 3, 3],
  svelte: [2, 2, 3, 3],
  django: [1, 1, 3, 3],
  rails: [1, 1, 2, 2],
  express: [1, 1, 5, 5],
  fastapi: [2, 2, 3, 3],
  docker: [1, 1, 3, 3],
  kubernetes: [2, 2, 3, 3],
  terraform: [1, 1, 3, 3],
  postgres: [1, 1, 2, 2],
  mysql: [1, 1, 2, 2],
  mongodb: [1, 1, 2, 2],
  redis: [1, 1, 3, 3],
  llm: [2, 2, 2, 2],
  agent: [1, 1, 1, 1],
  prompt: [1, 1, 1, 1]
};
var MEASURED_CODE_KEYWORD_TOKENS_OPENAI = {
  return: [1, 1, 1, 1],
  function: [1, 1, 2, 1],
  const: [1, 1, 2, 1],
  let: [1, 1, 2, 1],
  import: [1, 1, 1, 1],
  export: [1, 1, 1, 1],
  def: [1, 1, 2, 1],
  class: [1, 1, 3, 3],
  from: [1, 1, 1, 1],
  yield: [1, 1, 1, 1],
  "self.": [2, 2, 2, 2],
  int: [1, 1, 3, 2],
  void: [1, 1, 3, 2],
  char: [1, 1, 3, 2],
  float: [1, 1, 3, 2],
  double: [1, 1, 3, 2],
  long: [1, 1, 3, 2],
  short: [1, 1, 3, 2],
  fn: [1, 1, 2, 1],
  pub: [1, 1, 1, 1],
  mut: [1, 1, 1, 1],
  impl: [1, 1, 1, 1],
  struct: [1, 1, 3, 3],
  use: [1, 1, 1, 1],
  match: [1, 1, 1, 1],
  func: [1, 1, 2, 1],
  package: [1, 1, 1, 1],
  type: [1, 1, 3, 2],
  public: [1, 1, 1, 1],
  private: [1, 1, 1, 1],
  protected: [1, 1, 1, 1],
  using: [1, 1, 1, 1],
  "#include": [1, 1, 1, 1]
};
var MEASURED_TECH_GLYPH_TOKENS_GEMINI = {
  typescript: [1, 1],
  javascript: [1, 2],
  python: [1, 1],
  rust: [1, 1],
  go: [1, 1],
  java: [1, 1],
  csharp: [2, 1],
  swift: [1, 1],
  ruby: [1, 1],
  react: [1, 3],
  nextjs: [2, 1],
  vue: [1, 4],
  angular: [1, 1],
  svelte: [1, 1],
  django: [1, 1],
  rails: [1, 1],
  express: [1, 2],
  fastapi: [2, 4],
  docker: [1, 1],
  kubernetes: [1, 4],
  terraform: [1, 4],
  postgres: [1, 1],
  mysql: [1, 3],
  mongodb: [1, 3],
  redis: [1, 3],
  llm: [2, 3],
  agent: [1, 1],
  prompt: [1, 1]
};
var MEASURED_CODE_KEYWORD_TOKENS_GEMINI = {
  return: [1, 1],
  function: [1, 1],
  const: [1, 1],
  let: [1, 1],
  import: [1, 1],
  export: [1, 1],
  def: [1, 1],
  class: [1, 1],
  from: [1, 1],
  yield: [1, 1],
  "self.": [2, 2],
  int: [1, 2],
  void: [1, 2],
  char: [1, 2],
  float: [1, 2],
  double: [1, 2],
  long: [1, 2],
  short: [1, 2],
  fn: [1, 1],
  pub: [1, 1],
  mut: [1, 1],
  impl: [1, 1],
  struct: [1, 1],
  use: [1, 1],
  match: [1, 1],
  func: [1, 1],
  package: [1, 1],
  type: [1, 2],
  public: [1, 1],
  private: [1, 1],
  protected: [1, 1],
  using: [1, 1],
  "#include": [2, 1]
};
var MEASURED_TECH_GLYPH_TOKENS_ANTHROPIC = {
  typescript: [8, 12],
  javascript: [8, 13],
  python: [8, 12],
  rust: [8, 11],
  go: [8, 12],
  java: [8, 11],
  csharp: [10, 12],
  swift: [8, 11],
  ruby: [8, 12],
  react: [8, 11],
  nextjs: [9, 11],
  vue: [8, 12],
  angular: [8, 12],
  svelte: [9, 12],
  django: [8, 12],
  rails: [8, 11],
  express: [8, 16],
  fastapi: [9, 12],
  docker: [8, 12],
  kubernetes: [8, 12],
  terraform: [8, 12],
  postgres: [8, 11],
  mysql: [8, 11],
  mongodb: [8, 11],
  redis: [8, 12],
  llm: [9, 11],
  agent: [8, 8],
  prompt: [8, 8]
};
var MEASURED_CODE_KEYWORD_TOKENS_ANTHROPIC = {
  return: [8, 8],
  function: [8, 11],
  const: [8, 10],
  let: [8, 10],
  import: [8, 8],
  export: [8, 8],
  def: [8, 11],
  class: [8, 12],
  from: [8, 8],
  yield: [8, 8],
  "self.": [9, 9],
  int: [8, 11],
  void: [8, 11],
  char: [8, 11],
  float: [8, 11],
  double: [8, 11],
  long: [8, 11],
  short: [8, 11],
  fn: [8, 11],
  pub: [8, 8],
  mut: [8, 8],
  impl: [8, 8],
  struct: [8, 12],
  use: [8, 8],
  match: [8, 8],
  func: [8, 11],
  package: [8, 8],
  type: [8, 11],
  public: [8, 8],
  private: [8, 8],
  protected: [8, 8],
  using: [8, 8],
  "#include": [9, 8]
};
var TECH_LABEL_OVERRIDES = {
  typescript: "TS",
  javascript: "JS",
  python: "Py",
  csharp: "C#",
  nextjs: "Next",
  kubernetes: "K8s",
  postgres: "PG",
  mongodb: "Mongo",
  llm: "LLM",
  fastapi: "FastAPI"
};
function _techLabel(name) {
  return TECH_LABEL_OVERRIDES[name] || name.charAt(0).toUpperCase() + name.slice(1);
}
var CODE_LINE_PATTERN = /^\s*(?:import\s|export\s|from\s|def\s|class\s|function\s|const\s|let\s|var\s|return\s|if\s*\(|for\s*\(|while\s*\(|#include|using\s|package\s|public\s|private\s|protected\s|@\w+|.*[{};]\s*$|.*=>\s*\{?\s*$)/;
function selectCompressionLevel(text) {
  if (typeof text !== "string") return "standard";
  const trimmed = text.trim();
  if (trimmed.length < 120) return "light";
  const fencedBlocks = trimmed.match(/```[\s\S]*?```/g) || [];
  const fencedChars = fencedBlocks.reduce((sum, block) => sum + block.length, 0);
  const fencedRatio = fencedChars / trimmed.length;
  const lines = trimmed.split("\n").filter((line) => line.trim().length > 0);
  const codeLines = lines.filter((line) => CODE_LINE_PATTERN.test(line));
  const lineCodeRatio = lines.length > 0 ? codeLines.length / lines.length : 0;
  const codeRatio = Math.max(fencedRatio, lineCodeRatio);
  if (codeRatio >= 0.55 && trimmed.length > 600) return "ultra";
  if (codeRatio >= 0.3) return "aggressive";
  return "standard";
}
function planCompressionForBudget(text, options = {}) {
  const { budget, provider = "raw", levels, includeCodebook, trustPolicy } = options;
  const compressor = new GlyphCompressor({ provider, trustPolicy });
  return compressor.compressToBudget(text, { budget, provider, levels, includeCodebook });
}
var FALLBACK_MIN_IMPROVEMENT_RATIO = 0.9;
var COMPRESSION_LEVELS = ["light", "standard", "aggressive", "ultra"];
var ELISION_MARKER = "[identical code block repeated later in this conversation - see the most recent copy]";
function normalizeCompressionLevel(level) {
  if (typeof level !== "string") return "standard";
  const cleaned = level.trim().toLowerCase();
  if (cleaned === "auto") return "auto";
  return COMPRESSION_LEVELS.includes(cleaned) ? cleaned : "standard";
}
function isCompressionTrusted(compTokens, origTokens, provider) {
  if (provider === "raw") return true;
  return compTokens <= origTokens * FALLBACK_MIN_IMPROVEMENT_RATIO;
}
var ERROR_PATTERNS = [
  [/Property '(\w+)' does not exist on type '(\w+)'/g, "'$1'\u2209$2"],
  [/Type '(\w+)' is not assignable to type '(\w+)'/g, "$1\u2209\u2192$2"],
  [/Cannot find (?:name|module) '([^']+)'/g, "\u2205'$1'"],
  [/Argument of type '(\w+)' is not assignable/g, "arg:$1\u2209"],
  [/Expected (\d+) arguments?, but got (\d+)/g, "args:$1\u2260$2"],
  [/Object is possibly '(null|undefined)'/g, "\u2205?"],
  [/Parameter '(\w+)' implicitly has an 'any' type/g, "$1:\u2205type"],
  [/Unexpected token/g, "\u2205token"],
  [/No overload matches this call/g, "\u2209overload"],
  [/Module '([^']+)' has no exported member '(\w+)'/g, "$1\u2205exp:$2"],
  [/Cannot use import statement outside a module/g, "\u2205ESM"],
  [/is declared but its value is never read/g, "\u26A0unused"],
  [/is defined but never used/g, "\u26A0unused"]
];
var PROMPT_PATTERNS = [
  [/fix (?:the |this )?(?:error|bug|issue) in (.+)/i, "\u2E8C\u2717 $1"],
  [/create (?:a |an )?(.+) component/i, "\u25B2\u229E $1"],
  [/add (.+) to (.+)/i, "\u25B2 $1 \u2192 $2"],
  [/optimize (?:the )?performance of (.+)/i, "\u2E8B $1"],
  [/explain (?:how |what |why )(.+)/i, "\u2E8E $1"],
  [/refactor (.+)/i, "\u25CF $1"],
  [/write (?:a |the )?tests? for (.+)/i, "\u25BA $1"],
  [/deploy (.+) to (.+)/i, "\u2E8F $1\u2192$2"],
  [/review (.+)/i, "\u2E8E $1"],
  [/debug (.+)/i, "\u2E83 $1"],
  [/implement (.+)/i, "\u25B2 $1"],
  [/update (.+)/i, "\u25CF $1"],
  [/delete (?:the )?(.+)/i, "\u2717 $1"],
  [/test (.+)/i, "\u25BA $1"],
  [/document (.+)/i, "\u25A0 $1"]
];
var PRIVACY_REDACTION_PATTERNS = [
  { kind: "openai_key", label: "OpenAI API key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { kind: "github_token", label: "GitHub token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g },
  { kind: "github_token", label: "GitHub fine-grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { kind: "aws_access_key", label: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { kind: "jwt", label: "JSON Web Token", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { kind: "bearer_token", label: "Bearer token", pattern: /\bBearer\s+([A-Za-z0-9._~+/=-]{20,})\b/g, valueGroup: 1 },
  { kind: "secret_assignment", label: "secret assignment", pattern: /\b((?:api[_-]?key|token|secret|password|passwd|pwd|client[_-]?secret|access[_-]?token)\s*[:=]\s*)(["']?)([^"'\s,;]+)\2/gi, valueGroup: 3 },
  { kind: "email", label: "email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { kind: "ipv4", label: "IPv4 address", pattern: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g }
];
var PROVIDER_COMPRESSION_PROFILES = {
  raw: {
    provider: "raw",
    strategy: "balanced",
    dynamicMinSavedChars: 4,
    maxDynamicEntries: 80,
    codebookHint: "Generic text profile with balanced dynamic dictionary compression."
  },
  openai: {
    provider: "openai",
    strategy: "chat-compact",
    dynamicMinSavedChars: 4,
    maxDynamicEntries: 80,
    codebookHint: "OpenAI chat profile favors compact repeated identifiers and low message overhead."
  },
  anthropic: {
    provider: "anthropic",
    strategy: "cache-stable",
    dynamicMinSavedChars: 6,
    maxDynamicEntries: 64,
    codebookHint: "Anthropic profile keeps the codebook stable for cache-friendly system prompts."
  },
  gemini: {
    provider: "gemini",
    strategy: "structure-preserving",
    dynamicMinSavedChars: 4,
    maxDynamicEntries: 72,
    codebookHint: "Gemini-compatible profile favors structural clarity with moderate dictionary growth."
  },
  local: {
    provider: "local",
    strategy: "aggressive-local",
    dynamicMinSavedChars: 3,
    maxDynamicEntries: 96,
    codebookHint: "Local-model profile uses more dynamic entries where tokenizer overhead is lower."
  }
};
var TRUST_POLICY_PROFILES = {
  lossless: {
    policy: "lossless",
    label: "Lossless",
    reversible: true,
    redacts: false,
    lossy: false,
    allows: {
      prompt: false,
      tech: false,
      files: false,
      diagnostics: false,
      dynamic: false,
      codeMinify: false,
      codeSummary: false,
      redundancyStrip: false,
      privacy: false
    }
  },
  reversible: {
    policy: "reversible",
    label: "Reversible",
    reversible: true,
    redacts: false,
    lossy: false,
    allows: {
      prompt: true,
      tech: true,
      files: true,
      diagnostics: true,
      dynamic: true,
      codeMinify: false,
      codeSummary: false,
      redundancyStrip: false,
      privacy: false
    }
  },
  privacy: {
    policy: "privacy",
    label: "Privacy Firewall",
    reversible: true,
    redacts: true,
    lossy: false,
    allows: {
      prompt: true,
      tech: true,
      files: true,
      diagnostics: true,
      dynamic: true,
      codeMinify: false,
      codeSummary: false,
      redundancyStrip: false,
      privacy: true
    }
  },
  lossy: {
    policy: "lossy",
    label: "Lossy",
    reversible: false,
    redacts: false,
    lossy: true,
    allows: {
      prompt: true,
      tech: true,
      files: true,
      diagnostics: true,
      dynamic: true,
      codeMinify: true,
      codeSummary: true,
      redundancyStrip: true,
      privacy: true
    }
  }
};
function buildTrustWarnings(trustProfile, level) {
  const warnings = [];
  if (!trustProfile) return warnings;
  if (trustProfile.lossy) {
    warnings.push("Lossy trust policy: code summaries and redundancy stripping are irreversible \u2014 the compressed output cannot be used to reconstruct the original text.");
  }
  if (!trustProfile.reversible) {
    warnings.push("Non-reversible trust policy: no dictionaries are exposed for mapping compressed glyphs back to their original text.");
  }
  if (level === "ultra" && trustProfile.allows?.codeSummary) {
    warnings.push("Ultra level replaces code blocks with structural summaries \u2014 the model reasons from a description of the code, not the code itself.");
  }
  if ((level === "aggressive" || level === "ultra") && trustProfile.allows?.codeMinify) {
    warnings.push("Code blocks are syntactically minified \u2014 comments and some structure are removed; verify no comment contained information the model still needs.");
  }
  if (trustProfile.redacts) {
    warnings.push("Privacy firewall active: values matching secret/PII patterns are redacted before compression \u2014 verify no legitimate (non-secret) value was caught by those patterns.");
  }
  return warnings;
}
var COMPACT_CODEBOOK_DOM_ENTRIES = [
  ["\u25C8", "frontend"],
  ["\u25C9", "ai_ml"],
  ["\u25CA", "devops"],
  ["\u25C6", "database"],
  ["\u25C7", "lang"],
  ["\u2295", "auto"],
  ["\u2297", "arch"],
  ["\u2299", "mobile"],
  ["\u2298", "cloud"],
  ["\u229A", "data"],
  ["\u229B", "test"],
  ["\u229C", "backend"],
  ["\u229D", "security"],
  ["\u229E", "docs"],
  ["\u229F", "perf"],
  ["\u22A0", "net"]
];
var COMPACT_CODEBOOK_TECH_ENTRIES = Object.entries(TECH_GLYPHS).map(([name, glyph]) => [glyph, _techLabel(name)]);
var TECH_CODEBOOK_LINE = COMPACT_CODEBOOK_TECH_ENTRIES.map(([g, l]) => `${g}=${l}`).join(" ");
var CODEBOOK_PROMPT = `[GLYPH PROTOCOL v0.5]
Context uses compressed glyphs. Decode:
DOM: \u25C8=frontend \u25C9=ai_ml \u25CA=devops \u25C6=database \u25C7=lang \u2295=auto \u2297=arch \u2299=mobile \u2298=cloud \u229A=data \u229B=test \u229C=backend \u229D=security \u229E=docs \u229F=perf \u22A0=net
TECH: ${TECH_CODEBOOK_LINE}
SYM: \u2717=err \u26A0=warn \u2209=type_err \u2205=missing \u2192=return/yield \u0192=function/def/fn \u{1D49E}=class/struct \u25C7=var/const/let \u25C7t=type/int/void \u27FF=effect \u2E8C=fix \u2E8B=perf \u2E8E=review \u2E83=debug \u2E8F=deploy \u25B2=create \u25CF=refactor \u25BA=test \u25A0=doc
MOD: +=pub/public -=private #=protected m=mut I=impl ?=match pkg=package s.=self.
FILE: \u208DN\u208E=file_index :L=line [NL]=line_count imp=imports exp=exports \u27F3=hooks
DYNFMT: \xA7N=Nth most-frequent repeated word/phrase in this request (see DYN line)
Respond normally. Context below uses these glyphs for brevity.
[/GLYPH]`;
var COMPACT_CODEBOOK_PROMPT = `[GLYPH PROTOCOL v0.5]
DOM: \u25C8=frontend \u25C9=ai_ml \u25CA=devops \u25C6=database \u25C7=lang \u2295=auto \u2297=arch \u2299=mobile \u2298=cloud \u229A=data \u229B=test \u229C=backend \u229D=security \u229E=docs \u229F=perf \u22A0=net
TECH: ${TECH_CODEBOOK_LINE}
SYM: \u2717=err \u26A0=warn \u2209=type_err \u2205=missing \u2192=return/yield \u0192=function/def/fn \u{1D49E}=class/struct \u25C7=var/const/let \u25C7t=type/int/void \u27FF=effect \u2E8C=fix \u2E8B=perf \u2E8E=review \u2E83=debug \u2E8F=deploy \u25B2=create \u25CF=refactor \u25BA=test \u25A0=doc
MOD: +=pub/public -=private #=protected m=mut I=impl ?=match pkg=package s.=self.
FILE: \u208DN\u208E=file_index :L=line [NL]=line_count imp=imports exp=exports \u27F3=hooks
DYNFMT: \xA7N=Nth most-frequent repeated word/phrase in this request (see DYN line)
Decode:
[/GLYPH]`;
var COMPACT_CODEBOOK_SYM_ENTRIES = [
  ["\u2717", "err"],
  ["\u26A0", "warn"],
  ["\u2209", "type_err"],
  ["\u2205", "missing"],
  ["\u2192", "return/yield"],
  ["\u0192", "function/def/fn"],
  ["\u{1D49E}", "class/struct"],
  ["\u25C7t", "type/int/void"],
  ["\u27FF", "effect"],
  ["\u2E8C", "fix"],
  ["\u2E8B", "perf"],
  ["\u2E8E", "review"],
  ["\u2E83", "debug"],
  ["\u2E8F", "deploy"],
  ["\u25B2", "create"],
  ["\u25CF", "refactor"],
  ["\u25BA", "test"],
  ["\u25A0", "doc"],
  ["\u25C7", "var/const/let"]
];
var COMPACT_CODEBOOK_MOD_ENTRIES = [
  ["+=", "pub/public"],
  ["-=", "private"],
  ["#", "protected"],
  ["m", "mut"],
  ["I", "impl"],
  ["?", "match"],
  ["pkg", "package"],
  ["s.", "self."]
];
var COMPACT_CODEBOOK_FILE_LINE = "\u208DN\u208E=file_index :L=line [NL]=line_count imp=imports exp=exports \u27F3=hooks";
var GlyphCompressor = class {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.level = normalizeCompressionLevel(options.level);
    this.provider = (0, import_token_estimator.normalizeProvider)(options.provider || "raw");
    this.providerProfile = this._resolveProviderProfile(this.provider);
    this.requestedPrivacyFirewall = options.privacyFirewall === true || options.privacy === true;
    const requestedPolicy = String(options.trustPolicy || options.policy || "").toLowerCase();
    this.trustPolicyExplicit = Boolean(TRUST_POLICY_PROFILES[requestedPolicy]);
    this.trustPolicy = this._resolveTrustPolicy(options.trustPolicy || options.policy);
    this.trustProfile = TRUST_POLICY_PROFILES[this.trustPolicy];
    this.fileIndex = /* @__PURE__ */ new Map();
    this.fileCounter = 0;
    this.dynamicDict = /* @__PURE__ */ new Map();
    this.dynamicCounter = 0;
    this.privacyFirewall = this.requestedPrivacyFirewall || this.trustPolicy === "privacy";
    this.privacyTokens = /* @__PURE__ */ new Map();
    this.privacyCounter = 0;
    this.sourceMap = this._createSourceMap();
    this.stats = {
      totalOriginalTokens: 0,
      totalCompressedTokens: 0,
      messagesProcessed: 0,
      sessionStarted: Date.now()
    };
    this.workspacePath = options.workspacePath || options.cacheKey || null;
    this.teamCodebookEntries = [];
    this._seedTeamCodebook();
    this.cacheFile = null;
    this._initCache();
    this.attentionalDecay = options.attentionalDecay === true || options.decay === true;
    this.holographicFolding = options.holographicFolding === true || options.folding === true;
    this.intentDiffs = options.intentDiffs === true || options.intents === true;
  }
  // ─── MAIN API ─────────────────────────────────────────────
  /**
   * Compress a message array before sending to LLM.
   * Works with both OpenAI and Anthropic message formats.
   * 
   * @param {Array} messages - [{role, content}]
   * @param {string} provider - 'openai' | 'anthropic' | 'antigravity'
   * @returns {Object} { messages, stats }
   */
  compressMessages(messages, provider = this.provider) {
    if (!this.enabled) return { messages, stats: this.stats };
    this._setProvider(provider);
    const origTokens = this._estimateTokens(messages, provider);
    const baseState = this._captureCompressionState();
    const candidates = this._candidateMessageStrategies(messages);
    let bestResult = null;
    for (const candidate of candidates) {
      const trialState = this._captureCompressionState();
      this._applyEffectiveLevel(candidate.level);
      const result = this._compressMessagesForStrategy(messages, provider, origTokens, baseState, candidate);
      this._restoreCompressionState(trialState);
      if (!bestResult || result.compressedTokens < bestResult.compressedTokens) {
        bestResult = result;
      }
    }
    this._applyEffectiveLevel(bestResult.level);
    this._restoreCompressionState(bestResult.state);
    this.stats.totalOriginalTokens += origTokens;
    this.stats.totalCompressedTokens += bestResult.compressedTokens;
    this.stats.messagesProcessed++;
    if (!bestResult.fallback) {
      this._saveCache();
    }
    return {
      messages: bestResult.messages,
      sourceMap: bestResult.sourceMap,
      stats: {
        ...this.stats,
        thisMessage: {
          provider: this.provider,
          profile: this.providerProfile.strategy,
          trustPolicy: this.trustPolicy,
          originalTokens: origTokens,
          compressedTokens: bestResult.compressedTokens,
          saved: origTokens - bestResult.compressedTokens,
          ratio: (origTokens / Math.max(1, bestResult.compressedTokens)).toFixed(1) + "x",
          savedPct: ((1 - bestResult.compressedTokens / Math.max(1, origTokens)) * 100).toFixed(0) + "%",
          fallback: bestResult.fallback,
          selectedLevel: bestResult.level
        }
      }
    };
  }
  /**
   * Elide fenced code blocks that appear more than once across the turns,
   * keeping only the most recent copy.
   *
   * IDEs re-attach open-file context on every turn, so the same file arrives
   * unchanged turn after turn. Measured on a 5-turn thread re-sending
   * src/token-estimator.js at 'standard': 1635 | 1635 | 1592 | 1592 | 1592
   * real tokens — full weight every time, 8046 cumulative. The duplication is
   * *within a single request*, so an earlier copy is redundant with a later
   * one the model can already see.
   *
   * Direction is the whole design, not a detail. Attentional Decay compacts
   * OLD turns, so a marker pointing backwards would dangle the moment its
   * referent decayed — the same silent failure as the ◈₍1₎ collision fixed in
   * v1.32.6. Keeping the newest copy intact and eliding the older ones is
   * safe by construction: if decay later compacts those turns, they held only
   * a marker anyway.
   *
   * The marker is plain text, deliberately. A new glyph would need a codebook
   * entry, and a glyph emitted without one is exactly the drift v1.32.9 fixed.
   */
  _elideRepeatedBlocks(messages, rolesToCompress) {
    const FENCE = /```[\s\S]*?```/g;
    const occurrences = /* @__PURE__ */ new Map();
    messages.forEach((msg, msgIndex) => {
      if (!rolesToCompress.has(msg.role) || typeof msg.content !== "string") return;
      for (const block of msg.content.match(FENCE) || []) {
        if (!occurrences.has(block)) occurrences.set(block, []);
        occurrences.get(block).push(msgIndex);
      }
    });
    const elidable = /* @__PURE__ */ new Set();
    for (const [block, at] of occurrences) {
      if (at.length > 1 && block.length > 200) elidable.add(block);
    }
    if (elidable.size === 0) return messages;
    const lastIndexOf = /* @__PURE__ */ new Map();
    for (const block of elidable) lastIndexOf.set(block, Math.max(...occurrences.get(block)));
    let elided = 0;
    const out = messages.map((msg, msgIndex) => {
      if (!rolesToCompress.has(msg.role) || typeof msg.content !== "string") return msg;
      let changed = false;
      const content = msg.content.replace(FENCE, (block) => {
        if (!elidable.has(block) || lastIndexOf.get(block) === msgIndex) return block;
        changed = true;
        elided++;
        return ELISION_MARKER;
      });
      return changed ? { ...msg, content } : msg;
    });
    if (elided > 0) this.sourceMap.repeatedBlocksElided = elided;
    return out;
  }
  _compressMessagesForStrategy(messages, provider, origTokens, baseState, candidate) {
    this.resetSourceMap();
    const rolesToCompress = this.attentionalDecay ? /* @__PURE__ */ new Set(["user", "assistant"]) : new Set(candidate.roles || ["user"]);
    messages = this._elideRepeatedBlocks(messages, rolesToCompress);
    const allCompressibleText = messages.filter((m) => rolesToCompress.has(m.role)).map((m) => this._normalizeMessageContent(m.content)).map((text) => text.split(ELISION_MARKER).join(" ")).join("\n");
    const safeText = this._applyPrivacyFirewall(allCompressibleText, false);
    this._buildDynamicDictionary(safeText);
    const compressed = messages.map((msg, index) => {
      if (!rolesToCompress.has(msg.role)) return msg;
      if (this.attentionalDecay) {
        const d = messages.length - 1 - index;
        if (d === 0) {
          return {
            ...msg,
            content: this._compressUserMessage(msg.content, safeText)
          };
        } else if (d <= 3) {
          const prevLevel = this.level;
          this._applyEffectiveLevel("aggressive");
          const result = this._compressUserMessage(msg.content, safeText);
          this._applyEffectiveLevel(prevLevel);
          return { ...msg, content: result };
        } else if (d <= 6) {
          const prevLevel = this.level;
          this._applyEffectiveLevel("ultra");
          const compressedText = this._compressUserMessage(msg.content, safeText);
          this._applyEffectiveLevel(prevLevel);
          const decayed = compressedText.replace(/```([^\n\r]*?)[\r\n]+([\s\S]*?)[\r\n]+\s*```/g, (match, lang, code) => {
            const lines = code.split("\n").length;
            const language = lang || "code";
            return `// [Summary: ${language} block, ${lines} lines]`;
          });
          return { ...msg, content: decayed };
        } else {
          let cleanText = msg.content.replace(/```[\s\S]*?```/g, "").replace(/\s+/g, " ").trim();
          if (cleanText.length > 120) {
            cleanText = cleanText.slice(0, 120) + "...";
          }
          const decayed = `[Radical Summary: ${cleanText}]`;
          return { ...msg, content: decayed };
        }
      }
      return {
        ...msg,
        content: this._compressUserMessage(msg.content, safeText)
      };
    });
    const buildWithCodebook = (forceFiltered) => {
      const withCodebook = compressed.map((msg) => ({ ...msg }));
      const idx = withCodebook.findIndex((msg) => msg.role === "system");
      if (idx >= 0) {
        withCodebook[idx] = {
          ...withCodebook[idx],
          content: this._injectCodebook(withCodebook[idx].content, provider, compressed, { forceFiltered })
        };
      } else {
        withCodebook.unshift({
          role: "system",
          content: this._injectCodebook("", provider, compressed, { forceFiltered }).trim()
        });
      }
      return withCodebook;
    };
    let finalMessages = buildWithCodebook(false);
    let compTokens = this._estimateTokens(finalMessages, provider);
    let fallback = !isCompressionTrusted(compTokens, origTokens, this.provider);
    if (fallback) {
      const filteredMessages = buildWithCodebook(true);
      const filteredTokens = this._estimateTokens(filteredMessages, provider);
      if (isCompressionTrusted(filteredTokens, origTokens, this.provider)) {
        finalMessages = filteredMessages;
        compTokens = filteredTokens;
        fallback = false;
      }
    }
    return {
      level: candidate.level,
      // Falling back returns PRIVACY-FILTERED originals, never the raw input.
      //
      // This read `messages.map((msg) => ({ ...msg }))`, so every fallback
      // shipped the untouched text — API keys, bearer tokens, emails, IPs —
      // straight to the provider, with the privacy firewall enabled and
      // reporting success. Reproduced on the released code: a single user
      // message containing `API_KEY=sk-prod...` and an email address falls
      // back on token economics and both values arrive verbatim.
      //
      // The firewall is a security boundary, so it cannot be conditional on
      // whether compression happened to pay off. Redaction is re-applied here
      // with recording suppressed, because the compression attempt already
      // recorded these same entries in the source map.
      messages: fallback ? messages.map((msg) => typeof msg.content === "string" ? { ...msg, content: this._applyPrivacyFirewall(msg.content, false) } : { ...msg }) : finalMessages,
      compressedTokens: fallback ? origTokens : compTokens,
      sourceMap: fallback ? this._createSourceMap() : this.getSourceMap(),
      fallback,
      state: fallback ? baseState : this._captureCompressionState()
    };
  }
  _resolveBaseLevel(messages = []) {
    if (this.level !== "auto") return this.level;
    const userText = messages.filter((m) => m.role === "user").map((m) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join("\n");
    return selectCompressionLevel(userText);
  }
  _candidateMessageStrategies(messages = []) {
    const baseLevel = this._resolveBaseLevel(messages);
    const levels = this.provider === "raw" || baseLevel === "light" ? [baseLevel] : [baseLevel, "light"];
    const strategies = levels.map((level) => ({ level, roles: ["user"] }));
    if (this.provider !== "raw" && messages.some((message) => message.role === "assistant")) {
      for (const level of levels) {
        strategies.push({ level, roles: ["user", "assistant"] });
      }
    }
    return strategies;
  }
  _captureCompressionState() {
    return {
      level: this.level,
      // Captured alongside the level because the two are coupled: a derived
      // trust policy is a function of the level, so restoring one without
      // the other leaves the compressor in a state it could never have
      // reached on its own.
      trustPolicy: this.trustPolicy,
      fileIndex: new Map(this.fileIndex),
      fileCounter: this.fileCounter,
      dynamicDict: new Map(this.dynamicDict),
      dynamicCounter: this.dynamicCounter,
      privacyTokens: new Map(this.privacyTokens),
      privacyCounter: this.privacyCounter,
      sourceMap: {
        ...this.sourceMap,
        files: [...this.sourceMap.files],
        dynamic: [...this.sourceMap.dynamic],
        diagnostics: [...this.sourceMap.diagnostics],
        codeBlocks: [...this.sourceMap.codeBlocks],
        ast: [...this.sourceMap.ast],
        privacy: [...this.sourceMap.privacy],
        symbols: [...this.sourceMap.symbols],
        replacements: [...this.sourceMap.replacements]
      }
    };
  }
  _restoreCompressionState(state) {
    this.level = state.level;
    if (state.trustPolicy) {
      this.trustPolicy = state.trustPolicy;
      this.trustProfile = TRUST_POLICY_PROFILES[state.trustPolicy];
    }
    this.fileIndex = new Map(state.fileIndex);
    this.fileCounter = state.fileCounter;
    this.dynamicDict = new Map(state.dynamicDict);
    this.dynamicCounter = state.dynamicCounter;
    this.privacyTokens = new Map(state.privacyTokens);
    this.privacyCounter = state.privacyCounter;
    this.sourceMap = {
      ...state.sourceMap,
      files: [...state.sourceMap.files],
      dynamic: [...state.sourceMap.dynamic],
      diagnostics: [...state.sourceMap.diagnostics],
      codeBlocks: [...state.sourceMap.codeBlocks],
      ast: [...state.sourceMap.ast],
      privacy: [...state.sourceMap.privacy],
      symbols: [...state.sourceMap.symbols],
      replacements: [...state.sourceMap.replacements]
    };
  }
  /**
   * Compress a standalone context string (for Antigravity/skill usage).
   * @param {string} text - Raw context text
   * @returns {Object} { compressed, original, stats }
   */
  compressText(text, provider = this.provider) {
    if (!this.enabled) return { compressed: text, original: text, stats: {} };
    this._setProvider(provider);
    this.resetSourceMap();
    const configuredLevel = this.level;
    const configuredTrustPolicy = this.trustPolicy;
    const resolvedLevel = configuredLevel === "auto" ? selectCompressionLevel(text) : configuredLevel;
    this._applyEffectiveLevel(resolvedLevel);
    const safeText = this._applyPrivacyFirewall(text, false);
    this._buildDynamicDictionary(safeText);
    const compressed = this._compressUserMessage(text, safeText);
    const origTokens = this._estimateTokens([{ content: text }], this.provider);
    const compTokens = this._estimateTokens([{ content: compressed }], this.provider);
    this.level = configuredLevel;
    this.trustPolicy = configuredTrustPolicy;
    this.trustProfile = TRUST_POLICY_PROFILES[this.trustPolicy];
    const fallback = !isCompressionTrusted(compTokens, origTokens, this.provider);
    const finalCompressed = fallback ? safeText : compressed;
    const finalCompTokens = fallback ? origTokens : compTokens;
    this.stats.totalOriginalTokens += origTokens;
    this.stats.totalCompressedTokens += finalCompTokens;
    this.stats.messagesProcessed++;
    this._saveCache();
    return {
      compressed: finalCompressed,
      original: text,
      fallback,
      sourceMap: fallback ? this._createSourceMap() : this.getSourceMap(),
      stats: {
        provider: this.provider,
        profile: this.providerProfile.strategy,
        trustPolicy: this.trustPolicy,
        originalTokens: origTokens,
        compressedTokens: finalCompTokens,
        fallback,
        selectedLevel: resolvedLevel,
        ratio: (origTokens / Math.max(1, finalCompTokens)).toFixed(1) + "x",
        savedPct: ((1 - finalCompTokens / Math.max(1, origTokens)) * 100).toFixed(0) + "%"
      }
    };
  }
  /**
   * Context Budget Planner: given a hard token budget, compress `text`
   * with the *least destructive* level that actually fits, instead of
   * making the caller guess a level and hope.
   *
   * This is the budget-driven counterpart to selectCompressionLevel(),
   * which picks a level from content signals alone and is completely
   * budget-blind — it cannot know whether its choice fits in the space
   * the caller actually has. routeAndCompress()'s `tokenBudget` is a
   * different axis again: it decides *which files* to send, not how hard
   * to compress each one.
   *
   * Escalation is lightest-first (light -> standard -> aggressive ->
   * ultra) and stops at the first level that fits, because heavier levels
   * trade real fidelity (comment stripping, code summarization, and at
   * `ultra` irreversibly so) for space. Buying space that is not needed
   * is a pure loss, so this deliberately does not return the smallest
   * possible output — it returns the cheapest one that clears the bar.
   *
   * Budget is measured against what is actually transmitted, which
   * includes the injected codebook (~400 tokens), not just the compressed
   * body — budgeting on the body alone would under-report the real cost
   * on exactly the short payloads where the codebook dominates. Pass
   * `{ includeCodebook: false }` to budget the body only.
   *
   * When no level fits, this reports `withinBudget: false` and returns
   * the smallest candidate rather than silently pretending it succeeded;
   * the caller still needs to send something, and hiding an overflow is
   * how a budget check becomes worse than no check at all.
   *
   * @param {string} text - Raw context text
   * @param {Object} [options]
   * @param {number} options.budget - hard token budget for the transmitted payload
   * @param {string} [options.provider] - provider for token estimation, defaults to this.provider
   * @param {string[]} [options.levels] - escalation order, defaults to light/standard/aggressive/ultra
   * @param {boolean} [options.includeCodebook=true] - count the injected codebook against the budget
   * @returns {Object} { compressed, codebook, level, withinBudget, tokens, trials, ... }
   */
  compressToBudget(text, options = {}) {
    const budget = Number(options.budget);
    if (!Number.isFinite(budget) || budget <= 0) {
      throw new Error("compressToBudget requires a positive numeric `budget`");
    }
    const provider = options.provider || this.provider;
    const includeCodebook = options.includeCodebook !== false;
    const levels = Array.isArray(options.levels) && options.levels.length ? options.levels : ["light", "standard", "aggressive", "ultra"];
    const statsSnapshot = { ...this.stats };
    const configuredLevel = this.level;
    const configuredTrustPolicy = this.trustPolicy;
    const trials = [];
    let chosen = null;
    let smallest = null;
    for (const level of levels) {
      this._applyEffectiveLevel(level);
      const result = this.compressText(text, provider);
      const codebook = includeCodebook ? this.getCodebookPrompt() : "";
      const codebookTokens = includeCodebook ? (0, import_token_estimator.estimateProviderTokens)([{ content: codebook }], (0, import_token_estimator.normalizeProvider)(provider)) : 0;
      const totalTokens = result.stats.compressedTokens + codebookTokens;
      const trial = {
        level,
        bodyTokens: result.stats.compressedTokens,
        codebookTokens,
        totalTokens,
        fallback: result.fallback,
        withinBudget: totalTokens <= budget
      };
      trials.push(trial);
      if (!smallest || totalTokens < smallest.trial.totalTokens) {
        smallest = { trial, result, codebook };
      }
      if (trial.withinBudget) {
        chosen = { trial, result, codebook };
        break;
      }
    }
    this.level = configuredLevel;
    this.trustPolicy = configuredTrustPolicy;
    this.trustProfile = TRUST_POLICY_PROFILES[this.trustPolicy];
    this.stats = statsSnapshot;
    const winner = chosen || smallest;
    this.stats.totalOriginalTokens += winner.result.stats.originalTokens;
    this.stats.totalCompressedTokens += winner.trial.bodyTokens;
    this.stats.messagesProcessed++;
    return {
      compressed: winner.result.compressed,
      original: text,
      codebook: winner.codebook,
      level: winner.trial.level,
      withinBudget: Boolean(chosen),
      budget,
      tokens: winner.trial.totalTokens,
      bodyTokens: winner.trial.bodyTokens,
      codebookTokens: winner.trial.codebookTokens,
      overflowTokens: chosen ? 0 : winner.trial.totalTokens - budget,
      fallback: winner.result.fallback,
      sourceMap: winner.result.sourceMap,
      trials,
      stats: winner.result.stats
    };
  }
  /**
   * Context Router: rank workspace files relevant to a query (via
   * workspace-intelligence's intent detection + relevance scoring), then
   * compress as many as fit inside a token budget — instead of the IDE
   * caller manually picking which open files to send. Explicit opt-in;
   * existing compressText()/compressMessages() callers are unaffected.
   *
   * Files are taken in ranked-score order and skipped once the budget
   * would be exceeded, so `selectedFiles`/`excludedFiles` on the result
   * make the routing decision auditable (which files were sent and why
   * others were not), per-file `sourceMap` included for reversibility.
   *
   * @param {string} query - user's task/prompt, used for intent + relevance ranking
   * @param {Object} [options]
   * @param {string} [options.rootDir] - workspace root, defaults to cwd
   * @param {number} [options.tokenBudget] - max tokens to spend on routed file context (default 2000)
   * @param {number} [options.maxFiles] - max candidate files to rank before budgeting (default 8)
   * @param {string} [options.provider] - provider for token estimation, defaults to this.provider
   * @param {boolean} [options.gitDiffOnly] - restrict candidates to git staged/unstaged files
   *   (e.g. "review what I changed"), instead of ranking the whole workspace
   */
  routeAndCompress(query, options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const tokenBudget = options.tokenBudget || 2e3;
    const maxFiles = options.maxFiles || 8;
    const provider = options.provider || this.provider;
    const { intents, files } = (0, import_workspace_intelligence.routeContext)(rootDir, query, { limit: maxFiles, gitDiffOnly: options.gitDiffOnly === true });
    const selectedFiles = [];
    const excludedFiles = [];
    const parts = [];
    let tokensUsed = 0;
    for (const file of files) {
      if (!file.content) {
        excludedFiles.push({ path: file.path, score: file.score, reason: "unreadable-or-too-large" });
        continue;
      }
      const result = this.compressText(`[F: ${file.path}]
${file.content}`, provider);
      if (tokensUsed + result.stats.compressedTokens > tokenBudget) {
        excludedFiles.push({ path: file.path, score: file.score, reason: "token-budget-exceeded" });
        continue;
      }
      tokensUsed += result.stats.compressedTokens;
      selectedFiles.push({ path: file.path, score: file.score, tokens: result.stats.compressedTokens, sourceMap: result.sourceMap });
      parts.push(result.compressed);
    }
    if (selectedFiles.length) {
      (0, import_workspace_intelligence.recordFileUsage)(rootDir, selectedFiles.map((f) => f.path));
    }
    return {
      compressed: parts.join("\n"),
      intents,
      selectedFiles,
      excludedFiles,
      tokenBudget,
      tokensUsed
    };
  }
  /**
   * Get the codebook system prompt to inject.
   */
  getCodebookPrompt(messages = []) {
    let prompt = this._codebookPromptForProvider(messages);
    if (this.fileIndex.size > 0) {
      const files = [...this.fileIndex].map(([path2, ref]) => `${ref}=${path2}`).join(" | ");
      prompt = prompt.replace("[/GLYPH]", `FILES: ${files}
[/GLYPH]`);
    }
    if (this.dynamicDict.size > 0) {
      const dyn = [...this.dynamicDict].map(([word, glyph]) => `${glyph}=${word}`).join(" | ");
      prompt = prompt.replace("[/GLYPH]", `DYN: ${dyn}
[/GLYPH]`);
    }
    return prompt;
  }
  _prepareAnthropicPayload(systemInput, messages = []) {
    const allMessages = [];
    const originalSystemText = this._anthropicSystemText(systemInput);
    if (originalSystemText) {
      allMessages.push({ role: "system", content: originalSystemText });
    }
    allMessages.push(...messages);
    const { messages: compressed, stats } = this.compressMessages(allMessages, "anthropic");
    const systemMsg = compressed.find((message) => message.role === "system");
    const otherMsgs = compressed.filter((message) => message.role !== "system").map((message) => ({ ...message }));
    const useStructuredSystem = messages.some((message) => message.role === "assistant");
    let systemParam = systemInput;
    if (systemMsg) {
      systemParam = useStructuredSystem ? this._buildAnthropicSystemParam(systemMsg.content, originalSystemText) : systemMsg.content;
    }
    this._markAnthropicCacheBreakpoint(otherMsgs);
    return {
      system: systemParam,
      messages: otherMsgs,
      stats
    };
  }
  _anthropicSystemText(systemInput) {
    if (typeof systemInput === "string") {
      return systemInput;
    }
    if (Array.isArray(systemInput)) {
      return systemInput.map((entry) => entry && typeof entry === "object" && "text" in entry ? entry.text : "").filter(Boolean).join("\n");
    }
    return "";
  }
  _buildAnthropicSystemParam(systemContent, originalSystemText = "") {
    const parsed = this._parseInjectedCodebook(systemContent);
    const systemBlocks = [];
    if (parsed.hasProtocol) {
      systemBlocks.push({
        type: "text",
        text: this._anthropicStableProtocolBlock(),
        cache_control: { type: "ephemeral" }
      });
    }
    const resolvedSystemText = parsed.originalSystemText || originalSystemText;
    if (resolvedSystemText) {
      systemBlocks.push({
        type: "text",
        text: resolvedSystemText,
        cache_control: { type: "ephemeral" }
      });
    }
    if (parsed.dynamicLine) {
      systemBlocks.push({
        type: "text",
        text: `[GLYPH DYNAMIC]
${parsed.dynamicLine}`
      });
    }
    if (systemBlocks.length === 0 && systemContent) {
      systemBlocks.push({
        type: "text",
        text: systemContent,
        cache_control: { type: "ephemeral" }
      });
    }
    return systemBlocks;
  }
  _parseInjectedCodebook(systemContent = "") {
    if (typeof systemContent !== "string" || !systemContent.startsWith("[GLYPH PROTOCOL")) {
      return {
        hasProtocol: false,
        originalSystemText: systemContent || "",
        dynamicLine: ""
      };
    }
    const closingMarker = "[/GLYPH]";
    const closingIndex = systemContent.indexOf(closingMarker);
    if (closingIndex === -1) {
      return {
        hasProtocol: false,
        originalSystemText: systemContent,
        dynamicLine: ""
      };
    }
    const codebookText = systemContent.slice(0, closingIndex + closingMarker.length);
    const originalSystemText = systemContent.slice(closingIndex + closingMarker.length).replace(/^\s+/, "");
    const dynamicLine = codebookText.split("\n").find((line) => line.startsWith("DYN: ")) || "";
    return {
      hasProtocol: true,
      originalSystemText,
      dynamicLine
    };
  }
  _anthropicStableProtocolBlock() {
    return COMPACT_CODEBOOK_PROMPT.replace(
      "[/GLYPH]",
      `PROFILE: ${this.providerProfile.provider}/${this.providerProfile.strategy}
[/GLYPH]`
    );
  }
  /**
   * Put the conversation's cache breakpoint on its final block.
   *
   * Anthropic caching is prefix-based: cache_control means "everything up to
   * and including this block is cacheable". Until v1.33.6 this marked the
   * *largest* user block instead, which is the wrong axis — the largest block
   * is usually the file attached at the start, and it does not move as the
   * conversation grows. Every turn after it therefore fell outside the cached
   * prefix and was billed at full price, forever.
   *
   * Measured over a session with a 5.5k-token file attached up front, pricing
   * cache writes at 1.25x and reads at 0.1x:
   *
   *   turns   cached prefix (marking largest -> final)   effective cost
   *      8              96% -> 100%                          -1.4%
   *     18              88% -> 100%                         -13.8%
   *     42              74% -> 100%                         -41.6%
   *
   * The saving grows with session length because that is how much of the
   * conversation had accumulated beyond the frozen breakpoint. Short sessions
   * are neutral (worst case measured: +0.2% at 4 turns), because marking the
   * newest turn writes it to cache at 1.25x and a session that ends there
   * never reads it back.
   *
   * Marking only the final block also leaves headroom: with both system
   * blocks cached this uses 3 of Anthropic's 4 breakpoints. Keeping the old
   * largest-block marking as well would have used exactly 4, and measured
   * identically — a stable "floor" breakpoint buys no resilience here, since
   * any change early enough to invalidate the head invalidates the floor too.
   */
  _markAnthropicCacheBreakpoint(messages = []) {
    if (!messages.length) return;
    const msg = messages[messages.length - 1];
    if (typeof msg.content === "string") {
      msg.content = [
        {
          type: "text",
          text: msg.content,
          cache_control: { type: "ephemeral" }
        }
      ];
      return;
    }
    if (Array.isArray(msg.content) && msg.content.length > 0) {
      const textBlocks = msg.content.filter((block) => block.type === "text");
      if (textBlocks.length > 0) {
        textBlocks[textBlocks.length - 1].cache_control = { type: "ephemeral" };
      }
    }
  }
  /**
   * Get session statistics.
   */
  getStats() {
    const s = this.stats;
    const saved = s.totalOriginalTokens - s.totalCompressedTokens;
    const costPerToken = 3 / 1e6;
    return {
      messagesProcessed: s.messagesProcessed,
      totalOriginalTokens: s.totalOriginalTokens,
      totalCompressedTokens: s.totalCompressedTokens,
      totalSavedTokens: saved,
      overallRatio: s.totalOriginalTokens > 0 ? (s.totalOriginalTokens / Math.max(1, s.totalCompressedTokens)).toFixed(1) + "x" : "0x",
      overallSavedPct: s.totalOriginalTokens > 0 ? ((1 - s.totalCompressedTokens / s.totalOriginalTokens) * 100).toFixed(0) + "%" : "0%",
      estimatedCostSaved: `$${(saved * costPerToken).toFixed(4)}`,
      sessionDuration: Math.round((Date.now() - s.sessionStarted) / 6e4) + " min"
    };
  }
  /**
   * Reset file index (when changing projects).
   */
  resetFileIndex() {
    this.fileIndex.clear();
    this.fileCounter = 0;
  }
  getSourceMap() {
    const sourceMap = {
      ...this.sourceMap,
      files: [...this.sourceMap.files],
      dynamic: [...this.sourceMap.dynamic],
      diagnostics: [...this.sourceMap.diagnostics],
      codeBlocks: [...this.sourceMap.codeBlocks],
      ast: [...this.sourceMap.ast],
      privacy: [...this.sourceMap.privacy],
      symbols: [...this.sourceMap.symbols],
      replacements: [...this.sourceMap.replacements]
    };
    const knownFileRefs = new Set(sourceMap.files.map((file) => file.ref));
    for (const [path2, ref] of this.fileIndex) {
      if (!knownFileRefs.has(ref)) {
        sourceMap.files.push({ ref, path: path2, domain: this._detectDomain(path2) });
      }
    }
    const knownDynamicGlyphs = new Set(sourceMap.dynamic.map((entry) => entry.glyph));
    for (const [original, glyph] of this.dynamicDict) {
      if (!knownDynamicGlyphs.has(glyph)) {
        sourceMap.dynamic.push({ glyph, original });
      }
    }
    return sourceMap;
  }
  getReversibleDictionaries() {
    const sourceMap = this.getSourceMap();
    return {
      files: sourceMap.files,
      dynamic: sourceMap.dynamic,
      diagnostics: sourceMap.diagnostics,
      codeBlocks: sourceMap.codeBlocks,
      ast: sourceMap.ast,
      privacy: sourceMap.privacy,
      symbols: sourceMap.symbols
    };
  }
  resetSourceMap() {
    this.sourceMap = this._createSourceMap();
  }
  /**
   * Report which dynamic-dictionary entries came from the shared, git-
   * committed team codebook (glyphcompress.team.json) versus this
   * session's own local learning, for transparency/debugging.
   */
  getTeamCodebookInfo() {
    return {
      loaded: this.teamCodebookEntries.length > 0,
      entriesLoaded: this.teamCodebookEntries.length,
      words: [...this.teamCodebookEntries]
    };
  }
  // Seeds the dynamic dictionary from a git-committed glyphcompress.team.json
  // (see src/team-codebook.js) BEFORE per-session learning or the personal
  // local-cache restore happens, so every team member's compressor assigns
  // the exact same §N index to the same shared vocabulary — deliberately,
  // not by chance. Runs before _initCache() so the personal cache merge
  // below can skip words already claimed by the team file.
  _seedTeamCodebook() {
    if (!this.workspacePath) return;
    try {
      const team = (0, import_team_codebook.loadTeamCodebook)(this.workspacePath);
      if (!team || !Array.isArray(team.entries)) return;
      for (const word of team.entries) {
        if (!word || this.dynamicDict.has(word)) continue;
        if (this.dynamicCounter >= this.providerProfile.maxDynamicEntries) break;
        const glyph = `\xA7${this.dynamicCounter + 1}`;
        this.dynamicDict.set(word, glyph);
        this.teamCodebookEntries.push(word);
        this.dynamicCounter++;
      }
    } catch (e) {
    }
  }
  _initCache() {
    try {
      if (this.workspacePath) {
        const homedir = import_node_os.default.homedir();
        const cacheDir = import_node_path.default.join(homedir, ".glyphcompress", "cache");
        const hash = (0, import_node_crypto.createHash)("sha256").update(this.workspacePath).digest("hex").slice(0, 16);
        this.cacheFile = import_node_path.default.join(cacheDir, `${hash}.json`);
        this._loadCache();
      }
    } catch (e) {
    }
  }
  _loadCache() {
    if (!this.cacheFile) return;
    try {
      if (import_node_fs.default.existsSync(this.cacheFile)) {
        const raw = import_node_fs.default.readFileSync(this.cacheFile, "utf8");
        const data = JSON.parse(raw);
        if (data.fileIndex && Array.isArray(data.fileIndex)) {
          for (const [key, value] of data.fileIndex) {
            if (!this.fileIndex.has(key)) this.fileIndex.set(key, value);
          }
          const cachedCounter = typeof data.fileCounter === "number" ? data.fileCounter : this.fileIndex.size;
          this.fileCounter = Math.max(this.fileCounter, cachedCounter);
        }
        if (data.dynamicDict && Array.isArray(data.dynamicDict)) {
          for (const [word, glyph] of data.dynamicDict) {
            if (!this.dynamicDict.has(word)) this.dynamicDict.set(word, glyph);
          }
          const cachedCounter = typeof data.dynamicCounter === "number" ? data.dynamicCounter : this.dynamicDict.size;
          this.dynamicCounter = Math.max(this.dynamicCounter, cachedCounter);
        }
      }
    } catch (e) {
    }
  }
  _saveCache() {
    if (!this.cacheFile) return;
    try {
      const cacheDir = import_node_path.default.dirname(this.cacheFile);
      if (!import_node_fs.default.existsSync(cacheDir)) {
        import_node_fs.default.mkdirSync(cacheDir, { recursive: true });
      }
      const data = {
        fileIndex: [...this.fileIndex.entries()],
        dynamicDict: [...this.dynamicDict.entries()],
        fileCounter: this.fileCounter,
        dynamicCounter: this.dynamicCounter
      };
      import_node_fs.default.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
    }
  }
  // ─── INTERNAL METHODS ──────────────────────────────────────
  _createSourceMap() {
    return {
      version: "1.33.7",
      level: this.level,
      provider: this.provider,
      profile: this.providerProfile,
      trustPolicy: this.trustPolicy,
      trust: this.trustProfile,
      trustWarnings: buildTrustWarnings(this.trustProfile, this.level),
      files: [],
      dynamic: [],
      diagnostics: [],
      codeBlocks: [],
      ast: [],
      privacy: [],
      symbols: [],
      replacements: []
    };
  }
  _resolveProviderProfile(provider) {
    const normalized = (0, import_token_estimator.normalizeProvider)(provider);
    return PROVIDER_COMPRESSION_PROFILES[normalized] || PROVIDER_COMPRESSION_PROFILES.raw;
  }
  _setProvider(provider) {
    this.provider = (0, import_token_estimator.normalizeProvider)(provider || this.provider || "raw");
    this.providerProfile = this._resolveProviderProfile(this.provider);
  }
  _resolveTrustPolicy(policy) {
    const requested = String(policy || "auto").toLowerCase();
    if (TRUST_POLICY_PROFILES[requested]) return requested;
    if (this?.requestedPrivacyFirewall) return "privacy";
    if (this?.level === "aggressive" || this?.level === "ultra") return "lossy";
    return "reversible";
  }
  /**
   * Set the effective compression level, re-deriving the trust policy when
   * it was not pinned explicitly by the caller.
   *
   * _resolveTrustPolicy() reads `this.level`, but only ever ran once, in
   * the constructor. That silently broke `level: 'auto'`: the constructor
   * sees 'auto' (neither 'aggressive' nor 'ultra'), derives the
   * conservative 'reversible' policy, and then compressText() resolves the
   * level to 'ultra' for code-heavy content — with a trust profile that
   * forbids exactly the code summarization 'ultra' is defined by. The
   * result was reported as `selectedLevel: 'ultra'` while delivering
   * standard-level output, so the savings were lost *and* misreported.
   *
   * An explicitly requested policy is never touched: choosing a level is
   * delegation of the level decision, not permission to quietly widen what
   * transformations are allowed. When the policy is derived, it tracks the
   * level exactly as it would have had that level been passed to the
   * constructor, keeping `auto` consistent with explicit construction.
   * Irreversibility remains visible to callers through the existing
   * buildTrustWarnings()/`sourceMap.trustWarnings` surface.
   */
  _applyEffectiveLevel(level) {
    this.level = normalizeCompressionLevel(level);
    if (!this.trustPolicyExplicit) {
      this.trustPolicy = this._resolveTrustPolicy("auto");
      this.trustProfile = TRUST_POLICY_PROFILES[this.trustPolicy];
    }
  }
  _allows(capability) {
    return Boolean(this.trustProfile?.allows?.[capability]);
  }
  _recordReplacement(kind, original, compressed, extra = {}) {
    if (!original || original === compressed) return;
    if (this.sourceMap.replacements.length >= 500) return;
    this.sourceMap.replacements.push({ kind, original, compressed, ...extra });
  }
  _lineColumnAt(text, offset) {
    const safeOffset = Math.max(0, Math.min(offset, text.length));
    const before = text.slice(0, safeOffset);
    const lines = before.split(/\r?\n/);
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
      offset: safeOffset
    };
  }
  _spanForRange(text, startOffset, endOffset) {
    return {
      start: this._lineColumnAt(text, startOffset),
      end: this._lineColumnAt(text, endOffset)
    };
  }
  _recordSymbol(glyph, original, kind, span, extra = {}) {
    if (!glyph || !original || !span) return;
    this.sourceMap.symbols.push({ glyph, original, kind, span, ...extra });
  }
  _normalizeMessageContent(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part.text === "string") return part.text;
        return "";
      }).join("\n");
    }
    return content == null ? "" : String(content);
  }
  _privacyHash(value) {
    return (0, import_node_crypto.createHash)("sha256").update(String(value)).digest("hex").slice(0, 16);
  }
  _privacyPlaceholder(kind, value) {
    const hash = this._privacyHash(value);
    if (!this.privacyTokens.has(hash)) {
      this.privacyCounter++;
      this.privacyTokens.set(hash, `\u27E6${kind.toUpperCase()}_${this.privacyCounter}\u27E7`);
    }
    return { hash, placeholder: this.privacyTokens.get(hash) };
  }
  _applyPrivacyFirewall(text, record = true) {
    if (!this.privacyFirewall || !text || !this._allows("privacy")) return text;
    let result = text;
    for (const rule of PRIVACY_REDACTION_PATTERNS) {
      result = result.replace(rule.pattern, (...args) => {
        const match = args[0];
        const groups = args.slice(1, -2);
        const offset = args[args.length - 2];
        const input = args[args.length - 1];
        const sensitiveValue = rule.valueGroup ? groups[rule.valueGroup - 1] : match;
        if (!sensitiveValue) return match;
        const valueOffset = match.indexOf(sensitiveValue);
        const safeValueOffset = valueOffset >= 0 ? valueOffset : 0;
        const { hash, placeholder } = this._privacyPlaceholder(rule.kind, sensitiveValue);
        const span = this._spanForRange(input, offset + safeValueOffset, offset + safeValueOffset + sensitiveValue.length);
        const replacement = match.slice(0, safeValueOffset) + placeholder + match.slice(safeValueOffset + sensitiveValue.length);
        if (record) {
          this.sourceMap.privacy.push({
            kind: rule.kind,
            label: rule.label,
            placeholder,
            hash: `sha256:${hash}`,
            span
          });
          this._recordReplacement("privacy", `[${rule.kind}]`, placeholder, { span, redacted: true, label: rule.label });
          this._recordSymbol(placeholder, `[${rule.kind}]`, "privacy", span, { redacted: true, label: rule.label });
        }
        return replacement;
      });
    }
    return result;
  }
  _injectCodebook(systemPrompt, provider, messages = [], options = {}) {
    if (systemPrompt.includes("[GLYPH PROTOCOL")) return systemPrompt;
    this._setProvider(provider);
    const payloadText = this._payloadTextForCodebook(messages);
    const usedDynamicEntries = [...this.dynamicDict].filter(([, glyph]) => payloadText.includes(glyph)).map(([word, glyph]) => `${glyph}=${word}`);
    const dynLine = usedDynamicEntries.length > 0 ? `DYN: ${usedDynamicEntries.join(" | ")}` : "";
    const cacheStable = !options.forceFiltered && this.provider !== "raw" && this.provider !== "anthropic" && messages.some((message) => message.role === "assistant");
    let modifiedCodebook = cacheStable ? COMPACT_CODEBOOK_PROMPT : this._codebookPromptForProvider(messages);
    if (this.provider !== "raw") {
      modifiedCodebook = modifiedCodebook.replace("[/GLYPH]", `PROFILE: ${this.providerProfile.provider}/${this.providerProfile.strategy}
[/GLYPH]`);
    }
    if (cacheStable) {
      const dynBlock = dynLine ? `

[GLYPH DYNAMIC]
${dynLine}` : "";
      return modifiedCodebook + "\n\n" + systemPrompt + dynBlock;
    }
    if (dynLine) {
      modifiedCodebook = modifiedCodebook.replace("[/GLYPH]", `${dynLine}
[/GLYPH]`);
    }
    return modifiedCodebook + "\n\n" + systemPrompt;
  }
  _codebookPromptForProvider() {
    return this.provider === "raw" ? CODEBOOK_PROMPT : this._buildMinimalCompactCodebookPrompt(...arguments);
  }
  _buildMinimalCompactCodebookPrompt(messages = []) {
    if (!messages.length) {
      return COMPACT_CODEBOOK_PROMPT;
    }
    const payloadText = this._payloadTextForCodebook(messages);
    const usedDynamicGlyphs = new Set(
      [...this.dynamicDict].filter(([, glyph]) => payloadText.includes(glyph)).map(([, glyph]) => glyph)
    );
    const lines = ["[GLYPH PROTOCOL v0.5]"];
    const domLine = this._codebookLineFromEntries("DOM", COMPACT_CODEBOOK_DOM_ENTRIES, payloadText);
    const techLine = this._codebookLineFromEntries("TECH", COMPACT_CODEBOOK_TECH_ENTRIES, payloadText, usedDynamicGlyphs);
    const symLine = this._codebookLineFromEntries("SYM", COMPACT_CODEBOOK_SYM_ENTRIES, payloadText);
    const modLine = this._codebookLineFromEntries("MOD", COMPACT_CODEBOOK_MOD_ENTRIES, payloadText);
    const needsFileLine = this._payloadNeedsFileCodebook(payloadText);
    if (domLine) lines.push(domLine);
    if (techLine) lines.push(techLine);
    if (symLine) lines.push(symLine);
    if (modLine) lines.push(modLine);
    if (needsFileLine) lines.push(`FILE: ${COMPACT_CODEBOOK_FILE_LINE}`);
    lines.push("Decode:");
    lines.push("[/GLYPH]");
    return lines.join("\n");
  }
  _codebookLineFromEntries(section, entries, payloadText, excludedGlyphs = /* @__PURE__ */ new Set()) {
    const usedEntries = entries.filter(([glyph]) => !excludedGlyphs.has(glyph) && payloadText.includes(glyph));
    if (usedEntries.length === 0) return "";
    return `${section}: ${usedEntries.map(([glyph, label]) => `${glyph}=${label}`).join(" ")}`;
  }
  _payloadNeedsFileCodebook(payloadText) {
    return /₍\d+₎/.test(payloadText) || payloadText.includes(":L") || payloadText.includes("[NL]") || payloadText.includes("imp") || payloadText.includes("exp") || payloadText.includes("\u27F3");
  }
  _payloadTextForCodebook(messages = []) {
    return messages.filter((message) => message.role !== "system").map((message) => this._normalizeMessageContent(message.content)).join("\n");
  }
  _compressUserMessage(content, allUserText) {
    if (!content) return content;
    let c = this._applyPrivacyFirewall(this._normalizeMessageContent(content));
    if (this.intentDiffs) {
      c = this.compressIntentDiffs(c);
    }
    if (this.holographicFolding) {
      c = this._foldHolographicText(c);
    }
    c = this._normalizeWhitespaceOutsideCode(c);
    c = this._compressVerbosePhrases(c);
    if (this.level === "ultra" && this._allows("redundancyStrip")) {
      c = this._stripRedundancy(c);
    }
    if (this.level === "aggressive" && this._allows("codeMinify") || this.level === "ultra" && this._allows("codeSummary")) {
      c = this._compressCodeBlocks(c, allUserText);
    }
    if (this._allows("prompt")) c = this._compressPrompt(c);
    if (this._allows("tech")) c = this._compressTechNames(c);
    if (this._allows("files")) c = this._compressFilePaths(c);
    if (this.level === "light") {
      return this._allows("dynamic") ? this._applyDynamicDictionary(c) : c;
    }
    if (this._allows("diagnostics")) {
      c = this._compressErrors(c);
      c = this._compressDiagnostics(c);
    }
    if (this._allows("dynamic")) c = this._applyDynamicDictionary(c);
    return c;
  }
  _compressVerbosePhrases(text) {
    return this._applyOutsideCodeFences(text, (t) => this._compressVerbosePhrasesRaw(t));
  }
  _applyOutsideCodeFences(text, transform) {
    const fencePattern = /`{3,}\w*\n[\s\S]+?`{3,}/g;
    let result = "";
    let lastIndex = 0;
    for (const match of text.matchAll(fencePattern)) {
      const before = text.slice(lastIndex, match.index);
      result += transform(before) + match[0];
      lastIndex = match.index + match[0].length;
    }
    result += transform(text.slice(lastIndex));
    return result;
  }
  _compressVerbosePhrasesRaw(text) {
    return text.replace(/\bI need you to\b/gi, "").replace(/\bcan you (please )?/gi, "").replace(/\bplease\b/gi, "").replace(/\bthe following\b/gi, "this").replace(/\bin order to\b/gi, "to").replace(/\bas well as\b/gi, "&").replace(/\bmake sure (that )?/gi, "ensure ").replace(/\btake a look at\b/gi, "check").replace(/\bcould you\b/gi, "").replace(/\bI would like you to\b/gi, "").replace(/\bI want you to\b/gi, "").replace(/\bho bisogno che (tu )?/gi, "").replace(/\bpuoi (per favore )?/gi, "").replace(/\bper favore\b/gi, "").replace(/\bper cortesia\b/gi, "").replace(/\bvorrei che (tu )?/gi, "").replace(/\bpotresti\b/gi, "").replace(/\bdai un'?occhiata a\b/gi, "check").replace(/\bin modo da\b/gi, "per").replace(/\bmi serve che\b/gi, "").replace(/\bspiegami come\b/gi, "spiega").replace(/\bich m[öo]chte,? dass (du )?/gi, "").replace(/\bk[öo]nntest du (bitte )?/gi, "").replace(/\bbitte\b/gi, "").replace(/\bschau dir mal\b/gi, "check").replace(/\bich brauche,? dass\b/gi, "").replace(/\bum zu\b/gi, "zu").replace(/\bj'ai besoin que (tu )?/gi, "").replace(/\bpeux-tu (s'il te pla[iî]t )?/gi, "").replace(/\bs'il (te|vous) pla[iî]t\b/gi, "").replace(/\bje voudrais que (tu )?/gi, "").replace(/\bpourrais-tu\b/gi, "").replace(/\bjette un [œo]il [àa]\b/gi, "check").replace(/\bafin de\b/gi, "pour");
  }
  _stripRedundancy(text) {
    return text.replace(/\/\*(?!\*)[^]*?\*\//g, "").replace(/(?<![:"'])\/\/(?!\/).*/g, "").replace(/console\.(log|debug|info|trace)\([^)]*\);?/g, "");
  }
  _buildDynamicDictionary(text) {
    if (!this._allows("dynamic")) return;
    if (!text || this.dynamicDict.size >= this.providerProfile.maxDynamicEntries) return;
    const words = text.match(/\b[A-Za-z_][A-Za-z0-9_]{2,}\b/g) || [];
    const counts = /* @__PURE__ */ new Map();
    const stopWords = /* @__PURE__ */ new Set(["the", "and", "for", "with", "this", "that", "from", "true", "false", "null", "not", "are", "was", "has", "have", "been", "will", "can"]);
    for (const w of words) {
      if (stopWords.has(w.toLowerCase())) continue;
      if (/^(?:OPENAI_KEY|GITHUB_TOKEN|AWS_ACCESS_KEY|JWT|BEARER_TOKEN|SECRET_ASSIGNMENT|EMAIL|IPV4)_\d+$/.test(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
    const bigramPattern = /\b([A-Za-z_][A-Za-z0-9_]{2,})\s+([A-Za-z_][A-Za-z0-9_]{2,})\b/g;
    for (const match of text.matchAll(bigramPattern)) {
      const bigram = match[1] + " " + match[2];
      if (bigram.length >= 6 && !stopWords.has(match[1].toLowerCase()) && !stopWords.has(match[2].toLowerCase())) {
        counts.set(bigram, (counts.get(bigram) || 0) + 1);
      }
    }
    const savings = [...counts.entries()].map(([word, freq]) => {
      return { word, freq, save: freq * (word.length - 2) - (word.length + 2) };
    }).filter((x) => x.freq >= 2 && x.save > this.providerProfile.dynamicMinSavedChars).sort((a, b) => b.save - a.save);
    for (const item of savings) {
      if (!this.dynamicDict.has(item.word) && this.dynamicCounter < this.providerProfile.maxDynamicEntries) {
        const glyph = `\xA7${this.dynamicCounter + 1}`;
        this.dynamicDict.set(item.word, glyph);
        this.sourceMap.dynamic.push({
          glyph,
          original: item.word,
          frequency: item.freq,
          estimatedSavedChars: item.save,
          provider: this.provider,
          profile: this.providerProfile.strategy
        });
        this.dynamicCounter++;
      }
    }
  }
  // Delegates to the shared, measured implementation in
  // src/token-estimator.js (see estimateGlyphTokenCost there for the real
  // per-character-class calibration) rather than a second, independently
  // drifting copy of the same heuristic.
  _estimateGlyphTokenCost(glyph, charsPerToken) {
    return (0, import_token_estimator.estimateGlyphTokenCost)(glyph, charsPerToken);
  }
  _applyDynamicDictionary(text) {
    let result = text;
    const charsPerToken = import_token_estimator.PROVIDER_TOKEN_PROFILES[(0, import_token_estimator.normalizeProvider)(this.provider)].charsPerToken;
    for (const [word, glyph] of this.dynamicDict) {
      const origTokenCost = word.length / charsPerToken;
      const glyphTokenCost = this._estimateGlyphTokenCost(glyph, charsPerToken);
      if (this.provider !== "raw" && glyphTokenCost >= origTokenCost) continue;
      if (!this._dynRegexCache) this._dynRegexCache = /* @__PURE__ */ new Map();
      let regex = this._dynRegexCache.get(word);
      if (!regex) {
        regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
        this._dynRegexCache.set(word, regex);
      }
      regex.lastIndex = 0;
      result = result.replace(regex, (match, offset, input) => {
        const span = this._spanForRange(input, offset, offset + match.length);
        this._recordReplacement("dynamic", match, glyph, { span });
        this._recordSymbol(glyph, match, "dynamic", span);
        return glyph;
      });
    }
    return result;
  }
  _compressPrompt(text) {
    let result = text;
    for (const [pattern, replacement] of PROMPT_PATTERNS) {
      if (pattern.test(result)) {
        result = result.replace(pattern, (...args) => {
          const original = args[0];
          const groups = args.slice(1, -2);
          const offset = args[args.length - 2];
          const input = args[args.length - 1];
          const compressed = this._expandReplacement(replacement, groups);
          const span = this._spanForRange(input, offset, offset + original.length);
          this._recordReplacement("prompt", original, compressed, { span });
          this._recordSymbol(compressed.trim().split(/\s+/)[0], original, "prompt", span);
          return compressed;
        });
        break;
      }
    }
    return result;
  }
  _compressTechNames(text) {
    let result = text;
    const entries = Object.entries(TECH_GLYPHS).sort((a, b) => b[0].length - a[0].length);
    const charsPerToken = import_token_estimator.PROVIDER_TOKEN_PROFILES[(0, import_token_estimator.normalizeProvider)(this.provider)].charsPerToken;
    for (const [name, glyph] of entries) {
      let skip;
      if (this.provider === "openai" && MEASURED_TECH_GLYPH_TOKENS_OPENAI[name]) {
        const [wordCl, wordO2, glyphCl, glyphO2] = MEASURED_TECH_GLYPH_TOKENS_OPENAI[name];
        skip = glyphCl >= wordCl || glyphO2 >= wordO2;
      } else if (this.provider === "gemini" && MEASURED_TECH_GLYPH_TOKENS_GEMINI[name]) {
        const [wordTokens, glyphTokens] = MEASURED_TECH_GLYPH_TOKENS_GEMINI[name];
        skip = glyphTokens >= wordTokens;
      } else if (this.provider === "anthropic" && MEASURED_TECH_GLYPH_TOKENS_ANTHROPIC[name]) {
        const [wordTokens, glyphTokens] = MEASURED_TECH_GLYPH_TOKENS_ANTHROPIC[name];
        skip = glyphTokens >= wordTokens;
      } else {
        const origTokenCost = name.length / charsPerToken;
        const glyphTokenCost = this._estimateGlyphTokenCost(glyph, charsPerToken);
        skip = this.provider !== "raw" && glyphTokenCost >= origTokenCost;
      }
      if (skip) continue;
      if (!this._techRegexCache) this._techRegexCache = /* @__PURE__ */ new Map();
      let regex = this._techRegexCache.get(name);
      if (!regex) {
        regex = new RegExp(`\\b${name}\\b`, "gi");
        this._techRegexCache.set(name, regex);
      }
      regex.lastIndex = 0;
      result = result.replace(regex, (match, offset, input) => {
        const span = this._spanForRange(input, offset, offset + match.length);
        this._recordReplacement("tech", match, glyph, { span, canonical: name });
        this._recordSymbol(glyph, match, "tech", span, { canonical: name });
        return glyph;
      });
    }
    return result;
  }
  _compressFilePaths(text) {
    return text.replace(
      /(?:@[\w-]+\/)?(?:[\w\-./\\]+[\/\\])?[\w\-]+\.(tsx?|jsx?|py|rs|go|rb|java|cs|vue|svelte|css|scss|less|ya?ml|json|toml|md|sql|sh|bash|dockerfile|proto|graphql)/gi,
      (match, _extension, offset, input) => {
        const span = this._spanForRange(input, offset, offset + match.length);
        if (!this.fileIndex.has(match)) {
          this.fileCounter++;
          const domain = this._detectDomain(match);
          const glyph = DOMAIN_GLYPHS[domain] || "\u{1F4C4}";
          this.fileIndex.set(match, `${glyph}\u208D${this.fileCounter}\u208E`);
          this.sourceMap.files.push({
            ref: this.fileIndex.get(match),
            path: match,
            domain,
            span
          });
        }
        this._recordReplacement("file", match, this.fileIndex.get(match), { span });
        this._recordSymbol(this.fileIndex.get(match), match, "file", span);
        return this.fileIndex.get(match);
      }
    );
  }
  _compressErrors(text) {
    let result = text;
    for (const [pattern, replacement] of ERROR_PATTERNS) {
      result = result.replace(pattern, (...args) => {
        const original = args[0];
        const groups = args.slice(1, -2);
        const offset = args[args.length - 2];
        const input = args[args.length - 1];
        const compressed = this._expandReplacement(replacement, groups);
        const span = this._spanForRange(input, offset, offset + original.length);
        this.sourceMap.diagnostics.push({ original, compressed, pattern: pattern.source, span });
        this._recordReplacement("diagnostic", original, compressed, { span });
        this._recordSymbol(compressed, original, "diagnostic", span);
        return compressed;
      });
    }
    return result;
  }
  _expandReplacement(replacement, groups) {
    return replacement.replace(/\$(\d+)/g, (_, index) => groups[Number(index) - 1] || "");
  }
  _compressDiagnostics(text) {
    return text.replace(/error TS(\d+):/gi, "\u2717TS$1:").replace(/warning:/gi, "\u26A0:").replace(/\bat line (\d+)/gi, ":$1").replace(/on line (\d+)/gi, ":$1").replace(/\bline (\d+)/gi, ":$1").replace(/\bcolumn (\d+)/gi, "c$1");
  }
  // Whitespace normalization (collapsing runs of spaces/tabs, trimming
  // trailing whitespace, collapsing blank-line runs) used to run on the
  // WHOLE message before code-block processing, including the contents
  // of ```fenced``` code blocks. That silently flattened code
  // indentation — 4-space and 8-space nesting both collapsed to the
  // same single space/tab — destroying the visual structure a reader
  // relies on to understand nesting, and for indentation-significant
  // languages like Python, changing what the code actually does. It
  // also desynced every code-block span/offset recorded in the source
  // map from the caller's original text. Code fence contents are now
  // left untouched; only prose outside fences is normalized.
  _normalizeWhitespaceOutsideCode(text) {
    return this._applyOutsideCodeFences(text, (t) => this._normalizeWhitespace(t));
  }
  _normalizeWhitespace(text) {
    return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").replace(/[ \t]+$/gm, "");
  }
  _compressCodeBlocks(text, userPrompt) {
    return text.replace(/`{3,}(\w*)\n([\s\S]+?)`{3,}/g, (match, lang, code, offset, input) => {
      const lines = code.trim().split("\n");
      const span = this._spanForRange(input, offset, offset + match.length);
      const codeStartOffset = offset + match.indexOf("\n") + 1;
      const tokens = this._extractCodeBlockTokens(code, lang, input, codeStartOffset);
      if (this.level === "ultra" && this._allows("codeSummary")) {
        const summary = this._summarizeCode(lines, lang);
        const techGlyph = TECH_GLYPHS[lang] || "";
        const compressed = `[${techGlyph}${summary}]`;
        this.sourceMap.codeBlocks.push({
          mode: "summary",
          lang: lang || "text",
          originalLines: lines.length,
          originalChars: code.length,
          compressed,
          span,
          tokens
        });
        this.sourceMap.ast.push(...tokens.map((token) => ({ ...token, blockMode: "summary" })));
        this._recordReplacement("codeBlock", `\`\`\`${lang}
...
\`\`\``, compressed, { lang: lang || "text", mode: "summary", span });
        this._recordSymbol(compressed, `\`\`\`${lang}
...
\`\`\``, "codeBlock", span, { lang: lang || "text", mode: "summary" });
        return compressed;
      } else if (this._allows("codeMinify")) {
        let minified = this._minifySyntax(code, lang);
        minified = this._elideIrrelevantContext(minified, userPrompt);
        const compressed = "```" + lang + "\n" + minified + "\n```";
        this.sourceMap.codeBlocks.push({
          mode: "minified",
          lang: lang || "text",
          originalLines: lines.length,
          originalChars: code.length,
          compressedChars: minified.length,
          span,
          tokens
        });
        this.sourceMap.ast.push(...tokens.map((token) => ({ ...token, blockMode: "minified" })));
        return compressed;
      }
      return match;
    });
  }
  _extractCodeBlockTokens(code, lang, sourceText, codeStartOffset) {
    const l = (lang || "").toLowerCase();
    const tokens = [];
    const seen = /* @__PURE__ */ new Set();
    const addMatches = (pattern, kind, glyph, nameGroup = null) => {
      for (const match of code.matchAll(pattern)) {
        const original = match[0];
        const relativeOffset = match.index || 0;
        const key = `${kind}:${relativeOffset}:${original}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const span = this._spanForRange(sourceText, codeStartOffset + relativeOffset, codeStartOffset + relativeOffset + original.length);
        tokens.push({
          kind,
          original,
          glyph,
          lang: l || "text",
          name: nameGroup ? match[nameGroup] : void 0,
          span
        });
      }
    };
    if (["js", "jsx", "ts", "tsx", "javascript", "typescript"].includes(l) || !l) {
      addMatches(/\bimport\b/g, "import", "imp");
      addMatches(/\bexport\b/g, "export", "exp");
      addMatches(/\bfunction\s+([A-Za-z_$][\w$]*)/g, "function", "\u0192", 1);
      addMatches(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)/g, "declaration", "\u25C7", 1);
      addMatches(/\bclass\s+([A-Za-z_$][\w$]*)/g, "class", "\u{1D49E}", 1);
      addMatches(/(?:\([^()]*\)|\b[A-Za-z_$][\w$]*)\s*=>/g, "arrowFunction", "\u0192=>");
      addMatches(/\b(?!function\b|if\b|for\b|while\b|switch\b|catch\b|return\b)([A-Za-z_$][\w$]*)\s*\(/g, "call", "\u27D0", 1);
      addMatches(/\b(?:const|let|var)\s*(\{[^{}=]+\}|\[[^\[\]=]+\])\s*=/g, "destructure", "\u21C8", 1);
    }
    if (["py", "python"].includes(l) || !l) {
      addMatches(/\b(?:import|from)\b/g, "import", "imp");
      addMatches(/\bdef\s+([A-Za-z_][\w]*)/g, "function", "\u0192", 1);
      addMatches(/\bclass\s+([A-Za-z_][\w]*)/g, "class", "\u{1D49E}", 1);
      addMatches(/\bself\./g, "receiver", "s.");
      addMatches(/\blambda\b/g, "arrowFunction", "\u0192=>");
    }
    if (["rs", "rust"].includes(l) || !l) {
      addMatches(/\buse\b/g, "import", "imp");
      addMatches(/\bfn\s+([A-Za-z_][\w]*)/g, "function", "\u0192", 1);
      addMatches(/\bstruct\s+([A-Za-z_][\w]*)/g, "class", "\u{1D49E}", 1);
      addMatches(/\b(?:pub|mut|impl|match)\b/g, "modifier", "mod");
    }
    if (["go", "golang"].includes(l) || !l) {
      addMatches(/\bimport\b/g, "import", "imp");
      addMatches(/\bfunc\s+(?:\([^)]+\)\s+)?([A-Za-z_][\w]*)/g, "function", "\u0192", 1);
      addMatches(/\btype\s+([A-Za-z_][\w]*)\s+struct\b/g, "class", "\u{1D49E}", 1);
      addMatches(/\bpackage\b/g, "package", "pkg");
    }
    if (["java", "cs", "csharp"].includes(l) || !l) {
      addMatches(/\b(?:import|using)\b/g, "import", "imp");
      addMatches(/\bclass\s+([A-Za-z_][\w]*)/g, "class", "\u{1D49E}", 1);
      addMatches(/\b(?:public|private|protected)\b/g, "visibility", "vis");
      addMatches(/\bvoid\b/g, "type", "\u25C7t");
    }
    if (["c", "cpp", "c++", "h", "hpp"].includes(l) || !l) {
      addMatches(/#include\b/g, "import", "imp");
      addMatches(/\b(?:int|void|char|float|double|long|short)\b/g, "type", "\u25C7t");
    }
    if (["rb", "ruby"].includes(l) || !l) {
      addMatches(/\brequire(?:_relative)?\b/g, "import", "imp");
      addMatches(/\bdef\s+([A-Za-z_][\w?!]*)/g, "function", "\u0192", 1);
      addMatches(/\bclass\s+([A-Za-z_][\w]*)/g, "class", "\u{1D49E}", 1);
      addMatches(/\bmodule\s+([A-Za-z_][\w]*)/g, "class", "\u{1D49E}", 1);
      addMatches(/\battr_(?:accessor|reader|writer)\b/g, "declaration", "\u25C7");
    }
    if (["swift"].includes(l) || !l) {
      addMatches(/\bimport\b/g, "import", "imp");
      addMatches(/\bfunc\s+([A-Za-z_][\w]*)/g, "function", "\u0192", 1);
      addMatches(/\b(?:class|struct|enum|protocol)\s+([A-Za-z_][\w]*)/g, "class", "\u{1D49E}", 1);
      addMatches(/\b(?:var|let)\s+([A-Za-z_][\w]*)/g, "declaration", "\u25C7", 1);
      addMatches(/\bguard\b/g, "modifier", "mod");
    }
    if (["kt", "kotlin"].includes(l) || !l) {
      addMatches(/\bimport\b/g, "import", "imp");
      addMatches(/\bfun\s+([A-Za-z_][\w]*)/g, "function", "\u0192", 1);
      addMatches(/\b(?:class|object|interface)\s+([A-Za-z_][\w]*)/g, "class", "\u{1D49E}", 1);
      addMatches(/\b(?:val|var)\s+([A-Za-z_][\w]*)/g, "declaration", "\u25C7", 1);
    }
    if (["php"].includes(l) || !l) {
      addMatches(/\b(?:require|include)(?:_once)?\b/g, "import", "imp");
      addMatches(/\bfunction\s+([A-Za-z_][\w]*)/g, "function", "\u0192", 1);
      addMatches(/\bclass\s+([A-Za-z_][\w]*)/g, "class", "\u{1D49E}", 1);
      addMatches(/\$[A-Za-z_][\w]*/g, "variable", "\u25C7");
    }
    addMatches(/\breturn\b/g, "return", "\u2192");
    addMatches(/\byield\b/g, "yield", "\u2192");
    addMatches(/\b(?:async|await)\b/g, "async", "\u27FF");
    addMatches(/\b(?:try|catch|throw|finally|except|rescue)\b/g, "exception", "\u26A0");
    return tokens.sort((a, b) => a.span.start.offset - b.span.start.offset);
  }
  _elideIrrelevantContext(code, userPrompt) {
    if (!userPrompt || userPrompt.length < 5) return code;
    const intentKeywords = (userPrompt.match(/\b[A-Za-z0-9_]{3,}\b/g) || []).map((w) => w.toLowerCase());
    if (intentKeywords.length === 0) return code;
    let result = code;
    const blockRegex = /^([ \t]*)(?:(?:export|public|private|async|static)\s+)*(?:function|class|def|fn|func|struct)\s+([A-Za-z0-9_]+)[^{]*\{([\s\S]*?)\n\1\}/gm;
    result = result.replace(blockRegex, (match, indent, name, body) => {
      const lowerMatch = match.toLowerCase();
      const isRelevant = intentKeywords.some((kw) => lowerMatch.includes(kw));
      if (!isRelevant && body.split("\n").length > 5) {
        const signature = match.substring(0, match.indexOf("{") + 1);
        return `${signature} \u2702 }`;
      }
      return match;
    });
    return result;
  }
  // Skips a keyword->glyph minification when the current provider's
  // measured-cost table (MEASURED_CODE_KEYWORD_TOKENS_OPENAI/_GEMINI/
  // _ANTHROPIC) shows it is a net token loss; applies unconditionally for
  // local/raw, which don't have their own calibration pass yet, matching
  // _compressTechNames()'s established breakeven pattern.
  _minifyReplace(text, key, glyph, pattern) {
    if (this.provider === "openai") {
      const measured = MEASURED_CODE_KEYWORD_TOKENS_OPENAI[key];
      if (measured) {
        const [wordCl, wordO2, glyphCl, glyphO2] = measured;
        if (glyphCl >= wordCl || glyphO2 >= wordO2) return text;
      }
    } else if (this.provider === "gemini") {
      const measured = MEASURED_CODE_KEYWORD_TOKENS_GEMINI[key];
      if (measured) {
        const [wordTokens, glyphTokens] = measured;
        if (glyphTokens >= wordTokens) return text;
      }
    } else if (this.provider === "anthropic") {
      const measured = MEASURED_CODE_KEYWORD_TOKENS_ANTHROPIC[key];
      if (measured) {
        const [wordTokens, glyphTokens] = measured;
        if (glyphTokens >= wordTokens) return text;
      }
    }
    return text.replace(pattern, glyph);
  }
  _minifySyntax(code, lang) {
    if (!code) return code;
    let c = code;
    const l = (lang || "").toLowerCase();
    if (["js", "jsx", "ts", "tsx", "javascript", "typescript", "java", "cs", "csharp", "c", "cpp", "c++", "h", "hpp", "go", "golang", "rs", "rust"].includes(l) || !l) {
      c = c.replace(/\/\/.*$/gm, "");
      c = c.replace(/\/\*[\s\S]*?\*\//g, "");
    }
    if (["py", "python", "rb", "ruby", "sh", "bash", "yaml", "yml"].includes(l) || !l) {
      c = c.replace(/(?<!['"])\s*#.*$/gm, "");
    }
    if (["html", "xml", "vue", "svelte"].includes(l) || !l) {
      c = c.replace(/<!--[\s\S]*?-->/g, "");
    }
    if (["css", "scss", "less"].includes(l) || !l) {
      c = c.replace(/\/\*[\s\S]*?\*\//g, "");
    }
    c = this._minifyReplace(c, "return", "\u2192", /\breturn\b/g);
    c = c.replace(/^\s*[\r\n]/gm, "");
    if (["js", "jsx", "ts", "tsx", "javascript", "typescript"].includes(l) || !l) {
      c = this._minifyReplace(c, "function", "\u0192", /\bfunction\b/g);
      c = this._minifyReplace(c, "const", "\u25C7", /\bconst\b/g);
      c = this._minifyReplace(c, "let", "\u25C7", /\blet\b/g);
      c = this._minifyReplace(c, "import", "imp", /\bimport\b/g);
      c = this._minifyReplace(c, "export", "exp", /\bexport\b/g);
    }
    if (["py", "python"].includes(l) || !l) {
      c = this._minifyReplace(c, "def", "\u0192", /\bdef\b/g);
      c = this._minifyReplace(c, "class", "\u{1D49E}", /\bclass\b/g);
      c = this._minifyReplace(c, "import", "imp", /\bimport\b/g);
      c = this._minifyReplace(c, "from", "imp", /\bfrom\b/g);
      c = this._minifyReplace(c, "yield", "\u2192", /\byield\b/g);
      c = this._minifyReplace(c, "self.", "s.", /\bself\.\b/g);
    }
    if (["c", "cpp", "c++", "h", "hpp"].includes(l) || !l) {
      c = this._minifyReplace(c, "#include", "imp", /#include/g);
      c = this._minifyReplace(c, "void", "\u25C7t", /\b(?:int|void|char|float|double|long|short)\b/g);
    }
    if (["rs", "rust"].includes(l) || !l) {
      c = this._minifyReplace(c, "fn", "\u0192", /\bfn\b/g);
      c = this._minifyReplace(c, "pub", "+", /\bpub\b/g);
      c = this._minifyReplace(c, "mut", "m", /\bmut\b/g);
      c = this._minifyReplace(c, "impl", "I", /\bimpl\b/g);
      c = this._minifyReplace(c, "struct", "\u{1D49E}", /\bstruct\b/g);
      c = this._minifyReplace(c, "use", "imp", /\buse\b/g);
      c = this._minifyReplace(c, "match", "?", /\bmatch\b/g);
    }
    if (["go", "golang"].includes(l) || !l) {
      c = this._minifyReplace(c, "func", "\u0192", /\bfunc\b/g);
      c = this._minifyReplace(c, "package", "pkg", /\bpackage\b/g);
      c = this._minifyReplace(c, "import", "imp", /\bimport\b/g);
      c = this._minifyReplace(c, "type", "\u25C7t", /\btype\b/g);
      c = this._minifyReplace(c, "struct", "\u{1D49E}", /\bstruct\b/g);
    }
    if (["java", "cs", "csharp"].includes(l) || !l) {
      c = this._minifyReplace(c, "public", "+", /\bpublic\b/g);
      c = this._minifyReplace(c, "private", "-", /\bprivate\b/g);
      c = this._minifyReplace(c, "protected", "#", /\bprotected\b/g);
      c = this._minifyReplace(c, "class", "\u{1D49E}", /\bclass\b/g);
      c = this._minifyReplace(c, "import", "imp", /\bimport\b/g);
      c = this._minifyReplace(c, "using", "imp", /\busing\b/g);
      c = this._minifyReplace(c, "void", "\u25C7t", /\bvoid\b/g);
    }
    c = c.replace(/^[ \t]+/gm, (match) => {
      const spaces = match.replace(/\t/g, "    ").length;
      return "	".repeat(Math.max(1, Math.floor(spaces / 2)));
    });
    return c;
  }
  _summarizeCode(lines, lang) {
    const parts = [];
    let imports = 0, funcs = 0, classes = 0, hooks = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^(?:import|from|use|using)\s/.test(t) || /^#include/.test(t)) imports++;
      if (/(?:function |const \w+\s*=\s*(?:\(|async ))/.test(t) || /^\s*def\s+\w+/.test(t) || /^\s*(?:pub\s+)?(?:async\s+)?fn\s+\w+/.test(t) || /^\s*func\s+(?:\([^)]+\)\s+)?\w+/.test(t) || /^\s*(?:public|private|protected|static|virtual|override|async|inline)*\s*[\w<>\[\]]+\s+\w+\s*\(/.test(t) && !t.includes(";") && !t.includes("new ")) {
        funcs++;
      }
      if (/^(?:export\s+|public\s+|private\s+|pub\s+)?(?:class|struct|interface|trait|type\s+\w+\s+struct)\b/.test(t)) classes++;
      if (/^const\s+\[.*\]\s*=\s*use[A-Z]\w+/.test(t) || /^use[A-Z]\w+\(/.test(t)) hooks++;
    }
    if (imports) parts.push(`imp:${imports}`);
    if (funcs) parts.push(`\u0192:${funcs}`);
    if (classes) parts.push(`\u{1D49E}:${classes}`);
    if (hooks) parts.push(`\u27F3:${hooks}`);
    parts.push(`${lines.length}L`);
    return parts.join(" ");
  }
  _detectDomain(filepath) {
    const p = filepath.toLowerCase();
    if (/\.(tsx|jsx)$/.test(p) || /component|page|layout/i.test(p)) return "frontend";
    if (/\.(controller|service|middleware|route)\./i.test(p)) return "backend";
    if (/\.(test|spec)\./i.test(p)) return "testing";
    if (/dockerfile|docker-compose|\.ya?ml$/i.test(p)) return "devops";
    if (/migration|schema|seed/i.test(p)) return "database";
    if (/\.md$/.test(p)) return "documentation";
    if (/security|auth|guard/i.test(p)) return "security";
    return "language";
  }
  _estimateTokens(messages, provider = "raw") {
    return (0, import_token_estimator.estimateProviderTokens)(messages, provider);
  }
  _indexFile(filepath) {
    if (this.fileIndex.has(filepath)) {
      return this.fileIndex.get(filepath);
    }
    this.fileCounter++;
    const domain = this._detectDomain(filepath);
    const glyph = DOMAIN_GLYPHS[domain] || "\u{1F4C4}";
    const ref = `${glyph}\u208D${this.fileCounter}\u208E`;
    this.fileIndex.set(filepath, ref);
    this.sourceMap.files.push({
      ref,
      path: filepath,
      domain
    });
    return ref;
  }
  _detectLang(filepath) {
    const ext = filepath.split(".").pop()?.toLowerCase();
    const langMap = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      rs: "rust",
      go: "go",
      java: "java",
      cs: "csharp",
      rb: "ruby",
      swift: "swift"
    };
    return langMap[ext] || ext;
  }
  _analyzeStructure(lines, lang) {
    const parts = [];
    let imports = 0, functions = 0, classes = 0, exports2 = 0;
    let hooks = 0, states = 0, effects = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^import\s/.test(trimmed)) imports++;
      if (/^export\s/.test(trimmed)) exports2++;
      if (/(?:function|const\s+\w+\s*=\s*(?:\([^)]*\)|[^=])\s*=>)/.test(trimmed)) functions++;
      if (/^class\s/.test(trimmed)) classes++;
      if (/useState/.test(trimmed)) states++;
      if (/useEffect/.test(trimmed)) effects++;
      if (/use[A-Z]\w+/.test(trimmed)) hooks++;
    }
    if (imports) parts.push(`imp:${imports}`);
    if (functions) parts.push(`\u0192:${functions}`);
    if (classes) parts.push(`\u{1D49E}:${classes}`);
    if (exports2) parts.push(`exp:${exports2}`);
    if (states) parts.push(`\u25C7:${states}`);
    if (effects) parts.push(`\u27FF:${effects}`);
    if (hooks) parts.push(`\u27F3:${hooks}`);
    parts.push(`${lines.length}L`);
    return `[${parts.join(" ")}]`;
  }
  compressFile(file) {
    const ref = this._indexFile(file.path);
    const lang = this._detectLang(file.path);
    const techGlyph = TECH_GLYPHS[lang] || "";
    if (!file.content) {
      return `${ref}${techGlyph}`;
    }
    const lines = file.content.split("\n");
    const structure = this._analyzeStructure(lines, lang);
    return `${ref}${techGlyph} ${structure}`;
  }
  foldHolographicContext(files) {
    if (!files || files.length === 0) return "";
    const independentFiles = [];
    const fileImports = /* @__PURE__ */ new Map();
    for (const file of files) {
      const imports = [];
      const lines = file.content ? file.content.split("\n") : [];
      for (const line of lines) {
        const importMatch = line.match(/from\s+['"]\.\.?\/(.+)['"]/);
        if (importMatch) {
          imports.push(importMatch[1].split("/").pop());
        }
      }
      fileImports.set(file.path.split("/").pop(), imports);
    }
    const visited = /* @__PURE__ */ new Set();
    const foldedBlocks = [];
    for (const file of files) {
      const name = file.path.split("/").pop();
      if (visited.has(name)) continue;
      const group = [file];
      visited.add(name);
      for (const other of files) {
        const otherName = other.path.split("/").pop();
        if (visited.has(otherName)) continue;
        const importsOther = fileImports.get(name)?.some((imp) => otherName.includes(imp));
        const otherImportsThis = fileImports.get(otherName)?.some((imp) => name.includes(imp));
        if (importsOther || otherImportsThis) {
          group.push(other);
          visited.add(otherName);
        }
      }
      if (group.length > 1) {
        foldedBlocks.push(this._foldGroup(group));
      } else {
        independentFiles.push(file);
      }
    }
    const normalCompressed = independentFiles.map((f) => this.compressFile(f));
    return [...foldedBlocks, ...normalCompressed].filter(Boolean).join("\n");
  }
  _foldGroup(group) {
    const baseImports = /* @__PURE__ */ new Set();
    const fileOverlays = [];
    for (const file of group) {
      const ref = this._indexFile(file.path);
      const lang = this._detectLang(file.path);
      const techGlyph = TECH_GLYPHS[lang] || "";
      const lines = file.content ? file.content.split("\n") : [];
      const nonImportLines = [];
      for (const line of lines) {
        if (/^import\s/.test(line.trim())) {
          baseImports.add(line.trim());
        } else {
          nonImportLines.push(line);
        }
      }
      const struct = this._analyzeStructure(nonImportLines, lang);
      fileOverlays.push(`${ref}${techGlyph} ${struct}`);
    }
    const compressedImports = [...baseImports].map((imp) => this._compressTechNames(imp)).join(" | ");
    return `\u27E6Base: ${compressedImports}\u27E7 \u21B7 [${fileOverlays.join(" \u21B7 ")}]`;
  }
  compressIntentDiffs(text) {
    if (!text) return text;
    const lines = text.split("\n");
    let inDiff = false;
    const resultLines = [];
    let currentFile = "";
    let actions = [];
    let originalDiffLinesCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const fileHeaderMatch = line.match(/^(?:--- a\/|\+\+\+ b\/|diff --git a\/)(\S+)/);
      if (fileHeaderMatch) {
        if (actions.length > 0 || originalDiffLinesCount > 0) {
          resultLines.push(this._formatIntentActions(actions, originalDiffLinesCount, currentFile));
          actions = [];
          originalDiffLinesCount = 0;
        }
        currentFile = fileHeaderMatch[1];
        inDiff = true;
        continue;
      }
      if (line.startsWith("@@")) {
        inDiff = true;
        continue;
      }
      if (inDiff) {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          originalDiffLinesCount++;
          const added = line.slice(1).trim();
          if (added) {
            const parsed = this._parseDiffLine("add", added, currentFile);
            if (parsed) actions.push(parsed);
          }
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          originalDiffLinesCount++;
          const removed = line.slice(1).trim();
          if (removed) {
            const parsed = this._parseDiffLine("remove", removed, currentFile);
            if (parsed) actions.push(parsed);
          }
        } else if (!line.startsWith(" ") && trimmed.length > 0 && !line.startsWith("+") && !line.startsWith("-") && !line.startsWith("\\")) {
          inDiff = false;
        }
      }
      if (!inDiff) {
        if (actions.length > 0 || originalDiffLinesCount > 0) {
          resultLines.push(this._formatIntentActions(actions, originalDiffLinesCount, currentFile));
          actions = [];
          originalDiffLinesCount = 0;
        }
        resultLines.push(line);
      }
    }
    if (actions.length > 0 || originalDiffLinesCount > 0) {
      resultLines.push(this._formatIntentActions(actions, originalDiffLinesCount, currentFile));
    }
    return resultLines.join("\n");
  }
  _parseDiffLine(type, code, filepath) {
    const fileRef = filepath ? this._indexFile(filepath) : "";
    const actionGlyph = type === "add" ? "\u25B2" : "\u25BC";
    if (/^import\s+.*from\s+['"](.+)['"]/.test(code)) {
      const match = code.match(/^import\s+(.*?)\s+from\s+['"](.+)['"]/);
      if (match) return { fileRef, actionGlyph, type: "imp", symbol: match[1].trim(), detail: match[2] };
    }
    if (/class\s+(\w+)/.test(code)) {
      const match = code.match(/class\s+(\w+)/);
      if (match) return { fileRef, actionGlyph, type: "class", symbol: match[1] };
    }
    if (/(?:async\s+)?function\s+(\w+)/.test(code) || /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/.test(code)) {
      const match = code.match(/(?:async\s+)?(?:function\s+)?(\w+)\s*\(/);
      if (match) return { fileRef, actionGlyph, type: "func", symbol: match[1] };
    }
    return null;
  }
  _formatIntentActions(actions, originalDiffLinesCount = 0, filepath = "") {
    if (actions.length === 0) {
      const fileRef = filepath ? this._indexFile(filepath) : "\u25C8";
      return `\u26A1: ${fileRef} \xB1${originalDiffLinesCount}L`;
    }
    const formatted = actions.map((act) => {
      const detail = act.detail ? ` (${act.detail})` : "";
      return `${act.fileRef} ${act.actionGlyph}${act.type === "imp" ? "\u{1F4E6}" : act.type === "class" ? "\u{1D49E}" : "\u0192"} ${act.symbol}${detail}`;
    });
    return `\u26A1: ${formatted.join(" | ")}`;
  }
  _foldHolographicText(text) {
    if (!text) return text;
    const fileBlockRegex = /(?:(?:File|Path|Source):\s*)?((?:[a-zA-Z]:)?[A-Za-z0-9_\-\.\/\\\\]+\.[a-zA-Z0-9]+)\s*[\r\n]+`{3,}(\w*)\n([\s\S]+?)`{3,}/gi;
    const matches = [];
    let match;
    while ((match = fileBlockRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        path: match[1],
        lang: match[2],
        content: match[3],
        raw: match[0]
      });
    }
    if (matches.length === 0) return text;
    const fileImports = /* @__PURE__ */ new Map();
    for (const m of matches) {
      const imports = [];
      const lines = m.content ? m.content.split("\n") : [];
      for (const line of lines) {
        const importMatch = line.match(/from\s+['"]\.\.?\/(.+)['"]/);
        if (importMatch) {
          imports.push(importMatch[1].split("/").pop());
        }
      }
      fileImports.set(m.path.split("/").pop(), imports);
    }
    const visited = /* @__PURE__ */ new Set();
    const groups = [];
    for (const m of matches) {
      const name = m.path.split("/").pop();
      if (visited.has(name)) continue;
      const group = [m];
      visited.add(name);
      for (const other of matches) {
        const otherName = other.path.split("/").pop();
        if (visited.has(otherName)) continue;
        const importsOther = fileImports.get(name)?.some((imp) => otherName.includes(imp));
        const otherImportsThis = fileImports.get(otherName)?.some((imp) => name.includes(imp));
        if (importsOther || otherImportsThis) {
          group.push(other);
          visited.add(otherName);
        }
      }
      groups.push(group);
    }
    const replacements = /* @__PURE__ */ new Map();
    for (const group of groups) {
      if (group.length === 1) {
        const m = group[0];
        const compressedFile = this.compressFile({ path: m.path, content: m.content });
        replacements.set(m, compressedFile);
      } else {
        const foldedBlock = this._foldGroup(group.map((m) => ({ path: m.path, content: m.content })));
        replacements.set(group[0], foldedBlock);
        for (let i = 1; i < group.length; i++) {
          replacements.set(group[i], "");
        }
      }
    }
    let lastIndex = 0;
    let result = "";
    const sortedMatches = [...matches].sort((a, b) => a.index - b.index);
    for (const m of sortedMatches) {
      result += text.substring(lastIndex, m.index);
      result += replacements.get(m);
      lastIndex = m.index + m.length;
    }
    result += text.substring(lastIndex);
    return result;
  }
};
function wrapOpenAI(client, options = {}) {
  const compressor = new GlyphCompressor(options);
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);
  client.chat.completions.create = async function(params) {
    const { messages: compressed, stats } = compressor.compressMessages(
      params.messages,
      "openai"
    );
    console.log(`[GlyphCompress] ${stats.thisMessage.ratio} compression (${stats.thisMessage.savedPct} saved)`);
    return originalCreate({ ...params, messages: compressed });
  };
  client._glyphCompress = compressor;
  return client;
}
function wrapAnthropic(client, options = {}) {
  const compressor = new GlyphCompressor(options);
  const originalCreate = client.messages.create.bind(client.messages);
  client.messages.create = async function(params) {
    const anthropicPayload = compressor._prepareAnthropicPayload(params.system, params.messages);
    const result = await originalCreate({
      ...params,
      system: anthropicPayload.system,
      messages: anthropicPayload.messages
    });
    return result;
  };
  client._glyphCompress = compressor;
  return client;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GlyphCompressor,
    wrapOpenAI,
    wrapAnthropic,
    CODEBOOK_PROMPT,
    DOMAIN_GLYPHS,
    TECH_GLYPHS,
    PROVIDER_COMPRESSION_PROFILES,
    TRUST_POLICY_PROFILES,
    selectCompressionLevel,
    planCompressionForBudget,
    buildTrustWarnings
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CODEBOOK_PROMPT,
  DOMAIN_GLYPHS,
  GlyphCompressor,
  PROVIDER_COMPRESSION_PROFILES,
  TECH_GLYPHS,
  TRUST_POLICY_PROFILES,
  buildTrustWarnings,
  planCompressionForBudget,
  selectCompressionLevel,
  wrapAnthropic,
  wrapOpenAI
});
