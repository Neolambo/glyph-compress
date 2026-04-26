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
var glyph_middleware_exports = {};
__export(glyph_middleware_exports, {
  CODEBOOK_PROMPT: () => CODEBOOK_PROMPT,
  DOMAIN_GLYPHS: () => DOMAIN_GLYPHS,
  GlyphCompressor: () => GlyphCompressor,
  TECH_GLYPHS: () => TECH_GLYPHS,
  wrapAnthropic: () => wrapAnthropic,
  wrapOpenAI: () => wrapOpenAI
});
module.exports = __toCommonJS(glyph_middleware_exports);
var import_token_estimator = require("../src/token-estimator.cjs");
var import_node_crypto = require("node:crypto");
const DOMAIN_GLYPHS = {
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
const TECH_GLYPHS = {
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
const ERROR_PATTERNS = [
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
const PROMPT_PATTERNS = [
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
const PRIVACY_REDACTION_PATTERNS = [
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
const CODEBOOK_PROMPT = `[GLYPH PROTOCOL v0.5]
Context uses compressed glyphs. Decode:
DOM: \u25C8=frontend \u25C9=ai_ml \u25CA=devops \u25C6=database \u25C7=lang \u2295=auto \u2297=arch \u2299=mobile \u2298=cloud \u229A=data \u229B=test \u229C=backend \u229D=security \u229E=docs \u229F=perf \u22A0=net
TECH: \u1D57=TS \u02B2\u02E2=JS \u1D56=Py \u02B3=Rust \u1D4D=Go \u211C=React \u2115=Next \u{1D54D}=Vue \u{1D49F}=Docker \u{1D4A6}=K8s \u{1D4AF}=Terraform \u2119=PG \u1D63=Redis \u2112=LLM \u03B1=Agent
SYM: \u2717=err \u26A0=warn \u2209=type_err \u2205=missing \u2192=return/yield \u0192=function/def/fn \u{1D49E}=class/struct \u25C7=var/const/let \u25C7t=type/int/void \u27FF=effect \u2E8C=fix \u2E8B=perf \u2E8E=review \u2E83=debug \u2E8F=deploy \u25B2=create \u25CF=refactor \u25BA=test \u25A0=doc
MOD: +=pub/public -=private #=protected m=mut I=impl ?=match pkg=package s.=self.
FILE: \u208DN\u208E=file_index :L=line [NL]=line_count imp=imports exp=exports \u27F3=hooks
Respond normally. Context below uses these glyphs for brevity.
[/GLYPH]`;
class GlyphCompressor {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.level = options.level || "standard";
    this.fileIndex = /* @__PURE__ */ new Map();
    this.fileCounter = 0;
    this.dynamicDict = /* @__PURE__ */ new Map();
    this.dynamicCounter = 0;
    this.privacyFirewall = options.privacyFirewall === true || options.privacy === true;
    this.privacyTokens = /* @__PURE__ */ new Map();
    this.privacyCounter = 0;
    this.sourceMap = this._createSourceMap();
    this.stats = {
      totalOriginalTokens: 0,
      totalCompressedTokens: 0,
      messagesProcessed: 0,
      sessionStarted: Date.now()
    };
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
  compressMessages(messages, provider = "auto") {
    if (!this.enabled) return { messages, stats: this.stats };
    this.resetSourceMap();
    const allUserText = messages.filter((m) => m.role === "user").map((m) => this._normalizeMessageContent(m.content)).join("\n");
    const safeUserText = this._applyPrivacyFirewall(allUserText, false);
    this._buildDynamicDictionary(safeUserText);
    const compressed = [];
    let codebookInjected = false;
    for (const msg of messages) {
      if (msg.role === "system") {
        compressed.push({
          role: "system",
          content: this._injectCodebook(msg.content, provider)
        });
        codebookInjected = true;
      } else if (msg.role === "user") {
        compressed.push({
          role: "user",
          content: this._compressUserMessage(msg.content, safeUserText)
        });
      } else {
        compressed.push(msg);
      }
    }
    if (!codebookInjected) {
      compressed.unshift({
        role: "system",
        content: CODEBOOK_PROMPT
      });
    }
    const origTokens = this._estimateTokens(messages, provider);
    const compTokens = this._estimateTokens(compressed, provider);
    this.stats.totalOriginalTokens += origTokens;
    this.stats.totalCompressedTokens += compTokens;
    this.stats.messagesProcessed++;
    return {
      messages: compressed,
      sourceMap: this.getSourceMap(),
      stats: {
        ...this.stats,
        thisMessage: {
          originalTokens: origTokens,
          compressedTokens: compTokens,
          saved: origTokens - compTokens,
          ratio: (origTokens / Math.max(1, compTokens)).toFixed(1) + "x",
          savedPct: ((1 - compTokens / Math.max(1, origTokens)) * 100).toFixed(0) + "%"
        }
      }
    };
  }
  /**
   * Compress a standalone context string (for Antigravity/skill usage).
   * @param {string} text - Raw context text
   * @returns {Object} { compressed, original, stats }
   */
  compressText(text) {
    if (!this.enabled) return { compressed: text, original: text, stats: {} };
    this.resetSourceMap();
    const safeText = this._applyPrivacyFirewall(text, false);
    this._buildDynamicDictionary(safeText);
    const compressed = this._compressUserMessage(text, safeText);
    const origTokens = this._estimateTokens([{ content: text }], "raw");
    const compTokens = this._estimateTokens([{ content: compressed }], "raw");
    this.stats.totalOriginalTokens += origTokens;
    this.stats.totalCompressedTokens += compTokens;
    this.stats.messagesProcessed++;
    return {
      compressed,
      original: text,
      sourceMap: this.getSourceMap(),
      stats: {
        originalTokens: origTokens,
        compressedTokens: compTokens,
        ratio: (origTokens / Math.max(1, compTokens)).toFixed(1) + "x",
        savedPct: ((1 - compTokens / Math.max(1, origTokens)) * 100).toFixed(0) + "%"
      }
    };
  }
  /**
   * Get the codebook system prompt to inject.
   */
  getCodebookPrompt() {
    let prompt = CODEBOOK_PROMPT;
    if (this.fileIndex.size > 0) {
      const files = [...this.fileIndex].map(([path, ref]) => `${ref}=${path}`).join(" | ");
      prompt = prompt.replace("[/GLYPH]", `FILES: ${files}
[/GLYPH]`);
    }
    return prompt;
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
    const sourceMap = JSON.parse(JSON.stringify(this.sourceMap));
    const knownFileRefs = new Set(sourceMap.files.map((file) => file.ref));
    for (const [path, ref] of this.fileIndex) {
      if (!knownFileRefs.has(ref)) {
        sourceMap.files.push({ ref, path, domain: this._detectDomain(path) });
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
      symbols: sourceMap.symbols,
    };
  }
  resetSourceMap() {
    this.sourceMap = this._createSourceMap();
  }
  // ─── INTERNAL METHODS ──────────────────────────────────────
  _createSourceMap() {
    return {
      version: "1.6.0",
      level: this.level,
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
  _recordReplacement(kind, original, compressed, extra = {}) {
    if (!original || original === compressed) return;
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
    if (!this.privacyFirewall || !text) return text;
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
  _injectCodebook(systemPrompt, provider) {
    if (systemPrompt.includes("[GLYPH PROTOCOL")) return systemPrompt;
    let modifiedCodebook = CODEBOOK_PROMPT;
    if (this.dynamicDict.size > 0) {
      const dyn = [...this.dynamicDict].map(([w, g]) => `${g}=${w}`).join(" | ");
      modifiedCodebook = modifiedCodebook.replace("[/GLYPH]", `DYN: ${dyn}
[/GLYPH]`);
    }
    return modifiedCodebook + "\n\n" + systemPrompt;
  }
  _compressUserMessage(content, allUserText) {
    if (!content) return content;
    let c = this._applyPrivacyFirewall(this._normalizeMessageContent(content));
    if (this.level === "ultra") {
      c = this._stripRedundancy(c);
    }
    if (this.level === "aggressive" || this.level === "ultra") {
      c = this._compressCodeBlocks(c, allUserText);
    }
    c = this._compressPrompt(c);
    c = this._compressTechNames(c);
    if (this.level === "light") {
      return this._applyDynamicDictionary(c);
    }
    c = this._compressFilePaths(c);
    c = this._compressErrors(c);
    c = this._compressDiagnostics(c);
    c = this._applyDynamicDictionary(c);
    return c;
  }
  _stripRedundancy(text) {
    return text.replace(/\/\*(?!\*)[^]*?\*\//g, "").replace(/(?<![:"'])\/\/(?!\/).*/g, "").replace(/console\.(log|debug|info|trace)\([^)]*\);?/g, "");
  }
  _buildDynamicDictionary(text) {
    if (!text || this.dynamicDict.size >= 60) return;
    const words = text.match(/\b[A-Za-z_][A-Za-z0-9_]{3,}\b/g) || [];
    const counts = /* @__PURE__ */ new Map();
    for (const w of words) {
      if (["this", "that", "from", "with", "true", "false", "null"].includes(w)) continue;
      if (/^(?:OPENAI_KEY|GITHUB_TOKEN|AWS_ACCESS_KEY|JWT|BEARER_TOKEN|SECRET_ASSIGNMENT|EMAIL|IPV4)_\d+$/.test(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
    const DYN_SYMBOLS = "\u03B1\u03B2\u03B3\u03B4\u03B5\u03B6\u03B7\u03B8\u03B9\u03BA\u03BB\u03BC\u03BD\u03BE\u03BF\u03C0\u03C1\u03C3\u03C4\u03C5\u03C6\u03C7\u03C8\u03C9\u0393\u0394\u0398\u039B\u039E\u03A0\u03A3\u03A6\u03A8\u03A9\u0411\u0412\u0413\u0414\u0416\u0417\u0418\u041A\u041B\u041F\u0424\u0426\u0427\u0428\u0429\u042E\u042F".split("");
    const savings = [...counts.entries()].map(([word, freq]) => {
      return { word, freq, save: freq * (word.length - 1) };
    }).filter((x) => x.save > 10).sort((a, b) => b.save - a.save);
    for (const item of savings) {
      if (!this.dynamicDict.has(item.word) && this.dynamicCounter < DYN_SYMBOLS.length) {
        this.dynamicDict.set(item.word, DYN_SYMBOLS[this.dynamicCounter]);
        this.sourceMap.dynamic.push({
          glyph: DYN_SYMBOLS[this.dynamicCounter],
          original: item.word,
          frequency: item.freq,
          estimatedSavedChars: item.save
        });
        this.dynamicCounter++;
      }
    }
  }
  _applyDynamicDictionary(text) {
    let result = text;
    for (const [word, glyph] of this.dynamicDict) {
      const regex = new RegExp(`\\b${word}\\b`, "g");
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
    for (const [name, glyph] of entries) {
      const regex = new RegExp(`\\b${name}\\b`, "gi");
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
      /(?:[\w\-./\\]+\/)?[\w\-]+\.(tsx?|jsx?|py|rs|go|rb|java|cs|vue|svelte|css|scss|ya?ml|json|md)/gi,
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
  _compressCodeBlocks(text, userPrompt) {
    return text.replace(/`{3,}(\w*)\n([\s\S]+?)`{3,}/g, (match, lang, code, offset, input) => {
      const lines = code.trim().split("\n");
      const span = this._spanForRange(input, offset, offset + match.length);
      const codeStartOffset = offset + match.indexOf("\n") + 1;
      const tokens = this._extractCodeBlockTokens(code, lang, input, codeStartOffset);
      if (this.level === "ultra") {
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
      } else {
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
    }
    if (["py", "python"].includes(l) || !l) {
      addMatches(/\b(?:import|from)\b/g, "import", "imp");
      addMatches(/\bdef\s+([A-Za-z_][\w]*)/g, "function", "\u0192", 1);
      addMatches(/\bclass\s+([A-Za-z_][\w]*)/g, "class", "\u{1D49E}", 1);
      addMatches(/\bself\./g, "receiver", "s.");
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
    addMatches(/\breturn\b/g, "return", "\u2192");
    addMatches(/\byield\b/g, "yield", "\u2192");
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
    c = c.replace(/\breturn\b/g, "\u2192");
    c = c.replace(/^\s*[\r\n]/gm, "");
    if (["js", "jsx", "ts", "tsx", "javascript", "typescript"].includes(l) || !l) {
      c = c.replace(/\bfunction\b/g, "\u0192");
      c = c.replace(/\bconst\b/g, "\u25C7");
      c = c.replace(/\blet\b/g, "\u25C7");
      c = c.replace(/\bimport\b/g, "imp");
      c = c.replace(/\bexport\b/g, "exp");
    }
    if (["py", "python"].includes(l) || !l) {
      c = c.replace(/\bdef\b/g, "\u0192");
      c = c.replace(/\bclass\b/g, "\u{1D49E}");
      c = c.replace(/\bimport\b/g, "imp");
      c = c.replace(/\bfrom\b/g, "imp");
      c = c.replace(/\byield\b/g, "\u2192");
      c = c.replace(/\bself\.\b/g, "s.");
    }
    if (["c", "cpp", "c++", "h", "hpp"].includes(l) || !l) {
      c = c.replace(/#include/g, "imp");
      c = c.replace(/\b(?:int|void|char|float|double|long|short)\b/g, "\u25C7t");
    }
    if (["rs", "rust"].includes(l) || !l) {
      c = c.replace(/\bfn\b/g, "\u0192");
      c = c.replace(/\bpub\b/g, "+");
      c = c.replace(/\bmut\b/g, "m");
      c = c.replace(/\bimpl\b/g, "I");
      c = c.replace(/\bstruct\b/g, "\u{1D49E}");
      c = c.replace(/\buse\b/g, "imp");
      c = c.replace(/\bmatch\b/g, "?");
    }
    if (["go", "golang"].includes(l) || !l) {
      c = c.replace(/\bfunc\b/g, "\u0192");
      c = c.replace(/\bpackage\b/g, "pkg");
      c = c.replace(/\bimport\b/g, "imp");
      c = c.replace(/\btype\b/g, "\u25C7t");
      c = c.replace(/\bstruct\b/g, "\u{1D49E}");
    }
    if (["java", "cs", "csharp"].includes(l) || !l) {
      c = c.replace(/\bpublic\b/g, "+");
      c = c.replace(/\bprivate\b/g, "-");
      c = c.replace(/\bprotected\b/g, "#");
      c = c.replace(/\bclass\b/g, "\u{1D49E}");
      c = c.replace(/\bimport\b/g, "imp");
      c = c.replace(/\busing\b/g, "imp");
      c = c.replace(/\bvoid\b/g, "\u25C7t");
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
}
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
    const allMessages = [];
    let origSystemStr = "";
    if (typeof params.system === "string") {
      origSystemStr = params.system;
    } else if (Array.isArray(params.system)) {
      origSystemStr = params.system.map((s) => s.text).join("\n");
    }
    if (origSystemStr) {
      allMessages.push({ role: "system", content: origSystemStr });
    }
    allMessages.push(...params.messages);
    const { messages: compressed } = compressor.compressMessages(allMessages, "anthropic");
    const systemMsg = compressed.find((m) => m.role === "system");
    const otherMsgs = compressed.filter((m) => m.role !== "system");
    let systemParam = params.system;
    if (systemMsg) {
      systemParam = [
        {
          type: "text",
          text: systemMsg.content,
          cache_control: { type: "ephemeral" }
        }
      ];
    }
    let largestMsgIdx = -1;
    let maxLen = 0;
    for (let i = 0; i < otherMsgs.length; i++) {
      if (otherMsgs[i].role === "user") {
        const len = typeof otherMsgs[i].content === "string" ? otherMsgs[i].content.length : JSON.stringify(otherMsgs[i].content).length;
        if (len > maxLen) {
          maxLen = len;
          largestMsgIdx = i;
        }
      }
    }
    if (largestMsgIdx !== -1) {
      const msg = otherMsgs[largestMsgIdx];
      if (typeof msg.content === "string") {
        msg.content = [
          {
            type: "text",
            text: msg.content,
            cache_control: { type: "ephemeral" }
          }
        ];
      } else if (Array.isArray(msg.content) && msg.content.length > 0) {
        const textBlocks = msg.content.filter((b) => b.type === "text");
        if (textBlocks.length > 0) {
          textBlocks[textBlocks.length - 1].cache_control = { type: "ephemeral" };
        }
      }
    }
    const result = await originalCreate({
      ...params,
      system: systemParam,
      messages: otherMsgs
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
    TECH_GLYPHS
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CODEBOOK_PROMPT,
  DOMAIN_GLYPHS,
  GlyphCompressor,
  TECH_GLYPHS,
  wrapAnthropic,
  wrapOpenAI
});
