#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dedupedJsonl = process.argv[2];
const scoresManifest = process.argv[3];
const acceptedDir = process.argv[4];
const rejectedDir = process.argv[5];
const familyArg = process.argv[6] || null;

if (!dedupedJsonl || !scoresManifest || !acceptedDir || !rejectedDir) {
  console.error('Usage: node tools/select_final_500.js <deduped_jsonl> <scores_manifest> <accepted_dir> <rejected_dir> [family]');
  process.exit(1);
}

for (const d of [acceptedDir, rejectedDir]) fs.mkdirSync(d, { recursive: true });

const quota = { ambient:100, tunnel:100, geometric:100, waveform:100, aggressive:100 };
const familyCounts = { ambient:0, tunnel:0, geometric:0, waveform:0, aggressive:0 };

function countAccepted() {
  return fs.readdirSync(acceptedDir).filter(f => f.toLowerCase().endsWith('.milk')).length;
}

// reconstruct accepted counts from filenames convention if possible (best effort)
// and also from scores manifest accepted rows if present
if (fs.existsSync(scoresManifest)) {
  const lines = fs.readFileSync(scoresManifest, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const l of lines) {
    try {
      const r = JSON.parse(l);
      if (r.selected === 'accepted' && r.family && familyCounts[r.family] !== undefined) familyCounts[r.family]++;
    } catch {}
  }
}

const rows = fs.readFileSync(dedupedJsonl, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)
  .sort((a,b)=>b.score_total-a.score_total);

let acceptedTotal = countAccepted();
const outManifest = fs.createWriteStream(scoresManifest, { flags: 'a' });

for (const row of rows) {
  const file = row.file;
  const filename = path.basename(file);
  const family = row.family || familyArg || 'ambient';

  if (!(family in quota)) {
    outManifest.write(JSON.stringify({ ...row, selected: 'rejected', reason: 'unknown_family' }) + '\n');
    continue;
  }

  if (acceptedTotal >= 500) {
    outManifest.write(JSON.stringify({ ...row, selected: 'rejected', reason: 'target_reached' }) + '\n');
    continue;
  }

  if (familyCounts[family] >= quota[family]) {
    outManifest.write(JSON.stringify({ ...row, selected: 'rejected', reason: 'family_quota_full' }) + '\n');
    continue;
  }

  const dest = path.join(acceptedDir, filename);
  if (fs.existsSync(dest)) {
    outManifest.write(JSON.stringify({ ...row, selected: 'rejected', reason: 'duplicate_filename_in_accepted' }) + '\n');
    continue;
  }

  fs.copyFileSync(file, dest);
  acceptedTotal++;
  familyCounts[family]++;
  outManifest.write(JSON.stringify({ ...row, selected: 'accepted', family }) + '\n');
}

outManifest.end();

fs.writeFileSync('manifests/summary.json', JSON.stringify({
  accepted_total: acceptedTotal,
  family_counts: familyCounts,
  target_reached: acceptedTotal >= 500
}, null, 2));
