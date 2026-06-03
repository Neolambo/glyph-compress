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

// src/compressor.js
var compressor_exports = {};
__export(compressor_exports, {
  Codebook: () => Codebook,
  Compressor: () => Compressor
});
module.exports = __toCommonJS(compressor_exports);

// src/radical-alphabet.js
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
var ACTION_GLYPHS = {
  create: "\u25B2",
  analyze: "\u25BC",
  test: "\u25BA",
  monitor: "\u25C4",
  document: "\u25A0",
  connect: "\u25A1",
  deploy: "\u25AA",
  optimize: "\u25AB",
  transform: "\u25CF",
  protect: "\u25CB"
};
var TECH_GLYPHS = {
  // Languages
  typescript: "\u1D57",
  javascript: "\u02B2\u02E2",
  python: "\u1D56",
  rust: "\u02B3",
  go: "\u1D4D",
  java: "\u02B2",
  csharp: "\u1D9C",
  swift: "\u02E2",
  ruby: "\u1D47",
  // Frameworks
  react: "\u211C",
  nextjs: "\u2115",
  vue: "\u{1D54D}",
  angular: "\u{1D538}",
  svelte: "\u{1D54A}",
  django: "\u{1D53B}",
  rails: "\u211D",
  express: "\u{1D53C}\u02E3",
  fastapi: "\u{1D53D}",
  nestjs: "\u2115\u02E2",
  // Infrastructure
  docker: "\u{1D49F}",
  kubernetes: "\u{1D4A6}",
  terraform: "\u{1D4AF}",
  aws: "\u1D2C",
  azure: "\u1D2E",
  gcp: "\u1D33",
  // Databases
  postgres: "\u2119",
  mysql: "\u2133",
  mongodb: "\u2098",
  redis: "\u1D63",
  // AI/ML
  llm: "\u2112",
  embedding: "\u03B5",
  agent: "\u03B1",
  prompt: "\u03C0"
};
var ERROR_CODES = {
  // TypeScript
  "TS2339": "\u2209prop",
  // Property does not exist on type
  "TS2345": "\u2209arg",
  // Argument type mismatch
  "TS2322": "\u2209assign",
  // Type not assignable
  "TS7006": "\u2205type",
  // Parameter implicitly has 'any'
  "TS2304": "\u2205name",
  // Cannot find name
  "TS1005": "\u2205syntax",
  // Expected token
  "TS2769": "\u2209overload",
  // No overload matches
  // ESLint
  "no-unused-vars": "\u26A0unused",
  "react-hooks/exhaustive-deps": "\u26A0deps",
  "react/no-unescaped-entities": "\u26A0escape",
  "import/no-unresolved": "\u2205import",
  // Python
  "E0001": "\u2205syntax",
  // Syntax error
  "E1101": "\u2209attr",
  // Module has no member
  "W0611": "\u26A0unused",
  // Unused import
  "E0602": "\u2205name",
  // Undefined variable
  // General
  "ENOENT": "\u2205file",
  // File not found
  "EACCES": "\u25CBdenied",
  // Permission denied
  "ETIMEDOUT": "\u23F1timeout",
  // Connection timeout
  "ECONNREFUSED": "\u2205conn"
  // Connection refused
};
var COMPOSITIONS = {
  "\u2E86\u2E80": "frontend development",
  "\u2E87\u2E80": "backend development",
  "\u2E87\u2E8C": "API integration",
  "\u2E82\u2E8E": "security audit",
  "\u2E82\u2E85": "cloud security",
  "\u2E89\u2E80": "AI-assisted coding",
  "\u2E89\u2E8E": "ML evaluation",
  "\u2E84\u2E8F": "CI/CD pipeline",
  "\u2E8B\u2E86": "frontend performance",
  "\u2E8B\u2E87": "backend performance",
  "\u2E81\u2E87": "database operations",
  "\u2E81\u2E8E": "data analysis",
  "\u2E88\u2E86": "mobile UI",
  "\u2E88\u2E80": "mobile development",
  "\u2E8A\u2E80": "code documentation",
  "\u2E85\u2E8F": "cloud deployment",
  "\u2E85\u2E87": "serverless",
  "\u2E83\u2E84": "automated monitoring",
  "\u2E8C\u2E81": "data integration",
  "\u2E8D\u2E86": "UI construction"
};
var REVERSE_DOMAIN = Object.fromEntries(
  Object.entries(DOMAIN_GLYPHS).map(([k, v]) => [v, k])
);
var REVERSE_ACTION = Object.fromEntries(
  Object.entries(ACTION_GLYPHS).map(([k, v]) => [v, k])
);
var REVERSE_TECH = Object.fromEntries(
  Object.entries(TECH_GLYPHS).map(([k, v]) => [v, k])
);
var REVERSE_ERRORS = Object.fromEntries(
  Object.entries(ERROR_CODES).map(([k, v]) => [v, k])
);
var REVERSE_COMPOSITIONS = Object.fromEntries(
  Object.entries(COMPOSITIONS).map(([k, v]) => [v, k])
);

// src/compressor.js
var Codebook = class {
  constructor() {
    this.universal = /* @__PURE__ */ new Map();
    this.project = /* @__PURE__ */ new Map();
    this.fileIndex = /* @__PURE__ */ new Map();
    this.fileCounter = 0;
    this.stats = { originalChars: 0, compressedChars: 0, replacements: 0 };
  }
  /**
   * Index a file path for compressed reference
   * @returns {string} Short glyph reference like "◈₁"
   */
  indexFile(filepath) {
    if (this.fileIndex.has(filepath)) {
      return this.fileIndex.get(filepath);
    }
    this.fileCounter++;
    const domain = this._detectFileDomain(filepath);
    const glyph = DOMAIN_GLYPHS[domain] || "\u{1F4C4}";
    const ref = `${glyph}\u208D${this.fileCounter}\u208E`;
    this.fileIndex.set(filepath, ref);
    return ref;
  }
  /**
   * Detect domain from file path
   */
  _detectFileDomain(filepath) {
    const p = filepath.toLowerCase();
    if (/\.(tsx|jsx)$/.test(p) || /component|page|layout|ui/i.test(p)) return "frontend";
    if (/\.(controller|service|middleware|route)\.(ts|js)$/.test(p)) return "backend";
    if (/\.(test|spec)\.(ts|js|py)$/.test(p)) return "testing";
    if (/\.py$/.test(p)) return "language";
    if (/\.rs$/.test(p)) return "language";
    if (/dockerfile|docker-compose|\.ya?ml$/i.test(p)) return "devops";
    if (/migration|schema|seed/i.test(p)) return "database";
    if (/\.md$/.test(p)) return "documentation";
    if (/security|auth|guard/i.test(p)) return "security";
    if (/\.css|\.scss|style/i.test(p)) return "frontend";
    return "language";
  }
  /**
   * Get file index as codebook header (for system prompt)
   */
  getFileIndexHeader() {
    if (this.fileIndex.size === 0) return "";
    const entries = [];
    for (const [path, ref] of this.fileIndex) {
      entries.push(`${ref}=${path}`);
    }
    return `[FILES: ${entries.join(" | ")}]`;
  }
  getStats() {
    const ratio = this.stats.originalChars > 0 ? (this.stats.originalChars / Math.max(1, this.stats.compressedChars)).toFixed(1) : "0";
    return {
      ...this.stats,
      ratio: `${ratio}x`,
      saved: this.stats.originalChars - this.stats.compressedChars,
      savedPct: this.stats.originalChars > 0 ? ((1 - this.stats.compressedChars / this.stats.originalChars) * 100).toFixed(1) + "%" : "0%"
    };
  }
};
var Compressor = class {
  constructor(codebook = null, options = {}) {
    this.codebook = codebook || new Codebook();
    this.holographicFolding = options.holographicFolding || false;
    this.intentDiffs = options.intentDiffs || false;
  }
  /**
   * Compress a full IDE context message.
   * @param {Object} context - IDE context object
   * @param {string} context.prompt - User's prompt
   * @param {Array} context.files - Open files [{path, content, language}]
   * @param {Array} context.diagnostics - Errors/warnings [{file, line, code, message}]
   * @param {Array} context.history - Chat history [{role, content}]
   * @returns {Object} Compressed context
   */
  compress(context) {
    const result = {
      header: "",
      prompt: "",
      files: "",
      diagnostics: "",
      history: ""
    };
    const localFileRefs = /* @__PURE__ */ new Map();
    if (context.files) {
      for (const f of context.files) {
        const ref = this.codebook.indexFile(f.path);
        localFileRefs.set(ref, f.path);
      }
    }
    if (localFileRefs.size > 0) {
      const entries = [...localFileRefs].map(([ref, path]) => `${ref}=${path}`);
      result.header = `[F: ${entries.join(" | ")}]`;
    }
    if (context.prompt) {
      let promptText = context.prompt;
      if (this.intentDiffs) {
        promptText = this.compressIntentDiffs(promptText);
      }
      result.prompt = this.compressPrompt(promptText);
    }
    if (context.files) {
      if (this.holographicFolding) {
        result.files = this.foldHolographicContext(context.files);
      } else {
        result.files = context.files.map((f) => this.compressFile(f)).join("\n");
      }
    }
    if (context.diagnostics) {
      result.diagnostics = context.diagnostics.map((d) => this.compressDiagnostic(d)).join("\n");
    }
    if (context.history) {
      result.history = this.compressHistory(context.history);
    }
    const parts = [result.header, result.prompt, result.files, result.diagnostics, result.history].filter(Boolean);
    const compressed = parts.join("\n");
    const original = JSON.stringify(context);
    this.codebook.stats.originalChars += original.length;
    this.codebook.stats.compressedChars += compressed.length;
    return { compressed, parts: result, stats: this.codebook.getStats() };
  }
  /**
   * L1: Compress user prompt
   */
  compressPrompt(prompt) {
    let c = prompt;
    const patterns = [
      [/fix (?:the |this )?(?:error|bug|issue) in (.+)/i, (_, f) => `\u2E8C\u2717 ${this._fileRef(f)}`],
      [/create (?:a |an )?(.+) component/i, (_, name) => `\u25B2\u229E ${name}`],
      [/add (.+) to (.+)/i, (_, what, where) => `\u25B2 ${what} \u2192 ${this._fileRef(where)}`],
      [/optimize (?:the )?performance of (.+)/i, (_, f) => `\u2E8B ${this._fileRef(f)}`],
      [/explain (?:how |what |why )(.+)/i, (_, what) => `\u2E8E ${what}`],
      [/refactor (.+)/i, (_, what) => `\u25CF ${this._fileRef(what)}`],
      [/write (?:a )?test for (.+)/i, (_, what) => `\u25BA ${this._fileRef(what)}`],
      [/deploy (.+) to (.+)/i, (_, what, where) => `\u2E8F ${what}\u2192${where}`],
      [/review (.+)/i, (_, what) => `\u2E8E ${this._fileRef(what)}`],
      [/debug (.+)/i, (_, what) => `\u2E83 ${this._fileRef(what)}`]
    ];
    for (const [regex, replacer] of patterns) {
      if (regex.test(c)) {
        c = c.replace(regex, replacer);
        this.codebook.stats.replacements++;
        break;
      }
    }
    c = this._replaceTechNames(c);
    return c;
  }
  /**
   * L2: Compress file content into semantic description
   */
  compressFile(file) {
    const ref = this.codebook.indexFile(file.path);
    const lang = this._detectLang(file.path);
    const techGlyph = TECH_GLYPHS[lang] || "";
    if (!file.content) {
      return `${ref}${techGlyph}`;
    }
    const lines = file.content.split("\n");
    const structure = this._analyzeStructure(lines, lang);
    return `${ref}${techGlyph} ${structure}`;
  }
  /**
   * L3: Compress diagnostic message
   */
  compressDiagnostic(diag) {
    const fileRef = diag.file ? this.codebook.indexFile(diag.file) : "";
    const lineRef = diag.line ? `:${diag.line}` : "";
    const severity = diag.severity === "error" ? "\u2717" : diag.severity === "warning" ? "\u26A0" : "\u2139";
    let code = diag.code || "";
    if (ERROR_CODES[code]) {
      code = ERROR_CODES[code];
      this.codebook.stats.replacements++;
    }
    let msg = diag.message || "";
    msg = this._compressErrorMessage(msg);
    return `${fileRef}${lineRef} ${severity}${code} ${msg}`.trim();
  }
  /**
   * L4: Compress chat history
   */
  compressHistory(history) {
    if (!history || history.length === 0) return "";
    const compressed = history.map((turn, i) => {
      const role = turn.role === "user" ? "U" : "A";
      const content = this._summarizeTurn(turn.content);
      return `[T${i + 1}:${role}:${content}]`;
    });
    return compressed.join(" ");
  }
  // ─── HELPER METHODS ───────────────────────────────────────
  _fileRef(text) {
    const fileMatch = text.match(/[\w\-./]+\.(tsx?|jsx?|py|rs|go|rb|java|cs|vue|svelte|css|scss|md|ya?ml)/i);
    if (fileMatch) {
      return this.codebook.indexFile(fileMatch[0]);
    }
    return text;
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
  _replaceTechNames(text) {
    let result = text;
    const entries = Object.entries(TECH_GLYPHS).sort((a, b) => b[0].length - a[0].length);
    for (const [name, glyph] of entries) {
      const regex = new RegExp(`\\b${name}\\b`, "gi");
      if (regex.test(result)) {
        result = result.replace(regex, glyph);
        this.codebook.stats.replacements++;
      }
    }
    return result;
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
  _compressErrorMessage(msg) {
    return msg.replace(/Property '(\w+)' does not exist on type '(\w+)'/g, "'$1'\u2209$2").replace(/Type '(\w+)' is not assignable to type '(\w+)'/g, "$1\u2209\u2192$2").replace(/Cannot find (?:name|module) '(\w+)'/g, "\u2205'$1'").replace(/Argument of type '(\w+)' is not assignable/g, "arg:$1\u2209").replace(/Expected (\d+) arguments?, but got (\d+)/g, "args:$1\u2260$2").replace(/Module '(.+?)' has no exported member '(\w+)'/g, "$1\u2205exp:$2").replace(/Object is possibly '(null|undefined)'/g, "\u2205?").replace(/Parameter '(\w+)' implicitly has an 'any' type/g, "$1:\u2205type").replace(/Unexpected token/g, "\u2205token").replace(/SyntaxError/g, "\u2205syntax");
  }
  _summarizeTurn(content) {
    if (!content) return "\u2205";
    const lower = content.toLowerCase();
    if (/\b(fix|bug|error|issue)\b/.test(lower)) return "\u2E8C\u2717";
    if (/\b(create|build|add|implement)\b/.test(lower)) return "\u2E8D\u25B2";
    if (/\b(test|spec)\b/.test(lower)) return "\u2E9B\u25BA";
    if (/\b(optimize|performance|speed)\b/.test(lower)) return "\u2E8B\u25AB";
    if (/\b(deploy|ship|release)\b/.test(lower)) return "\u2E8F\u25AA";
    if (/\b(review|audit|check)\b/.test(lower)) return "\u2E8E\u25BC";
    if (/\b(explain|how|what|why)\b/.test(lower)) return "\u2E8A\u25A0";
    if (/\b(refactor|clean|simplify)\b/.test(lower)) return "\u25CF";
    return content.substring(0, 20);
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
      const ref = this.codebook.indexFile(file.path);
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
    const compressedImports = [...baseImports].map((imp) => this._replaceTechNames(imp)).join(" | ");
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
    const fileRef = filepath ? this.codebook.indexFile(filepath) : "";
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
      const fileRef = filepath ? this.codebook.indexFile(filepath) : "\u25C8";
      return `\u26A1: ${fileRef} \xB1${originalDiffLinesCount}L`;
    }
    const formatted = actions.map((act) => {
      const detail = act.detail ? ` (${act.detail})` : "";
      return `${act.fileRef} ${act.actionGlyph}${act.type === "imp" ? "\u{1F4E6}" : act.type === "class" ? "\u{1D49E}" : "\u0192"} ${act.symbol}${detail}`;
    });
    return `\u26A1: ${formatted.join(" | ")}`;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Codebook,
  Compressor
});
