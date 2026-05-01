const DEFAULT_PROFILE = 'raw';

const PROVIDER_ALIASES = {
  auto: DEFAULT_PROFILE,
  raw: DEFAULT_PROFILE,
  openai: 'openai',
  gpt: 'openai',
  anthropic: 'anthropic',
  claude: 'anthropic',
  gemini: 'gemini',
  google: 'gemini',
  local: 'local',
  ollama: 'local',
};

const PROVIDER_TOKEN_PROFILES = {
  raw: {
    charsPerToken: 4,
    messageOverhead: 0,
    systemOverhead: 0,
    name: 'Generic text estimate',
  },
  openai: {
    charsPerToken: 3.8,
    messageOverhead: 4,
    systemOverhead: 2,
    name: 'OpenAI chat estimate',
  },
  anthropic: {
    charsPerToken: 3.6,
    messageOverhead: 3,
    systemOverhead: 5,
    name: 'Anthropic Messages estimate',
  },
  gemini: {
    charsPerToken: 4.1,
    messageOverhead: 3,
    systemOverhead: 2,
    name: 'Gemini-compatible estimate',
  },
  local: {
    charsPerToken: 3.5,
    messageOverhead: 2,
    systemOverhead: 1,
    name: 'Local model estimate',
  },
};

function normalizeProvider(provider = DEFAULT_PROFILE) {
  const key = String(provider || DEFAULT_PROFILE).toLowerCase();
  return PROVIDER_ALIASES[key] || DEFAULT_PROFILE;
}

function stringifyContent(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function normalizeMessages(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === 'object' && 'content' in item) return item;
      return { role: 'user', content: item };
    });
  }
  return [{ role: 'user', content: value }];
}

function countUnicodeGlyphs(text) {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) count++;
  }
  return count;
}

function estimateProviderTokens(value, provider = DEFAULT_PROFILE) {
  const profileName = normalizeProvider(provider);
  const profile = PROVIDER_TOKEN_PROFILES[profileName];
  const messages = normalizeMessages(value);
  let estimated = 0;

  for (const message of messages) {
    const content = stringifyContent(message.content);
    const baseTokens = Math.ceil(content.length / profile.charsPerToken);
    const unicodeGlyphs = countUnicodeGlyphs(content);
    estimated += baseTokens + Math.ceil(unicodeGlyphs * 1.5);
    estimated += profile.messageOverhead;
    if (message.role === 'system') estimated += profile.systemOverhead;
  }

  return Math.max(1, Math.ceil(estimated));
}

function compareTokenEstimates(original, compressed, provider = DEFAULT_PROFILE) {
  const originalTokens = estimateProviderTokens(original, provider);
  const compressedTokens = estimateProviderTokens(compressed, provider);
  const saved = originalTokens - compressedTokens;
  return {
    provider: normalizeProvider(provider),
    originalTokens,
    compressedTokens,
    saved,
    ratio: `${(originalTokens / Math.max(1, compressedTokens)).toFixed(1)}x`,
    savedPct: `${((1 - compressedTokens / Math.max(1, originalTokens)) * 100).toFixed(0)}%`,
  };
}

export { PROVIDER_TOKEN_PROFILES, normalizeProvider, estimateProviderTokens, compareTokenEstimates };