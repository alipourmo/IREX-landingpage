#!/usr/bin/env node
/**
 * Generate a salted scrypt hash suitable for ADMIN_PASSWORD_HASH.
 * Usage:
 *   ADMIN_PASSWORD='...' node scripts/hash-password.mjs
 */

import { randomBytes, scryptSync } from 'node:crypto';

const password = process.env.ADMIN_PASSWORD || process.argv[2] || '';
if (!password) {
  console.error('Provide password via ADMIN_PASSWORD env var or CLI argument.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const derived = scryptSync(password, salt, 64).toString('hex');
console.log(`scrypt:${salt}:${derived}`);
