/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 * 
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 * 
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — LLM API Middleware
 * 
 * Intercepts and compresses messages for OpenAI, Anthropic Claude,
 * and Antigravity. Injects codebook into system prompt, compresses
 * user context, and tracks token savings.
 * 
 * Works as:
 * 1. VS Code extension middleware
 * 2. Standalone proxy
 * 3. Antigravity skill
 */

import { createHash } from 'node:crypto';
import { estimateProviderTokens, normalizeProvider } from '../src/token-estimator.js';

// ═══════════════════════════════════════════════════════════
// RADICAL ALPHABET (embedded — no external dependencies)
// ═══════════════════════════════════════════════════════════

const DOMAIN_GLYPHS = {
  frontend: '◈', ai_ml: '◉', devops: '◊', database: '◆',
  language: '◇', automation: '⊕', architecture: '⊗', mobile: '⊙',
  cloud: '⊘', data: '⊚', testing: '⊛', backend: '⊜',
  security: '⊝', documentation: '⊞', optimization: '⊟', networking: '⊠',
};

const TECH_GLYPHS = {
  typescript: 'ᵗ', javascript: 'ʲˢ', python: 'ᵖ', rust: 'ʳ',
  go: 'ᵍ', java: 'ʲ', csharp: 'ᶜ', swift: 'ˢ', ruby: 'ᵇ',
  react: 'ℜ', nextjs: 'ℕ', vue: '𝕍', angular: '𝔸',
  svelte: '𝕊', django: '𝔻', rails: 'ℝ', express: '𝔼ˣ',
  fastapi: '𝔽', docker: '𝒟', kubernetes: '𝒦', terraform: '𝒯',
  postgres: 'ℙ', mysql: 'ℳ', mongodb: 'ₘ', redis: 'ᵣ',
  llm: 'ℒ', agent: 'α', prompt: 'π',
};

const ERROR_PATTERNS = [
  [/Property '(\w+)' does not exist on type '(\w+)'/g, "'$1'∉$2"],
  [/Type '(\w+)' is not assignable to type '(\w+)'/g, "$1∉→$2"],
  [/Cannot find (?:name|module) '([^']+)'/g, "∅'$1'"],
  [/Argument of type '(\w+)' is not assignable/g, "arg:$1∉"],
  [/Expected (\d+) arguments?, but got (\d+)/g, "args:$1≠$2"],
  [/Object is possibly '(null|undefined)'/g, "∅?"],
  [/Parameter '(\w+)' implicitly has an 'any' type/g, "$1:∅type"],
  [/Unexpected token/g, "∅token"],
  [/No overload matches this call/g, "∉overload"],
  [/Module '([^']+)' has no exported member '(\w+)'/g, "$1∅exp:$2"],
  [/Cannot use import statement outside a module/g, "∅ESM"],
  [/is declared but its value is never read/g, "⚠unused"],
  [/is defined but never used/g, "⚠unused"],
];

const PROMPT_PATTERNS = [
  [/fix (?:the |this )?(?:error|bug|issue) in (.+)/i, '⺌✗ $1'],
  [/create (?:a |an )?(.+) component/i, '▲⊞ $1'],
  [/add (.+) to (.+)/i, '▲ $1 → $2'],
  [/optimize (?:the )?performance of (.+)/i, '⺋ $1'],
  [/explain (?:how |what |why )(.+)/i, '⺎ $1'],
  [/refactor (.+)/i, '● $1'],
  [/write (?:a |the )?tests? for (.+)/i, '► $1'],
  [/deploy (.+) to (.+)/i, '⺏ $1→$2'],
  [/review (.+)/i, '⺎ $1'],
  [/debug (.+)/i, '⺃ $1'],
  [/implement (.+)/i, '▲ $1'],
  [/update (.+)/i, '● $1'],
  [/delete (?:the )?(.+)/i, '✗ $1'],
  [/test (.+)/i, '► $1'],
  [/document (.+)/i, '■ $1'],
];

const PRIVACY_REDACTION_PATTERNS = [
  { kind: 'openai_key', label: 'OpenAI API key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { kind: 'github_token', label: 'GitHub token', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g },
  { kind: 'github_token', label: 'GitHub fine-grained token', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { kind: 'aws_access_key', label: 'AWS access key', pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { kind: 'jwt', label: 'JSON Web Token', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { kind: 'bearer_token', label: 'Bearer token', pattern: /\bBearer\s+([A-Za-z0-9._~+/=-]{20,})\b/g, valueGroup: 1 },
  { kind: 'secret_assignment', label: 'secret assignment', pattern: /\b((?:api[_-]?key|token|secret|password|passwd|pwd|client[_-]?secret|access[_-]?token)\s*[:=]\s*)(["']?)([^"'\s,;]+)\2/gi, valueGroup: 3 },
  { kind: 'email', label: 'email address', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { kind: 'ipv4', label: 'IPv4 address', pattern: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
];

const PROVIDER_COMPRESSION_PROFILES = {
  raw: {
    provider: 'raw',
    strategy: 'balanced',
    dynamicMinSavedChars: 10,
    maxDynamicEntries: 60,
    codebookHint: 'Generic text profile with balanced dynamic dictionary compression.',
  },
  openai: {
    provider: 'openai',
    strategy: 'chat-compact',
    dynamicMinSavedChars: 8,
    maxDynamicEntries: 72,
    codebookHint: 'OpenAI chat profile favors compact repeated identifiers and low message overhead.',
  },
  anthropic: {
    provider: 'anthropic',
    strategy: 'cache-stable',
    dynamicMinSavedChars: 14,
    maxDynamicEntries: 48,
    codebookHint: 'Anthropic profile keeps the codebook stable for cache-friendly system prompts.',
  },
  gemini: {
    provider: 'gemini',
    strategy: 'structure-preserving',
    dynamicMinSavedChars: 12,
    maxDynamicEntries: 56,
    codebookHint: 'Gemini-compatible profile favors structural clarity with moderate dictionary growth.',
  },
  local: {
    provider: 'local',
    strategy: 'aggressive-local',
    dynamicMinSavedChars: 6,
    maxDynamicEntries: 80,
    codebookHint: 'Local-model profile uses more dynamic entries where tokenizer overhead is lower.',
  },
};

const TRUST_POLICY_PROFILES = {
  lossless: {
    policy: 'lossless',
    label: 'Lossless',
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
      privacy: false,
    },
  },
  reversible: {
    policy: 'reversible',
    label: 'Reversible',
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
      privacy: false,
    },
  },
  privacy: {
    policy: 'privacy',
    label: 'Privacy Firewall',
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
      privacy: true,
    },
  },
  lossy: {
    policy: 'lossy',
    label: 'Lossy',
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
      privacy: true,
    },
  },
};

// ═══════════════════════════════════════════════════════════
// CODEBOOK SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════

const CODEBOOK_PROMPT = `[GLYPH PROTOCOL v0.5]
Context uses compressed glyphs. Decode:
DOM: ◈=frontend ◉=ai_ml ◊=devops ◆=database ◇=lang ⊕=auto ⊗=arch ⊙=mobile ⊘=cloud ⊚=data ⊛=test ⊜=backend ⊝=security ⊞=docs ⊟=perf ⊠=net
TECH: ᵗ=TS ʲˢ=JS ᵖ=Py ʳ=Rust ᵍ=Go ℜ=React ℕ=Next 𝕍=Vue 𝒟=Docker 𝒦=K8s 𝒯=Terraform ℙ=PG ᵣ=Redis ℒ=LLM α=Agent
SYM: ✗=err ⚠=warn ∉=type_err ∅=missing →=return/yield ƒ=function/def/fn 𝒞=class/struct ◇=var/const/let ◇t=type/int/void ⟿=effect ⺌=fix ⺋=perf ⺎=review ⺃=debug ⺏=deploy ▲=create ●=refactor ►=test ■=doc
MOD: +=pub/public -=private #=protected m=mut I=impl ?=match pkg=package s.=self.
FILE: ₍N₎=file_index :L=line [NL]=line_count imp=imports exp=exports ⟳=hooks
Respond normally. Context below uses these glyphs for brevity.
[/GLYPH]`;

// ═══════════════════════════════════════════════════════════
// COMPRESSOR CLASS
// ═══════════════════════════════════════════════════════════

class GlyphCompressor {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.level = options.level || 'standard'; // light | standard | aggressive | ultra
    this.provider = normalizeProvider(options.provider || 'raw');
    this.providerProfile = this._resolveProviderProfile(this.provider);
    this.requestedPrivacyFirewall = options.privacyFirewall === true || options.privacy === true;
    this.trustPolicy = this._resolveTrustPolicy(options.trustPolicy || options.policy);
    this.trustProfile = TRUST_POLICY_PROFILES[this.trustPolicy];
    this.fileIndex = new Map();
    this.fileCounter = 0;
    this.dynamicDict = new Map();
    this.dynamicCounter = 0;
    this.privacyFirewall = this.requestedPrivacyFirewall || this.trustPolicy === 'privacy';
    this.privacyTokens = new Map();
    this.privacyCounter = 0;
    this.sourceMap = this._createSourceMap();
    this.stats = {
      totalOriginalTokens: 0,
      totalCompressedTokens: 0,
      messagesProcessed: 0,
      sessionStarted: Date.now(),
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
  compressMessages(messages, provider = this.provider) {
    if (!this.enabled) return { messages, stats: this.stats };
    this._setProvider(provider);
    this.resetSourceMap();

    // Build dynamic dictionary from user messages
    const allUserText = messages.filter(m => m.role === 'user').map(m => this._normalizeMessageContent(m.content)).join('\n');
    const safeUserText = this._applyPrivacyFirewall(allUserText, false);
    this._buildDynamicDictionary(safeUserText);

    const compressed = [];
    let codebookInjected = false;

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Inject codebook into system prompt
        compressed.push({
          role: 'system',
          content: this._injectCodebook(msg.content, provider),
        });
        codebookInjected = true;
      } else if (msg.role === 'user') {
        compressed.push({
          role: 'user',
          content: this._compressUserMessage(msg.content, safeUserText),
        });
      } else {
        // assistant messages: keep as-is (or summarize old ones)
        compressed.push(msg);
      }
    }

    // If no system message, prepend one with codebook
    if (!codebookInjected) {
      compressed.unshift({
        role: 'system',
        content: this._injectCodebook('', provider).trim(),
      });
    }

    // Update stats
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
          provider: this.provider,
          profile: this.providerProfile.strategy,
          trustPolicy: this.trustPolicy,
          originalTokens: origTokens,
          compressedTokens: compTokens,
          saved: origTokens - compTokens,
          ratio: (origTokens / Math.max(1, compTokens)).toFixed(1) + 'x',
          savedPct: ((1 - compTokens / Math.max(1, origTokens)) * 100).toFixed(0) + '%',
        },
      },
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

    const safeText = this._applyPrivacyFirewall(text, false);
    this._buildDynamicDictionary(safeText);
    const compressed = this._compressUserMessage(text, safeText);
    const origTokens = this._estimateTokens([{ content: text }], this.provider);
    const compTokens = this._estimateTokens([{ content: compressed }], this.provider);

    // Track stats
    this.stats.totalOriginalTokens += origTokens;
    this.stats.totalCompressedTokens += compTokens;
    this.stats.messagesProcessed++;

    return {
      compressed,
      original: text,
      sourceMap: this.getSourceMap(),
      stats: {
        provider: this.provider,
        profile: this.providerProfile.strategy,
        trustPolicy: this.trustPolicy,
        originalTokens: origTokens,
        compressedTokens: compTokens,
        ratio: (origTokens / Math.max(1, compTokens)).toFixed(1) + 'x',
        savedPct: ((1 - compTokens / Math.max(1, origTokens)) * 100).toFixed(0) + '%',
      },
    };
  }

  /**
   * Get the codebook system prompt to inject.
   */
  getCodebookPrompt() {
    let prompt = CODEBOOK_PROMPT;
    if (this.fileIndex.size > 0) {
      const files = [...this.fileIndex].map(([path, ref]) => `${ref}=${path}`).join(' | ');
      prompt = prompt.replace('[/GLYPH]', `FILES: ${files}\n[/GLYPH]`);
    }
    return prompt;
  }

  /**
   * Get session statistics.
   */
  getStats() {
    const s = this.stats;
    const saved = s.totalOriginalTokens - s.totalCompressedTokens;
    const costPerToken = 3 / 1_000_000; // Claude Sonnet ~$3/M input
    return {
      messagesProcessed: s.messagesProcessed,
      totalOriginalTokens: s.totalOriginalTokens,
      totalCompressedTokens: s.totalCompressedTokens,
      totalSavedTokens: saved,
      overallRatio: s.totalOriginalTokens > 0
        ? (s.totalOriginalTokens / Math.max(1, s.totalCompressedTokens)).toFixed(1) + 'x'
        : '0x',
      overallSavedPct: s.totalOriginalTokens > 0
        ? ((1 - s.totalCompressedTokens / s.totalOriginalTokens) * 100).toFixed(0) + '%'
        : '0%',
      estimatedCostSaved: `$${(saved * costPerToken).toFixed(4)}`,
      sessionDuration: Math.round((Date.now() - s.sessionStarted) / 60000) + ' min',
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
      version: '1.8.0',
      level: this.level,
      provider: this.provider,
      profile: this.providerProfile,
      trustPolicy: this.trustPolicy,
      trust: this.trustProfile,
      files: [],
      dynamic: [],
      diagnostics: [],
      codeBlocks: [],
      ast: [],
      privacy: [],
      symbols: [],
      replacements: [],
    };
  }

  _resolveProviderProfile(provider) {
    const normalized = normalizeProvider(provider);
    return PROVIDER_COMPRESSION_PROFILES[normalized] || PROVIDER_COMPRESSION_PROFILES.raw;
  }

  _setProvider(provider) {
    this.provider = normalizeProvider(provider || this.provider || 'raw');
    this.providerProfile = this._resolveProviderProfile(this.provider);
  }

  _resolveTrustPolicy(policy) {
    const requested = String(policy || 'auto').toLowerCase();
    if (TRUST_POLICY_PROFILES[requested]) return requested;
    if (this?.requestedPrivacyFirewall) return 'privacy';
    if (this?.level === 'aggressive' || this?.level === 'ultra') return 'lossy';
    return 'reversible';
  }

  _allows(capability) {
    return Boolean(this.trustProfile?.allows?.[capability]);
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
      offset: safeOffset,
    };
  }

  _spanForRange(text, startOffset, endOffset) {
    return {
      start: this._lineColumnAt(text, startOffset),
      end: this._lineColumnAt(text, endOffset),
    };
  }

  _recordSymbol(glyph, original, kind, span, extra = {}) {
    if (!glyph || !original || !span) return;
    this.sourceMap.symbols.push({ glyph, original, kind, span, ...extra });
  }

  _normalizeMessageContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part.text === 'string') return part.text;
        return '';
      }).join('\n');
    }
    return content == null ? '' : String(content);
  }

  _privacyHash(value) {
    return createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
  }

  _privacyPlaceholder(kind, value) {
    const hash = this._privacyHash(value);
    if (!this.privacyTokens.has(hash)) {
      this.privacyCounter++;
      this.privacyTokens.set(hash, `⟦${kind.toUpperCase()}_${this.privacyCounter}⟧`);
    }
    return { hash, placeholder: this.privacyTokens.get(hash) };
  }

  _applyPrivacyFirewall(text, record = true) {
    if (!this.privacyFirewall || !text || !this._allows('privacy')) return text;

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
            span,
          });
          this._recordReplacement('privacy', `[${rule.kind}]`, placeholder, { span, redacted: true, label: rule.label });
          this._recordSymbol(placeholder, `[${rule.kind}]`, 'privacy', span, { redacted: true, label: rule.label });
        }
        return replacement;
      });
    }
    return result;
  }

  _injectCodebook(systemPrompt, provider) {
    // Don't double-inject
    if (systemPrompt.includes('[GLYPH PROTOCOL')) return systemPrompt;

    this._setProvider(provider);

    let modifiedCodebook = CODEBOOK_PROMPT;
    if (this.dynamicDict.size > 0) {
      const dyn = [...this.dynamicDict].map(([w, g]) => `${g}=${w}`).join(' | ');
      modifiedCodebook = modifiedCodebook.replace('[/GLYPH]', `DYN: ${dyn}\n[/GLYPH]`);
    }

    if (this.provider !== 'raw') {
      modifiedCodebook = modifiedCodebook.replace('[/GLYPH]', `PROFILE: ${this.providerProfile.provider}/${this.providerProfile.strategy}\n[/GLYPH]`);
    }

    // Prepend codebook (it's small: ~150 tokens)
    return modifiedCodebook + '\n\n' + systemPrompt;
  }

  _compressUserMessage(content, allUserText) {
    if (!content) return content;

    let c = this._applyPrivacyFirewall(this._normalizeMessageContent(content));

    // Ultra level: remove redundancy before processing
    if (this.level === 'ultra' && this._allows('redundancyStrip')) {
      c = this._stripRedundancy(c);
    }

    // Level 3 first: Aggressive — compress code blocks BEFORE tech name substitution
    if ((this.level === 'aggressive' && this._allows('codeMinify')) || (this.level === 'ultra' && this._allows('codeSummary'))) {
      c = this._compressCodeBlocks(c, allUserText);
    }

    // Level 1: Always — compress prompts
    if (this._allows('prompt')) c = this._compressPrompt(c);
    if (this._allows('tech')) c = this._compressTechNames(c);

    if (this.level === 'light') {
      return this._allows('dynamic') ? this._applyDynamicDictionary(c) : c;
    }

    // Level 2: Standard — compress file paths and errors
    if (this._allows('files')) c = this._compressFilePaths(c);
    if (this._allows('diagnostics')) {
      c = this._compressErrors(c);
      c = this._compressDiagnostics(c);
    }

    // Apply dynamic dictionary LAST so regexes expecting \w+ still work
    if (this._allows('dynamic')) c = this._applyDynamicDictionary(c);

    return c;
  }

  _stripRedundancy(text) {
    return text
      .replace(/\/\*(?!\*)[^]*?\*\//g, '') // remove block comments (except JSDoc)
      .replace(/(?<![:"'])\/\/(?!\/).*/g, '') // remove inline comments
      .replace(/console\.(log|debug|info|trace)\([^)]*\);?/g, ''); // remove logs
  }

  _buildDynamicDictionary(text) {
    if (!this._allows('dynamic')) return;
    if (!text || this.dynamicDict.size >= this.providerProfile.maxDynamicEntries) return;

    // Find all potential identifiers (words >= 4 chars, containing letters)
    const words = text.match(/\b[A-Za-z_][A-Za-z0-9_]{3,}\b/g) || [];
    const counts = new Map();
    for (const w of words) {
      // Ignore common short keywords that aren't worth replacing
      if (['this', 'that', 'from', 'with', 'true', 'false', 'null'].includes(w)) continue;
      if (/^(?:OPENAI_KEY|GITHUB_TOKEN|AWS_ACCESS_KEY|JWT|BEARER_TOKEN|SECRET_ASSIGNMENT|EMAIL|IPV4)_\d+$/.test(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }

    const DYN_SYMBOLS = 'αβγδεζηθικλμνξοπρστυφχψωΓΔΘΛΞΠΣΦΨΩБВГДЖЗИКЛПФЦЧШЩЮЯ'.split('');

    const savings = [...counts.entries()].map(([word, freq]) => {
      // Assume replacement glyph is 1 char. Saving is frequency * (length - 1)
      return { word, freq, save: freq * (word.length - 1) };
    }).filter(x => x.save > this.providerProfile.dynamicMinSavedChars) // Provider-aware minimum savings threshold
      .sort((a, b) => b.save - a.save);

    for (const item of savings) {
      if (!this.dynamicDict.has(item.word) && this.dynamicCounter < DYN_SYMBOLS.length && this.dynamicCounter < this.providerProfile.maxDynamicEntries) {
        this.dynamicDict.set(item.word, DYN_SYMBOLS[this.dynamicCounter]);
        this.sourceMap.dynamic.push({
          glyph: DYN_SYMBOLS[this.dynamicCounter],
          original: item.word,
          frequency: item.freq,
          estimatedSavedChars: item.save,
          provider: this.provider,
          profile: this.providerProfile.strategy,
        });
        this.dynamicCounter++;
      }
    }
  }

  _applyDynamicDictionary(text) {
    let result = text;
    for (const [word, glyph] of this.dynamicDict) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      result = result.replace(regex, (match, offset, input) => {
        const span = this._spanForRange(input, offset, offset + match.length);
        this._recordReplacement('dynamic', match, glyph, { span });
        this._recordSymbol(glyph, match, 'dynamic', span);
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
          this._recordReplacement('prompt', original, compressed, { span });
          this._recordSymbol(compressed.trim().split(/\s+/)[0], original, 'prompt', span);
          return compressed;
        });
        break; // Only match first pattern
      }
    }
    return result;
  }

  _compressTechNames(text) {
    let result = text;
    // Sort by length to avoid partial matches (typescript before type)
    const entries = Object.entries(TECH_GLYPHS).sort((a, b) => b[0].length - a[0].length);
    for (const [name, glyph] of entries) {
      const regex = new RegExp(`\\b${name}\\b`, 'gi');
      result = result.replace(regex, (match, offset, input) => {
        const span = this._spanForRange(input, offset, offset + match.length);
        this._recordReplacement('tech', match, glyph, { span, canonical: name });
        this._recordSymbol(glyph, match, 'tech', span, { canonical: name });
        return glyph;
      });
    }
    return result;
  }

  _compressFilePaths(text) {
    // Replace file paths with indexed refs
    return text.replace(
      /(?:[\w\-./\\]+\/)?[\w\-]+\.(tsx?|jsx?|py|rs|go|rb|java|cs|vue|svelte|css|scss|ya?ml|json|md)/gi,
      (match, _extension, offset, input) => {
        const span = this._spanForRange(input, offset, offset + match.length);
        if (!this.fileIndex.has(match)) {
          this.fileCounter++;
          const domain = this._detectDomain(match);
          const glyph = DOMAIN_GLYPHS[domain] || '📄';
          this.fileIndex.set(match, `${glyph}₍${this.fileCounter}₎`);
          this.sourceMap.files.push({
            ref: this.fileIndex.get(match),
            path: match,
            domain,
            span,
          });
        }
        this._recordReplacement('file', match, this.fileIndex.get(match), { span });
        this._recordSymbol(this.fileIndex.get(match), match, 'file', span);
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
        this._recordReplacement('diagnostic', original, compressed, { span });
        this._recordSymbol(compressed, original, 'diagnostic', span);
        return compressed;
      });
    }
    return result;
  }

  _expandReplacement(replacement, groups) {
    return replacement.replace(/\$(\d+)/g, (_, index) => groups[Number(index) - 1] || '');
  }

  _compressDiagnostics(text) {
    return text
      .replace(/error TS(\d+):/gi, '✗TS$1:')
      .replace(/warning:/gi, '⚠:')
      .replace(/\bat line (\d+)/gi, ':$1')
      .replace(/on line (\d+)/gi, ':$1')
      .replace(/\bline (\d+)/gi, ':$1')
      .replace(/\bcolumn (\d+)/gi, 'c$1');
  }

  _compressCodeBlocks(text, userPrompt) {
    // Replace code blocks with semantic summaries or minification
    return text.replace(/`{3,}(\w*)\n([\s\S]+?)`{3,}/g, (match, lang, code, offset, input) => {
      const lines = code.trim().split('\n');
      const span = this._spanForRange(input, offset, offset + match.length);
      const codeStartOffset = offset + match.indexOf('\n') + 1;
      const tokens = this._extractCodeBlockTokens(code, lang, input, codeStartOffset);
      
      if (this.level === 'ultra' && this._allows('codeSummary')) {
        const summary = this._summarizeCode(lines, lang);
        const techGlyph = TECH_GLYPHS[lang] || '';
        const compressed = `[${techGlyph}${summary}]`;
        this.sourceMap.codeBlocks.push({
          mode: 'summary',
          lang: lang || 'text',
          originalLines: lines.length,
          originalChars: code.length,
          compressed,
          span,
          tokens,
        });
        this.sourceMap.ast.push(...tokens.map(token => ({ ...token, blockMode: 'summary' })));
        this._recordReplacement('codeBlock', `\`\`\`${lang}\n...\n\`\`\``, compressed, { lang: lang || 'text', mode: 'summary', span });
        this._recordSymbol(compressed, `\`\`\`${lang}\n...\n\`\`\``, 'codeBlock', span, { lang: lang || 'text', mode: 'summary' });
        return compressed;
      } else if (this._allows('codeMinify')) {
        // aggressive mode
        let minified = this._minifySyntax(code, lang);
        minified = this._elideIrrelevantContext(minified, userPrompt);
        const compressed = '```' + lang + '\n' + minified + '\n```';
        this.sourceMap.codeBlocks.push({
          mode: 'minified',
          lang: lang || 'text',
          originalLines: lines.length,
          originalChars: code.length,
          compressedChars: minified.length,
          span,
          tokens,
        });
        this.sourceMap.ast.push(...tokens.map(token => ({ ...token, blockMode: 'minified' })));
        return compressed;
      }
      return match;
    });
  }

  _extractCodeBlockTokens(code, lang, sourceText, codeStartOffset) {
    const l = (lang || '').toLowerCase();
    const tokens = [];
    const seen = new Set();
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
          lang: l || 'text',
          name: nameGroup ? match[nameGroup] : undefined,
          span,
        });
      }
    };

    if (['js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript'].includes(l) || !l) {
      addMatches(/\bimport\b/g, 'import', 'imp');
      addMatches(/\bexport\b/g, 'export', 'exp');
      addMatches(/\bfunction\s+([A-Za-z_$][\w$]*)/g, 'function', 'ƒ', 1);
      addMatches(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)/g, 'declaration', '◇', 1);
      addMatches(/\bclass\s+([A-Za-z_$][\w$]*)/g, 'class', '𝒞', 1);
    }
    if (['py', 'python'].includes(l) || !l) {
      addMatches(/\b(?:import|from)\b/g, 'import', 'imp');
      addMatches(/\bdef\s+([A-Za-z_][\w]*)/g, 'function', 'ƒ', 1);
      addMatches(/\bclass\s+([A-Za-z_][\w]*)/g, 'class', '𝒞', 1);
      addMatches(/\bself\./g, 'receiver', 's.');
    }
    if (['rs', 'rust'].includes(l) || !l) {
      addMatches(/\buse\b/g, 'import', 'imp');
      addMatches(/\bfn\s+([A-Za-z_][\w]*)/g, 'function', 'ƒ', 1);
      addMatches(/\bstruct\s+([A-Za-z_][\w]*)/g, 'class', '𝒞', 1);
      addMatches(/\b(?:pub|mut|impl|match)\b/g, 'modifier', 'mod');
    }
    if (['go', 'golang'].includes(l) || !l) {
      addMatches(/\bimport\b/g, 'import', 'imp');
      addMatches(/\bfunc\s+(?:\([^)]+\)\s+)?([A-Za-z_][\w]*)/g, 'function', 'ƒ', 1);
      addMatches(/\btype\s+([A-Za-z_][\w]*)\s+struct\b/g, 'class', '𝒞', 1);
      addMatches(/\bpackage\b/g, 'package', 'pkg');
    }
    if (['java', 'cs', 'csharp'].includes(l) || !l) {
      addMatches(/\b(?:import|using)\b/g, 'import', 'imp');
      addMatches(/\bclass\s+([A-Za-z_][\w]*)/g, 'class', '𝒞', 1);
      addMatches(/\b(?:public|private|protected)\b/g, 'visibility', 'vis');
      addMatches(/\bvoid\b/g, 'type', '◇t');
    }
    if (['c', 'cpp', 'c++', 'h', 'hpp'].includes(l) || !l) {
      addMatches(/#include\b/g, 'import', 'imp');
      addMatches(/\b(?:int|void|char|float|double|long|short)\b/g, 'type', '◇t');
    }

    addMatches(/\breturn\b/g, 'return', '→');
    addMatches(/\byield\b/g, 'yield', '→');

    return tokens.sort((a, b) => a.span.start.offset - b.span.start.offset);
  }

  _elideIrrelevantContext(code, userPrompt) {
    if (!userPrompt || userPrompt.length < 5) return code;
    
    // Extract keywords from user prompt to determine intent
    const intentKeywords = (userPrompt.match(/\b[A-Za-z0-9_]{3,}\b/g) || []).map(w => w.toLowerCase());
    if (intentKeywords.length === 0) return code;

    // A very fast, naive AST-like block elision using regex
    // Matches top-level or single-indent functions/classes: `function foo() { ... }`
    let result = code;
    const blockRegex = /^([ \t]*)(?:(?:export|public|private|async|static)\s+)*(?:function|class|def|fn|func|struct)\s+([A-Za-z0-9_]+)[^{]*\{([\s\S]*?)\n\1\}/gm;

    result = result.replace(blockRegex, (match, indent, name, body) => {
      const lowerMatch = match.toLowerCase();
      const isRelevant = intentKeywords.some(kw => lowerMatch.includes(kw));
      
      if (!isRelevant && body.split('\n').length > 5) {
        // Elide! Keep the signature, but replace body with ✂
        const signature = match.substring(0, match.indexOf('{') + 1);
        return `${signature} ✂ }`;
      }
      return match;
    });

    return result;
  }

  _minifySyntax(code, lang) {
    if (!code) return code;
    let c = code;
    const l = (lang || '').toLowerCase();

    // 1. Aggressive comment removal based on language family
    if (['js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript', 'java', 'cs', 'csharp', 'c', 'cpp', 'c++', 'h', 'hpp', 'go', 'golang', 'rs', 'rust'].includes(l) || !l) {
      c = c.replace(/\/\/.*$/gm, ''); // inline comments
      c = c.replace(/\/\*[\s\S]*?\*\//g, ''); // block comments
    }

    if (['py', 'python', 'rb', 'ruby', 'sh', 'bash', 'yaml', 'yml'].includes(l) || !l) {
      c = c.replace(/(?<!['"])\s*#.*$/gm, ''); // hash comments
    }

    if (['html', 'xml', 'vue', 'svelte'].includes(l) || !l) {
      c = c.replace(/<!--[\s\S]*?-->/g, ''); // HTML comments
    }

    if (['css', 'scss', 'less'].includes(l) || !l) {
      c = c.replace(/\/\*[\s\S]*?\*\//g, ''); // CSS comments
    }

    // 2. Cross-language common minifications
    c = c.replace(/\breturn\b/g, '→');
    c = c.replace(/^\s*[\r\n]/gm, ''); // Remove empty lines for ALL languages

    // 3. Keyword semantic minification
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

    // 4. Indentation minification (replace spaces with tabs)
    c = c.replace(/^[ \t]+/gm, (match) => {
      const spaces = match.replace(/\t/g, '    ').length;
      return '\t'.repeat(Math.max(1, Math.floor(spaces / 2))); // 2 spaces = 1 tab
    });

    return c;
  }

  _summarizeCode(lines, lang) {
    const parts = [];
    let imports = 0, funcs = 0, classes = 0, hooks = 0;

    for (const line of lines) {
      const t = line.trim();
      // Imports (JS, Py, Go, Rust, Java, C#)
      if (/^(?:import|from|use|using)\s/.test(t) || /^#include/.test(t)) imports++;
      // Functions (JS, Py, Rust, Go, Java/C#)
      if (
        /(?:function |const \w+\s*=\s*(?:\(|async ))/.test(t) || 
        /^\s*def\s+\w+/.test(t) || 
        /^\s*(?:pub\s+)?(?:async\s+)?fn\s+\w+/.test(t) || 
        /^\s*func\s+(?:\([^)]+\)\s+)?\w+/.test(t) ||
        /^\s*(?:public|private|protected|static|virtual|override|async|inline)*\s*[\w<>\[\]]+\s+\w+\s*\(/.test(t) && !t.includes(';') && !t.includes('new ')
      ) {
        funcs++;
      }
      // Classes/Structs (JS, Py, Rust, Go, Java, C#)
      if (/^(?:export\s+|public\s+|private\s+|pub\s+)?(?:class|struct|interface|trait|type\s+\w+\s+struct)\b/.test(t)) classes++;
      // React Hooks
      if (/^const\s+\[.*\]\s*=\s*use[A-Z]\w+/.test(t) || /^use[A-Z]\w+\(/.test(t)) hooks++;
    }

    if (imports) parts.push(`imp:${imports}`);
    if (funcs) parts.push(`ƒ:${funcs}`);
    if (classes) parts.push(`𝒞:${classes}`);
    if (hooks) parts.push(`⟳:${hooks}`);
    parts.push(`${lines.length}L`);

    return parts.join(' ');
  }

  _detectDomain(filepath) {
    const p = filepath.toLowerCase();
    if (/\.(tsx|jsx)$/.test(p) || /component|page|layout/i.test(p)) return 'frontend';
    if (/\.(controller|service|middleware|route)\./i.test(p)) return 'backend';
    if (/\.(test|spec)\./i.test(p)) return 'testing';
    if (/dockerfile|docker-compose|\.ya?ml$/i.test(p)) return 'devops';
    if (/migration|schema|seed/i.test(p)) return 'database';
    if (/\.md$/.test(p)) return 'documentation';
    if (/security|auth|guard/i.test(p)) return 'security';
    return 'language';
  }

  _estimateTokens(messages, provider = 'raw') {
    return estimateProviderTokens(messages, provider);
  }
}

// ═══════════════════════════════════════════════════════════
// PROVIDER ADAPTERS
// ═══════════════════════════════════════════════════════════

/**
 * Wrap an OpenAI client to automatically compress messages.
 * 
 * Usage:
 *   import OpenAI from 'openai';
 *   const client = new OpenAI({ apiKey: '...' });
 *   const compressed = wrapOpenAI(client);
 *   const response = await compressed.chat.completions.create({
 *     model: 'gpt-4',
 *     messages: [{ role: 'user', content: 'Fix the bug in app.tsx' }],
 *   });
 */
function wrapOpenAI(client, options = {}) {
  const compressor = new GlyphCompressor(options);
  const originalCreate = client.chat.completions.create.bind(client.chat.completions);

  client.chat.completions.create = async function (params) {
    const { messages: compressed, stats } = compressor.compressMessages(
      params.messages, 'openai'
    );
    console.log(`[GlyphCompress] ${stats.thisMessage.ratio} compression (${stats.thisMessage.savedPct} saved)`);
    return originalCreate({ ...params, messages: compressed });
  };

  client._glyphCompress = compressor;
  return client;
}

/**
 * Wrap an Anthropic client to automatically compress messages.
 * 
 * Usage:
 *   import Anthropic from '@anthropic-ai/sdk';
 *   const client = new Anthropic({ apiKey: '...' });
 *   const compressed = wrapAnthropic(client);
 *   const response = await compressed.messages.create({
 *     model: 'claude-sonnet-4-20250514',
 *     system: 'You are a coding assistant.',
 *     messages: [{ role: 'user', content: 'Fix the error in app.tsx' }],
 *   });
 */
function wrapAnthropic(client, options = {}) {
  const compressor = new GlyphCompressor(options);
  const originalCreate = client.messages.create.bind(client.messages);

  client.messages.create = async function (params) {
    // Anthropic uses a separate 'system' field
    const allMessages = [];
    
    let origSystemStr = '';
    if (typeof params.system === 'string') {
      origSystemStr = params.system;
    } else if (Array.isArray(params.system)) {
      origSystemStr = params.system.map(s => s.text).join('\n');
    }
    
    if (origSystemStr) {
      allMessages.push({ role: 'system', content: origSystemStr });
    }
    allMessages.push(...params.messages);

    const { messages: compressed } = compressor.compressMessages(allMessages, 'anthropic');

    // Split back into system + messages for Anthropic format
    const systemMsg = compressed.find(m => m.role === 'system');
    const otherMsgs = compressed.filter(m => m.role !== 'system');

    // For prompt caching in Anthropic, send system as an array with cache_control
    let systemParam = params.system;
    if (systemMsg) {
      systemParam = [
        {
          type: 'text',
          text: systemMsg.content,
          cache_control: { type: 'ephemeral' }
        }
      ];
    }

    // Inject cache_control into the largest user message to save massive token costs
    let largestMsgIdx = -1;
    let maxLen = 0;
    for (let i = 0; i < otherMsgs.length; i++) {
      if (otherMsgs[i].role === 'user') {
        const len = typeof otherMsgs[i].content === 'string' ? otherMsgs[i].content.length : JSON.stringify(otherMsgs[i].content).length;
        if (len > maxLen) {
          maxLen = len;
          largestMsgIdx = i;
        }
      }
    }

    if (largestMsgIdx !== -1) {
      const msg = otherMsgs[largestMsgIdx];
      if (typeof msg.content === 'string') {
        msg.content = [
          {
            type: 'text',
            text: msg.content,
            cache_control: { type: 'ephemeral' }
          }
        ];
      } else if (Array.isArray(msg.content) && msg.content.length > 0) {
        const textBlocks = msg.content.filter(b => b.type === 'text');
        if (textBlocks.length > 0) {
          textBlocks[textBlocks.length - 1].cache_control = { type: 'ephemeral' };
        }
      }
    }

    const result = await originalCreate({
      ...params,
      system: systemParam,
      messages: otherMsgs,
    });

    return result;
  };

  client._glyphCompress = compressor;
  return client;
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

// CommonJS for VS Code extension compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GlyphCompressor,
    wrapOpenAI,
    wrapAnthropic,
    CODEBOOK_PROMPT,
    DOMAIN_GLYPHS,
    TECH_GLYPHS,
  };
}

// ESM export for modern usage
export { GlyphCompressor, wrapOpenAI, wrapAnthropic, CODEBOOK_PROMPT, DOMAIN_GLYPHS, TECH_GLYPHS, PROVIDER_COMPRESSION_PROFILES, TRUST_POLICY_PROFILES };
