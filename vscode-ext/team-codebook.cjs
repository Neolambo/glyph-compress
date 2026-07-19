var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/team-codebook.js
var team_codebook_exports = {};
__export(team_codebook_exports, {
  TEAM_CODEBOOK_FILENAME: () => TEAM_CODEBOOK_FILENAME,
  loadTeamCodebook: () => loadTeamCodebook,
  mergeTeamCodebook: () => mergeTeamCodebook,
  readLocalDynamicDictWords: () => readLocalDynamicDictWords,
  saveTeamCodebook: () => saveTeamCodebook,
  teamCodebookPath: () => teamCodebookPath
});
module.exports = __toCommonJS(team_codebook_exports);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var import_crypto = require("crypto");
var TEAM_CODEBOOK_FILENAME = "glyphcompress.team.json";
function teamCodebookPath(rootDir) {
  return import_path.default.join(import_path.default.resolve(rootDir), TEAM_CODEBOOK_FILENAME);
}
function loadTeamCodebook(rootDir) {
  const filePath = teamCodebookPath(rootDir);
  if (!import_fs.default.existsSync(filePath)) return null;
  try {
    const data = JSON.parse(import_fs.default.readFileSync(filePath, "utf8"));
    if (!Array.isArray(data.entries)) return null;
    return data;
  } catch {
    return null;
  }
}
function saveTeamCodebook(rootDir, entries) {
  const filePath = teamCodebookPath(rootDir);
  const deduped = [...new Set(entries.filter(Boolean))];
  const data = {
    version: 1,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    entries: deduped
  };
  import_fs.default.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return filePath;
}
function mergeTeamCodebook(rootDir, newEntries) {
  const existing = loadTeamCodebook(rootDir);
  const merged = [...existing?.entries || []];
  const seen = new Set(merged);
  for (const word of newEntries) {
    if (!word || seen.has(word)) continue;
    merged.push(word);
    seen.add(word);
  }
  return { path: saveTeamCodebook(rootDir, merged), entries: merged, addedCount: merged.length - (existing?.entries.length || 0) };
}
function readLocalDynamicDictWords(workspacePath, homeDir = import_os.default.homedir()) {
  try {
    const hash = (0, import_crypto.createHash)("sha256").update(workspacePath).digest("hex").slice(0, 16);
    const cacheFile = import_path.default.join(homeDir, ".glyphcompress", "cache", `${hash}.json`);
    if (!import_fs.default.existsSync(cacheFile)) return [];
    const data = JSON.parse(import_fs.default.readFileSync(cacheFile, "utf8"));
    if (!Array.isArray(data.dynamicDict)) return [];
    return data.dynamicDict.map(([word]) => word);
  } catch {
    return [];
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TEAM_CODEBOOK_FILENAME,
  loadTeamCodebook,
  mergeTeamCodebook,
  readLocalDynamicDictWords,
  saveTeamCodebook,
  teamCodebookPath
});
