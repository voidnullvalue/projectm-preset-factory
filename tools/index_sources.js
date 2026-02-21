#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureDir, walkFiles, sha1, normalizeMilkContent } = require('./source_common');

const ROOT = process.cwd();
const NORMALIZED_DIR = path.join(ROOT, 'sources', 'normalized');
const INDEX_DIR = path.join(ROOT, 'sources', 'indexed');
const INDEX_FILE = path.join(INDEX_DIR, 'source_index.jsonl');

ensureDir(NORMALIZED_DIR);
ensureDir(INDEX_DIR);

const files = walkFiles(NORMALIZED_DIR).filter((f) => f.toLowerCase().endsWith('.milk')).sort();
const rows = files.map((file, idx) => {
  const content = normalizeMilkContent(fs.readFileSync(file));
  const rel = path.relative(ROOT, file);
  return {
    id: `src_${String(idx + 1).padStart(6, '0')}`,
    file: rel,
    sha1: sha1(content),
    bytes: Buffer.byteLength(content, 'utf8'),
    lines: content.split('\n').length,
    hasPreset00: /\[Preset00\]/i.test(content),
    hasAudioReactivity: /\b(bass|mid|treb)\b/i.test(content),
  };
});

fs.writeFileSync(INDEX_FILE, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
console.log(JSON.stringify({ indexed: rows.length, output: path.relative(ROOT, INDEX_FILE) }, null, 2));
