#!/usr/bin/env node
const fs = require('fs');

const batchDir = process.argv[2];
const lintJsonl = process.argv[3];
if (!batchDir || !lintJsonl) {
  console.error('Usage: node tools/score_static.js <batch_dir> <lint_jsonl>');
  process.exit(1);
}

const lintRows = fs.readFileSync(lintJsonl, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);

function countRe(s, re) { const m = s.match(re); return m ? m.length : 0; }

function scoreFile(file, lint) {
  const txt = fs.readFileSync(file, 'utf8');

  const cTime = countRe(txt, /\btime\b/g);
  const cBass = countRe(txt, /\bbass\b/g);
  const cMid  = countRe(txt, /\bmid\b/g);
  const cTreb = countRe(txt, /\btreb\b/g);
  const cAudio = cBass + cMid + cTreb;

  const cPerFrame = countRe(txt, /^\s*per_frame_\d+\s*=/gm);
  const cPerPoint = countRe(txt, /^\s*per_point_\d+\s*=/gm);
  const cWaves = countRe(txt, /^\s*\[Wave\d\d\]\s*$/gm);
  const cShapes = countRe(txt, /^\s*\[Shape\d\d\]\s*$/gm);

  const motionVars = ['zoom','rot','warp','cx','cy','dx','dy'];
  const motionTouched = motionVars.filter(v => new RegExp(`\\b${v}\\b`).test(txt)).length;

  const colorVars = ['wave_r','wave_g','wave_b','wave_a','fR','fG','fB','fA'];
  const colorTouched = colorVars.filter(v => new RegExp(`\\b${v}\\b`).test(txt)).length;

  const instabilityTan = countRe(txt, /\btan\s*\(/g);
  const instabilityDiv = countRe(txt, /\//g);
  const instabilityLog = countRe(txt, /\blog\s*\(/g);
  const powCount = countRe(txt, /\bpow\s*\(/g);

  let score_motion = Math.min(20, motionTouched * 4 + Math.min(cTime, 8));
  let score_audio = Math.min(20, cAudio * 2 + (cBass > 0) + (cMid > 0) + (cTreb > 0));
  let score_color = Math.min(15, colorTouched + Math.min(countRe(txt, /\b(wave_[rgba]|f[RGBA])\s*=.*time/g), 8));
  let score_structure = Math.min(15, cPerFrame + Math.min(cPerPoint, 6) + cWaves + cShapes);

  let score_complexity = 0;
  const totalEq = cPerFrame + cPerPoint;
  if (totalEq >= 5 && totalEq <= 20) score_complexity = 15;
  else if (totalEq >= 3 && totalEq <= 30) score_complexity = 10;
  else score_complexity = 3;

  let penalty_instability = 0;
  penalty_instability -= instabilityTan * 4;
  penalty_instability -= Math.max(0, instabilityDiv - 4); // too many divisions
  penalty_instability -= Math.max(0, instabilityLog - 1) * 2;
  penalty_instability -= Math.max(0, powCount - 3);

  let penalty_warnings = -(lint.warnings?.length || 0);
  let penalty_invalid = lint.valid ? 0 : -9999;

  const score_total = score_motion + score_audio + score_color + score_structure + score_complexity + penalty_instability + penalty_warnings + penalty_invalid;

  return {
    file,
    family: lint.family || null,
    valid: lint.valid,
    score_total,
    score_motion,
    score_audio,
    score_color,
    score_structure,
    score_complexity,
    penalty_instability,
    penalty_warnings,
    metrics: {
      cTime, cBass, cMid, cTreb, cAudio, cPerFrame, cPerPoint, cWaves, cShapes, motionTouched, colorTouched
    }
  };
}

for (const row of lintRows) {
  if (!fs.existsSync(row.file)) continue;
  console.log(JSON.stringify(scoreFile(row.file, row)));
}
