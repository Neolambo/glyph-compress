import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(repositoryRoot, 'assets', 'demo-video');
const temporaryDirectory = join(outputDirectory, '.tmp');
const outputPath = join(outputDirectory, 'glyphcompress-demo-75s.mp4');
const concatListPath = join(temporaryDirectory, 'concat.txt');
const ffmpegPath = resolveFfmpegPath();

const videoWidth = 1920;
const videoHeight = 1080;
const frameRate = 30;
const titleFont = 'C\\:/Windows/Fonts/segoeuib.ttf';
const bodyFont = 'C\\:/Windows/Fonts/segoeui.ttf';
const monoFont = 'C\\:/Windows/Fonts/consola.ttf';

const scenes = [
  {
    seconds: 8,
    title: 'GlyphCompress in 75 seconds',
    subtitle: 'Semantic compression for IDE-to-LLM context',
    bullets: ['CLI, npm, VS Code Marketplace, local proxy', 'Source maps, privacy redaction, provider profiles', 'Trust policies: lossless, reversible, privacy, lossy'],
    accent: '0x3bb273',
  },
  {
    seconds: 11,
    title: 'Install from the terminal',
    subtitle: 'No setup ceremony. Try the CLI directly with npx.',
    terminal: [
      'npx glyph-compress --help',
      'npx glyph-compress README.md --level ultra --provider openai --trust reversible --explain',
    ],
    caption: 'Start with one command, then point it at a real project file.',
    accent: '0xf6bd60',
  },
  {
    seconds: 12,
    title: 'Compress one useful workflow',
    subtitle: 'Send richer coding context while spending fewer tokens.',
    terminal: [
      'Original context: README.md, diagnostics, file refs, repeated identifiers',
      'Compressed context: shared glyph codebook + compact semantic payload',
      'Example result: 80-90% savings on representative coding tasks',
    ],
    stats: ['12.7x compression', '92% saved', '0 hallucinated refs in benchmark'],
    accent: '0x4cc9f0',
  },
  {
    seconds: 12,
    title: 'Keep compression auditable',
    subtitle: 'Reversible mode blocks risky code minification and emits source-map metadata.',
    terminal: [
      'npx glyph-compress src/app.ts --provider anthropic --trust reversible --source-map',
      'sourceMap.version = 1.8.0',
      'sourceMap.trustPolicy = reversible',
      'sourceMap.files, symbols, ast, privacy, provider, trust',
    ],
    caption: 'Source maps explain what changed and why.',
    accent: '0xe76f51',
  },
  {
    seconds: 11,
    title: 'Use it inside VS Code',
    subtitle: 'Install the Marketplace extension for one-click compressed context.',
    terminal: [
      'Extension: neolambo.glyph-compress',
      'Command: GlyphCompress: Ask LLM (Auto-Compress)',
      'Command: GlyphCompress: Compress Entire Workspace',
      'Setting: glyphCompress.trustPolicy = reversible',
    ],
    caption: 'The workflow stays inside the editor.',
    accent: '0x9b5de5',
  },
  {
    seconds: 10,
    title: 'Proxy workflows are available too',
    subtitle: 'Route OpenAI-compatible tools through a local compression proxy.',
    terminal: [
      'npx glyph-compress --proxy 8080',
      'API base URL: http://localhost:8080/v1',
      'Works with tools that support custom OpenAI-compatible endpoints',
    ],
    caption: 'Useful for Continue, Cline, Roo Code, and custom agent stacks.',
    accent: '0x2a9d8f',
  },
  {
    seconds: 11,
    title: 'Try it, benchmark it, challenge it',
    subtitle: 'GlyphCompress v1.8.0 is published on npm, GitHub, and the VS Code Marketplace.',
    bullets: [
      'GitHub: github.com/Neolambo/glyph-compress',
      'Wiki: github.com/Neolambo/glyph-compress/wiki',
      'Feedback: github.com/Neolambo/glyph-compress/issues/1',
    ],
    caption: 'Looking for AI tooling integrations and real-world benchmarks.',
    accent: '0xffb703',
  },
];

mkdirSync(outputDirectory, { recursive: true });
rmSync(temporaryDirectory, { recursive: true, force: true });
mkdirSync(temporaryDirectory, { recursive: true });

const scenePaths = scenes.map((scene, sceneIndex) => {
  const scenePath = join(temporaryDirectory, `scene-${String(sceneIndex + 1).padStart(2, '0')}.mp4`);
  renderScene(scene, scenePath);
  return scenePath;
});

writeFileSync(
  concatListPath,
  scenePaths.map((scenePath) => `file '${scenePath.replaceAll('\\', '/')}'`).join('\n'),
  'utf8',
);

runFfmpeg([
  '-y',
  '-hide_banner',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  concatListPath,
  '-c',
  'copy',
  outputPath,
]);

rmSync(temporaryDirectory, { recursive: true, force: true });
console.log(`Rendered ${outputPath}`);

function renderScene(scene, scenePath) {
  const filters = [
    `drawbox=x=0:y=0:w=${videoWidth}:h=${videoHeight}:color=0x121826:t=fill`,
    `drawbox=x=0:y=0:w=${videoWidth}:h=18:color=${scene.accent}:t=fill`,
    `drawbox=x=88:y=96:w=1744:h=792:color=0x182236@0.92:t=fill`,
    `drawbox=x=88:y=96:w=10:h=792:color=${scene.accent}:t=fill`,
    drawText('GlyphCompress', 124, 126, 34, '0xc8d3f5', bodyFont),
    drawText('v1.8.0 demo', 1610, 126, 30, '0x93a4c7', bodyFont),
    drawText(scene.title, 124, 202, 72, '0xffffff', titleFont),
    ...drawWrappedText(scene.subtitle, 124, 306, 44, 72, '0xdce6ff', bodyFont, 58),
  ];

  if (scene.terminal) {
    filters.push(...drawTerminal(scene.terminal, 124, 410, 1670, 300, scene.accent));
  }

  if (scene.bullets) {
    filters.push(...drawBullets(scene.bullets, 142, 430, scene.accent));
  }

  if (scene.stats) {
    filters.push(...drawStats(scene.stats, 124, 740, scene.accent));
  }

  if (scene.caption) {
    filters.push(drawText(scene.caption, 124, 914, 38, '0xffffff', bodyFont));
  }

  filters.push(drawText('github.com/Neolambo/glyph-compress', 124, 992, 30, '0x93a4c7', bodyFont));

  runFfmpeg([
    '-y',
    '-hide_banner',
    '-f',
    'lavfi',
    '-i',
    `color=c=0x121826:s=${videoWidth}x${videoHeight}:r=${frameRate}:d=${scene.seconds}`,
    '-f',
    'lavfi',
    '-i',
    'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-vf',
    filters.join(','),
    '-shortest',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    scenePath,
  ]);
}

function drawTerminal(lines, boxX, boxY, boxWidth, boxHeight, accentColor) {
  const filters = [
    `drawbox=x=${boxX}:y=${boxY}:w=${boxWidth}:h=${boxHeight}:color=0x070b12:t=fill`,
    `drawbox=x=${boxX}:y=${boxY}:w=${boxWidth}:h=54:color=0x202b42:t=fill`,
    drawText('PowerShell', boxX + 28, boxY + 16, 24, '0xdce6ff', bodyFont),
    `drawbox=x=${boxX + boxWidth - 128}:y=${boxY + 18}:w=24:h=24:color=${accentColor}:t=fill`,
  ];

  lines.forEach((line, lineIndex) => {
    const prefix = lineIndex === 0 && line.startsWith('npx') ? '> ' : '  ';
    filters.push(drawText(`${prefix}${line}`, boxX + 30, boxY + 86 + lineIndex * 52, 28, '0xe8f1ff', monoFont));
  });

  return filters;
}

function drawBullets(bullets, bulletX, bulletY, accentColor) {
  return bullets.flatMap((bullet, bulletIndex) => {
    const currentY = bulletY + bulletIndex * 72;
    return [
      `drawbox=x=${bulletX}:y=${currentY + 12}:w=18:h=18:color=${accentColor}:t=fill`,
      drawText(bullet, bulletX + 42, currentY, 36, '0xe8f1ff', bodyFont),
    ];
  });
}

function drawStats(stats, statsX, statsY, accentColor) {
  const statWidth = 520;
  return stats.flatMap((stat, statIndex) => {
    const currentX = statsX + statIndex * (statWidth + 36);
    return [
      `drawbox=x=${currentX}:y=${statsY}:w=${statWidth}:h=108:color=0x243047:t=fill`,
      `drawbox=x=${currentX}:y=${statsY}:w=${statWidth}:h=8:color=${accentColor}:t=fill`,
      drawText(stat, currentX + 28, statsY + 34, 34, '0xffffff', titleFont),
    ];
  });
}

function drawWrappedText(text, textX, textY, fontSize, lineHeight, color, fontFile, maxCharacters) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length > maxCharacters) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.map((line, lineIndex) => drawText(line, textX, textY + lineIndex * lineHeight, fontSize, color, fontFile));
}

function drawText(text, textX, textY, fontSize, color, fontFile) {
  return `drawtext=fontfile='${fontFile}':text='${escapeDrawText(text)}':x=${textX}:y=${textY}:fontsize=${fontSize}:fontcolor=${color}:line_spacing=10`;
}

function escapeDrawText(text) {
  return String(text)
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll(':', '\\:')
    .replaceAll("'", "\\'")
    .replaceAll(',', '\\,')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]');
}

function runFfmpeg(args) {
  const result = spawnSync(ffmpegPath, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || '');
    throw new Error(`ffmpeg failed with exit code ${result.status}`);
  }
}

function resolveFfmpegPath() {
  const localPath = join(repositoryRoot, 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');
  if (existsSync(localPath)) {
    return localPath;
  }

  return 'ffmpeg';
}