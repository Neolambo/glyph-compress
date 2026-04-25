/**
 * Copyright (c) 2026 Neolambo. All rights reserved.
 * 
 * This software is dual-licensed:
 * 1. GNU Affero General Public License v3.0 (AGPL-3.0) for open-source projects.
 * 2. Commercial License for proprietary/enterprise use.
 * 
 * See LICENSE file for details or contact campiossasco1@gmail.com.
 * -------------------------------------------------------------------------
 * GlyphCompress — Demo & Benchmark
 * 
 * Simulates realistic IDE→LLM communication scenarios,
 * compresses them, and measures savings.
 */

import { Compressor, Codebook } from '../src/compressor.js';
import { generateSystemPrompt, estimateOverhead } from '../src/system-prompt-generator.js';
import { getAlphabetStats } from '../src/radical-alphabet.js';

// ═══════════════════════════════════════════════════════════
// TEST SCENARIOS — Realistic IDE contexts
// ═══════════════════════════════════════════════════════════

const SCENARIOS = [
  {
    name: "Fix TypeScript error in React component",
    context: {
      prompt: "Fix the error in UserProfile.tsx",
      files: [
        {
          path: "src/components/UserProfile.tsx",
          content: `import React, { useState, useEffect } from 'react';
import { User } from '../types/User';
import { fetchUser } from '../api/users';
import { Avatar } from './Avatar';
import { Badge } from './Badge';

interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await fetchUser(userId);
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [userId]);

  if (loading) return <div className="skeleton" />;
  if (error) return <div className="error">{error}</div>;
  if (!user) return null;

  return (
    <div className="profile-card">
      <Avatar src={user.avatar} size="lg" />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <Badge type={user.role} />
      <p>{user.department.name}</p>
    </div>
  );
};`,
          language: "typescript",
        },
      ],
      diagnostics: [
        {
          file: "src/components/UserProfile.tsx",
          line: 42,
          code: "TS2339",
          severity: "error",
          message: "Property 'department' does not exist on type 'User'",
        },
      ],
      history: [
        { role: "user", content: "I need to add a department field to the User type" },
        { role: "assistant", content: "I'll add the department field to the User interface and update the component" },
      ],
    },
  },
  {
    name: "Optimize slow API endpoint",
    context: {
      prompt: "Optimize the performance of the orders API endpoint",
      files: [
        {
          path: "src/controllers/orders.controller.ts",
          content: `import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { validateOrderQuery } from '../validators/order.validator';

export class OrdersController {
  constructor(private orderService: OrderService) {}

  async getOrders(req: Request, res: Response) {
    const { page, limit, status, userId } = req.query;
    const orders = await this.orderService.findAll({ page, limit, status, userId });
    const total = await this.orderService.count({ status, userId });
    return res.json({ orders, total, page, limit });
  }

  async getOrderById(req: Request, res: Response) {
    const order = await this.orderService.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json(order);
  }
}`,
          language: "typescript",
        },
        {
          path: "src/services/order.service.ts",
          content: `import { prisma } from '../lib/prisma';

export class OrderService {
  async findAll(params) {
    return prisma.order.findMany({
      where: { status: params.status, userId: params.userId },
      include: { items: true, user: true, shipping: true },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(params) {
    return prisma.order.count({
      where: { status: params.status, userId: params.userId },
    });
  }

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, user: true, shipping: true, payments: true },
    });
  }
}`,
          language: "typescript",
        },
      ],
      diagnostics: [],
      history: [
        { role: "user", content: "The /api/orders endpoint is taking 3 seconds to respond" },
        { role: "assistant", content: "Let me review the query patterns and suggest optimizations" },
      ],
    },
  },
  {
    name: "Deploy to Kubernetes",
    context: {
      prompt: "Deploy the application to the production Kubernetes cluster",
      files: [
        {
          path: "k8s/deployment.yaml",
          content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web-app
        image: registry.example.com/web-app:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"`,
          language: "yaml",
        },
      ],
      diagnostics: [],
      history: [],
    },
  },
  {
    name: "Debug Python ML pipeline",
    context: {
      prompt: "Debug the data preprocessing pipeline",
      files: [
        {
          path: "src/pipeline/preprocess.py",
          content: `import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split

class DataPreprocessor:
    def __init__(self, config):
        self.config = config
        self.scaler = StandardScaler()
        self.encoders = {}

    def fit_transform(self, df):
        df = self._handle_missing(df)
        df = self._encode_categoricals(df)
        df = self._scale_numerics(df)
        return df

    def _handle_missing(self, df):
        for col in df.columns:
            if df[col].isnull().sum() > 0:
                if df[col].dtype == 'object':
                    df[col].fillna(df[col].mode()[0], inplace=True)
                else:
                    df[col].fillna(df[col].median(), inplace=True)
        return df

    def _encode_categoricals(self, df):
        for col in df.select_dtypes(include=['object']).columns:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col])
            self.encoders[col] = le
        return df

    def _scale_numerics(self, df):
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = self.scaler.fit_transform(df[numeric_cols])
        return df`,
          language: "python",
        },
      ],
      diagnostics: [
        {
          file: "src/pipeline/preprocess.py",
          line: 18,
          code: "W0611",
          severity: "warning",
          message: "Unused import train_test_split",
        },
        {
          file: "src/pipeline/preprocess.py",
          line: 25,
          code: "",
          severity: "warning",
          message: "FutureWarning: DataFrame.fillna with 'method' is deprecated",
        },
      ],
      history: [
        { role: "user", content: "The pipeline crashes when processing the customer dataset" },
        { role: "assistant", content: "I'll check the preprocessing steps for potential issues with data types and missing values" },
      ],
    },
  },
  {
    name: "Create React form with validation",
    context: {
      prompt: "Create a registration form component with React and TypeScript",
      files: [],
      diagnostics: [],
      history: [],
    },
  },
];

// ═══════════════════════════════════════════════════════════
// RUN DEMO
// ═══════════════════════════════════════════════════════════

console.log('='.repeat(70));
console.log('GlyphCompress — Demo & Benchmark');
console.log('='.repeat(70));
console.log();

// Show alphabet stats
const stats = getAlphabetStats();
console.log('Alphabet:');
console.log(`  Radicals:    ${stats.radicals}`);
console.log(`  Domains:     ${stats.domains}`);
console.log(`  Actions:     ${stats.actions}`);
console.log(`  Techs:       ${stats.techs}`);
console.log(`  Structures:  ${stats.structures}`);
console.log(`  Error codes: ${stats.errorCodes}`);
console.log(`  Total:       ${stats.totalSymbols} unique symbols`);
console.log();

// Show system prompt overhead
const overhead = estimateOverhead();
console.log('System Prompt Overhead (paid once):');
console.log(`  ${overhead.chars} chars ≈ ${overhead.estimatedTokens} tokens`);
console.log();

// Process each scenario
const codebook = new Codebook();
const compressor = new Compressor(codebook);

let totalOriginal = 0;
let totalCompressed = 0;

console.log('='.repeat(70));
console.log('SCENARIO RESULTS');
console.log('='.repeat(70));

for (const scenario of SCENARIOS) {
  const original = JSON.stringify(scenario.context);
  const result = compressor.compress(scenario.context);

  totalOriginal += original.length;
  totalCompressed += result.compressed.length;

  const ratio = (original.length / Math.max(1, result.compressed.length)).toFixed(1);
  const saved = ((1 - result.compressed.length / original.length) * 100).toFixed(0);

  console.log(`\n─── ${scenario.name} ───`);
  console.log(`  Original:   ${original.length} chars`);
  console.log(`  Compressed: ${result.compressed.length} chars`);
  console.log(`  Ratio:      ${ratio}x (${saved}% saved)`);
  console.log();
  console.log('  ORIGINAL PROMPT:');
  console.log(`    "${scenario.context.prompt}"`);
  console.log('  COMPRESSED OUTPUT:');
  result.compressed.split('\n').forEach(line => {
    if (line.trim()) console.log(`    ${line}`);
  });
}

// Show system prompt
console.log();
console.log('='.repeat(70));
console.log('GENERATED SYSTEM PROMPT (sent once to LLM)');
console.log('='.repeat(70));
const sysPrompt = generateSystemPrompt(codebook);
console.log(sysPrompt);

// Final stats
console.log();
console.log('='.repeat(70));
console.log('AGGREGATE RESULTS');
console.log('='.repeat(70));
const finalRatio = (totalOriginal / totalCompressed).toFixed(1);
const finalSaved = ((1 - totalCompressed / totalOriginal) * 100).toFixed(1);

console.log(`  Total original:     ${totalOriginal.toLocaleString()} chars`);
console.log(`  Total compressed:   ${totalCompressed.toLocaleString()} chars`);
console.log(`  Overall ratio:      ${finalRatio}x`);
console.log(`  Chars saved:        ${(totalOriginal - totalCompressed).toLocaleString()} (${finalSaved}%)`);
console.log(`  System prompt cost: ${overhead.chars} chars (amortized over all messages)`);
console.log(`  File index entries: ${codebook.fileIndex.size}`);
console.log(`  Replacements made:  ${codebook.stats.replacements}`);
console.log();

// Token cost estimate
const tokensOriginal = Math.ceil(totalOriginal / 4);
const tokensCompressed = Math.ceil(totalCompressed / 4) + overhead.estimatedTokens;
const tokenSaved = tokensOriginal - tokensCompressed;
const costPerToken = 3 / 1000000; // ~$3/M tokens (Claude Sonnet)

console.log('  TOKEN COST ESTIMATE (Claude Sonnet @ $3/M tokens):');
console.log(`    Original:   ${tokensOriginal.toLocaleString()} tokens → $${(tokensOriginal * costPerToken).toFixed(4)}`);
console.log(`    Compressed: ${tokensCompressed.toLocaleString()} tokens → $${(tokensCompressed * costPerToken).toFixed(4)}`);
console.log(`    Saved:      ${tokenSaved.toLocaleString()} tokens → $${(tokenSaved * costPerToken).toFixed(4)} per batch`);
console.log(`    At 50 req/day: $${(tokenSaved * costPerToken * 50 * 30).toFixed(2)}/month saved`);
