/**
 * GlyphCompress — Compressor
 * 
 * Multi-level compression engine that transforms IDE context
 * into compressed glyph sequences.
 * 
 * Levels:
 *   L1: Structural — paths, line refs, file structure
 *   L2: Diagnostic — errors, warnings, lint messages
 *   L3: Semantic — code patterns, component descriptions
 *   L4: Contextual — chat history, conversation state
 */

import {
  DOMAIN_GLYPHS, ACTION_GLYPHS, TECH_GLYPHS,
  STRUCTURE_GLYPHS, ERROR_CODES, RADICALS,
} from './radical-alphabet.js';

// ═══════════════════════════════════════════════════════════
// CODEBOOK — Built from project analysis + universal patterns
// ═══════════════════════════════════════════════════════════

export class Codebook {
  constructor() {
    // Universal patterns (always available)
    this.universal = new Map();
    // Project-specific patterns (built from codebase analysis)
    this.project = new Map();
    // File index (short refs for file paths)
    this.fileIndex = new Map();
    this.fileCounter = 0;
    // Stats
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
    const glyph = DOMAIN_GLYPHS[domain] || '📄';
    const ref = `${glyph}₍${this.fileCounter}₎`;
    this.fileIndex.set(filepath, ref);
    return ref;
  }

  /**
   * Detect domain from file path
   */
  _detectFileDomain(filepath) {
    const p = filepath.toLowerCase();
    if (/\.(tsx|jsx)$/.test(p) || /component|page|layout|ui/i.test(p)) return 'frontend';
    if (/\.(controller|service|middleware|route)\.(ts|js)$/.test(p)) return 'backend';
    if (/\.(test|spec)\.(ts|js|py)$/.test(p)) return 'testing';
    if (/\.py$/.test(p)) return 'language';
    if (/\.rs$/.test(p)) return 'language';
    if (/dockerfile|docker-compose|\.ya?ml$/i.test(p)) return 'devops';
    if (/migration|schema|seed/i.test(p)) return 'database';
    if (/\.md$/.test(p)) return 'documentation';
    if (/security|auth|guard/i.test(p)) return 'security';
    if (/\.css|\.scss|style/i.test(p)) return 'frontend';
    return 'language';
  }

  /**
   * Get file index as codebook header (for system prompt)
   */
  getFileIndexHeader() {
    if (this.fileIndex.size === 0) return '';
    const entries = [];
    for (const [path, ref] of this.fileIndex) {
      entries.push(`${ref}=${path}`);
    }
    return `[FILES: ${entries.join(' | ')}]`;
  }

  getStats() {
    const ratio = this.stats.originalChars > 0
      ? (this.stats.originalChars / Math.max(1, this.stats.compressedChars)).toFixed(1)
      : '0';
    return {
      ...this.stats,
      ratio: `${ratio}x`,
      saved: this.stats.originalChars - this.stats.compressedChars,
      savedPct: this.stats.originalChars > 0
        ? ((1 - this.stats.compressedChars / this.stats.originalChars) * 100).toFixed(1) + '%'
        : '0%',
    };
  }
}

// ═══════════════════════════════════════════════════════════
// COMPRESSOR ENGINE
// ═══════════════════════════════════════════════════════════

export class Compressor {
  constructor(codebook = null) {
    this.codebook = codebook || new Codebook();
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
      header: '',
      prompt: '',
      files: '',
      diagnostics: '',
      history: '',
    };

    // Index only files in this context
    const localFileRefs = new Map();
    if (context.files) {
      for (const f of context.files) {
        const ref = this.codebook.indexFile(f.path);
        localFileRefs.set(ref, f.path);
      }
    }
    // Only show relevant file index
    if (localFileRefs.size > 0) {
      const entries = [...localFileRefs].map(([ref, path]) => `${ref}=${path}`);
      result.header = `[F: ${entries.join(' | ')}]`;
    }

    // L1: Compress prompt
    if (context.prompt) {
      result.prompt = this.compressPrompt(context.prompt);
    }

    // L2: Compress file contents
    if (context.files) {
      result.files = context.files.map(f => this.compressFile(f)).join('\n');
    }

    // L3: Compress diagnostics
    if (context.diagnostics) {
      result.diagnostics = context.diagnostics.map(d => this.compressDiagnostic(d)).join('\n');
    }

    // L4: Compress history
    if (context.history) {
      result.history = this.compressHistory(context.history);
    }

    // Build final compressed message
    const parts = [result.header, result.prompt, result.files, result.diagnostics, result.history]
      .filter(Boolean);
    const compressed = parts.join('\n');
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

    // Replace common prompt patterns
    const patterns = [
      [/fix (?:the |this )?(?:error|bug|issue) in (.+)/i, (_, f) => `⺌✗ ${this._fileRef(f)}`],
      [/create (?:a |an )?(.+) component/i, (_, name) => `▲⊞ ${name}`],
      [/add (.+) to (.+)/i, (_, what, where) => `▲ ${what} → ${this._fileRef(where)}`],
      [/optimize (?:the )?performance of (.+)/i, (_, f) => `⺋ ${this._fileRef(f)}`],
      [/explain (?:how |what |why )(.+)/i, (_, what) => `⺎ ${what}`],
      [/refactor (.+)/i, (_, what) => `● ${this._fileRef(what)}`],
      [/write (?:a )?test for (.+)/i, (_, what) => `► ${this._fileRef(what)}`],
      [/deploy (.+) to (.+)/i, (_, what, where) => `⺏ ${what}→${where}`],
      [/review (.+)/i, (_, what) => `⺎ ${this._fileRef(what)}`],
      [/debug (.+)/i, (_, what) => `⺃ ${this._fileRef(what)}`],
    ];

    for (const [regex, replacer] of patterns) {
      if (regex.test(c)) {
        c = c.replace(regex, replacer);
        this.codebook.stats.replacements++;
        break;
      }
    }

    // Replace technology names with glyphs
    c = this._replaceTechNames(c);

    return c;
  }

  /**
   * L2: Compress file content into semantic description
   */
  compressFile(file) {
    const ref = this.codebook.indexFile(file.path);
    const lang = this._detectLang(file.path);
    const techGlyph = TECH_GLYPHS[lang] || '';

    if (!file.content) {
      return `${ref}${techGlyph}`;
    }

    const lines = file.content.split('\n');
    const structure = this._analyzeStructure(lines, lang);

    // Format: fileRef langGlyph [structure summary]
    return `${ref}${techGlyph} ${structure}`;
  }

  /**
   * L3: Compress diagnostic message
   */
  compressDiagnostic(diag) {
    const fileRef = diag.file ? this.codebook.indexFile(diag.file) : '';
    const lineRef = diag.line ? `:${diag.line}` : '';
    const severity = diag.severity === 'error' ? '✗' : diag.severity === 'warning' ? '⚠' : 'ℹ';

    // Compress error code if known
    let code = diag.code || '';
    if (ERROR_CODES[code]) {
      code = ERROR_CODES[code];
      this.codebook.stats.replacements++;
    }

    // Compress message
    let msg = diag.message || '';
    msg = this._compressErrorMessage(msg);

    return `${fileRef}${lineRef} ${severity}${code} ${msg}`.trim();
  }

  /**
   * L4: Compress chat history
   */
  compressHistory(history) {
    if (!history || history.length === 0) return '';

    // Keep only the semantic essence of each turn
    const compressed = history.map((turn, i) => {
      const role = turn.role === 'user' ? 'U' : 'A';
      const content = this._summarizeTurn(turn.content);
      return `[T${i + 1}:${role}:${content}]`;
    });

    return compressed.join(' ');
  }

  // ─── HELPER METHODS ───────────────────────────────────────

  _fileRef(text) {
    // Try to find a file path in the text
    const fileMatch = text.match(/[\w\-./]+\.(tsx?|jsx?|py|rs|go|rb|java|cs|vue|svelte|css|scss|md|ya?ml)/i);
    if (fileMatch) {
      return this.codebook.indexFile(fileMatch[0]);
    }
    return text;
  }

  _detectLang(filepath) {
    const ext = filepath.split('.').pop()?.toLowerCase();
    const langMap = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', rs: 'rust', go: 'go', java: 'java', cs: 'csharp',
      rb: 'ruby', swift: 'swift',
    };
    return langMap[ext] || ext;
  }

  _replaceTechNames(text) {
    let result = text;
    // Sort by length desc to avoid partial matches
    const entries = Object.entries(TECH_GLYPHS).sort((a, b) => b[0].length - a[0].length);
    for (const [name, glyph] of entries) {
      const regex = new RegExp(`\\b${name}\\b`, 'gi');
      if (regex.test(result)) {
        result = result.replace(regex, glyph);
        this.codebook.stats.replacements++;
      }
    }
    return result;
  }

  _analyzeStructure(lines, lang) {
    const parts = [];
    let imports = 0, functions = 0, classes = 0, exports = 0;
    let hooks = 0, states = 0, effects = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (/^import\s/.test(trimmed)) imports++;
      if (/^export\s/.test(trimmed)) exports++;
      if (/(?:function|const\s+\w+\s*=\s*(?:\([^)]*\)|[^=])\s*=>)/.test(trimmed)) functions++;
      if (/^class\s/.test(trimmed)) classes++;
      if (/useState/.test(trimmed)) states++;
      if (/useEffect/.test(trimmed)) effects++;
      if (/use[A-Z]\w+/.test(trimmed)) hooks++;
    }

    if (imports) parts.push(`imp:${imports}`);
    if (functions) parts.push(`ƒ:${functions}`);
    if (classes) parts.push(`𝒞:${classes}`);
    if (exports) parts.push(`exp:${exports}`);
    if (states) parts.push(`◇:${states}`);
    if (effects) parts.push(`⟿:${effects}`);
    if (hooks) parts.push(`⟳:${hooks}`);
    parts.push(`${lines.length}L`);

    return `[${parts.join(' ')}]`;
  }

  _compressErrorMessage(msg) {
    return msg
      .replace(/Property '(\w+)' does not exist on type '(\w+)'/g, "'$1'∉$2")
      .replace(/Type '(\w+)' is not assignable to type '(\w+)'/g, "$1∉→$2")
      .replace(/Cannot find (?:name|module) '(\w+)'/g, "∅'$1'")
      .replace(/Argument of type '(\w+)' is not assignable/g, "arg:$1∉")
      .replace(/Expected (\d+) arguments?, but got (\d+)/g, "args:$1≠$2")
      .replace(/Module '(.+?)' has no exported member '(\w+)'/g, "$1∅exp:$2")
      .replace(/Object is possibly '(null|undefined)'/g, "∅?")
      .replace(/Parameter '(\w+)' implicitly has an 'any' type/g, "$1:∅type")
      .replace(/Unexpected token/g, "∅token")
      .replace(/SyntaxError/g, "∅syntax");
  }

  _summarizeTurn(content) {
    if (!content) return '∅';
    
    // Detect what the turn was about
    const lower = content.toLowerCase();
    
    if (/\b(fix|bug|error|issue)\b/.test(lower)) return '⺌✗';
    if (/\b(create|build|add|implement)\b/.test(lower)) return '⺍▲';
    if (/\b(test|spec)\b/.test(lower)) return '⺛►';
    if (/\b(optimize|performance|speed)\b/.test(lower)) return '⺋▫';
    if (/\b(deploy|ship|release)\b/.test(lower)) return '⺏▪';
    if (/\b(review|audit|check)\b/.test(lower)) return '⺎▼';
    if (/\b(explain|how|what|why)\b/.test(lower)) return '⺊■';
    if (/\b(refactor|clean|simplify)\b/.test(lower)) return '●';
    
    // Fallback: first 20 chars
    return content.substring(0, 20);
  }
}
