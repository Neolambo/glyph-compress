/**
 * GlyphCompress — Radical Alphabet
 * 
 * The 16 base radicals + extended coding-specific glyphs.
 * Each radical encodes a fundamental semantic dimension.
 * Composition rules allow expressing any coding concept with 1-4 radicals.
 */

// ═══════════════════════════════════════════════════════════
// BASE RADICALS — 16 fundamental semantic primitives
// ═══════════════════════════════════════════════════════════

export const RADICALS = {
  // Domain radicals
  CODE:     '⺀',  // generic code / programming
  DATA:     '⺁',  // data / information
  SHIELD:   '⺂',  // security / protection
  EYE:      '⺃',  // observation / monitoring / debugging
  GEAR:     '⺄',  // automation / process / CI/CD
  CLOUD:    '⺅',  // cloud / remote / distributed
  SCREEN:   '⺆',  // frontend / display / UI
  BOX:      '⺇',  // backend / container / server
  PHONE:    '⺈',  // mobile / device
  BRAIN:    '⺉',  // AI / intelligence / ML
  BOOK:     '⺊',  // documentation / knowledge
  BOLT:     '⺋',  // speed / performance / optimization
  CHAIN:    '⺌',  // connection / integration / API
  HAMMER:   '⺍',  // build / create / construct
  LENS:     '⺎',  // analyze / inspect / review
  ARROW:    '⺏',  // deploy / ship / transfer
};

// ═══════════════════════════════════════════════════════════
// DOMAIN GLYPHS — Specific technology domains
// ═══════════════════════════════════════════════════════════

export const DOMAIN_GLYPHS = {
  frontend:      '◈',
  ai_ml:         '◉',
  devops:        '◊',
  database:      '◆',
  language:      '◇',
  automation:    '⊕',
  architecture:  '⊗',
  mobile:        '⊙',
  cloud:         '⊘',
  data:          '⊚',
  testing:       '⊛',
  backend:       '⊜',
  security:      '⊝',
  documentation: '⊞',
  optimization:  '⊟',
  networking:    '⊠',
};

// ═══════════════════════════════════════════════════════════
// ACTION GLYPHS — What operations are being performed
// ═══════════════════════════════════════════════════════════

export const ACTION_GLYPHS = {
  create:    '▲',
  analyze:   '▼',
  test:      '►',
  monitor:   '◄',
  document:  '■',
  connect:   '□',
  deploy:    '▪',
  optimize:  '▫',
  transform: '●',
  protect:   '○',
};

// ═══════════════════════════════════════════════════════════
// TECH GLYPHS — Specific technologies & frameworks
// ═══════════════════════════════════════════════════════════

export const TECH_GLYPHS = {
  // Languages
  typescript: 'ᵗ', javascript: 'ʲˢ', python: 'ᵖ', rust: 'ʳ',
  go: 'ᵍ', java: 'ʲ', csharp: 'ᶜ', swift: 'ˢ', ruby: 'ᵇ',
  
  // Frameworks
  react: 'ℜ', nextjs: 'ℕ', vue: '𝕍', angular: '𝔸',
  svelte: '𝕊', django: '𝔻', rails: 'ℝ', express: '𝔼ˣ',
  fastapi: '𝔽', nestjs: 'ℕˢ',
  
  // Infrastructure
  docker: '𝒟', kubernetes: '𝒦', terraform: '𝒯',
  aws: 'ᴬ', azure: 'ᴮ', gcp: 'ᴳ',
  
  // Databases
  postgres: 'ℙ', mysql: 'ℳ', mongodb: 'ₘ', redis: 'ᵣ',
  
  // AI/ML
  llm: 'ℒ', embedding: 'ε', agent: 'α', prompt: 'π',
};

// ═══════════════════════════════════════════════════════════
// STRUCTURE GLYPHS — Code structure & diagnostics
// ═══════════════════════════════════════════════════════════

export const STRUCTURE_GLYPHS = {
  // File references
  file: '📄',      // file reference
  dir: '📁',       // directory reference
  line: ':',        // line number prefix
  range: '~',       // line range

  // Diagnostics
  error: '✗',       // error
  warning: '⚠',     // warning  
  info: 'ℹ',        // info
  hint: '💡',       // hint/suggestion
  
  // Type system
  typeError: '∉',    // type mismatch
  notFound: '∅',     // not found / undefined
  duplicate: '≡',    // duplicate / identical
  returns: '→',      // returns / maps to
  generic: '⟨⟩',    // generic type
  
  // Code structure
  func: 'ƒ',        // function
  cls: '𝒞',         // class
  iface: '𝒾',       // interface
  component: '⊞',   // component (React/Vue/etc)
  hook: '⟳',        // hook / lifecycle
  state: '◇',       // state variable
  effect: '⟿',      // side effect
  render: '⊞',      // render output
};

// ═══════════════════════════════════════════════════════════
// COMMON ERROR CODES — Compressed error patterns
// ═══════════════════════════════════════════════════════════

export const ERROR_CODES = {
  // TypeScript
  'TS2339': '∉prop',       // Property does not exist on type
  'TS2345': '∉arg',        // Argument type mismatch
  'TS2322': '∉assign',     // Type not assignable
  'TS7006': '∅type',       // Parameter implicitly has 'any'
  'TS2304': '∅name',       // Cannot find name
  'TS1005': '∅syntax',     // Expected token
  'TS2769': '∉overload',   // No overload matches
  
  // ESLint
  'no-unused-vars': '⚠unused',
  'react-hooks/exhaustive-deps': '⚠deps',
  'react/no-unescaped-entities': '⚠escape',
  'import/no-unresolved': '∅import',
  
  // Python
  'E0001': '∅syntax',      // Syntax error
  'E1101': '∉attr',        // Module has no member
  'W0611': '⚠unused',      // Unused import
  'E0602': '∅name',        // Undefined variable
  
  // General
  'ENOENT': '∅file',       // File not found
  'EACCES': '○denied',     // Permission denied
  'ETIMEDOUT': '⏱timeout', // Connection timeout
  'ECONNREFUSED': '∅conn', // Connection refused
};

// ═══════════════════════════════════════════════════════════
// COMPOSITION RULES
// ═══════════════════════════════════════════════════════════

/**
 * Compose radicals to express complex concepts:
 * 
 * ⺆⺀    = Screen + Code    = "Frontend Development"
 * ⺇⺌    = Box + Chain      = "Backend API"
 * ⺂⺎    = Shield + Lens    = "Security Audit"
 * ⺉⺀    = Brain + Code     = "AI-assisted Coding"
 * ⺄⺏    = Gear + Arrow     = "CI/CD Pipeline"
 * ⺋⺆    = Bolt + Screen    = "Frontend Performance"
 * ⺁⺇    = Data + Box       = "Database"
 * ⺂⺅    = Shield + Cloud   = "Cloud Security"
 * ⺈⺆    = Phone + Screen   = "Mobile UI"
 * ⺉⺎    = Brain + Lens     = "ML Evaluation"
 */

export const COMPOSITIONS = {
  '⺆⺀': 'frontend development',
  '⺇⺀': 'backend development',
  '⺇⺌': 'API integration',
  '⺂⺎': 'security audit',
  '⺂⺅': 'cloud security',
  '⺉⺀': 'AI-assisted coding',
  '⺉⺎': 'ML evaluation',
  '⺄⺏': 'CI/CD pipeline',
  '⺋⺆': 'frontend performance',
  '⺋⺇': 'backend performance',
  '⺁⺇': 'database operations',
  '⺁⺎': 'data analysis',
  '⺈⺆': 'mobile UI',
  '⺈⺀': 'mobile development',
  '⺊⺀': 'code documentation',
  '⺅⺏': 'cloud deployment',
  '⺅⺇': 'serverless',
  '⺃⺄': 'automated monitoring',
  '⺌⺁': 'data integration',
  '⺍⺆': 'UI construction',
};

// ═══════════════════════════════════════════════════════════
// REVERSE LOOKUP MAPS
// ═══════════════════════════════════════════════════════════

// Build reverse maps for decompression
export const REVERSE_DOMAIN = Object.fromEntries(
  Object.entries(DOMAIN_GLYPHS).map(([k, v]) => [v, k])
);

export const REVERSE_ACTION = Object.fromEntries(
  Object.entries(ACTION_GLYPHS).map(([k, v]) => [v, k])
);

export const REVERSE_TECH = Object.fromEntries(
  Object.entries(TECH_GLYPHS).map(([k, v]) => [v, k])
);

export const REVERSE_ERRORS = Object.fromEntries(
  Object.entries(ERROR_CODES).map(([k, v]) => [v, k])
);

export const REVERSE_COMPOSITIONS = Object.fromEntries(
  Object.entries(COMPOSITIONS).map(([k, v]) => [v, k])
);

// ═══════════════════════════════════════════════════════════
// ALPHABET STATS
// ═══════════════════════════════════════════════════════════

export function getAlphabetStats() {
  return {
    radicals: Object.keys(RADICALS).length,
    domains: Object.keys(DOMAIN_GLYPHS).length,
    actions: Object.keys(ACTION_GLYPHS).length,
    techs: Object.keys(TECH_GLYPHS).length,
    structures: Object.keys(STRUCTURE_GLYPHS).length,
    errorCodes: Object.keys(ERROR_CODES).length,
    compositions: Object.keys(COMPOSITIONS).length,
    totalSymbols: Object.keys(RADICALS).length + 
                  Object.keys(DOMAIN_GLYPHS).length +
                  Object.keys(ACTION_GLYPHS).length +
                  Object.keys(TECH_GLYPHS).length +
                  Object.keys(STRUCTURE_GLYPHS).length,
  };
}
