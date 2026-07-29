/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 *
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 *
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — demo video renderer
 *
 * Run with:  node scripts/render-demo-video.js
 * ffmpeg:    npm install --no-save @ffmpeg-installer/ffmpeg   (if not global)
 *
 * The previous cut led on glyph substitution and closed on "12.7x compression,
 * 92% saved". Both numbers are character counts of the most favourable fixture
 * in the set, and they describe the one technique that real tokenizers later
 * showed to be a net cost — now gated off by default. A viewer who installed
 * on the strength of that video could watch the tool decline to compress a
 * short prompt and conclude it was broken, when that is the never-inflate
 * guard working exactly as designed.
 *
 * ONE RULE FOR ANYONE EDITING THE SCENES BELOW: every figure on screen must be
 * a TOKEN count that a command in this repository prints. No character counts,
 * no ratios from a hand-picked file, nothing that cannot be reproduced by a
 * viewer on their own code. The commands that produce each number are named in
 * the scene that shows it, so the claim and its proof travel together.
 */
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(repositoryRoot, 'assets', 'demo-video');
const temporaryDirectory = join(outputDirectory, '.tmp');
const outputPath = join(outputDirectory, 'glyphcompress-session-cost.mp4');
const coverPath = join(outputDirectory, 'glyphcompress-session-cost-cover.png');
const concatListPath = join(temporaryDirectory, 'concat.txt');
const ffmpegPath = resolveFfmpegPath();

const { version } = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8'));

const videoWidth = 1920;
const videoHeight = 1080;
const frameRate = 30;
const titleFont = 'C\\:/Windows/Fonts/segoeuib.ttf';
const bodyFont = 'C\\:/Windows/Fonts/segoeui.ttf';
const monoFont = 'C\\:/Windows/Fonts/consola.ttf';

// ASCII only in on-screen strings: the fonts above render the arrows and
// typographic minus signs used in the README inconsistently, and a glyph that
// falls back to a box on one machine is worse than a hyphen everywhere.
const scenes = [
  {
    seconds: 11,
    kicker: 'The Problem',
    title: 'You pay for the same file, every turn',
    subtitle: 'Your IDE re-attaches open files to every request. Turn 10 is not one message. It is the whole conversation, uploaded again.',
    terminal: [
      'turn 1     3,499 tokens',
      'turn 4    14,062 tokens',
      'turn 8    28,146 tokens',
    ],
    caption: 'Real js-tiktoken counts. The useful part stays flat. The bill does not.',
    accent: '0xe76f51',
  },
  {
    seconds: 10,
    kicker: 'The Reframe',
    title: 'The compression ratio is not the bill',
    subtitle: 'Measure the two separately and they come apart immediately.',
    bullets: [
      'Making a file 25% smaller is worth 25% of it',
      'Not sending it again is worth all of it',
      'Most of a session is content the model already has',
    ],
    caption: 'So the two biggest wins here compress nothing at all.',
    accent: '0x4cc9f0',
  },
  {
    seconds: 13,
    kicker: 'What Actually Pays',
    title: 'Ranked by what it is worth',
    subtitle: 'Each axis measured on its own, against real provider tokenizers.',
    terminal: [
      'Send a re-attached file once      -78.5% billed   measure:differential',
      'Cache breakpoint at prefix end    -32.9% at 42 turns   measure:cache',
      'Compress the content itself        26% aggregate   npm run benchmark',
    ],
    caption: 'Compression is third. It is the one everyone reaches for first.',
    accent: '0x3bb273',
  },
  {
    seconds: 13,
    kicker: 'The Honest Part',
    title: 'We measured our own headline feature',
    subtitle: 'It lost.',
    bullets: [
      'The glyph encoding in the name costs tokens on real files',
      'BPE already gives ordinary words the shortest codes',
      'Anything that looks like a code is more expensive, not less',
    ],
    caption: 'Off by default, held there by a rule that refuses to send more tokens than it received.',
    accent: '0xf6bd60',
  },
  {
    seconds: 13,
    kicker: 'Proof You Can Run',
    title: 'Do not take our number',
    subtitle: 'Every figure above comes from one fixture. Get your own, from your code.',
    terminal: [
      'npx glyph-compress measure src/your-biggest-file.ts --turns 10',
      'Tokens sent       283,525 ->  57,472    -79.7%',
      'Billed w/ cache   167,547 ->  34,304    -79.5%',
    ],
    caption: 'Two columns, because they can disagree. When they do, you should be the one who knows.',
    accent: '0x9b5de5',
  },
  {
    seconds: 10,
    kicker: 'Where It Runs',
    title: 'CLI, VS Code, MCP server, proxy',
    subtitle: 'Drop it in front of any OpenAI-compatible tool, or call it as a library.',
    bullets: [
      'npm i glyph-compress   |   npx glyph-compress measure <file>',
      'VS Code Marketplace: neolambo.glyph-compress',
      'AGPL-3.0, with a commercial licence for proprietary use',
    ],
    caption: 'Thirty seconds to your own number. No signup, no configuration, no account.',
    accent: '0xffb703',
  },
];

mkdirSync(outputDirectory, { recursive: true });
rmSync(temporaryDirectory, { recursive: true, force: true });
mkdirSync(temporaryDirectory, { recursive: true });

const scenePaths = scenes.map((scene, sceneIndex) => {
  const scenePath = join(temporaryDirectory, `scene-${String(sceneIndex + 1).padStart(2, '0')}.mp4`);
  renderScene(scene, scenePath, sceneIndex);
  return scenePath;
});

writeFileSync(
  concatListPath,
  scenePaths.map((scenePath) => `file '${scenePath.replaceAll('\\', '/')}'`).join('\n'),
  'utf8',
);

runFfmpeg(['-y', '-hide_banner', '-f', 'concat', '-safe', '0', '-i', concatListPath, '-c', 'copy', outputPath]);
runFfmpeg(['-y', '-hide_banner', '-ss', '00:00:03', '-i', outputPath, '-frames:v', '1', coverPath]);

rmSync(temporaryDirectory, { recursive: true, force: true });
const totalSeconds = scenes.reduce((sum, scene) => sum + scene.seconds, 0);
console.log(`Rendered ${outputPath} (${totalSeconds}s, ${scenes.length} scenes)`);
console.log(`Rendered ${coverPath}`);

function renderScene(scene, scenePath, sceneIndex) {
  const progressWidth = Math.round(videoWidth * ((sceneIndex + 1) / scenes.length));
  const sceneCounter = `${String(sceneIndex + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
  const filters = [
    `drawbox=x=0:y=0:w=${videoWidth}:h=${videoHeight}:color=0x121826:t=fill`,
    `drawbox=x=0:y=0:w=${videoWidth}:h=92:color=0x0b1020:t=fill`,
    `drawbox=x=0:y=92:w=${progressWidth}:h=8:color=${scene.accent}:t=fill`,
    `drawbox=x=0:y=100:w=${videoWidth}:h=1:color=0x2a3654:t=fill`,
    `drawbox=x=96:y=132:w=1728:h=758:color=0x172033@0.96:t=fill`,
    `drawbox=x=96:y=132:w=1728:h=1:color=0x34415f:t=fill`,
    `drawbox=x=96:y=132:w=10:h=758:color=${scene.accent}:t=fill`,
    `drawbox=x=124:y=26:w=54:h=54:color=${scene.accent}:t=fill`,
    drawText('GC', 136, 36, 28, '0x0b1020', titleFont),
    drawText('GlyphCompress', 198, 28, 32, '0xf8fbff', titleFont),
    drawText('Fewer tokens billed, measured against real tokenizers', 198, 62, 20, '0x9fb0d0', bodyFont),
    drawText(sceneCounter, 1644, 28, 26, '0xdce6ff', monoFont),
    drawText(`v${version}`, 1644, 60, 22, '0x9fb0d0', bodyFont),
    drawText(scene.kicker, 134, 166, 28, scene.accent, titleFont),
    drawText(scene.title, 134, 214, 64, '0xffffff', titleFont),
    ...drawWrappedText(scene.subtitle, 134, 310, 38, 58, '0xdce6ff', bodyFont, 74),
  ];

  if (scene.terminal) {
    filters.push(...drawTerminal(scene.terminal, 134, 448, 1652, 268, scene.accent));
  }

  if (scene.bullets) {
    filters.push(...drawBullets(scene.bullets, 152, 462, scene.accent));
  }

  if (scene.caption) {
    filters.push('drawbox=x=96:y=908:w=1728:h=72:color=0x0f1728:t=fill');
    filters.push(...drawWrappedText(scene.caption, 134, 924, 32, 40, '0xffffff', bodyFont, 92));
  }

  filters.push(drawText('github.com/Neolambo/glyph-compress', 124, 1012, 28, '0x9fb0d0', bodyFont));
  filters.push(drawText('npm | VS Code Marketplace | MCP', 1330, 1012, 28, '0x9fb0d0', bodyFont));

  runFfmpeg([
    '-y', '-hide_banner',
    '-f', 'lavfi', '-i', `color=c=0x121826:s=${videoWidth}x${videoHeight}:r=${frameRate}:d=${scene.seconds}`,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-vf', filters.join(','),
    '-shortest',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '20',
    '-c:a', 'aac', '-b:a', '128k',
    scenePath,
  ]);
}

function drawTerminal(lines, boxX, boxY, boxWidth, boxHeight, accentColor) {
  const filters = [
    `drawbox=x=${boxX}:y=${boxY}:w=${boxWidth}:h=${boxHeight}:color=0x070b12:t=fill`,
    `drawbox=x=${boxX}:y=${boxY}:w=${boxWidth}:h=54:color=0x202b42:t=fill`,
    drawText('measured with js-tiktoken', boxX + 28, boxY + 16, 24, '0xdce6ff', bodyFont),
    `drawbox=x=${boxX + boxWidth - 128}:y=${boxY + 18}:w=24:h=24:color=${accentColor}:t=fill`,
  ];

  lines.forEach((line, lineIndex) => {
    const prefix = line.startsWith('npx') || line.startsWith('npm') ? '> ' : '  ';
    filters.push(drawText(`${prefix}${line}`, boxX + 30, boxY + 84 + lineIndex * 56, 27, '0xe8f1ff', monoFont));
  });

  return filters;
}

function drawBullets(bullets, bulletX, bulletY, accentColor) {
  return bullets.flatMap((bullet, bulletIndex) => {
    const currentY = bulletY + bulletIndex * 76;
    return [
      `drawbox=x=${bulletX}:y=${currentY + 14}:w=18:h=18:color=${accentColor}:t=fill`,
      drawText(bullet, bulletX + 42, currentY, 34, '0xe8f1ff', bodyFont),
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
  // expansion=none is load-bearing, not tidiness. Under drawtext's default
  // expansion a percent sign opens a %{...} directive, and the escaped form is
  // not a valid escape: ffmpeg logs "Stray %", DISCARDS THE ENTIRE STRING, and
  // still exits 0. Every line carrying a saving in percent therefore rendered
  // as an empty terminal panel while the build reported success. Disabling
  // expansion makes the text literal, so percent needs no escape at all.
  return `drawtext=fontfile='${fontFile}':text='${escapeDrawText(text)}':x=${textX}:y=${textY}:fontsize=${fontSize}:fontcolor=${color}:line_spacing=10:expansion=none`;
}

// Escapes for the FILTER-ARGUMENT level only: characters that would otherwise
// end the option, the quoted string, or the filter itself. Percent is
// deliberately absent — with expansion disabled it is an ordinary character,
// and escaping it would print a literal backslash on screen.
function escapeDrawText(text) {
  return String(text)
    .replaceAll('\\', '\\\\')
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

  // A drawtext filter that cannot parse its own text does not fail the render:
  // it logs, drops the string, and returns 0. The first cut of this script
  // produced a video with three empty terminal panels and reported success.
  // Exit codes are not enough here — the log has to be read.
  const log = `${result.stderr || ''}${result.stdout || ''}`;
  const complaint = /Stray %|Unable to parse|Could not load font|No such filter/i.exec(log);
  if (complaint) {
    process.stderr.write(log);
    throw new Error(`ffmpeg reported "${complaint[0]}" while exiting 0 — text was silently dropped from the frame`);
  }
}

function resolveFfmpegPath() {
  const localPath = join(repositoryRoot, 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');
  if (existsSync(localPath)) {
    return localPath;
  }

  return 'ffmpeg';
}
