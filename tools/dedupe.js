#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');

const scoresJsonl = process.argv[2];
if (!scoresJsonl) {
  console.error('Usage: node tools/dedupe.js <scores_jsonl>');
  process.exit(1);
}

const rows = fs.readFileSync(scoresJsonl, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));

function normalize(txt) {
  return txt
    .replace(/\/\/.*$/gm, '')
    .replace(/;.*$/gm, '')
    .replace(/#.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function shingles(s, n = 7) {
  const set = new Set();
  if (s.length <= n) {
    set.add(s);
    return set;
  }
  for (let i = 0; i <= s.length - n; i++) {
    set.add(s.slice(i, i + n));
  }
  return set;
}

function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

const candidates = [];
for (const row of rows) {
  if (!row.valid || row.score_total < 0) continue;
  const raw = fs.readFileSync(row.file, 'utf8');
  const norm = normalize(raw);
  candidates.push({
    ...row,
    norm,
    hash: crypto.createHash('sha1').update(norm).digest('hex'),
    shingle: shingles(norm),
  });
}

candidates.sort((a, b) => b.score_total - a.score_total);
const kept = [];
for (const c of candidates) {
  let duplicate = false;
  for (const k of kept) {
    if (c.hash === k.hash || jaccard(c.shingle, k.shingle) > 0.985) {
      duplicate = true;
      break;
    }
  }
  if (!duplicate) kept.push(c);
}

for (const row of kept) {
  const { norm, hash, shingle, ...out } = row;
  console.log(JSON.stringify(out));
}
