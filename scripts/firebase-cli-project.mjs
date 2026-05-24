import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const loadEnvFile = () => {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
};

loadEnvFile();

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error('Missing FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID.');
  process.exit(1);
}

const args = process.argv.slice(2);
const firebaseBin = resolve(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'firebase.cmd' : 'firebase'
);

const firebase = spawn(firebaseBin, [...args, '--project', projectId], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

firebase.on('error', (error) => {
  console.error(`Failed to start Firebase CLI: ${error.message}`);
  process.exit(1);
});

firebase.on('exit', (code) => {
  process.exit(code ?? 1);
});
