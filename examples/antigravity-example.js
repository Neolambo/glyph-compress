/**
 * GlyphCompress — Antigravity Usage Example
 * 
 * Demonstrates how to use GlyphCompress as a standalone script
 * to compress context BEFORE sending it to Antigravity CLI or AI Agent.
 */

import { GlyphCompressor } from '../vscode-ext/glyph-middleware.js';
import fs from 'fs';

// 1. Initialize standalone compressor for Antigravity with "ultra" level
const gc = new GlyphCompressor({ level: 'ultra' });

// 2. A simulated large file or context from your project
const projectContext = `
Please analyze this code and fix the bugs.
src/services/AuthenticationManager.ts
import { DatabaseConnection } from '../db';
import { UserProfile } from '../types';

export class AuthenticationManager {
  // Check user credentials
  async authenticate(email: string, pass: string): Promise<UserProfile> {
    const db = new DatabaseConnection();
    console.log("Checking database for", email);
    /* TODO: Hash password before checking */
    const user = await db.query("SELECT * FROM users WHERE email=?", [email]);
    if (!user) throw new Error("Not found");
    return user;
  }
}
Warning: 'DatabaseConnection' is deprecated.
`;

console.log('='.repeat(60));
console.log(' ANTIGRAVITY PRE-COMPRESSION (Simulated)');
console.log('='.repeat(60));

// 3. Compress the context directly
const { compressed, stats } = gc.compressText(projectContext);

console.log('\\n[1] Copy this Codebook into your Antigravity System Prompt:');
console.log('----------------------------------------------------');
console.log(gc.getCodebookPrompt());
console.log('----------------------------------------------------');

console.log('\\n[2] Send this compressed context to Antigravity:');
console.log('----------------------------------------------------');
console.log(compressed.trim());
console.log('----------------------------------------------------');

// 4. Show how much space was saved
console.log('\\n[3] Token Savings for Antigravity:');
console.log(`Original tokens:   ~${stats.originalTokens}`);
console.log(`Compressed tokens: ~${stats.compressedTokens}`);
console.log(`Compression ratio: ${stats.ratio}`);
console.log(`Saved:             ${stats.savedPct}`);
