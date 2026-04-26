export type CompressionLevel = 'light' | 'standard' | 'aggressive' | 'ultra';
export type Provider = 'auto' | 'raw' | 'openai' | 'anthropic' | 'antigravity' | 'gemini' | 'local';

export interface CompressionStats {
  originalTokens: number;
  compressedTokens: number;
  ratio: string;
  savedPct: string;
  saved?: number;
}

export interface SessionStats {
  messagesProcessed: number;
  totalOriginalTokens: number;
  totalCompressedTokens: number;
  totalSavedTokens: number;
  overallRatio: string;
  overallSavedPct: string;
  estimatedCostSaved: string;
  sessionDuration: string;
}

export interface SourceMapEntry {
  kind: string;
  original: string;
  compressed: string;
  count?: number;
  span?: GlyphSourceSpan;
  [key: string]: unknown;
}

export interface GlyphSourcePosition {
  line: number;
  column: number;
  offset: number;
}

export interface GlyphSourceSpan {
  start: GlyphSourcePosition;
  end: GlyphSourcePosition;
}

export interface GlyphSymbolSpan {
  glyph: string;
  original: string;
  kind: string;
  span: GlyphSourceSpan;
  [key: string]: unknown;
}

export interface GlyphPrivacyRedaction {
  kind: string;
  label: string;
  placeholder: string;
  hash: string;
  span: GlyphSourceSpan;
}

export interface GlyphSourceMap {
  version: string;
  level: CompressionLevel | string;
  files: Array<{ ref: string; path: string; domain: string; span?: GlyphSourceSpan }>;
  dynamic: Array<{ glyph: string; original: string; frequency?: number; estimatedSavedChars?: number }>;
  diagnostics: Array<{ original: string; compressed: string; pattern?: string; span?: GlyphSourceSpan }>;
  codeBlocks: Array<Record<string, unknown>>;
  privacy: GlyphPrivacyRedaction[];
  symbols: GlyphSymbolSpan[];
  replacements: SourceMapEntry[];
}

export interface CompressTextResult {
  compressed: string;
  original: string;
  sourceMap: GlyphSourceMap;
  stats: CompressionStats;
}

export interface CompressMessagesResult<TMessage = { role: string; content: unknown }> {
  messages: TMessage[];
  sourceMap: GlyphSourceMap;
  stats: SessionStats & { thisMessage: CompressionStats };
}

export interface GlyphCompressorOptions {
  enabled?: boolean;
  level?: CompressionLevel;
  privacyFirewall?: boolean;
  privacy?: boolean;
}

export class GlyphCompressor {
  constructor(options?: GlyphCompressorOptions);
  compressText(text: string): CompressTextResult;
  compressMessages<TMessage extends { role: string; content: unknown }>(messages: TMessage[], provider?: Provider): CompressMessagesResult<TMessage>;
  getCodebookPrompt(): string;
  getStats(): SessionStats;
  resetFileIndex(): void;
  getSourceMap(): GlyphSourceMap;
  getReversibleDictionaries(): Pick<GlyphSourceMap, 'files' | 'dynamic' | 'diagnostics' | 'codeBlocks' | 'privacy' | 'symbols'>;
  resetSourceMap(): void;
}

export function wrapOpenAI<TClient>(client: TClient, options?: GlyphCompressorOptions): TClient;
export function wrapAnthropic<TClient>(client: TClient, options?: GlyphCompressorOptions): TClient;

export const CODEBOOK_PROMPT: string;
export const RADICALS: Record<string, unknown>;
export const DOMAIN_GLYPHS: Record<string, string>;
export const ACTION_GLYPHS: Record<string, string>;
export const TECH_GLYPHS: Record<string, string>;
export const STRUCTURE_GLYPHS: Record<string, string>;
export const ERROR_CODES: Record<string, string>;
export function getAlphabetStats(): Record<string, unknown>;

export class Compressor {
  constructor(...args: unknown[]);
}

export class Codebook {
  constructor(...args: unknown[]);
}

export function generateSystemPrompt(...args: unknown[]): string;
export function estimateOverhead(...args: unknown[]): unknown;

export interface ProviderTokenProfile {
  charsPerToken: number;
  messageOverhead: number;
  systemOverhead: number;
  name: string;
}

export const PROVIDER_TOKEN_PROFILES: Record<string, ProviderTokenProfile>;
export function normalizeProvider(provider?: string): string;
export function estimateProviderTokens(value: unknown, provider?: Provider | string): number;
export function compareTokenEstimates(original: unknown, compressed: unknown, provider?: Provider | string): CompressionStats & { provider: string };
export interface WorkspaceCodebookFile {
  path: string;
  ext: string;
  owner: string;
  symbols: string[];
  imports: string[];
  lines: number;
}

export interface WorkspaceCodebook {
  version: string;
  root: string;
  generatedAt: string;
  files: WorkspaceCodebookFile[];
  symbols: Array<{ name: string; frequency: number }>;
  importGraph: Array<{ from: string; to: string }>;
  diagnostics: Array<{ file: string; message: string }>;
  owners: Array<{ name: string; files: number }>;
  git: { staged: string[]; unstaged: string[] };
}

export interface WorkspaceIntelligenceOptions {
  maxFiles?: number;
  maxFileBytes?: number;
  maxSymbols?: number;
  maxImports?: number;
  maxDiagnostics?: number;
  limit?: number;
  codebook?: WorkspaceCodebook;
}

export type WorkspaceIntent = 'fix_error' | 'review_diff' | 'implement_feature' | 'explain_architecture' | 'write_tests' | 'optimize_performance' | 'general';

export function detectIntent(text?: string): WorkspaceIntent[];
export function buildWorkspaceCodebook(rootDir?: string, options?: WorkspaceIntelligenceOptions): WorkspaceCodebook;
export function saveWorkspaceCodebook(rootDir: string, codebook: WorkspaceCodebook): string;
export function loadWorkspaceCodebook(rootDir?: string): WorkspaceCodebook | null;
export function selectRelevantFiles(rootDir?: string, query?: string, options?: WorkspaceIntelligenceOptions): { intents: WorkspaceIntent[]; files: Array<WorkspaceCodebookFile & { score: number }>; codebook: WorkspaceCodebook };
export function runDoctor(rootDir?: string): { version: string; root: string; checks: Array<{ name: string; ok: boolean; detail: string }>; ok: boolean };
