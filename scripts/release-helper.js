#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const allowDirty = args.has('--allow-dirty');
const skipCheck = args.has('--skip-check');
const skipPackage = args.has('--skip-package');
const skipPublishDryRun = args.has('--skip-publish-dry-run');
const writeReleaseNotes = args.has('--write-release-notes');
const verifyMarketplace = args.has('--verify-marketplace');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function run(command) {
  execSync(command, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

function capture(command) {
  return execSync(command, {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  }).trim();
}

function printCommandBlock(title, commands) {
  console.log(`\n${title}`);
  for (const command of commands) console.log(`  ${command}`);
}

function tryCapture(command) {
  try {
    return capture(command);
  } catch {
    return '';
  }
}

function findPreviousTag(currentVersion) {
  const currentTag = `v${currentVersion}`;
  const tags = tryCapture('git tag --sort=-version:refname')
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => tag !== currentTag);
  return tags[0] || '';
}

function generateReleaseNotes(currentVersion) {
  const previousTag = findPreviousTag(currentVersion);
  const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';
  const subjects = tryCapture(`git log --format=%s ${range}`)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = new Map([
    ['feat', []],
    ['fix', []],
    ['docs', []],
    ['test', []],
    ['refactor', []],
    ['chore', []],
    ['other', []],
  ]);

  for (const subject of subjects) {
    const match = /^([a-z]+)(\([^)]+\))?:\s+(.+)$/.exec(subject);
    const type = match?.[1] || 'other';
    const detail = match?.[3] || subject;
    const key = sections.has(type) ? type : 'other';
    sections.get(key).push(detail);
  }

  const lines = [`## v${currentVersion}`];
  if (previousTag) lines.push('', `Changes since ${previousTag}:`);

  const labels = {
    feat: 'Features',
    fix: 'Fixes',
    docs: 'Docs',
    test: 'Tests',
    refactor: 'Refactors',
    chore: 'Chores',
    other: 'Other',
  };

  for (const [key, items] of sections.entries()) {
    if (!items.length) continue;
    lines.push('', `### ${labels[key]}`);
    for (const item of items) lines.push(`- ${item}`);
  }

  if (lines.length === 1 || (lines.length === 3 && previousTag)) {
    lines.push('', '- Describe the user-visible changes in this release.');
    lines.push('- List validation steps and any noteworthy migration details.');
  }

  return `${lines.join('\n')}\n`;
}

function verifyMarketplaceVersion(currentVersion) {
  const raw = capture('npx @vscode/vsce show Neolambo.glyph-compress --json');
  const result = JSON.parse(raw);
  const publishedVersion = result?.versions?.[0]?.version || 'unknown';
  if (publishedVersion !== currentVersion) {
    throw new Error(`Marketplace version mismatch: expected ${currentVersion}, got ${publishedVersion}`);
  }
  console.log(`\nMarketplace verification ok: Neolambo.glyph-compress@${publishedVersion}`);
}

const rootPkg = readJson('package.json');
const extPkg = readJson('vscode-ext/package.json');
const lockPkg = readJson('vscode-ext/package-lock.json');

const version = rootPkg.version;
const extVersion = extPkg.version;
const lockVersion = lockPkg.version;
const lockRootVersion = lockPkg.packages?.['']?.version;

if (version !== extVersion || version !== lockVersion || version !== lockRootVersion) {
  throw new Error(
    `version mismatch: root=${version}, ext=${extVersion}, lock=${lockVersion}, lock.packages['']=${lockRootVersion}`,
  );
}

const dirty = capture('git status --short');
if (dirty && !allowDirty) {
  throw new Error('working tree is dirty. Commit or stash changes first, or rerun with --allow-dirty.');
}

const vsixPath = path.join(rootDir, 'vscode-ext', `glyph-compress-${version}.vsix`);

console.log(`GlyphCompress release helper`);
console.log(`  version: ${version}`);
console.log(`  dirty worktree: ${dirty ? 'yes' : 'no'}`);
console.log(`  VSCE_PAT: ${process.env.VSCE_PAT ? 'present' : 'missing'}`);

if (writeReleaseNotes) {
  const notesPath = path.join(rootDir, 'RELEASE_NOTES.md');
  fs.writeFileSync(notesPath, generateReleaseNotes(version), 'utf8');
  console.log(`  release notes: ${path.relative(rootDir, notesPath)}`);
}

if (!skipCheck) {
  console.log('\nRunning release validation...');
  run('npm run check');
}

if (!skipPublishDryRun) {
  console.log('\nRunning npm publish dry-run...');
  run('npm publish --dry-run');
}

if (!skipPackage) {
  console.log('\nPackaging VS Code extension...');
  run('npm run package:vscode');
}

if (!skipPackage && !fs.existsSync(vsixPath)) {
  throw new Error(`expected VSIX not found: ${vsixPath}`);
}

if (verifyMarketplace) {
  verifyMarketplaceVersion(version);
}

printCommandBlock('Next release commands:', [
  'git add .',
  `git commit -m "chore(release): v${version}"`,
  `git tag -a v${version} -m "v${version}"`,
  'git push origin master',
  `git push origin v${version}`,
  'npm publish',
  `gh release create v${version} .\\vscode-ext\\glyph-compress-${version}.vsix --title "GlyphCompress v${version}" --notes-file RELEASE_NOTES.md`,
]);

printCommandBlock('Post-release verification:', [
  'npm view glyph-compress version dist-tags --json',
  `gh release view v${version} --json tagName,name,url,isDraft,isPrerelease,assets`,
  'npx @vscode/vsce show Neolambo.glyph-compress',
  "code.cmd --list-extensions --show-versions | Select-String -Pattern 'neolambo.glyph-compress'",
  'git status --short',
]);

if (!skipPackage) {
  printCommandBlock('Local VSIX install:', [
    `code.cmd --install-extension .\\vscode-ext\\glyph-compress-${version}.vsix --force`,
  ]);
}

console.log('\nRelease helper completed.');