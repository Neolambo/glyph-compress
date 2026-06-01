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
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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
    dynamicMinSavedChars: 4,
    maxDynamicEntries: 80,
    codebookHint: 'Generic text profile with balanced dynamic dictionary compression.',
  },
  openai: {
    provider: 'openai',
    strategy: 'chat-compact',
    dynamicMinSavedChars: 4,
    maxDynamicEntries: 80,
    codebookHint: 'OpenAI chat profile favors compact repeated identifiers and low message overhead.',
  },
  anthropic: {
    provider: 'anthropic',
    strategy: 'cache-stable',
    dynamicMinSavedChars: 6,
    maxDynamicEntries: 64,
    codebookHint: 'Anthropic profile keeps the codebook stable for cache-friendly system prompts.',
  },
  gemini: {
    provider: 'gemini',
    strategy: 'structure-preserving',
    dynamicMinSavedChars: 4,
    maxDynamicEntries: 72,
    codebookHint: 'Gemini-compatible profile favors structural clarity with moderate dictionary growth.',
  },
  local: {
    provider: 'local',
    strategy: 'aggressive-local',
    dynamicMinSavedChars: 3,
    maxDynamicEntries: 96,
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
const COMPACT_CODEBOOK_PROMPT = `[GLYPH PROTOCOL v0.5]
DOM: ◈=frontend ◉=ai_ml ◊=devops ◆=database ◇=lang ⊕=auto ⊗=arch ⊙=mobile ⊘=cloud ⊚=data ⊛=test ⊜=backend ⊝=security ⊞=docs ⊟=perf ⊠=net
TECH: ᵗ=TS ʲˢ=JS ᵖ=Py ʳ=Rust ᵍ=Go ℜ=React ℕ=Next 𝕍=Vue 𝒟=Docker 𝒦=K8s 𝒯=Terraform ℙ=PG ᵣ=Redis ℒ=LLM α=Agent
SYM: ✗=err ⚠=warn ∉=type_err ∅=missing →=return/yield ƒ=function/def/fn 𝒞=class/struct ◇=var/const/let ◇t=type/int/void ⟿=effect ⺌=fix ⺋=perf ⺎=review ⺃=debug ⺏=deploy ▲=create ●=refactor ►=test ■=doc
MOD: +=pub/public -=private #=protected m=mut I=impl ?=match pkg=package s.=self.
FILE: ₍N₎=file_index :L=line [NL]=line_count imp=imports exp=exports ⟳=hooks
Decode:
[/GLYPH]`;
const COMPACT_CODEBOOK_DOM_ENTRIES = [
  ['◈', 'frontend'], ['◉', 'ai_ml'], ['◊', 'devops'], ['◆', 'database'],
  ['◇', 'lang'], ['⊕', 'auto'], ['⊗', 'arch'], ['⊙', 'mobile'],
  ['⊘', 'cloud'], ['⊚', 'data'], ['⊛', 'test'], ['⊜', 'backend'],
  ['⊝', 'security'], ['⊞', 'docs'], ['⊟', 'perf'], ['⊠', 'net'],
];
const COMPACT_CODEBOOK_TECH_ENTRIES = [
  ['ᵗ', 'TS'], ['ʲˢ', 'JS'], ['ᵖ', 'Py'], ['ʳ', 'Rust'], ['ᵍ', 'Go'],
  ['ℜ', 'React'], ['ℕ', 'Next'], ['𝕍', 'Vue'], ['𝒟', 'Docker'], ['𝒦', 'K8s'],
  ['𝒯', 'Terraform'], ['ℙ', 'PG'], ['ᵣ', 'Redis'], ['ℒ', 'LLM'], ['α', 'Agent'],
];
const COMPACT_CODEBOOK_SYM_ENTRIES = [
  ['✗', 'err'], ['⚠', 'warn'], ['∉', 'type_err'], ['∅', 'missing'], ['→', 'return/yield'],
  ['ƒ', 'function/def/fn'], ['𝒞', 'class/struct'], ['◇t', 'type/int/void'], ['⟿', 'effect'],
  ['⺌', 'fix'], ['⺋', 'perf'], ['⺎', 'review'], ['⺃', 'debug'], ['⺏', 'deploy'],
  ['▲', 'create'], ['●', 'refactor'], ['►', 'test'], ['■', 'doc'], ['◇', 'var/const/let'],
];
const COMPACT_CODEBOOK_MOD_ENTRIES = [
  ['+=', 'pub/public'], ['-=', 'private'], ['#', 'protected'], ['m', 'mut'],
  ['I', 'impl'], ['?', 'match'], ['pkg', 'package'], ['s.', 'self.'],
];
const COMPACT_CODEBOOK_FILE_LINE = '₍N₎=file_index :L=line [NL]=line_count imp=imports exp=exports ⟳=hooks';

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
    this.workspacePath = options.workspacePath || options.cacheKey || null;
    this.cacheFile = null;
    this._initCache();
    this.attentionalDecay = options.attentionalDecay === true || options.decay === true;
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
      this.level = candidate.level;
      const result = this._compressMessagesForStrategy(messages, provider, origTokens, baseState, candidate);
      this._restoreCompressionState(trialState);

      if (!bestResult || result.compressedTokens < bestResult.compressedTokens) {
        bestResult = result;
      }
    }

    this.level = bestResult.level;
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
          ratio: (origTokens / Math.max(1, bestResult.compressedTokens)).toFixed(1) + 'x',
          savedPct: ((1 - bestResult.compressedTokens / Math.max(1, origTokens)) * 100).toFixed(0) + '%',
          fallback: bestResult.fallback,
          selectedLevel: bestResult.level,
        },
      },
    };
  }

  _compressMessagesForStrategy(messages, provider, origTokens, baseState, candidate) {
    this.resetSourceMap();

    const rolesToCompress = this.attentionalDecay ? new Set(['user', 'assistant']) : new Set(candidate.roles || ['user']);
    const allCompressibleText = messages
      .filter((m) => rolesToCompress.has(m.role))
      .map((m) => this._normalizeMessageContent(m.content))
      .join('\n');
    const safeText = this._applyPrivacyFirewall(allCompressibleText, false);
    this._buildDynamicDictionary(safeText);

    const compressed = messages.map((msg, index) => {
      if (!rolesToCompress.has(msg.role)) return msg;

      if (this.attentionalDecay) {
        const d = messages.length - 1 - index;
        if (d === 0) {
          return {
            ...msg,
            content: this._compressUserMessage(msg.content, safeText),
          };
        } else if (d <= 3) {
          const prevLevel = this.level;
          this.level = 'ultra';
          const result = this._compressUserMessage(msg.content, safeText);
          this.level = prevLevel;
          return { ...msg, content: result };
        } else if (d <= 6) {
          const prevLevel = this.level;
          this.level = 'ultra';
          const compressedText = this._compressUserMessage(msg.content, safeText);
          this.level = prevLevel;
          const decayed = compressedText.replace(/```([^\n\r]*?)[\r\n]+([\s\S]*?)[\r\n]+\s*```/g, (match, lang, code) => {
            const lines = code.split('\n').length;
            const language = lang || 'code';
            return `// [Summary: ${language} block, ${lines} lines]`;
          });
          return { ...msg, content: decayed };
        } else {
          let cleanText = msg.content
            .replace(/```[\s\S]*?```/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleanText.length > 120) {
            cleanText = cleanText.slice(0, 120) + '...';
          }
          const decayed = `[Radical Summary: ${cleanText}]`;
          return { ...msg, content: decayed };
        }
      }

      return {
        ...msg,
        content: this._compressUserMessage(msg.content, safeText),
      };
    });

    const firstSystemIndex = compressed.findIndex((msg) => msg.role === 'system');

    if (firstSystemIndex >= 0) {
      compressed[firstSystemIndex] = {
        ...compressed[firstSystemIndex],
        content: this._injectCodebook(compressed[firstSystemIndex].content, provider, compressed),
      };
    } else {
      compressed.unshift({
        role: 'system',
        content: this._injectCodebook('', provider, compressed).trim(),
      });
    }

    const compTokens = this._estimateTokens(compressed, provider);
    const fallback = this.provider !== 'raw' && compTokens >= origTokens;

    return {
      level: candidate.level,
      messages: fallback ? messages.map((msg) => ({ ...msg })) : compressed,
      compressedTokens: fallback ? origTokens : compTokens,
      sourceMap: fallback ? this._createSourceMap() : this.getSourceMap(),
      fallback,
      state: fallback ? baseState : this._captureCompressionState(),
    };
  }

  _candidateMessageStrategies(messages = []) {
    const levels = this.provider === 'raw' || this.level === 'light'
      ? [this.level]
      : [this.level, 'light'];
    const strategies = levels.map((level) => ({ level, roles: ['user'] }));

    if (this.provider !== 'raw' && messages.some((message) => message.role === 'assistant')) {
      for (const level of levels) {
        strategies.push({ level, roles: ['user', 'assistant'] });
      }
    }

    return strategies;
  }

  _captureCompressionState() {
    return {
      level: this.level,
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
        replacements: [...this.sourceMap.replacements],
      },
    };
  }

  _restoreCompressionState(state) {
    this.level = state.level;
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
      replacements: [...state.sourceMap.replacements],
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

    this._saveCache();

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
  getCodebookPrompt(messages = []) {
    let prompt = this._codebookPromptForProvider(messages);
    if (this.fileIndex.size > 0) {
      const files = [...this.fileIndex].map(([path, ref]) => `${ref}=${path}`).join(' | ');
      prompt = prompt.replace('[/GLYPH]', `FILES: ${files}\n[/GLYPH]`);
    }
    return prompt;
  }

  _prepareAnthropicPayload(systemInput, messages = []) {
    const allMessages = [];
    const originalSystemText = this._anthropicSystemText(systemInput);

    if (originalSystemText) {
      allMessages.push({ role: 'system', content: originalSystemText });
    }
    allMessages.push(...messages);

    const { messages: compressed } = this.compressMessages(allMessages, 'anthropic');
    const systemMsg = compressed.find((message) => message.role === 'system');
    const otherMsgs = compressed
      .filter((message) => message.role !== 'system')
      .map((message) => ({ ...message }));

    const useStructuredSystem = messages.some((message) => message.role === 'assistant');
    let systemParam = systemInput;
    if (systemMsg) {
      systemParam = useStructuredSystem
        ? this._buildAnthropicSystemParam(systemMsg.content, originalSystemText)
        : systemMsg.content;
    }

    this._markLargestAnthropicUserBlock(otherMsgs);

    return {
      system: systemParam,
      messages: otherMsgs,
    };
  }

  _anthropicSystemText(systemInput) {
    if (typeof systemInput === 'string') {
      return systemInput;
    }

    if (Array.isArray(systemInput)) {
      return systemInput
        .map((entry) => (entry && typeof entry === 'object' && 'text' in entry ? entry.text : ''))
        .filter(Boolean)
        .join('\n');
    }

    return '';
  }

  _buildAnthropicSystemParam(systemContent, originalSystemText = '') {
    const parsed = this._parseInjectedCodebook(systemContent);
    const systemBlocks = [];

    if (parsed.hasProtocol) {
      systemBlocks.push({
        type: 'text',
        text: this._anthropicStableProtocolBlock(),
        cache_control: { type: 'ephemeral' },
      });
    }

    const resolvedSystemText = parsed.originalSystemText || originalSystemText;
    if (resolvedSystemText) {
      systemBlocks.push({
        type: 'text',
        text: resolvedSystemText,
        cache_control: { type: 'ephemeral' },
      });
    }

    if (parsed.dynamicLine) {
      systemBlocks.push({
        type: 'text',
        text: `[GLYPH DYNAMIC]\n${parsed.dynamicLine}`,
      });
    }

    if (systemBlocks.length === 0 && systemContent) {
      systemBlocks.push({
        type: 'text',
        text: systemContent,
        cache_control: { type: 'ephemeral' },
      });
    }

    return systemBlocks;
  }

  _parseInjectedCodebook(systemContent = '') {
    if (typeof systemContent !== 'string' || !systemContent.startsWith('[GLYPH PROTOCOL')) {
      return {
        hasProtocol: false,
        originalSystemText: systemContent || '',
        dynamicLine: '',
      };
    }

    const closingMarker = '[/GLYPH]';
    const closingIndex = systemContent.indexOf(closingMarker);
    if (closingIndex === -1) {
      return {
        hasProtocol: false,
        originalSystemText: systemContent,
        dynamicLine: '',
      };
    }

    const codebookText = systemContent.slice(0, closingIndex + closingMarker.length);
    const originalSystemText = systemContent.slice(closingIndex + closingMarker.length).replace(/^\s+/, '');
    const dynamicLine = codebookText.split('\n').find((line) => line.startsWith('DYN: ')) || '';

    return {
      hasProtocol: true,
      originalSystemText,
      dynamicLine,
    };
  }

  _anthropicStableProtocolBlock() {
    return COMPACT_CODEBOOK_PROMPT.replace(
      '[/GLYPH]',
      `PROFILE: ${this.providerProfile.provider}/${this.providerProfile.strategy}\n[/GLYPH]`,
    );
  }

  _markLargestAnthropicUserBlock(messages = []) {
    let largestMsgIdx = -1;
    let maxLen = 0;

    for (let i = 0; i < messages.length; i += 1) {
      if (messages[i].role !== 'user') continue;
      const len = typeof messages[i].content === 'string'
        ? messages[i].content.length
        : JSON.stringify(messages[i].content).length;
      if (len > maxLen) {
        maxLen = len;
        largestMsgIdx = i;
      }
    }

    if (largestMsgIdx === -1) return;

    const msg = messages[largestMsgIdx];
    if (typeof msg.content === 'string') {
      msg.content = [
        {
          type: 'text',
          text: msg.content,
          cache_control: { type: 'ephemeral' },
        },
      ];
      return;
    }

    if (Array.isArray(msg.content) && msg.content.length > 0) {
      const textBlocks = msg.content.filter((block) => block.type === 'text');
      if (textBlocks.length > 0) {
        textBlocks[textBlocks.length - 1].cache_control = { type: 'ephemeral' };
      }
    }
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
    const sourceMap = {
      ...this.sourceMap,
      files: [...this.sourceMap.files],
      dynamic: [...this.sourceMap.dynamic],
      diagnostics: [...this.sourceMap.diagnostics],
      codeBlocks: [...this.sourceMap.codeBlocks],
      ast: [...this.sourceMap.ast],
      privacy: [...this.sourceMap.privacy],
      symbols: [...this.sourceMap.symbols],
      replacements: [...this.sourceMap.replacements],
    };
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

  _initCache() {
    try {
      if (this.workspacePath) {
        const homedir = os.homedir();
        const cacheDir = path.join(homedir, '.glyphcompress', 'cache');
        const hash = createHash('sha256').update(this.workspacePath).digest('hex').slice(0, 16);
        this.cacheFile = path.join(cacheDir, `${hash}.json`);
        this._loadCache();
      }
    } catch (e) {
      // Fail silently
    }
  }

  _loadCache() {
    if (!this.cacheFile) return;
    try {
      if (fs.existsSync(this.cacheFile)) {
        const raw = fs.readFileSync(this.cacheFile, 'utf8');
        const data = JSON.parse(raw);
        if (data.fileIndex && Array.isArray(data.fileIndex)) {
          this.fileIndex = new Map(data.fileIndex);
          this.fileCounter = typeof data.fileCounter === 'number' ? data.fileCounter : this.fileIndex.size;
        }
        if (data.dynamicDict && Array.isArray(data.dynamicDict)) {
          this.dynamicDict = new Map(data.dynamicDict);
          this.dynamicCounter = typeof data.dynamicCounter === 'number' ? data.dynamicCounter : this.dynamicDict.size;
        }
      }
    } catch (e) {
      // Fail silently
    }
  }

  _saveCache() {
    if (!this.cacheFile) return;
    try {
      const cacheDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      const data = {
        fileIndex: [...this.fileIndex.entries()],
        dynamicDict: [...this.dynamicDict.entries()],
        fileCounter: this.fileCounter,
        dynamicCounter: this.dynamicCounter
      };
      fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      // Fail silently
    }
  }

  // ─── INTERNAL METHODS ──────────────────────────────────────

  _createSourceMap() {
    return {
      version: '1.14.0',
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

  _injectCodebook(systemPrompt, provider, messages = []) {
    // Don't double-inject
    if (systemPrompt.includes('[GLYPH PROTOCOL')) return systemPrompt;

    this._setProvider(provider);

    let modifiedCodebook = this._codebookPromptForProvider(messages);
    const payloadText = this._payloadTextForCodebook(messages);
    const usedDynamicEntries = [...this.dynamicDict]
      .filter(([, glyph]) => payloadText.includes(glyph))
      .map(([word, glyph]) => `${glyph}=${word}`);
    if (usedDynamicEntries.length > 0) {
      const dyn = usedDynamicEntries.join(' | ');
      modifiedCodebook = modifiedCodebook.replace('[/GLYPH]', `DYN: ${dyn}\n[/GLYPH]`);
    }

    if (this.provider !== 'raw') {
      modifiedCodebook = modifiedCodebook.replace('[/GLYPH]', `PROFILE: ${this.providerProfile.provider}/${this.providerProfile.strategy}\n[/GLYPH]`);
    }

    // Prepend codebook (it's small: ~150 tokens)
    return modifiedCodebook + '\n\n' + systemPrompt;
  }

  _codebookPromptForProvider() {
    return this.provider === 'raw' ? CODEBOOK_PROMPT : this._buildMinimalCompactCodebookPrompt(...arguments);
  }

  _buildMinimalCompactCodebookPrompt(messages = []) {
    if (!messages.length) {
      return COMPACT_CODEBOOK_PROMPT;
    }

    const payloadText = this._payloadTextForCodebook(messages);
    const usedDynamicGlyphs = new Set(
      [...this.dynamicDict]
        .filter(([, glyph]) => payloadText.includes(glyph))
        .map(([, glyph]) => glyph),
    );
    const lines = ['[GLYPH PROTOCOL v0.5]'];
    const domLine = this._codebookLineFromEntries('DOM', COMPACT_CODEBOOK_DOM_ENTRIES, payloadText);
    const techLine = this._codebookLineFromEntries('TECH', COMPACT_CODEBOOK_TECH_ENTRIES, payloadText, usedDynamicGlyphs);
    const symLine = this._codebookLineFromEntries('SYM', COMPACT_CODEBOOK_SYM_ENTRIES, payloadText);
    const modLine = this._codebookLineFromEntries('MOD', COMPACT_CODEBOOK_MOD_ENTRIES, payloadText);
    const needsFileLine = this._payloadNeedsFileCodebook(payloadText);

    if (domLine) lines.push(domLine);
    if (techLine) lines.push(techLine);
    if (symLine) lines.push(symLine);
    if (modLine) lines.push(modLine);
    if (needsFileLine) lines.push(`FILE: ${COMPACT_CODEBOOK_FILE_LINE}`);
    lines.push('Decode:');
    lines.push('[/GLYPH]');
    return lines.join('\n');
  }

  _codebookLineFromEntries(section, entries, payloadText, excludedGlyphs = new Set()) {
    const usedEntries = entries.filter(([glyph]) => !excludedGlyphs.has(glyph) && payloadText.includes(glyph));
    if (usedEntries.length === 0) return '';
    return `${section}: ${usedEntries.map(([glyph, label]) => `${glyph}=${label}`).join(' ')}`;
  }

  _payloadNeedsFileCodebook(payloadText) {
    return /₍\d+₎/.test(payloadText)
      || payloadText.includes(':L')
      || payloadText.includes('[NL]')
      || payloadText.includes('imp')
      || payloadText.includes('exp')
      || payloadText.includes('⟳');
  }

  _payloadTextForCodebook(messages = []) {
    return messages
      .filter((message) => message.role !== 'system')
      .map((message) => this._normalizeMessageContent(message.content))
      .join('\n');
  }

  _compressUserMessage(content, allUserText) {
    if (!content) return content;

    let c = this._applyPrivacyFirewall(this._normalizeMessageContent(content));
    c = c.replace(/[ \t]+/g, ' ');
    c = c.replace(/\n{3,}/g, '\n\n');
    c = c.replace(/[ \t]+$/gm, '');
    c = this._compressVerbosePhrases(c);

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
    if (this._allows('files')) c = this._compressFilePaths(c);

    if (this.level === 'light') {
      return this._allows('dynamic') ? this._applyDynamicDictionary(c) : c;
    }

    // Level 2: Standard — compress errors
    if (this._allows('diagnostics')) {
      c = this._compressErrors(c);
      c = this._compressDiagnostics(c);
    }

    // Apply dynamic dictionary LAST so regexes expecting \w+ still work
    if (this._allows('dynamic')) c = this._applyDynamicDictionary(c);

    return c;
  }

  _compressVerbosePhrases(text) {
    return text
      // English
      .replace(/\bI need you to\b/gi, '')
      .replace(/\bcan you (please )?/gi, '')
      .replace(/\bplease\b/gi, '')
      .replace(/\bthe following\b/gi, 'this')
      .replace(/\bin order to\b/gi, 'to')
      .replace(/\bas well as\b/gi, '&')
      .replace(/\bmake sure (that )?/gi, 'ensure ')
      .replace(/\btake a look at\b/gi, 'check')
      .replace(/\bcould you\b/gi, '')
      .replace(/\bI would like you to\b/gi, '')
      .replace(/\bI want you to\b/gi, '')
      // Italian
      .replace(/\bho bisogno che (tu )?/gi, '')
      .replace(/\bpuoi (per favore )?/gi, '')
      .replace(/\bper favore\b/gi, '')
      .replace(/\bper cortesia\b/gi, '')
      .replace(/\bvorrei che (tu )?/gi, '')
      .replace(/\bpotresti\b/gi, '')
      .replace(/\bdai un'?occhiata a\b/gi, 'check')
      .replace(/\bin modo da\b/gi, 'per')
      .replace(/\bmi serve che\b/gi, '')
      .replace(/\bspiegami come\b/gi, 'spiega')
      // German
      .replace(/\bich m[öo]chte,? dass (du )?/gi, '')
      .replace(/\bk[öo]nntest du (bitte )?/gi, '')
      .replace(/\bbitte\b/gi, '')
      .replace(/\bschau dir mal\b/gi, 'check')
      .replace(/\bich brauche,? dass\b/gi, '')
      .replace(/\bum zu\b/gi, 'zu')
      // French
      .replace(/\bj'ai besoin que (tu )?/gi, '')
      .replace(/\bpeux-tu (s'il te pla[iî]t )?/gi, '')
      .replace(/\bs'il (te|vous) pla[iî]t\b/gi, '')
      .replace(/\bje voudrais que (tu )?/gi, '')
      .replace(/\bpourrais-tu\b/gi, '')
      .replace(/\bjette un [œo]il [àa]\b/gi, 'check')
      .replace(/\bafin de\b/gi, 'pour')
      .replace(/[ \t]+/g, ' ')
      .trim();
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

    const words = text.match(/\b[A-Za-z_][A-Za-z0-9_]{2,}\b/g) || [];
    const counts = new Map();
    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'true', 'false', 'null', 'not', 'are', 'was', 'has', 'have', 'been', 'will', 'can']);
    for (const w of words) {
      if (stopWords.has(w.toLowerCase())) continue;
      if (/^(?:OPENAI_KEY|GITHUB_TOKEN|AWS_ACCESS_KEY|JWT|BEARER_TOKEN|SECRET_ASSIGNMENT|EMAIL|IPV4)_\d+$/.test(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }

    const bigramPattern = /\b([A-Za-z_][A-Za-z0-9_]{2,})\s+([A-Za-z_][A-Za-z0-9_]{2,})\b/g;
    for (const match of text.matchAll(bigramPattern)) {
      const bigram = match[1] + ' ' + match[2];
      if (bigram.length >= 6 && !stopWords.has(match[1].toLowerCase()) && !stopWords.has(match[2].toLowerCase())) {
        counts.set(bigram, (counts.get(bigram) || 0) + 1);
      }
    }

    const DYN_SYMBOLS = 'αβγδεζηθικλμνξοπρστυφχψωΓΔΘΛΞΠΣΦΨΩБВГДЖЗИКЛПФЦЧШЩЮЯ'.split('');

    const savings = [...counts.entries()].map(([word, freq]) => {
      return { word, freq, save: freq * (word.length - 1) };
    }).filter(x => x.save > this.providerProfile.dynamicMinSavedChars)
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
    const charsPerToken = ({ raw: 4, openai: 3.8, anthropic: 3.5, gemini: 4, local: 4 }[this.provider] || 4);
    for (const [word, glyph] of this.dynamicDict) {
      const origTokenCost = word.length / charsPerToken;
      const glyphTokenCost = glyph.length / charsPerToken + 1.5 * glyph.length;
      if (this.provider !== 'raw' && glyphTokenCost >= origTokenCost) continue;
      if (!this._dynRegexCache) this._dynRegexCache = new Map();
      let regex = this._dynRegexCache.get(word);
      if (!regex) {
        regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        this._dynRegexCache.set(word, regex);
      }
      regex.lastIndex = 0;
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
    const entries = Object.entries(TECH_GLYPHS).sort((a, b) => b[0].length - a[0].length);
    const charsPerToken = this.providerProfile ? ({ raw: 4, openai: 3.8, anthropic: 3.5, gemini: 4, local: 4 }[this.provider] || 4) : 4;
    for (const [name, glyph] of entries) {
      const glyphUnicodeCost = 1.5;
      const origTokenCost = name.length / charsPerToken;
      const glyphTokenCost = glyph.length / charsPerToken + glyphUnicodeCost * glyph.length;
      if (this.provider !== 'raw' && glyphTokenCost >= origTokenCost) continue;
      if (!this._techRegexCache) this._techRegexCache = new Map();
      let regex = this._techRegexCache.get(name);
      if (!regex) {
        regex = new RegExp(`\\b${name}\\b`, 'gi');
        this._techRegexCache.set(name, regex);
      }
      regex.lastIndex = 0;
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
    return text.replace(
      /(?:@[\w-]+\/)?(?:[\w\-./\\]+[\/\\])?[\w\-]+\.(tsx?|jsx?|py|rs|go|rb|java|cs|vue|svelte|css|scss|less|ya?ml|json|toml|md|sql|sh|bash|dockerfile|proto|graphql)/gi,
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
    const anthropicPayload = compressor._prepareAnthropicPayload(params.system, params.messages);

    const result = await originalCreate({
      ...params,
      system: anthropicPayload.system,
      messages: anthropicPayload.messages,
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
    PROVIDER_COMPRESSION_PROFILES,
    TRUST_POLICY_PROFILES,
  };
}

// ESM export for modern usage
export { GlyphCompressor, wrapOpenAI, wrapAnthropic, CODEBOOK_PROMPT, DOMAIN_GLYPHS, TECH_GLYPHS, PROVIDER_COMPRESSION_PROFILES, TRUST_POLICY_PROFILES };
