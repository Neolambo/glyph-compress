export type CompressionLevel = 'light' | 'standard' | 'aggressive' | 'ultra';
export type CompressionLevelOption = CompressionLevel | 'auto';
export type Provider = 'auto' | 'raw' | 'openai' | 'anthropic' | 'antigravity' | 'gemini' | 'local' | 'gpt' | 'claude' | 'google' | 'ollama';
export type TrustPolicy = 'auto' | 'lossless' | 'reversible' | 'privacy' | 'lossy';

export interface CompressionStats {
  provider?: string;
  profile?: string;
  trustPolicy?: string;
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

export interface GlyphAstTokenSpan {
  kind: string;
  original: string;
  glyph: string;
  lang: string;
  name?: string;
  blockMode?: string;
  span: GlyphSourceSpan;
}

export interface ProviderCompressionProfile {
  provider: string;
  strategy: string;
  dynamicMinSavedChars: number;
  maxDynamicEntries: number;
  codebookHint: string;
}

export interface TrustPolicyProfile {
  policy: Exclude<TrustPolicy, 'auto'>;
  label: string;
  reversible: boolean;
  redacts: boolean;
  lossy: boolean;
  allows: Record<string, boolean>;
}

export interface GlyphSourceMap {
  version: string;
  level: CompressionLevel | string;
  provider: string;
  profile: ProviderCompressionProfile;
  trustPolicy: string;
  trust: TrustPolicyProfile;
  files: Array<{ ref: string; path: string; domain: string; span?: GlyphSourceSpan }>;
  dynamic: Array<{ glyph: string; original: string; frequency?: number; estimatedSavedChars?: number; provider?: string; profile?: string }>;
  diagnostics: Array<{ original: string; compressed: string; pattern?: string; span?: GlyphSourceSpan }>;
  codeBlocks: Array<Record<string, unknown> & { tokens?: GlyphAstTokenSpan[] }>;
  ast: GlyphAstTokenSpan[];
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
  level?: CompressionLevelOption;
  provider?: Provider | string;
  trustPolicy?: TrustPolicy | string;
  policy?: TrustPolicy | string;
  privacyFirewall?: boolean;
  privacy?: boolean;
}

export interface RouteAndCompressOptions {
  rootDir?: string;
  tokenBudget?: number;
  maxFiles?: number;
  provider?: Provider | string;
}

export interface RoutedFile {
  path: string;
  score: number;
  tokens?: number;
  reason?: string;
  sourceMap?: GlyphSourceMap;
}

export interface RouteAndCompressResult {
  compressed: string;
  intents: string[];
  selectedFiles: RoutedFile[];
  excludedFiles: RoutedFile[];
  tokenBudget: number;
  tokensUsed: number;
}

export class GlyphCompressor {
  constructor(options?: GlyphCompressorOptions);
  compressText(text: string, provider?: Provider | string): CompressTextResult;
  compressMessages<TMessage extends { role: string; content: unknown }>(messages: TMessage[], provider?: Provider): CompressMessagesResult<TMessage>;
  routeAndCompress(query: string, options?: RouteAndCompressOptions): RouteAndCompressResult;
  getCodebookPrompt(): string;
  getStats(): SessionStats;
  resetFileIndex(): void;
  getSourceMap(): GlyphSourceMap;
  getReversibleDictionaries(): Pick<GlyphSourceMap, 'files' | 'dynamic' | 'diagnostics' | 'codeBlocks' | 'ast' | 'privacy' | 'symbols'>;
  resetSourceMap(): void;
}

export function wrapOpenAI<TClient>(client: TClient, options?: GlyphCompressorOptions): TClient;
export function wrapAnthropic<TClient>(client: TClient, options?: GlyphCompressorOptions): TClient;

export const CODEBOOK_PROMPT: string;
export const PROVIDER_COMPRESSION_PROFILES: Record<string, ProviderCompressionProfile>;
export const TRUST_POLICY_PROFILES: Record<string, TrustPolicyProfile>;
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
export function selectCompressionLevel(text: string): CompressionLevel;
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
export function runDoctor(rootDir?: string): { version: string; root: string; checks: Array<{ name: string; ok: boolean; detail: string; optional?: boolean }>; ok: boolean };
