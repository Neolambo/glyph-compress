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

// src/system-prompt-generator.js
var system_prompt_generator_exports = {};
__export(system_prompt_generator_exports, {
  estimateOverhead: () => estimateOverhead,
  generateSystemPrompt: () => generateSystemPrompt
});
module.exports = __toCommonJS(system_prompt_generator_exports);

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
var STRUCTURE_GLYPHS = {
  // File references
  file: "\u{1F4C4}",
  // file reference
  dir: "\u{1F4C1}",
  // directory reference
  line: ":",
  // line number prefix
  range: "~",
  // line range
  // Diagnostics
  error: "\u2717",
  // error
  warning: "\u26A0",
  // warning  
  info: "\u2139",
  // info
  hint: "\u{1F4A1}",
  // hint/suggestion
  // Type system
  typeError: "\u2209",
  // type mismatch
  notFound: "\u2205",
  // not found / undefined
  duplicate: "\u2261",
  // duplicate / identical
  returns: "\u2192",
  // returns / maps to
  generic: "\u27E8\u27E9",
  // generic type
  // Code structure
  func: "\u0192",
  // function
  cls: "\u{1D49E}",
  // class
  iface: "\u{1D4BE}",
  // interface
  component: "\u229E",
  // component (React/Vue/etc)
  hook: "\u27F3",
  // hook / lifecycle
  state: "\u25C7",
  // state variable
  effect: "\u27FF",
  // side effect
  render: "\u229E"
  // render output
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

// src/system-prompt-generator.js
function generateSystemPrompt(codebook) {
  const parts = [];
  parts.push(`[GLYPH PROTOCOL v0.1]
Context uses compressed glyphs. Decode with this codebook:`);
  const domainStr = Object.entries(DOMAIN_GLYPHS).map(([k, v]) => `${v}=${k}`).join(" ");
  parts.push(`DOM: ${domainStr}`);
  const actionStr = Object.entries(ACTION_GLYPHS).map(([k, v]) => `${v}=${k}`).join(" ");
  parts.push(`ACT: ${actionStr}`);
  const techStr = Object.entries(TECH_GLYPHS).map(([name, glyph]) => `${glyph}=${name}`).join(" ");
  parts.push(`TECH: ${techStr}`);
  const structureStr = Object.entries(STRUCTURE_GLYPHS).map(([name, glyph]) => `${glyph}=${name}`).join(" ");
  parts.push(`SYM: ${structureStr}`);
  const errorGlyphs = [...new Set(Object.values(ERROR_CODES))].join(" ");
  parts.push(`ERR: ${errorGlyphs}`);
  parts.push(`PAT: \u2E8C=fix \u2E8E=review/explain \u2E8F=deploy`);
  parts.push(`FILE: \u25C8\u208DN\u208E=indexed file reference :L=line ~=range`);
  if (codebook && codebook.fileIndex.size > 0) {
    parts.push(codebook.getFileIndexHeader());
  }
  parts.push(`[/GLYPH]`);
  return parts.join("\n");
}
function estimateOverhead() {
  const prompt = generateSystemPrompt(null);
  const tokenEstimate = Math.ceil(prompt.length / 4);
  return {
    chars: prompt.length,
    estimatedTokens: tokenEstimate,
    note: "This overhead is paid once per conversation, amortized over all messages"
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  estimateOverhead,
  generateSystemPrompt
});
