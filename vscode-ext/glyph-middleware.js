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
import { routeContext } from '../src/workspace-intelligence.js';
import { loadTeamCodebook } from '../src/team-codebook.js';

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

// Measured real token cost of [word, glyph] for every TECH_GLYPHS entry,
// captured with js-tiktoken against cl100k_base and o200k_base — see
// `test/tokenizer-calibration.js` (`npm run calibrate:tokenizer` to
// regenerate this table if TECH_GLYPHS changes). Format per entry:
// [wordTokensCl100k, wordTokensO200k, glyphTokensCl100k, glyphTokensO200k].
//
// The finding that produced this table: on real OpenAI tokenizers, EVERY
// one of these 28 glyphs costs as many or more tokens than the English
// word it replaces (common tech names are already efficiently merged into
// 1-2 BPE tokens; the char-count-based heuristic previously used for the
// breakeven check couldn't see that, since it estimated the word's cost
// from its length instead of its real token count). "express" -> 5 tokens
// vs "express" itself at 1 token is the worst case. Only measured for
// OpenAI so far — Anthropic and Gemini keep the character-based heuristic
// until they get their own calibration pass (see ROADMAP.md).
const MEASURED_TECH_GLYPH_TOKENS_OPENAI = {
  typescript: [1, 1, 3, 3], javascript: [1, 1, 4, 4], python: [1, 1, 3, 3], rust: [1, 1, 2, 2],
  go: [1, 1, 3, 3], java: [1, 1, 2, 2], csharp: [2, 2, 3, 3], swift: [1, 1, 2, 2], ruby: [1, 1, 3, 3],
  react: [1, 1, 2, 2], nextjs: [2, 2, 2, 2], vue: [1, 1, 3, 3], angular: [1, 1, 3, 3], svelte: [2, 2, 3, 3],
  django: [1, 1, 3, 3], rails: [1, 1, 2, 2], express: [1, 1, 5, 5], fastapi: [2, 2, 3, 3], docker: [1, 1, 3, 3],
  kubernetes: [2, 2, 3, 3], terraform: [1, 1, 3, 3], postgres: [1, 1, 2, 2], mysql: [1, 1, 2, 2],
  mongodb: [1, 1, 2, 2], redis: [1, 1, 3, 3], llm: [2, 2, 2, 2], agent: [1, 1, 1, 1], prompt: [1, 1, 1, 1],
};

// Every glyph emitted by _compressTechNames() below is drawn from TECH_GLYPHS,
// so the printed codebook lines are generated FROM this same map (see
// COMPACT_CODEBOOK_TECH_ENTRIES) instead of a hand-maintained subset, which
// previously let 13/28 tech glyphs (Java, C#, Swift, Ruby, Angular, Svelte,
// Django, Rails, Express, FastAPI, MySQL, MongoDB, "prompt") reach the model
// without ever being documented in the injected codebook.
const TECH_LABEL_OVERRIDES = {
  typescript: 'TS', javascript: 'JS', python: 'Py', csharp: 'C#',
  nextjs: 'Next', kubernetes: 'K8s', postgres: 'PG', mongodb: 'Mongo',
  llm: 'LLM', fastapi: 'FastAPI',
};

function _techLabel(name) {
  return TECH_LABEL_OVERRIDES[name] || name.charAt(0).toUpperCase() + name.slice(1);
}

// ═══════════════════════════════════════════════════════════
// AUTOMATIC LEVEL SELECTION
// ═══════════════════════════════════════════════════════════

// compressMessages() already tries the user-configured level against
// 'light' and keeps whichever measures fewer tokens (see
// _candidateMessageStrategies), but it never tries 'aggressive'/'ultra' —
// so a user stuck on 'standard' never discovers that a code-heavy payload
// would compress much better under code minification/summary. And
// compressText() (the CLI's method) has no multi-candidate trial at all;
// it applies whatever level was configured, once. selectCompressionLevel()
// gives both paths a real starting point instead of a fixed default,
// based on cheap, content-derived signals rather than a guess:
//   - very short text: 'light' — heavier transforms have near-zero room to
//     help and only add fidelity risk for no measurable benefit.
//   - code-dominated text: 'aggressive', or 'ultra' once it's also long
//     enough that full architectural summarization has something
//     meaningful to amortize against.
//   - otherwise: 'standard'.
const CODE_LINE_PATTERN = /^\s*(?:import\s|export\s|from\s|def\s|class\s|function\s|const\s|let\s|var\s|return\s|if\s*\(|for\s*\(|while\s*\(|#include|using\s|package\s|public\s|private\s|protected\s|@\w+|.*[{};]\s*$|.*=>\s*\{?\s*$)/;

function selectCompressionLevel(text) {
  if (typeof text !== 'string') return 'standard';
  const trimmed = text.trim();
  if (trimmed.length < 120) return 'light';

  const fencedBlocks = trimmed.match(/```[\s\S]*?```/g) || [];
  const fencedChars = fencedBlocks.reduce((sum, block) => sum + block.length, 0);
  const fencedRatio = fencedChars / trimmed.length;

  const lines = trimmed.split('\n').filter((line) => line.trim().length > 0);
  const codeLines = lines.filter((line) => CODE_LINE_PATTERN.test(line));
  const lineCodeRatio = lines.length > 0 ? codeLines.length / lines.length : 0;

  const codeRatio = Math.max(fencedRatio, lineCodeRatio);

  if (codeRatio >= 0.55 && trimmed.length > 600) return 'ultra';
  if (codeRatio >= 0.3) return 'aggressive';
  return 'standard';
}

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

const COMPACT_CODEBOOK_DOM_ENTRIES = [
  ['◈', 'frontend'], ['◉', 'ai_ml'], ['◊', 'devops'], ['◆', 'database'],
  ['◇', 'lang'], ['⊕', 'auto'], ['⊗', 'arch'], ['⊙', 'mobile'],
  ['⊘', 'cloud'], ['⊚', 'data'], ['⊛', 'test'], ['⊜', 'backend'],
  ['⊝', 'security'], ['⊞', 'docs'], ['⊟', 'perf'], ['⊠', 'net'],
];
// Generated from TECH_GLYPHS (single source of truth) so every glyph the
// compressor can emit is guaranteed to be documented here — see the note
// above TECH_LABEL_OVERRIDES.
const COMPACT_CODEBOOK_TECH_ENTRIES = Object.entries(TECH_GLYPHS)
  .map(([name, glyph]) => [glyph, _techLabel(name)]);
const TECH_CODEBOOK_LINE = COMPACT_CODEBOOK_TECH_ENTRIES.map(([g, l]) => `${g}=${l}`).join(' ');
const CODEBOOK_PROMPT = `[GLYPH PROTOCOL v0.5]
Context uses compressed glyphs. Decode:
DOM: ◈=frontend ◉=ai_ml ◊=devops ◆=database ◇=lang ⊕=auto ⊗=arch ⊙=mobile ⊘=cloud ⊚=data ⊛=test ⊜=backend ⊝=security ⊞=docs ⊟=perf ⊠=net
TECH: ${TECH_CODEBOOK_LINE}
SYM: ✗=err ⚠=warn ∉=type_err ∅=missing →=return/yield ƒ=function/def/fn 𝒞=class/struct ◇=var/const/let ◇t=type/int/void ⟿=effect ⺌=fix ⺋=perf ⺎=review ⺃=debug ⺏=deploy ▲=create ●=refactor ►=test ■=doc
MOD: +=pub/public -=private #=protected m=mut I=impl ?=match pkg=package s.=self.
FILE: ₍N₎=file_index :L=line [NL]=line_count imp=imports exp=exports ⟳=hooks
DYNFMT: §N=Nth most-frequent repeated word/phrase in this request (see DYN line)
Respond normally. Context below uses these glyphs for brevity.
[/GLYPH]`;
const COMPACT_CODEBOOK_PROMPT = `[GLYPH PROTOCOL v0.5]
DOM: ◈=frontend ◉=ai_ml ◊=devops ◆=database ◇=lang ⊕=auto ⊗=arch ⊙=mobile ⊘=cloud ⊚=data ⊛=test ⊜=backend ⊝=security ⊞=docs ⊟=perf ⊠=net
TECH: ${TECH_CODEBOOK_LINE}
SYM: ✗=err ⚠=warn ∉=type_err ∅=missing →=return/yield ƒ=function/def/fn 𝒞=class/struct ◇=var/const/let ◇t=type/int/void ⟿=effect ⺌=fix ⺋=perf ⺎=review ⺃=debug ⺏=deploy ▲=create ●=refactor ►=test ■=doc
MOD: +=pub/public -=private #=protected m=mut I=impl ?=match pkg=package s.=self.
FILE: ₍N₎=file_index :L=line [NL]=line_count imp=imports exp=exports ⟳=hooks
DYNFMT: §N=Nth most-frequent repeated word/phrase in this request (see DYN line)
Decode:
[/GLYPH]`;
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

  _resolveBaseLevel(messages = []) {
    if (this.level !== 'auto') return this.level;
    const userText = messages
      .filter((m) => m.role === 'user')
      .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
      .join('\n');
    return selectCompressionLevel(userText);
  }

  _candidateMessageStrategies(messages = []) {
    const baseLevel = this._resolveBaseLevel(messages);
    const levels = this.provider === 'raw' || baseLevel === 'light'
      ? [baseLevel]
      : [baseLevel, 'light'];
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

    const configuredLevel = this.level;
    const resolvedLevel = configuredLevel === 'auto' ? selectCompressionLevel(text) : configuredLevel;
    this.level = resolvedLevel;

    const safeText = this._applyPrivacyFirewall(text, false);
    this._buildDynamicDictionary(safeText);
    const compressed = this._compressUserMessage(text, safeText);
    const origTokens = this._estimateTokens([{ content: text }], this.provider);
    const compTokens = this._estimateTokens([{ content: compressed }], this.provider);
    this.level = configuredLevel;

    // compressMessages() already falls back to the original payload when
    // compression is net-negative (see the `fallback` logic below), but
    // compressText() — the method the CLI and standalone SDK usage call —
    // had no equivalent safety net and would happily return output that
    // costs MORE tokens than the input. 'raw' keeps its historical
    // always-compress behavior (it exists specifically to report raw
    // character-level deltas), matching the same provider guard already
    // used for the messages path and per-glyph breakeven checks.
    const fallback = this.provider !== 'raw' && compTokens >= origTokens;
    const finalCompressed = fallback ? text : compressed;
    const finalCompTokens = fallback ? origTokens : compTokens;

    // Track stats
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
        ratio: (origTokens / Math.max(1, finalCompTokens)).toFixed(1) + 'x',
        savedPct: ((1 - finalCompTokens / Math.max(1, origTokens)) * 100).toFixed(0) + '%',
      },
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
    const tokenBudget = options.tokenBudget || 2000;
    const maxFiles = options.maxFiles || 8;
    const provider = options.provider || this.provider;

    const { intents, files } = routeContext(rootDir, query, { limit: maxFiles, gitDiffOnly: options.gitDiffOnly === true });

    const selectedFiles = [];
    const excludedFiles = [];
    const parts = [];
    let tokensUsed = 0;

    for (const file of files) {
      if (!file.content) {
        excludedFiles.push({ path: file.path, score: file.score, reason: 'unreadable-or-too-large' });
        continue;
      }
      const result = this.compressText(`[F: ${file.path}]\n${file.content}`, provider);
      if (tokensUsed + result.stats.compressedTokens > tokenBudget) {
        excludedFiles.push({ path: file.path, score: file.score, reason: 'token-budget-exceeded' });
        continue;
      }
      tokensUsed += result.stats.compressedTokens;
      selectedFiles.push({ path: file.path, score: file.score, tokens: result.stats.compressedTokens, sourceMap: result.sourceMap });
      parts.push(result.compressed);
    }

    return {
      compressed: parts.join('\n'),
      intents,
      selectedFiles,
      excludedFiles,
      tokenBudget,
      tokensUsed,
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
    // compressText() callers (CLI, standalone SDK usage) never go through
    // _injectCodebook(), so without this the CLI's default output —
    // getCodebookPrompt() + compressed text — silently included dynamic
    // §N glyphs the model was never told the meaning of. This instance's
    // full dynamicDict is exactly what a standalone-compressed payload can
    // reference, so it is always safe to disclose here.
    if (this.dynamicDict.size > 0) {
      const dyn = [...this.dynamicDict].map(([word, glyph]) => `${glyph}=${word}`).join(' | ');
      prompt = prompt.replace('[/GLYPH]', `DYN: ${dyn}\n[/GLYPH]`);
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

  /**
   * Report which dynamic-dictionary entries came from the shared, git-
   * committed team codebook (glyphcompress.team.json) versus this
   * session's own local learning, for transparency/debugging.
   */
  getTeamCodebookInfo() {
    return {
      loaded: this.teamCodebookEntries.length > 0,
      entriesLoaded: this.teamCodebookEntries.length,
      words: [...this.teamCodebookEntries],
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
      const team = loadTeamCodebook(this.workspacePath);
      if (!team || !Array.isArray(team.entries)) return;
      for (const word of team.entries) {
        if (!word || this.dynamicDict.has(word)) continue;
        if (this.dynamicCounter >= this.providerProfile.maxDynamicEntries) break;
        const glyph = `§${this.dynamicCounter + 1}`;
        this.dynamicDict.set(word, glyph);
        this.teamCodebookEntries.push(word);
        this.dynamicCounter++;
      }
    } catch (e) {
      // Fail silently, matching _initCache()'s existing philosophy.
    }
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
        // Merge rather than overwrite: when no team codebook was seeded
        // (the common case), this.fileIndex/dynamicDict start empty, so
        // merging behaves identically to the previous assign-in-place
        // behavior. When a team codebook WAS seeded, this preserves its
        // entries instead of a stale personal cache clobbering them.
        if (data.fileIndex && Array.isArray(data.fileIndex)) {
          for (const [key, value] of data.fileIndex) {
            if (!this.fileIndex.has(key)) this.fileIndex.set(key, value);
          }
          const cachedCounter = typeof data.fileCounter === 'number' ? data.fileCounter : this.fileIndex.size;
          this.fileCounter = Math.max(this.fileCounter, cachedCounter);
        }
        if (data.dynamicDict && Array.isArray(data.dynamicDict)) {
          for (const [word, glyph] of data.dynamicDict) {
            if (!this.dynamicDict.has(word)) this.dynamicDict.set(word, glyph);
          }
          const cachedCounter = typeof data.dynamicCounter === 'number' ? data.dynamicCounter : this.dynamicDict.size;
          this.dynamicCounter = Math.max(this.dynamicCounter, cachedCounter);
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
      version: '1.20.0',
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
    if (this.intentDiffs) {
      c = this.compressIntentDiffs(c);
    }
    if (this.holographicFolding) {
      c = this._foldHolographicText(c);
    }
    c = this._normalizeWhitespaceOutsideCode(c);
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
    // Same fence-safety concern as whitespace normalization: a prose
    // filler pattern like "please"/"in order to" has no business being
    // rewritten inside a code fence (a string literal or comment could
    // legitimately contain that exact text), and the trailing whitespace
    // collapse this chain used to end with had the same indentation-
    // destroying bug _normalizeWhitespaceOutsideCode fixed — just
    // reintroduced one step later in the pipeline.
    return this._applyOutsideCodeFences(text, (t) => this._compressVerbosePhrasesRaw(t));
  }

  _applyOutsideCodeFences(text, transform) {
    const fencePattern = /`{3,}\w*\n[\s\S]+?`{3,}/g;
    let result = '';
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
      .replace(/\bafin de\b/gi, 'pour');
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

    // Dynamic-dictionary glyphs are §N references (a single reserved marker
    // + plain digits) instead of single exotic Unicode letters. The
    // previous Greek/Cyrillic pool (a) collided with reserved TECH_GLYPHS
    // symbols — α is literally the first assigned symbol, and
    // TECH_GLYPHS.agent is also 'α', so every session with a dynamic entry
    // silently produced an ambiguous glyph — and (b) exhausted after only
    // 54 entries even though maxDynamicEntries goes up to 96. §N is
    // collision-free, unbounded, and only 1 non-ASCII character (the
    // digits are cheap ASCII), keeping the per-replacement token cost close
    // to the original single-letter design. Estimated savings below assume
    // a ~2-char glyph instead of the old 1-char assumption, so very short
    // words correctly stop qualifying.
    // A dictionary entry only pays for itself once its in-body savings
    // exceed the cost of transmitting its own "word=glyph" definition (the
    // DYN: line). A word seen once has nothing to amortize that definition
    // against, so it is a guaranteed net loss once the definition cost is
    // counted — the old formula ignored this and would happily spend a
    // glyph on a single-occurrence word, which is why short multi-message
    // sessions (see test: "Batch: overall compression") were barely
    // breaking even. Requiring freq >= 2 fixes that at the source.
    const savings = [...counts.entries()].map(([word, freq]) => {
      return { word, freq, save: freq * (word.length - 2) - (word.length + 2) };
    }).filter(x => x.freq >= 2 && x.save > this.providerProfile.dynamicMinSavedChars)
      .sort((a, b) => b.save - a.save);

    for (const item of savings) {
      if (!this.dynamicDict.has(item.word) && this.dynamicCounter < this.providerProfile.maxDynamicEntries) {
        const glyph = `§${this.dynamicCounter + 1}`;
        this.dynamicDict.set(item.word, glyph);
        this.sourceMap.dynamic.push({
          glyph,
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

  // Non-ASCII penalty applies per non-ASCII character, not per glyph
  // character overall — a glyph like §₍12₎ mixes one non-ASCII marker with
  // ASCII digits, and blanket-penalizing every character in it (the
  // previous formula) overstated its cost.
  _estimateGlyphTokenCost(glyph, charsPerToken) {
    let nonAsciiCount = 0;
    for (let i = 0; i < glyph.length; i++) {
      if (glyph.charCodeAt(i) > 127) nonAsciiCount++;
    }
    return glyph.length / charsPerToken + 1.5 * nonAsciiCount;
  }

  _applyDynamicDictionary(text) {
    let result = text;
    const charsPerToken = ({ raw: 4, openai: 3.8, anthropic: 3.5, gemini: 4, local: 4 }[this.provider] || 4);
    for (const [word, glyph] of this.dynamicDict) {
      const origTokenCost = word.length / charsPerToken;
      const glyphTokenCost = this._estimateGlyphTokenCost(glyph, charsPerToken);
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
      const measured = this.provider === 'openai' ? MEASURED_TECH_GLYPH_TOKENS_OPENAI[name] : null;
      let skip;
      if (measured) {
        const [wordCl, wordO2, glyphCl, glyphO2] = measured;
        skip = glyphCl >= wordCl || glyphO2 >= wordO2;
      } else {
        const origTokenCost = name.length / charsPerToken;
        const glyphTokenCost = this._estimateGlyphTokenCost(glyph, charsPerToken);
        skip = this.provider !== 'raw' && glyphTokenCost >= origTokenCost;
      }
      if (skip) continue;
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
    return text
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '');
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
      // Expression-level spans (v1.20.0): arrow functions, calls, and
      // destructuring were previously invisible to the source map even
      // though they're some of the densest, most information-carrying
      // constructs in a minified block.
      addMatches(/(?:\([^()]*\)|\b[A-Za-z_$][\w$]*)\s*=>/g, 'arrowFunction', 'ƒ=>');
      addMatches(/\b(?!function\b|if\b|for\b|while\b|switch\b|catch\b|return\b)([A-Za-z_$][\w$]*)\s*\(/g, 'call', '⟐', 1);
      addMatches(/\b(?:const|let|var)\s*(\{[^{}=]+\}|\[[^\[\]=]+\])\s*=/g, 'destructure', '⇈', 1);
    }
    if (['py', 'python'].includes(l) || !l) {
      addMatches(/\b(?:import|from)\b/g, 'import', 'imp');
      addMatches(/\bdef\s+([A-Za-z_][\w]*)/g, 'function', 'ƒ', 1);
      addMatches(/\bclass\s+([A-Za-z_][\w]*)/g, 'class', '𝒞', 1);
      addMatches(/\bself\./g, 'receiver', 's.');
      addMatches(/\blambda\b/g, 'arrowFunction', 'ƒ=>');
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
    if (['rb', 'ruby'].includes(l) || !l) {
      addMatches(/\brequire(?:_relative)?\b/g, 'import', 'imp');
      addMatches(/\bdef\s+([A-Za-z_][\w?!]*)/g, 'function', 'ƒ', 1);
      addMatches(/\bclass\s+([A-Za-z_][\w]*)/g, 'class', '𝒞', 1);
      addMatches(/\bmodule\s+([A-Za-z_][\w]*)/g, 'class', '𝒞', 1);
      addMatches(/\battr_(?:accessor|reader|writer)\b/g, 'declaration', '◇');
    }
    if (['swift'].includes(l) || !l) {
      addMatches(/\bimport\b/g, 'import', 'imp');
      addMatches(/\bfunc\s+([A-Za-z_][\w]*)/g, 'function', 'ƒ', 1);
      addMatches(/\b(?:class|struct|enum|protocol)\s+([A-Za-z_][\w]*)/g, 'class', '𝒞', 1);
      addMatches(/\b(?:var|let)\s+([A-Za-z_][\w]*)/g, 'declaration', '◇', 1);
      addMatches(/\bguard\b/g, 'modifier', 'mod');
    }
    if (['kt', 'kotlin'].includes(l) || !l) {
      addMatches(/\bimport\b/g, 'import', 'imp');
      addMatches(/\bfun\s+([A-Za-z_][\w]*)/g, 'function', 'ƒ', 1);
      addMatches(/\b(?:class|object|interface)\s+([A-Za-z_][\w]*)/g, 'class', '𝒞', 1);
      addMatches(/\b(?:val|var)\s+([A-Za-z_][\w]*)/g, 'declaration', '◇', 1);
    }
    if (['php'].includes(l) || !l) {
      addMatches(/\b(?:require|include)(?:_once)?\b/g, 'import', 'imp');
      addMatches(/\bfunction\s+([A-Za-z_][\w]*)/g, 'function', 'ƒ', 1);
      addMatches(/\bclass\s+([A-Za-z_][\w]*)/g, 'class', '𝒞', 1);
      addMatches(/\$[A-Za-z_][\w]*/g, 'variable', '◇');
    }

    addMatches(/\breturn\b/g, 'return', '→');
    addMatches(/\byield\b/g, 'yield', '→');
    addMatches(/\b(?:async|await)\b/g, 'async', '⟿');
    addMatches(/\b(?:try|catch|throw|finally|except|rescue)\b/g, 'exception', '⚠');

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

  _indexFile(filepath) {
    if (this.fileIndex.has(filepath)) {
      return this.fileIndex.get(filepath);
    }
    this.fileCounter++;
    const domain = this._detectDomain(filepath);
    const glyph = DOMAIN_GLYPHS[domain] || '📄';
    const ref = `${glyph}₍${this.fileCounter}₎`;
    this.fileIndex.set(filepath, ref);
    this.sourceMap.files.push({
      ref,
      path: filepath,
      domain,
    });
    return ref;
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

  compressFile(file) {
    const ref = this._indexFile(file.path);
    const lang = this._detectLang(file.path);
    const techGlyph = TECH_GLYPHS[lang] || '';

    if (!file.content) {
      return `${ref}${techGlyph}`;
    }

    const lines = file.content.split('\n');
    const structure = this._analyzeStructure(lines, lang);

    return `${ref}${techGlyph} ${structure}`;
  }

  foldHolographicContext(files) {
    if (!files || files.length === 0) return '';
    
    const independentFiles = [];
    const fileImports = new Map();
    
    for (const file of files) {
      const imports = [];
      const lines = file.content ? file.content.split('\n') : [];
      for (const line of lines) {
        const importMatch = line.match(/from\s+['"]\.\.?\/(.+)['"]/);
        if (importMatch) {
          imports.push(importMatch[1].split('/').pop());
        }
      }
      fileImports.set(file.path.split('/').pop(), imports);
    }

    const visited = new Set();
    const foldedBlocks = [];

    for (const file of files) {
      const name = file.path.split('/').pop();
      if (visited.has(name)) continue;

      const group = [file];
      visited.add(name);

      for (const other of files) {
        const otherName = other.path.split('/').pop();
        if (visited.has(otherName)) continue;

        const importsOther = fileImports.get(name)?.some(imp => otherName.includes(imp));
        const otherImportsThis = fileImports.get(otherName)?.some(imp => name.includes(imp));

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

    const normalCompressed = independentFiles.map(f => this.compressFile(f));
    return [...foldedBlocks, ...normalCompressed].filter(Boolean).join('\n');
  }

  _foldGroup(group) {
    const baseImports = new Set();
    const fileOverlays = [];

    for (const file of group) {
      const ref = this._indexFile(file.path);
      const lang = this._detectLang(file.path);
      const techGlyph = TECH_GLYPHS[lang] || '';
      
      const lines = file.content ? file.content.split('\n') : [];
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

    const compressedImports = [...baseImports]
      .map(imp => this._compressTechNames(imp))
      .join(' | ');

    return `⟦Base: ${compressedImports}⟧ ↷ [${fileOverlays.join(' ↷ ')}]`;
  }

  compressIntentDiffs(text) {
    if (!text) return text;
    const lines = text.split('\n');
    let inDiff = false;
    const resultLines = [];
    let currentFile = '';
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

      if (line.startsWith('@@')) {
        inDiff = true;
        continue;
      }

      if (inDiff) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          originalDiffLinesCount++;
          const added = line.slice(1).trim();
          if (added) {
            const parsed = this._parseDiffLine('add', added, currentFile);
            if (parsed) actions.push(parsed);
          }
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          originalDiffLinesCount++;
          const removed = line.slice(1).trim();
          if (removed) {
            const parsed = this._parseDiffLine('remove', removed, currentFile);
            if (parsed) actions.push(parsed);
          }
        } else if (!line.startsWith(' ') && trimmed.length > 0 && !line.startsWith('+') && !line.startsWith('-') && !line.startsWith('\\')) {
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

    return resultLines.join('\n');
  }

  _parseDiffLine(type, code, filepath) {
    const fileRef = filepath ? this._indexFile(filepath) : '';
    const actionGlyph = type === 'add' ? '▲' : '▼';

    if (/^import\s+.*from\s+['"](.+)['"]/.test(code)) {
      const match = code.match(/^import\s+(.*?)\s+from\s+['"](.+)['"]/);
      if (match) return { fileRef, actionGlyph, type: 'imp', symbol: match[1].trim(), detail: match[2] };
    }
    if (/class\s+(\w+)/.test(code)) {
      const match = code.match(/class\s+(\w+)/);
      if (match) return { fileRef, actionGlyph, type: 'class', symbol: match[1] };
    }
    if (/(?:async\s+)?function\s+(\w+)/.test(code) || /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/.test(code)) {
      const match = code.match(/(?:async\s+)?(?:function\s+)?(\w+)\s*\(/);
      if (match) return { fileRef, actionGlyph, type: 'func', symbol: match[1] };
    }

    return null;
  }

  _formatIntentActions(actions, originalDiffLinesCount = 0, filepath = '') {
    if (actions.length === 0) {
      const fileRef = filepath ? this._indexFile(filepath) : '◈';
      return `⚡: ${fileRef} ±${originalDiffLinesCount}L`;
    }
    const formatted = actions.map(act => {
      const detail = act.detail ? ` (${act.detail})` : '';
      return `${act.fileRef} ${act.actionGlyph}${act.type === 'imp' ? '📦' : act.type === 'class' ? '𝒞' : 'ƒ'} ${act.symbol}${detail}`;
    });
    return `⚡: ${formatted.join(' | ')}`;
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

    const fileImports = new Map();
    for (const m of matches) {
      const imports = [];
      const lines = m.content ? m.content.split('\n') : [];
      for (const line of lines) {
        const importMatch = line.match(/from\s+['"]\.\.?\/(.+)['"]/);
        if (importMatch) {
          imports.push(importMatch[1].split('/').pop());
        }
      }
      fileImports.set(m.path.split('/').pop(), imports);
    }

    const visited = new Set();
    const groups = [];

    for (const m of matches) {
      const name = m.path.split('/').pop();
      if (visited.has(name)) continue;

      const group = [m];
      visited.add(name);

      for (const other of matches) {
        const otherName = other.path.split('/').pop();
        if (visited.has(otherName)) continue;

        const importsOther = fileImports.get(name)?.some(imp => otherName.includes(imp));
        const otherImportsThis = fileImports.get(otherName)?.some(imp => name.includes(imp));

        if (importsOther || otherImportsThis) {
          group.push(other);
          visited.add(otherName);
        }
      }
      groups.push(group);
    }

    const replacements = new Map();

    for (const group of groups) {
      if (group.length === 1) {
        const m = group[0];
        const compressedFile = this.compressFile({ path: m.path, content: m.content });
        replacements.set(m, compressedFile);
      } else {
        const foldedBlock = this._foldGroup(group.map(m => ({ path: m.path, content: m.content })));
        replacements.set(group[0], foldedBlock);
        for (let i = 1; i < group.length; i++) {
          replacements.set(group[i], '');
        }
      }
    }

    let lastIndex = 0;
    let result = '';
    
    const sortedMatches = [...matches].sort((a, b) => a.index - b.index);
    for (const m of sortedMatches) {
      result += text.substring(lastIndex, m.index);
      result += replacements.get(m);
      lastIndex = m.index + m.length;
    }
    result += text.substring(lastIndex);
    return result;
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
    selectCompressionLevel,
  };
}

// ESM export for modern usage
export { GlyphCompressor, wrapOpenAI, wrapAnthropic, CODEBOOK_PROMPT, DOMAIN_GLYPHS, TECH_GLYPHS, PROVIDER_COMPRESSION_PROFILES, TRUST_POLICY_PROFILES, selectCompressionLevel };
