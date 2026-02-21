#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dedupedJsonl = process.argv[2];
const scoresManifest = process.argv[3] || 'manifests/scores.jsonl';
const familyArg = process.argv[4] || null;
const selectedOut = process.argv[5] || 'manifests/selected.jsonl';
const copyDir = process.argv[6] || null;

if (!dedupedJsonl) {
  console.error('Usage: node tools/select_final_500.js <deduped_jsonl> [scores_manifest] [family] [selected_out] [copy_dir]');
  process.exit(1);
}

const quota = { ambient: 100, tunnel: 100, geometric: 100, waveform: 100, aggressive: 100 };
const familyCounts = { ambient: 0, tunnel: 0, geometric: 0, waveform: 0, aggressive: 0 };
let acceptedTotal = 0;

if (fs.existsSync(scoresManifest)) {
  const lines = fs.readFileSync(scoresManifest, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const l of lines) {
    try {
      const r = JSON.parse(l);
      if (r.selected === 'accepted') {
        acceptedTotal += 1;
        if (r.family && familyCounts[r.family] !== undefined) familyCounts[r.family] += 1;
      }
    } catch (_) {}
  }
}

const rows = fs.readFileSync(dedupedJsonl, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).sort((a, b) => b.score_total - a.score_total);
fs.mkdirSync(path.dirname(selectedOut), { recursive: true });
if (copyDir) fs.mkdirSync(copyDir, { recursive: true });
const selectedStream = fs.createWriteStream(selectedOut, { flags: 'a' });
const scoreStream = fs.createWriteStream(scoresManifest, { flags: 'a' });

for (const row of rows) {
  const family = row.family || familyArg || 'ambient';
  const filename = path.basename(row.file);
  let status = 'accepted';
  let reason = null;

  if (!(family in quota)) {
    status = 'rejected';
    reason = 'unknown_family';
  } else if (acceptedTotal >= 500) {
    status = 'rejected';
    reason = 'target_reached';
  } else if (familyCounts[family] >= quota[family]) {
    status = 'rejected';
    reason = 'family_quota_full';
  }

  const outRow = { ...row, family, selected: status, reason };
  selectedStream.write(`${JSON.stringify(outRow)}\n`);
  scoreStream.write(`${JSON.stringify(outRow)}\n`);

  if (status === 'accepted') {
    acceptedTotal += 1;
    familyCounts[family] += 1;
    if (copyDir) {
      const dest = path.join(copyDir, filename);
      if (!fs.existsSync(dest)) fs.copyFileSync(row.file, dest);
    }
  }
}

selectedStream.end();
scoreStream.end();

fs.writeFileSync('manifests/summary.json', JSON.stringify({ accepted_total: acceptedTotal, family_counts: familyCounts, target_reached: acceptedTotal >= 500 }, null, 2));
