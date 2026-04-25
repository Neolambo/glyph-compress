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
const CODEBOOK_PROMPT = `[GLYPH PROTOCOL v0.5]
Context uses compressed glyphs. Decode:
DOM: \u25C8=frontend \u25C9=ai_ml \u25CA=devops \u25C6=database \u25C7=lang \u2295=auto \u2297=arch \u2299=mobile \u2298=cloud \u229A=data \u229B=test \u229C=backend \u229D=security \u229E=docs \u229F=perf \u22A0=net
TECH: \u1D57=TS \u02B2\u02E2=JS \u1D56=Py \u02B3=Rust \u1D4D=Go \u211C=React \u2115=Next \u{1D54D}=Vue \u{1D49F}=Docker \u{1D4A6}=K8s \u{1D4AF}=Terraform \u2119=PG \u1D63=Redis \u2112=LLM \u03B1=Agent
SYM: ✗=err ⚠=warn ∉=type_err ∅=missing →=return/yield ƒ=function/def/fn 𝒞=class/struct ◇=var/const/let ◇t=type/int/void ⟿=effect ⺌=fix ⺋=perf ⺎=review ⺃=debug ⺏=deploy ▲=create ●=refactor ►=test ■=doc
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
    const allUserText = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
    this._buildDynamicDictionary(allUserText);
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
          content: this._compressUserMessage(msg.content)
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
    const origTokens = this._estimateTokens(messages);
    const compTokens = this._estimateTokens(compressed);
    this.stats.totalOriginalTokens += origTokens;
    this.stats.totalCompressedTokens += compTokens;
    this.stats.messagesProcessed++;
    return {
      messages: compressed,
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
    this._buildDynamicDictionary(text);
    const compressed = this._compressUserMessage(text);
    const origTokens = this._estimateTokens([{ content: text }]);
    const compTokens = this._estimateTokens([{ content: compressed }]);
    this.stats.totalOriginalTokens += origTokens;
    this.stats.totalCompressedTokens += compTokens;
    this.stats.messagesProcessed++;
    return {
      compressed,
      original: text,
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
  // ─── INTERNAL METHODS ──────────────────────────────────────
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
  _compressUserMessage(content) {
    if (!content) return content;
    let c = content;
    if (this.level === "ultra") {
      c = this._stripRedundancy(c);
    }
    if (this.level === "aggressive" || this.level === "ultra") {
      c = this._compressCodeBlocks(c);
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
    if (!text || this.dynamicDict.size >= 20) return;
    const words = text.match(/\b[A-Za-z]+[A-Z][a-z]+[A-Za-z]*\b/g) || [];
    const counts = /* @__PURE__ */ new Map();
    for (const w of words) {
      if (w.length > 5) {
        counts.set(w, (counts.get(w) || 0) + 1);
      }
    }
    const sorted = [...counts.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
    for (const [word] of sorted) {
      if (!this.dynamicDict.has(word) && this.dynamicCounter < 20) {
        this.dynamicCounter++;
        const greek = ["\u03B1", "\u03B2", "\u03B3", "\u03B4", "\u03B5", "\u03B6", "\u03B7", "\u03B8", "\u03B9", "\u03BA", "\u03BB", "\u03BC", "\u03BD", "\u03BE", "\u03BF", "\u03C0", "\u03C1", "\u03C3", "\u03C4", "\u03C5"];
        this.dynamicDict.set(word, greek[this.dynamicCounter - 1]);
      }
    }
  }
  _applyDynamicDictionary(text) {
    let result = text;
    for (const [word, glyph] of this.dynamicDict) {
      const regex = new RegExp(`\\b${word}\\b`, "g");
      result = result.replace(regex, glyph);
    }
    return result;
  }
  _compressPrompt(text) {
    let result = text;
    for (const [pattern, replacement] of PROMPT_PATTERNS) {
      if (pattern.test(result)) {
        result = result.replace(pattern, replacement);
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
      result = result.replace(regex, glyph);
    }
    return result;
  }
  _compressFilePaths(text) {
    return text.replace(
      /(?:[\w\-./\\]+\/)?[\w\-]+\.(tsx?|jsx?|py|rs|go|rb|java|cs|vue|svelte|css|scss|ya?ml|json|md)/gi,
      (match) => {
        if (!this.fileIndex.has(match)) {
          this.fileCounter++;
          const domain = this._detectDomain(match);
          const glyph = DOMAIN_GLYPHS[domain] || "\u{1F4C4}";
          this.fileIndex.set(match, `${glyph}\u208D${this.fileCounter}\u208E`);
        }
        return this.fileIndex.get(match);
      }
    );
  }
  _compressErrors(text) {
    let result = text;
    for (const [pattern, replacement] of ERROR_PATTERNS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }
  _compressDiagnostics(text) {
    return text.replace(/error TS(\d+):/gi, "\u2717TS$1:").replace(/warning:/gi, "\u26A0:").replace(/\bat line (\d+)/gi, ":$1").replace(/on line (\d+)/gi, ":$1").replace(/\bline (\d+)/gi, ":$1").replace(/\bcolumn (\d+)/gi, "c$1");
  }
  _compressCodeBlocks(text) {
    return text.replace(/`{3,}(\w*)\n([\s\S]+?)`{3,}/g, (match, lang, code) => {
      const lines = code.trim().split("\n");
      if (this.level === 'ultra') {
        const summary = this._summarizeCode(lines, lang);
        const techGlyph = TECH_GLYPHS[lang] || "";
        return `[${techGlyph}${summary}]`;
      } else {
        const minified = this._minifySyntax(code, lang);
        return '```' + lang + '\n' + minified + '\n```';
      }
    });
  }
  _minifySyntax(code, lang) {
    if (!code) return code;
    let c = code;
    const l = (lang || '').toLowerCase();
    c = c.replace(/\breturn\b/g, '→');
    if (['js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript'].includes(l) || !l) {
      c = c.replace(/\bfunction\b/g, 'ƒ');
      c = c.replace(/\bconst\b/g, '◇');
      c = c.replace(/\blet\b/g, '◇');
      c = c.replace(/\bimport\b/g, 'imp');
      c = c.replace(/\bexport\b/g, 'exp');
    }
    if (['py', 'python'].includes(l) || !l) {
      c = c.replace(/\bdef\b/g, 'ƒ');
      c = c.replace(/\bclass\b/g, '𝒞');
      c = c.replace(/\bimport\b/g, 'imp');
      c = c.replace(/\bfrom\b/g, 'imp');
      c = c.replace(/\byield\b/g, '→');
      c = c.replace(/\bself\.\b/g, 's.');
    }
    if (['c', 'cpp', 'c++', 'h', 'hpp'].includes(l) || !l) {
      c = c.replace(/#include/g, 'imp');
      c = c.replace(/\b(?:int|void|char|float|double|long|short)\b/g, '◇t');
    }
    if (['rs', 'rust'].includes(l) || !l) {
      c = c.replace(/\bfn\b/g, 'ƒ');
      c = c.replace(/\bpub\b/g, '+');
      c = c.replace(/\bmut\b/g, 'm');
      c = c.replace(/\bimpl\b/g, 'I');
      c = c.replace(/\bstruct\b/g, '𝒞');
      c = c.replace(/\buse\b/g, 'imp');
      c = c.replace(/\bmatch\b/g, '?');
    }
    if (['go', 'golang'].includes(l) || !l) {
      c = c.replace(/\bfunc\b/g, 'ƒ');
      c = c.replace(/\bpackage\b/g, 'pkg');
      c = c.replace(/\bimport\b/g, 'imp');
      c = c.replace(/\btype\b/g, '◇t');
      c = c.replace(/\bstruct\b/g, '𝒞');
    }
    if (['java', 'cs', 'csharp'].includes(l) || !l) {
      c = c.replace(/\bpublic\b/g, '+');
      c = c.replace(/\bprivate\b/g, '-');
      c = c.replace(/\bprotected\b/g, '#');
      c = c.replace(/\bclass\b/g, '𝒞');
      c = c.replace(/\bimport\b/g, 'imp');
      c = c.replace(/\busing\b/g, 'imp');
      c = c.replace(/\bvoid\b/g, '◇t');
    }
    return c;
  }
  _summarizeCode(lines, lang) {
    const parts = [];
    let imports = 0, funcs = 0, classes = 0, hooks = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^import\s/.test(t) || /^from\s/.test(t)) imports++;
      if (/(?:function |const \w+ = (?:\(|async ))/.test(t) || /^\s*def /.test(t)) funcs++;
      if (/^(?:export )?class /.test(t)) classes++;
      if (/use[A-Z]\w+/.test(t)) hooks++;
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
  _estimateTokens(messages) {
    let chars = 0;
    for (const m of messages) {
      if (typeof m.content === "string") chars += m.content.length;
      else if (m.content) chars += JSON.stringify(m.content).length;
    }
    return Math.ceil(chars / 4);
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
