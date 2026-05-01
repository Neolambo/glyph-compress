/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 * 
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 * 
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Compressor as GlyphCompressor } from '../src/compressor.js';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Test files to benchmark
const testTargets = [
    'src/compressor.js',
    'src/radical-alphabet.js',
    'src/glyph-middleware.js',
    'vscode-ext/extension.js',
    'test/integration.js',
    'README.md'
];

// LLM Evaluation Metrics implementation (from @llm-evaluation skill)
class BenchmarkRunner {
    constructor() {
        this.results = [];
        this.compressorUltra = new GlyphCompressor(); // Codebook level Ultra would be passed here or set via options
    }

    // Rough token estimator (4 chars = 1 token approx)
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }

    runSuite() {
        console.log('\n🚀 ENTERPRISE LLM-EVALUATION BENCHMARK SUITE');
        console.log('==================================================');
        
        let totalOriginalTokens = 0;
        let totalCompressedTokens = 0;
        let totalMs = 0;

        testTargets.forEach(target => {
            const filePath = path.join(rootDir, target);
            if (!fs.existsSync(filePath)) return;

            const content = fs.readFileSync(filePath, 'utf-8');
            const originalTokens = this.estimateTokens(content);
            
            // Measure execution time
            const start = performance.now();
            const { compressed, stats } = this.compressorUltra.compress({ files: [{ path: target, content }] });
            const end = performance.now();
            
            const execTimeMs = end - start;
            const compressedTokens = this.estimateTokens(compressed);
            const ratio = (originalTokens / compressedTokens).toFixed(2);
            const savedPct = (((originalTokens - compressedTokens) / originalTokens) * 100).toFixed(1);

            totalOriginalTokens += originalTokens;
            totalCompressedTokens += compressedTokens;
            totalMs += execTimeMs;

            this.results.push({
                File: path.basename(target),
                'Orig Tokens': originalTokens,
                'Comp Tokens': compressedTokens,
                'Ratio': `${ratio}x`,
                'Saved %': `${savedPct}%`,
                'Exec (ms)': execTimeMs.toFixed(2)
            });
        });

        // Print automated metrics table
        console.table(this.results);

        // Print Aggregate Analysis
        console.log('\n📊 AUTOMATED METRICS (AGGREGATE)');
        console.log('--------------------------------------------------');
        console.log(`Total Original Tokens   : ${totalOriginalTokens.toLocaleString()}`);
        console.log(`Total Compressed Tokens : ${totalCompressedTokens.toLocaleString()}`);
        console.log(`Global Compression Ratio: ${(totalOriginalTokens/totalCompressedTokens).toFixed(2)}x`);
        console.log(`Global Token Savings    : ${(((totalOriginalTokens - totalCompressedTokens) / totalOriginalTokens) * 100).toFixed(2)}%`);
        console.log(`Total Execution Time    : ${totalMs.toFixed(2)} ms`);
        
        // Cost analysis (Assuming Claude 3.5 Sonnet: $3/1M input tokens)
        const costBefore = (totalOriginalTokens / 1_000_000) * 3.00;
        const costAfter = (totalCompressedTokens / 1_000_000) * 3.00;
        
        console.log('\n💰 FINANCIAL IMPACT (Cost per 1M context iterations)');
        console.log('--------------------------------------------------');
        console.log(`Cost Without GlyphCompress: $${(costBefore * 10000).toFixed(2)}`);
        console.log(`Cost With GlyphCompress   : $${(costAfter * 10000).toFixed(2)}`);
        console.log(`Total ROI Savings         : $${((costBefore - costAfter) * 10000).toFixed(2)}`);
        console.log('==================================================\n');
    }
}

// Run the benchmark
const runner = new BenchmarkRunner();
runner.runSuite();
