#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const zlib = require('zlib');
const { ensureDir, walkFiles } = require('./source_common');

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, 'sources', 'raw');
const UNPACKED_DIR = path.join(ROOT, 'sources', 'unpacked');

ensureDir(RAW_DIR);
ensureDir(UNPACKED_DIR);

function extType(file) {
  const lower = file.toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return 'tgz';
  if (lower.endsWith('.tar')) return 'tar';
  if (lower.endsWith('.zip')) return 'zip';
  if (lower.endsWith('.gz')) return 'gz';
  return null;
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
}

const archiveFiles = walkFiles(RAW_DIR).filter((file) => extType(file));
let unpackedCount = 0;
let skippedCount = 0;

for (const archivePath of archiveFiles) {
  const rel = path.relative(RAW_DIR, archivePath);
  const type = extType(archivePath);
  const safe = rel.replace(/[^a-zA-Z0-9._/-]/g, '_');
  const base = safe.replace(/\.(tar\.gz|tgz|zip|tar|gz)$/i, '');
  const targetDir = path.join(UNPACKED_DIR, base);
  ensureDir(targetDir);

  try {
    if (type === 'zip') {
      run('unzip', ['-oq', archivePath, '-d', targetDir]);
    } else if (type === 'tar') {
      run('tar', ['-xf', archivePath, '-C', targetDir]);
    } else if (type === 'tgz') {
      run('tar', ['-xzf', archivePath, '-C', targetDir]);
    } else if (type === 'gz') {
      const content = fs.readFileSync(archivePath);
      const outputName = path.basename(base);
      const outPath = path.join(targetDir, outputName);
      fs.writeFileSync(outPath, zlib.gunzipSync(content));
    }
    unpackedCount += 1;
    console.log(`unpacked: ${rel} -> ${path.relative(ROOT, targetDir)}`);
  } catch (err) {
    skippedCount += 1;
    console.warn(`skipped: ${rel} (${err.message})`);
  }
}

console.log(JSON.stringify({ archivesFound: archiveFiles.length, unpackedCount, skippedCount }, null, 2));
