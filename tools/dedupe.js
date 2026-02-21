#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const batchDir = process.argv[2];
const scoresJsonl = process.argv[3];
if (!batchDir || !scoresJsonl) {
  console.error('Usage: node tools/dedupe.js <batch_dir> <scores_jsonl>');
  process.exit(1);
}

const rows = fs.readFileSync(scoresJsonl, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);

function normalize(txt) {
  return txt
    .replace(/\/\/.*$/gm, '')
    .replace(/;.*$/gm, '')
    .replace(/#.*$/gm, '')
    .replace(/\bq\d+\b/g, 'qX')
    .replace(/\b\d+\.\d{4,}\b/g, m => Number(m).toFixed(3))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function featureSig(txt) {
  const parts = [];
  for (const v of ['bass','mid','treb','time','zoom','rot','warp','cx','cy','wave_r','wave_g','wave_b','wave_a']) {
    parts.push(v + ':' + ((txt.match(new RegExp(`\\b${v}\\b`, 'g')) || []).length));
  }
  parts.push('waves:' + ((txt.match(/^\s*\[wave\d\d\]/gmi) || []).length));
  parts.push('shapes:' + ((txt.match(/^\s*\[shape\d\d\]/gmi) || []).length));
  parts.push('pf:' + ((txt.match(/^\s*per_frame_\d+\s*=/gmi) || []).length));
  parts.push('pp:' + ((txt.match(/^\s*per_point_\d+\s*=/gmi) || []).length));
  return parts.join('|');
}

const bestByCluster = new Map();

for (const row of rows) {
  if (!row.valid || row.score_total < 0) continue;
  const txt = fs.readFileSync(row.file, 'utf8');
  const norm = normalize(txt);
  const hash = crypto.createHash('sha1').update(norm).digest('hex');
  const sig = featureSig(norm);

  // cluster key combines exact-ish normalized hash prefix + feature sig
  const clusterKey = hash.slice(0, 16) + '|' + sig;

  const existing = bestByCluster.get(clusterKey);
  if (!existing || row.score_total > existing.score_total) {
    bestByCluster.set(clusterKey, row);
  }
}

for (const row of [...bestByCluster.values()].sort((a,b)=>b.score_total-a.score_total)) {
  console.log(JSON.stringify(row));
}
