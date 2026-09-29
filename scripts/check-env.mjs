#!/usr/bin/env node
/**
 * Env guard: fails the build if required Supabase client config is missing,
 * mismatched, or unsafe. Never prints a full key value.
 *
 * Secrets such as SERVICE_ROLE_KEY belong in the host secret store.
 * They must not live in .env. Their presence in process.env is expected
 * and is not a build failure.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_PATH = resolve(process.cwd(), '.env');
const REQUIRED = [
  'SUPABASE_PROJECT_ID',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PROJECT_ID',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
];
const PAIRS = [
  ['SUPABASE_PROJECT_ID', 'VITE_SUPABASE_PROJECT_ID'],
  ['SUPABASE_URL', 'VITE_SUPABASE_URL'],
  ['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'],
];
const FILE_SECRET_KEYS = new Set([
  'SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const errors = [];
const warnings = [];

function parseEnv(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function mask() {
  return '(redacted)';
}

function pickRequiredFromProcess() {
  const out = {};
  for (const key of REQUIRED) {
    const value = process.env[key];
    if (typeof value === 'string' && value.length) out[key] = value;
  }
  const backend = process.env.VITE_BACKEND_URL;
  if (typeof backend === 'string' && backend.length) {
    out.VITE_BACKEND_URL = backend;
  }
  return out;
}

const fileExists = existsSync(ENV_PATH);
const fileEnv = fileExists ? parseEnv(readFileSync(ENV_PATH, 'utf8')) : {};
const env = fileExists ? fileEnv : pickRequiredFromProcess();

for (const key of REQUIRED) {
  const value = env[key];
  if (!value) {
    errors.push(`${key} is missing or empty.`);
  } else if (/your-project-ref|xxxxxxxx|changeme/i.test(value)) {
    errors.push(`${key} still holds a placeholder value from .env.example.`);
  }
}

for (const [a, b] of PAIRS) {
  if (env[a] && env[b] && env[a] !== env[b]) {
    errors.push(`${a} and \( {b} disagree — they must be identical ( \){mask()} vs ${mask()}).`);
  }
}

const ref = env['SUPABASE_PROJECT_ID'];
for (const key of ['SUPABASE_URL', 'VITE_SUPABASE_URL']) {
  const url = env[key];
  if (!url) continue;
  const match = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/.exec(url);
  if (!match) {
    errors.push(`${key} must look like https://<project-ref>.supabase.co.`);
    continue;
  }
  if (ref && match[1] !== ref) {
    errors.push(`${key} does not match SUPABASE_PROJECT_ID.`);
  }
}

if (ref && !/^[a-z0-9]{20}$/.test(ref)) {
  errors.push('SUPABASE_PROJECT_ID is not a valid 20-character project ref.');
}

if (fileExists) {
  for (const [key, value] of Object.entries(fileEnv)) {
    if (/^sb_secret_/.test(value)) {
      errors.push(`${key} contains a secret (sb_secret_…) key. Move it to the secret store.`);
    }
    if (/service_role/i.test(value) || /"role"\s*:\s*"service_role"/.test(value)) {
      errors.push(`${key} looks like a service_role key. It must never live in .env.`);
    }
    if (FILE_SECRET_KEYS.has(key)) {
      errors.push(`${key} must not be defined in .env — it is a server-only secret.`);
    }
    if (key.startsWith('VITE_') && /^sb_secret_|service_role/i.test(value)) {
      errors.push(`${key} is exposed to the browser and holds a secret value.`);
    }
  }
}

for (const key of ['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY']) {
  const value = env[key];
  if (!value) continue;
  const isNewFormat = value.startsWith('sb_publishable_');
  const isLegacyAnonJwt = value.startsWith('eyJ');
  if (!isNewFormat && !isLegacyAnonJwt) {
    errors.push(`\( {key} is not a publishable/anon key ( \){mask()}).`);
  }
  if (isLegacyAnonJwt) {
    warnings.push(`${key} uses the legacy anon JWT format; prefer sb_publishable_…`);
  }
}

try {
  const ignore = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8') : '';
  if (!/^\.env\s*$/m.test(ignore)) {
    warnings.push('.env is not listed in .gitignore.');
  }
} catch {
  /* ignore */
}

for (const w of warnings) console.warn(`⚠ ${w}`);

if (errors.length) {
  console.error('\n✖ Environment check failed:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nSee .env.example for the expected shape.\n');
  process.exit(1);
}

console.log('✔ Env OK — required Supabase configuration is present.');
