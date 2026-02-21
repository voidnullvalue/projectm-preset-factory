#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureDir, walkFiles, sha1, normalizeMilkContent } = require('./source_common');

const ROOT = process.cwd();
const NORMALIZED_DIR = path.join(ROOT, 'sources', 'normalized');
const CATALOG_DIR = path.join(ROOT, 'manifests', 'source_catalog');
const DUPES_FILE = path.join(CATALOG_DIR, 'duplicates.jsonl');

ensureDir(NORMALIZED_DIR);
ensureDir(CATALOG_DIR);

const files = walkFiles(NORMALIZED_DIR).filter((f) => f.toLowerCase().endsWith('.milk'));
const byHash = new Map();
const duplicateRows = [];
let removed = 0;

for (const file of files) {
  const normalized = normalizeMilkContent(fs.readFileSync(file));
  const hash = sha1(normalized);
  if (!byHash.has(hash)) {
    byHash.set(hash, file);
    continue;
  }
  const kept = byHash.get(hash);
  duplicateRows.push({ hash, kept: path.relative(ROOT, kept), removed: path.relative(ROOT, file) });
  fs.unlinkSync(file);
  removed += 1;
}

if (duplicateRows.length > 0) {
  fs.appendFileSync(DUPES_FILE, duplicateRows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

console.log(JSON.stringify({ filesScanned: files.length, duplicatesRemoved: removed }, null, 2));
