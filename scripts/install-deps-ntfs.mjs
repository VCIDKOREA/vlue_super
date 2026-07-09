#!/usr/bin/env node
/**
 * FAT32/외장 드라이브(D: 등)에서 npm workspace symlink(EISDIR) 실패 시
 * NTFS 임시 경로에 설치 후 node_modules를 프로젝트로 복사합니다.
 *
 * Usage: node scripts/install-deps-ntfs.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const tempRoot = path.join(
  process.env.LOCALAPPDATA || process.env.TEMP || 'C:\\Temp',
  'vlue_super_npm',
);

const COPY_GLOBS = [
  'package.json',
  'package-lock.json',
  '.npmrc',
  'packages',
  'apps',
  'web',
  'web2',
];

function log(msg) {
  console.log(`[install-deps-ntfs] ${msg}`);
}

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}

function copyTree(src, dest) {
  fs.cpSync(src, dest, { recursive: true, force: true, dereference: true });
}

function run(cmd, args, cwd) {
  log(`${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  // robocopy: 0-7 = success
  if (cmd === 'robocopy' && r.status != null && r.status <= 7) return;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

log(`project: ${root}`);
log(`temp install dir: ${tempRoot}`);

rimraf(tempRoot);
fs.mkdirSync(tempRoot, { recursive: true });

for (const item of COPY_GLOBS) {
  const src = path.join(root, item);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(tempRoot, item);
  log(`copy ${item}`);
  copyTree(src, dest);
}

run('npm', ['install', '--no-audit', '--no-fund'], tempRoot);

const srcModules = path.join(tempRoot, 'node_modules');
const destModules = path.join(root, 'node_modules');

log('merge node_modules -> project (may take a few minutes)');
fs.mkdirSync(destModules, { recursive: true });
if (process.platform === 'win32') {
  run('robocopy', [srcModules, destModules, '/E', '/IS', '/IT', '/NFL', '/NDL', '/NJH', '/NJS', '/nc', '/ns', '/np'], root);
} else {
  copyTree(srcModules, destModules);
}

for (const ws of ['web', 'web2', 'apps/api', 'apps/electron', 'apps/pc-agent']) {
  const wsPath = path.join(root, ws);
  const wsModules = path.join(wsPath, 'node_modules');
  const srcWsModules = path.join(tempRoot, ws, 'node_modules');
  if (fs.existsSync(srcWsModules)) {
    log(`merge ${ws}/node_modules`);
    fs.mkdirSync(wsModules, { recursive: true });
    if (process.platform === 'win32') {
      run('robocopy', [srcWsModules, wsModules, '/E', '/IS', '/IT', '/NFL', '/NDL', '/NJH', '/NJS', '/nc', '/ns', '/np'], root);
    } else {
      copyTree(srcWsModules, wsModules);
    }
  }
}

log('done — run: npm run dev');
log(`temp kept at ${tempRoot} (safe to delete later)`);
