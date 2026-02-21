#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureDir, walkFiles, sha1, normalizeMilkContent } = require('./source_common');

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, 'sources', 'raw');
const UNPACKED_DIR = path.join(ROOT, 'sources', 'unpacked');
const NORMALIZED_DIR = path.join(ROOT, 'sources', 'normalized');

ensureDir(NORMALIZED_DIR);

function milkFilesIn(dir) {
  return walkFiles(dir).filter((file) => file.toLowerCase().endsWith('.milk'));
}

const allMilk = [...milkFilesIn(RAW_DIR), ...milkFilesIn(UNPACKED_DIR)];
const seen = new Set();
let copied = 0;
let deduped = 0;

for (const sourcePath of allMilk) {
  const raw = fs.readFileSync(sourcePath);
  const normalized = normalizeMilkContent(raw);
  const hash = sha1(normalized);
  if (seen.has(hash)) {
    deduped += 1;
    continue;
  }
  seen.add(hash);

  const stem = path.basename(sourcePath, path.extname(sourcePath)).replace(/[^a-zA-Z0-9._-]/g, '_');
  const outName = `${stem}__${hash.slice(0, 10)}.milk`;
  const outPath = path.join(NORMALIZED_DIR, outName);
  fs.writeFileSync(outPath, normalized, 'utf8');
  copied += 1;
}

console.log(JSON.stringify({ milkDiscovered: allMilk.length, copied, deduped }, null, 2));
