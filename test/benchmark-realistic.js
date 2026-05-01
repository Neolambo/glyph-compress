/**
 * GlyphCompress realistic benchmark harness.
 *
 * Measures three behaviors the synthetic benchmark does not capture well:
 * 1. raw repository corpus compression on real project files
 * 2. chat payload overhead once the glyph codebook is injected
 * 3. multi-turn chat amortization across cumulative IDE conversations
 * 4. local throughput/latency under repeated compression load
 */

import fs from 'fs';
import { performance } from 'perf_hooks';

import { GlyphCompressor } from '../src/glyph-middleware.js';
import { estimateProviderTokens } from '../src/token-estimator.js';

const fileCases = [
  'README.md',
  'ROADMAP.md',
  'docs/architecture.md',
  'src/compressor.js',
  'src/workspace-intelligence.js',
];

const rawLevels = ['light', 'standard', 'aggressive', 'ultra'];
const runsPerCase = 25;

const chatPrompts = [
  {
    name: 'short-fix',
    system: 'You are a senior TypeScript engineer.',
    user: "Fix src/server/auth.ts. Property 'email' does not exist on type 'User'.",
  },
  {
    name: 'medium-review',
    system: 'You are an expert code reviewer.',
    user: `Review this file and suggest safe refactors:\n\n${fs.readFileSync('src/workspace-intelligence.js', 'utf8').slice(0, 2200)}`,
  },
  {
    name: 'large-architecture',
    system: 'You are a principal engineer documenting architecture decisions.',
    user: `Summarize this roadmap and architecture for a release review:\n\n${fs.readFileSync('ROADMAP.md', 'utf8').slice(0, 5000)}`,
  },
];

const enterpriseChatPrompts = [
  {
    name: 'pr-review-large-file',
    system: 'You are a staff engineer reviewing a production pull request for a TypeScript monorepo.',
    user: `Review this implementation and report correctness risks, edge cases, and safe refactors:\n\n${fs.readFileSync('src/workspace-intelligence.js', 'utf8').slice(0, 4200)}`,
    weight: 4,
  },
  {
    name: 'release-readiness',
    system: 'You are a principal engineer preparing an enterprise release-readiness review.',
    user: `Summarize rollout risks, validation gaps, and operational impact from these project docs:\n\n${fs.readFileSync('ROADMAP.md', 'utf8').slice(0, 3600)}\n\n${fs.readFileSync('docs/architecture.md', 'utf8')}`,
    weight: 3,
  },
  {
    name: 'incident-root-cause',
    system: 'You are a senior engineer debugging a production incident from an IDE session.',
    user: `Investigate this code path and propose the safest minimal fix with targeted regression tests:\n\n${fs.readFileSync('src/compressor.js', 'utf8').slice(0, 3600)}`,
    weight: 4,
  },
  {
    name: 'test-plan-generation',
    system: 'You are a staff engineer writing an enterprise test plan before merge.',
    user: `Generate a test plan with unit, integration, and rollback checks for this repository slice:\n\n${fs.readFileSync('README.md', 'utf8').slice(0, 2600)}\n\n${fs.readFileSync('src/workspace-intelligence.js', 'utf8').slice(0, 1800)}`,
    weight: 2,
  },
];

const multiTurnConversations = [
  {
    name: 'repo-fix-thread',
    system: 'You are a senior TypeScript engineer fixing bugs in a production repository.',
    turns: [
      {
        user: "Fix src/server/auth.ts. Property 'email' does not exist on type 'User'.",
        assistant: 'I will inspect the auth flow and patch the type mismatch first.',
      },
      {
        user: `Now review this related code for regressions:\n\n${fs.readFileSync('src/workspace-intelligence.js', 'utf8').slice(0, 1800)}`,
        assistant: 'The ranking logic and doctor metadata look related to the auth path.',
      },
      {
        user: "Write a safe follow-up note for the release explaining the fix, settings impact, and test coverage.",
        assistant: 'I can summarize the patch, impacted files, and validation status.',
      },
    ],
  },
  {
    name: 'architecture-review-thread',
    system: 'You are a principal engineer preparing an architectural release review.',
    turns: [
      {
        user: `Summarize the roadmap status for this release:\n\n${fs.readFileSync('ROADMAP.md', 'utf8').slice(0, 3200)}`,
        assistant: 'I will summarize the current stable release and remaining gaps.',
      },
      {
        user: `Now incorporate the architecture notes too:\n\n${fs.readFileSync('docs/architecture.md', 'utf8')}`,
        assistant: 'I can connect the roadmap with the compression pipeline and provider behavior.',
      },
      {
        user: `Finally, draft a concise release review using these docs:\n\n${fs.readFileSync('README.md', 'utf8').slice(0, 2200)}`,
        assistant: 'I will produce a concise release-review summary with risks and validation.',
      },
    ],
  },
];

const enterpriseMultiTurnConversations = [
  {
    name: 'enterprise-pr-thread',
    system: 'You are a staff engineer reviewing a production pull request in a large repository.',
    weight: 4,
    turns: [
      {
        user: `Review this implementation and identify correctness risks before merge:\n\n${fs.readFileSync('src/workspace-intelligence.js', 'utf8').slice(0, 2400)}`,
        assistant: [
          'Initial review findings: src/workspace-intelligence.js mixes repository ranking, doctor reporting, and release summaries in one flow.',
          'Primary risks: coupling between ranking heuristics and release metadata, weak isolation of provider-specific formatting, and limited regression coverage for enterprise review prompts.',
          'Recommended follow-up: isolate scoring rules, add regression tests for review and release-readiness flows, and verify provider-aware summaries remain stable after refactors.',
        ].join(' '),
      },
      {
        user: `Now focus on regression coverage and missing tests for this related code:\n\n${fs.readFileSync('src/compressor.js', 'utf8').slice(0, 1800)}`,
        assistant: [
          'Regression plan: cover provider-aware token estimates, dynamic dictionary threshold differences, and fallback behavior when compressed chat payloads are net-negative.',
          'Missing tests: assistant-history reuse in multi-turn review threads, release-note generation with large context, and validation that source maps stay reversible under review-oriented prompts.',
        ].join(' '),
      },
      {
        user: 'Draft the final PR summary with risks, mitigation, and rollout guidance for reviewers.',
        assistant: 'I can summarize the merge risk, validation, and rollout notes clearly.',
      },
    ],
  },
  {
    name: 'enterprise-release-thread',
    system: 'You are a principal engineer preparing an enterprise release-readiness review.',
    weight: 3,
    turns: [
      {
        user: `Summarize the roadmap risks and remaining work for this release:\n\n${fs.readFileSync('ROADMAP.md', 'utf8').slice(0, 2600)}`,
        assistant: [
          'Release snapshot: the stable platform work is complete, but realistic enterprise payload efficiency is still modest for repeated IDE conversations.',
          'Main risk areas: multi-turn thread overhead, payload fallback in short sessions, and incomplete capture of provider-native caching benefits in the current benchmark harness.',
        ].join(' '),
      },
      {
        user: `Add architecture context and deployment implications from these notes:\n\n${fs.readFileSync('docs/architecture.md', 'utf8')}`,
        assistant: [
          'Architecture notes: glyph compression improves dense repository context, but cost is dominated by repeated protocol overhead on chat providers.',
          'Deployment implication: enterprise IDE flows benefit most when large review and release-readiness prompts are amortized across stable sessions rather than short isolated calls.',
        ].join(' '),
      },
      {
        user: `Draft an executive release note using these additional details:\n\n${fs.readFileSync('README.md', 'utf8').slice(0, 1800)}`,
        assistant: 'I can produce a concise executive release note with risks and validation.',
      },
    ],
  },
  {
    name: 'enterprise-incident-thread',
    system: 'You are a senior engineer handling an incident investigation from the IDE.',
    weight: 4,
    turns: [
      {
        user: `Investigate this code path for a likely production failure mode:\n\n${fs.readFileSync('src/compressor.js', 'utf8').slice(0, 2200)}`,
        assistant: [
          'Incident hypothesis: payload fallback and provider-aware codebook injection may interact in ways that hide savings on short or mixed-size enterprise threads.',
          'Safe-fix strategy: keep fallback as the guardrail, isolate compression candidates, and verify exact behavior with benchmark and integration coverage before widening scope.',
        ].join(' '),
      },
      {
        user: `Review the neighboring implementation for regressions and configuration side effects:\n\n${fs.readFileSync('src/workspace-intelligence.js', 'utf8').slice(0, 1600)}`,
        assistant: [
          'Regression check: look for source-map drift, provider profile mismatches, and any hidden dependency on a fixed codebook shape across review and incident workflows.',
          'Operational note: rollout guidance should highlight which enterprise prompts benefit from compression and which ones still fall back to the original payload.',
        ].join(' '),
      },
      {
        user: 'Write the incident follow-up note with root cause, fix scope, and validation checklist.',
        assistant: 'I can draft the incident follow-up with root cause, fix scope, and validation.',
      },
    ],
  },
];

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function formatMs(value) {
  return `${value.toFixed(2)}ms`;
}

function formatPct(value) {
  return `${Math.round(value * 100)}%`;
}

function anthropicPayloadToEstimatorMessages(payload) {
  return [
    { role: 'system', content: payload.system || '' },
    ...(payload.messages || []),
  ];
}

function measureAnthropicCacheableBlocks(payload) {
  const blocks = [];
  const systemBlocks = Array.isArray(payload.system)
    ? payload.system.filter((block) => block && block.cache_control)
    : [];

  for (const block of systemBlocks) {
    blocks.push({ role: 'system', content: block.text || '' });
  }

  for (const message of payload.messages || []) {
    if (message.role !== 'user' || !Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block && block.type === 'text' && block.cache_control) {
        blocks.push({ role: 'user', content: block.text || '' });
      }
    }
  }

  return blocks;
}

function estimateAnthropicCacheAdjustedTokens(payload, cacheState = new Set()) {
  const transmittedTokens = estimateProviderTokens(anthropicPayloadToEstimatorMessages(payload), 'anthropic');
  let cachedRepeatTokens = 0;
  const nextCacheState = new Set(cacheState);

  for (const block of measureAnthropicCacheableBlocks(payload)) {
    const content = typeof block.content === 'string'
      ? block.content
      : JSON.stringify(block.content);
    const key = `${block.role}:${content}`;

    if (cacheState.has(key)) {
      cachedRepeatTokens += estimateProviderTokens([{ role: block.role, content: block.content }], 'anthropic');
    }

    nextCacheState.add(key);
  }

  return {
    transmittedTokens,
    billedTokens: Math.max(1, transmittedTokens - cachedRepeatTokens),
    cachedRepeatTokens,
    cacheState: nextCacheState,
  };
}

function measureChatPrompt(prompt, provider, level = 'standard') {
  const messages = [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ];

  let originalPayloadTokens = estimateProviderTokens(messages, provider);
  const compressor = new GlyphCompressor({ level, provider });
  const result = compressor.compressMessages(messages, provider);
  let compressedPayloadTokens = estimateProviderTokens(result.messages, provider);

  if (provider === 'anthropic') {
    const payload = compressor._prepareAnthropicPayload(prompt.system, [{ role: 'user', content: prompt.user }]);
    originalPayloadTokens = estimateProviderTokens(anthropicPayloadToEstimatorMessages({ system: prompt.system, messages: [{ role: 'user', content: prompt.user }] }), provider);
    compressedPayloadTokens = estimateProviderTokens(anthropicPayloadToEstimatorMessages(payload), provider);
  }

  const originalUserTokens = estimateProviderTokens([{ role: 'user', content: prompt.user }], provider);
  const compressedUserTokens = estimateProviderTokens(
    result.messages.filter((message) => message.role === 'user'),
    provider,
  );

  return {
    messages,
    result,
    originalPayloadTokens,
    compressedPayloadTokens,
    originalUserTokens,
    compressedUserTokens,
    payloadRatio: originalPayloadTokens / Math.max(1, compressedPayloadTokens),
    payloadSavedPct: 1 - (compressedPayloadTokens / Math.max(1, originalPayloadTokens)),
    userRatio: originalUserTokens / Math.max(1, compressedUserTokens),
    userSavedPct: 1 - (compressedUserTokens / Math.max(1, originalUserTokens)),
  };
}

function benchmarkRawCorpus() {
  console.log('\n=== REALISTIC RAW CORPUS BENCHMARK ===\n');

  for (const filePath of fileCases) {
    const input = fs.readFileSync(filePath, 'utf8');
    console.log(`FILE ${filePath} (${input.length} chars)`);

    for (const level of rawLevels) {
      const compressor = new GlyphCompressor({ level, provider: 'raw' });
      const timings = [];
      let result = null;

      for (let index = 0; index < runsPerCase; index += 1) {
        const startedAt = performance.now();
        result = compressor.compressText(input, 'raw');
        timings.push(performance.now() - startedAt);
      }

      const average = timings.reduce((sum, value) => sum + value, 0) / timings.length;
      const p95 = percentile(timings, 95);
      const stats = result.stats;

      console.log([
        `  ${level.padEnd(10)}`,
        `ratio=${stats.ratio.padStart(5)}`,
        `saved=${stats.savedPct.padStart(4)}`,
        `orig=${String(stats.originalTokens).padStart(5)}`,
        `comp=${String(stats.compressedTokens).padStart(5)}`,
        `avg=${formatMs(average).padStart(8)}`,
        `p95=${formatMs(p95).padStart(8)}`,
      ].join(' | '));
    }

    console.log('');
  }
}

function benchmarkChatPayloads() {
  console.log('\n=== REALISTIC CHAT PAYLOAD BENCHMARK ===\n');

  for (const provider of ['openai', 'anthropic']) {
    console.log(`PROVIDER ${provider}`);

    for (const prompt of chatPrompts) {
      const metrics = measureChatPrompt(prompt, provider);

      console.log([
        `  ${prompt.name.padEnd(18)}`,
        `payloadRatio=${metrics.payloadRatio.toFixed(2)}x`.padEnd(18),
        `payloadSaved=${formatPct(metrics.payloadSavedPct)}`.padEnd(16),
        `userRatio=${metrics.userRatio.toFixed(2)}x`.padEnd(15),
        `userSaved=${formatPct(metrics.userSavedPct)}`.padEnd(13),
        `payloadTokens=${metrics.originalPayloadTokens}->${metrics.compressedPayloadTokens}`,
      ].join(' | '));
    }

    console.log('');
  }

  console.log('Notes: payloadSaved includes the injected glyph codebook; userSaved isolates only the compressed user message.');
}

function benchmarkEnterpriseNominalUsage() {
  console.log('\n=== ENTERPRISE IDE NOMINAL USAGE ===\n');

  for (const provider of ['openai', 'anthropic']) {
    console.log(`PROVIDER ${provider}`);

    let weightedOriginalPayloadTokens = 0;
    let weightedCompressedPayloadTokens = 0;
    let weightedOriginalUserTokens = 0;
    let weightedCompressedUserTokens = 0;
    let weightedOriginalBilledTokens = 0;
    let weightedCompressedBilledTokens = 0;

    console.log('  Single-turn workloads');
    for (const prompt of enterpriseChatPrompts) {
      const metrics = measureChatPrompt(prompt, provider);
      const weight = prompt.weight || 1;
      weightedOriginalPayloadTokens += metrics.originalPayloadTokens * weight;
      weightedCompressedPayloadTokens += metrics.compressedPayloadTokens * weight;
      weightedOriginalUserTokens += metrics.originalUserTokens * weight;
      weightedCompressedUserTokens += metrics.compressedUserTokens * weight;

      console.log([
        `    ${prompt.name.padEnd(22)}`,
        `weight=${String(weight).padEnd(2)}`,
        `payloadSaved=${formatPct(metrics.payloadSavedPct)}`.padEnd(16),
        `userSaved=${formatPct(metrics.userSavedPct)}`.padEnd(13),
        `selected=${String(metrics.result.stats.thisMessage.selectedLevel || 'n/a')}`,
      ].join(' | '));
    }

    console.log('  Multi-turn workloads');
    for (const conversation of enterpriseMultiTurnConversations) {
      let totalOriginalPayloadTokens = 0;
      let totalCompressedPayloadTokens = 0;
      let totalOriginalUserTokens = 0;
      let totalCompressedUserTokens = 0;
      let totalOriginalBilledTokens = 0;
      let totalCompressedBilledTokens = 0;
      let originalCacheState = new Set();
      let compressedCacheState = new Set();

      const transcript = [];
      for (const turn of conversation.turns) {
        transcript.push({ role: 'user', content: turn.user });

        const requestMessages = [
          { role: 'system', content: conversation.system },
          ...transcript,
        ];

        const compressor = new GlyphCompressor({ level: 'standard', provider });
        const result = compressor.compressMessages(requestMessages, provider);
        let originalPayloadTokens = estimateProviderTokens(requestMessages, provider);
        let compressedPayloadTokens = estimateProviderTokens(result.messages, provider);
        const originalUserTokens = estimateProviderTokens([{ role: 'user', content: turn.user }], provider);
        const compressedUserTokens = estimateProviderTokens(
          result.messages.filter((message) => message.role === 'user').slice(-1),
          provider,
        );

        let originalAnthropicPayload = null;
        let compressedAnthropicPayload = null;

        if (provider === 'anthropic') {
          originalAnthropicPayload = {
            system: conversation.system,
            messages: transcript.map((message) => ({ ...message })),
          };
          compressedAnthropicPayload = compressor._prepareAnthropicPayload(conversation.system, transcript);
          originalPayloadTokens = estimateProviderTokens(anthropicPayloadToEstimatorMessages(originalAnthropicPayload), provider);
          compressedPayloadTokens = estimateProviderTokens(anthropicPayloadToEstimatorMessages(compressedAnthropicPayload), provider);
        }

        totalOriginalPayloadTokens += originalPayloadTokens;
        totalCompressedPayloadTokens += compressedPayloadTokens;
        totalOriginalUserTokens += originalUserTokens;
        totalCompressedUserTokens += compressedUserTokens;

        if (provider === 'anthropic') {
          const originalCacheMetrics = estimateAnthropicCacheAdjustedTokens(originalAnthropicPayload, originalCacheState);
          const compressedCacheMetrics = estimateAnthropicCacheAdjustedTokens(compressedAnthropicPayload, compressedCacheState);
          totalOriginalBilledTokens += originalCacheMetrics.billedTokens;
          totalCompressedBilledTokens += compressedCacheMetrics.billedTokens;
          originalCacheState = originalCacheMetrics.cacheState;
          compressedCacheState = compressedCacheMetrics.cacheState;
        }

        transcript.push({ role: 'assistant', content: turn.assistant });
      }

      const weight = conversation.weight || 1;
      weightedOriginalPayloadTokens += totalOriginalPayloadTokens * weight;
      weightedCompressedPayloadTokens += totalCompressedPayloadTokens * weight;
      weightedOriginalUserTokens += totalOriginalUserTokens * weight;
      weightedCompressedUserTokens += totalCompressedUserTokens * weight;
      weightedOriginalBilledTokens += totalOriginalBilledTokens * weight;
      weightedCompressedBilledTokens += totalCompressedBilledTokens * weight;

      const row = [
        `    ${conversation.name.padEnd(22)}`,
        `weight=${String(weight).padEnd(2)}`,
        `cumPayloadSaved=${formatPct(1 - (totalCompressedPayloadTokens / Math.max(1, totalOriginalPayloadTokens)))}`.padEnd(20),
        `cumUserSaved=${formatPct(1 - (totalCompressedUserTokens / Math.max(1, totalOriginalUserTokens)))}`,
      ];

      if (provider === 'anthropic') {
        row.push(`cacheAdjSaved=${formatPct(1 - (totalCompressedBilledTokens / Math.max(1, totalOriginalBilledTokens)))}`);
      }

      console.log(row.join(' | '));
    }

    const aggregatePayloadRatio = weightedOriginalPayloadTokens / Math.max(1, weightedCompressedPayloadTokens);
    const aggregateUserRatio = weightedOriginalUserTokens / Math.max(1, weightedCompressedUserTokens);
    const aggregatePayloadSavedPct = 1 - (weightedCompressedPayloadTokens / Math.max(1, weightedOriginalPayloadTokens));
    const aggregateUserSavedPct = 1 - (weightedCompressedUserTokens / Math.max(1, weightedOriginalUserTokens));

    const summary = [
      '  Weighted nominal summary'.padEnd(28),
      `payloadRatio=${aggregatePayloadRatio.toFixed(2)}x`.padEnd(22),
      `payloadSaved=${formatPct(aggregatePayloadSavedPct)}`.padEnd(18),
      `userRatio=${aggregateUserRatio.toFixed(2)}x`.padEnd(18),
      `userSaved=${formatPct(aggregateUserSavedPct)}`,
    ];

    if (provider === 'anthropic' && weightedOriginalBilledTokens > 0) {
      const cacheAdjustedRatio = weightedOriginalBilledTokens / Math.max(1, weightedCompressedBilledTokens);
      const cacheAdjustedSavedPct = 1 - (weightedCompressedBilledTokens / Math.max(1, weightedOriginalBilledTokens));
      summary.push(`cacheAdjRatio=${cacheAdjustedRatio.toFixed(2)}x`.padEnd(21));
      summary.push(`cacheAdjSaved=${formatPct(cacheAdjustedSavedPct)}`);
    }

    console.log(summary.join(' | '));
    console.log('');
  }

  console.log('Notes: enterprise workloads approximate professional IDE usage such as PR review, incident response, test planning, and release-readiness reviews.');
  console.log('Notes: Anthropic cacheAdj metrics are best-case billed-token estimates that only discount exact repeated blocks matching wrapAnthropic cache_control placement (system plus largest user block).');
}

function benchmarkMultiTurnChat() {
  console.log('\n=== MULTI-TURN CHAT AMORTIZATION ===\n');

  for (const provider of ['openai', 'anthropic']) {
    console.log(`PROVIDER ${provider}`);

    for (const conversation of multiTurnConversations) {
      const transcript = [];
      let totalOriginalPayloadTokens = 0;
      let totalCompressedPayloadTokens = 0;
      let totalOriginalUserTokens = 0;
      let totalCompressedUserTokens = 0;
      let totalOriginalBilledTokens = 0;
      let totalCompressedBilledTokens = 0;
      let lastTurnRatio = '0.00x';
      let originalCacheState = new Set();
      let compressedCacheState = new Set();

      for (const turn of conversation.turns) {
        transcript.push({ role: 'user', content: turn.user });

        const requestMessages = [
          { role: 'system', content: conversation.system },
          ...transcript,
        ];

        const compressor = new GlyphCompressor({ level: 'standard', provider });
        const result = compressor.compressMessages(requestMessages, provider);
        let originalPayloadTokens = estimateProviderTokens(requestMessages, provider);
        let compressedPayloadTokens = estimateProviderTokens(result.messages, provider);
        const originalUserTokens = estimateProviderTokens([{ role: 'user', content: turn.user }], provider);
        const compressedUserTokens = estimateProviderTokens(
          result.messages.filter((message) => message.role === 'user').slice(-1),
          provider,
        );

        let originalAnthropicPayload = null;
        let compressedAnthropicPayload = null;

        if (provider === 'anthropic') {
          originalAnthropicPayload = {
            system: conversation.system,
            messages: transcript.map((message) => ({ ...message })),
          };
          compressedAnthropicPayload = compressor._prepareAnthropicPayload(conversation.system, transcript);
          originalPayloadTokens = estimateProviderTokens(anthropicPayloadToEstimatorMessages(originalAnthropicPayload), provider);
          compressedPayloadTokens = estimateProviderTokens(anthropicPayloadToEstimatorMessages(compressedAnthropicPayload), provider);
        }

        totalOriginalPayloadTokens += originalPayloadTokens;
        totalCompressedPayloadTokens += compressedPayloadTokens;
        totalOriginalUserTokens += originalUserTokens;
        totalCompressedUserTokens += compressedUserTokens;
        lastTurnRatio = (originalPayloadTokens / Math.max(1, compressedPayloadTokens)).toFixed(2) + 'x';

        if (provider === 'anthropic') {
          const originalCacheMetrics = estimateAnthropicCacheAdjustedTokens(originalAnthropicPayload, originalCacheState);
          const compressedCacheMetrics = estimateAnthropicCacheAdjustedTokens(compressedAnthropicPayload, compressedCacheState);
          totalOriginalBilledTokens += originalCacheMetrics.billedTokens;
          totalCompressedBilledTokens += compressedCacheMetrics.billedTokens;
          originalCacheState = originalCacheMetrics.cacheState;
          compressedCacheState = compressedCacheMetrics.cacheState;
        }

        transcript.push({ role: 'assistant', content: turn.assistant });
      }

      const payloadRatio = totalOriginalPayloadTokens / Math.max(1, totalCompressedPayloadTokens);
      const payloadSavedPct = 1 - (totalCompressedPayloadTokens / Math.max(1, totalOriginalPayloadTokens));
      const userRatio = totalOriginalUserTokens / Math.max(1, totalCompressedUserTokens);
      const userSavedPct = 1 - (totalCompressedUserTokens / Math.max(1, totalOriginalUserTokens));

      const row = [
        `  ${conversation.name.padEnd(26)}`,
        `turns=${String(conversation.turns.length).padEnd(2)}`,
        `cumPayloadRatio=${payloadRatio.toFixed(2)}x`.padEnd(22),
        `cumPayloadSaved=${formatPct(payloadSavedPct)}`.padEnd(19),
        `cumUserRatio=${userRatio.toFixed(2)}x`.padEnd(18),
        `cumUserSaved=${formatPct(userSavedPct)}`.padEnd(17),
        `lastTurn=${lastTurnRatio}`,
      ];

      if (provider === 'anthropic' && totalOriginalBilledTokens > 0) {
        const cacheAdjustedSavedPct = 1 - (totalCompressedBilledTokens / Math.max(1, totalOriginalBilledTokens));
        row.push(`cacheAdjSaved=${formatPct(cacheAdjustedSavedPct)}`);
      }

      console.log(row.join(' | '));
    }

    console.log('');
  }

  console.log('Notes: cumPayloadSaved sums every API request in the conversation; repeated system codebook injection is counted on each turn.');
  console.log('Notes: Anthropic cacheAdjSaved is a best-case billed-token estimate using exact repeated-block reuse for the system prompt and largest user block only.');
}

function benchmarkThroughput() {
  console.log('\n=== THROUGHPUT STRESS TEST ===\n');

  const stressInput = `${fs.readFileSync('src/compressor.js', 'utf8')}\n\n${fs.readFileSync('src/workspace-intelligence.js', 'utf8')}`;
  const iterations = 50;

  for (const level of rawLevels) {
    const compressor = new GlyphCompressor({ level, provider: 'raw' });
    const startedAt = performance.now();
    let result = null;

    for (let index = 0; index < iterations; index += 1) {
      result = compressor.compressText(stressInput, 'raw');
    }

    const totalMs = performance.now() - startedAt;
    const averageMs = totalMs / iterations;
    const charsPerSecond = Math.round((stressInput.length * iterations) / (totalMs / 1000));

    console.log(
      `  ${level.padEnd(10)} total=${formatMs(totalMs)} avg=${formatMs(averageMs)} chars/sec=${charsPerSecond} finalRatio=${result.stats.ratio}`,
    );
  }
}

benchmarkRawCorpus();
benchmarkChatPayloads();
benchmarkMultiTurnChat();
benchmarkEnterpriseNominalUsage();
benchmarkThroughput();