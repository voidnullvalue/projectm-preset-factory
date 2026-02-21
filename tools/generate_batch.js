#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const batchId = process.argv[2];
const family = process.argv[3];
const count = Number(process.argv[4] || 0);
if (!batchId || !family || !Number.isInteger(count) || count <= 0) {
  console.error('Usage: node tools/generate_batch.js <batch_id> <family> <count>');
  process.exit(1);
}

const validFamilies = new Set(['ambient', 'tunnel', 'geometric', 'waveform', 'aggressive']);
if (!validFamilies.has(family)) {
  console.error(`Unsupported family: ${family}`);
  process.exit(1);
}

const outDir = path.join('presets', 'candidates', batchId);
fs.mkdirSync(outDir, { recursive: true });

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

for (let i = 0; i < count; i++) {
  const idx = String(i + 1).padStart(3, '0');
  const filename = `${family}_${batchId}_${idx}.milk`;
  const waveCount = 1 + (i % 3);
  const shapeCount = i % 3;
  const t1 = (0.07 + (i % 11) * 0.013).toFixed(3);
  const t2 = (0.11 + (i % 7) * 0.017).toFixed(3);
  const zr = (1.0 + (i % 5) * 0.03).toFixed(3);
  const wa = clamp01(0.18 + (i % 8) * 0.06).toFixed(3);
  const wr = clamp01(0.2 + ((i * 7) % 10) * 0.06).toFixed(3);
  const wg = clamp01(0.3 + ((i * 5) % 10) * 0.05).toFixed(3);
  const wb = clamp01(0.4 + ((i * 3) % 10) * 0.05).toFixed(3);

  const lines = [
    `// family: ${family}`,
    `// batch_id: ${batchId}`,
    `// brief: drifting harmonic field ${idx}`,
    '',
    '[Preset00]',
    `fDecay=${(0.945 + (i % 6) * 0.007).toFixed(3)}`,
    `fGammaAdj=${(1.5 + (i % 9) * 0.08).toFixed(3)}`,
    `fWarpScale=${(0.4 + (i % 8) * 0.09).toFixed(3)}`,
    `fWaveAlpha=${wa}`,
    `wave_r=${wr}`,
    `wave_g=${wg}`,
    `wave_b=${wb}`,
    'wave_a=0.85',
    `per_frame_1=zoom=${zr}+0.015*sin(time*${t1})+0.010*bass;rot=0.008*sin(time*${t2})+0.004*mid;cx=0.5+0.03*sin(time*0.170)+0.015*treb;cy=0.5+0.03*cos(time*0.140)+0.010*mid;wave_r=min(1,max(0,${wr}+0.20*sin(time*0.120)+0.10*bass));wave_g=min(1,max(0,${wg}+0.20*sin(time*0.090+1.2)+0.08*mid));wave_b=min(1,max(0,${wb}+0.20*cos(time*0.110)+0.08*treb));`,
    `per_frame_2=dx=0.004*sin(time*0.130+q1)+0.002*mid;dy=0.004*cos(time*0.160+q2)+0.002*treb;q1=q1+0.010+0.004*bass;q2=q2+0.009+0.003*mid;`,
    'per_point_1=x=x+0.003*sin(time*0.4+y*6.283)+0.001*bass;y=y+0.003*cos(time*0.3+x*6.283)+0.001*treb;',
  ];

  for (let w = 0; w < waveCount; w++) {
    const wn = String(w).padStart(2, '0');
    lines.push(`[Wave${wn}]`);
    lines.push(`enabled=1`);
    lines.push(`samples=${256 + w * 64}`);
    lines.push(`scaling=${(1 + w * 0.2).toFixed(3)}`);
    lines.push(`smoothing=${(0.5 + 0.1 * w).toFixed(3)}`);
  }

  for (let s = 0; s < shapeCount; s++) {
    const sn = String(s).padStart(2, '0');
    lines.push(`[Shape${sn}]`);
    lines.push('enabled=1');
    lines.push(`sides=${3 + ((i + s) % 6)}`);
    lines.push(`rad=${(0.06 + ((i + s) % 8) * 0.02).toFixed(3)}`);
    lines.push(`ang=${(i % 10) * 0.2}`);
    lines.push('r=0.4');
    lines.push('g=0.5');
    lines.push('b=0.7');
    lines.push('a=0.3');
  }

  fs.writeFileSync(path.join(outDir, filename), lines.join('\n') + '\n');
}

console.log(`Generated ${count} presets in ${outDir}`);
