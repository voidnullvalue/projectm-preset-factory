#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node tools/lint_preset.js <batch_dir>');
  process.exit(1);
}

const allowedEqPrefixes = ['per_frame_', 'per_point_'];

function listMilkFiles(d) {
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .filter((f) => f.toLowerCase().endsWith('.milk'))
    .map((f) => path.join(d, f));
}

function sectionAllowed(line) {
  return /^\[Preset00\]$/.test(line) || /^\[(Wave|Shape)0\d\]$/.test(line);
}

function lintFile(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split(/\r?\n/);
  const errors = [];
  const warnings = [];

  let hasPreset00 = false;
  let hasAudio = false;
  let hasTime = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('//') || line.startsWith(';') || line.startsWith('#')) {
      if (/\b(bass|mid|treb)\b/.test(line)) hasAudio = true;
      if (/\btime\b/.test(line)) hasTime = true;
      continue;
    }

    if (/^\[.*\]$/.test(line)) {
      if (line === '[Preset00]') hasPreset00 = true;
      if (!sectionAllowed(line)) errors.push(`line ${i + 1}: disallowed section ${line}`);
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();

    if (key.startsWith('per_') && !allowedEqPrefixes.some((p) => key.startsWith(p))) {
      errors.push(`line ${i + 1}: disallowed equation prefix in ${key}`);
      continue;
    }

    if (allowedEqPrefixes.some((p) => key.startsWith(p))) {
      if (/[{}]/.test(val)) errors.push(`line ${i + 1}: braces not allowed in equations`);
      if (/\/\s*0(\D|$)/.test(val)) errors.push(`line ${i + 1}: obvious divide-by-zero`);
      if (/\btime\b/.test(val)) hasTime = true;
      if (/\b(bass|mid|treb)\b/.test(val)) hasAudio = true;
      if (/\btan\s*\(/.test(val)) warnings.push(`line ${i + 1}: tan() may be unstable`);
      continue;
    }

    if (/^(fR|fG|fB|fA|fBorderR|fBorderG|fBorderB|fBorderA|wave_r|wave_g|wave_b|wave_a|r|g|b|a)$/.test(key)) {
      const num = Number(val);
      if (!Number.isNaN(num) && (num < 0 || num > 1)) {
        warnings.push(`line ${i + 1}: ${key} outside [0,1]`);
      }
      if (/\btime\b/.test(val)) hasTime = true;
      if (/\b(bass|mid|treb)\b/.test(val)) hasAudio = true;
    }

    if (/\btime\b/.test(val)) hasTime = true;
    if (/\b(bass|mid|treb)\b/.test(val)) hasAudio = true;
  }

  if (!hasPreset00) errors.push('missing [Preset00]');
  if (!hasAudio) errors.push('missing audio reactivity (bass|mid|treb)');
  if (!hasTime) errors.push('missing time-varying expression (time)');

  const family = (txt.match(/family\s*:\s*(ambient|tunnel|geometric|waveform|aggressive)/i) || [])[1]?.toLowerCase() || null;

  return {
    file,
    valid: errors.length === 0,
    errors,
    warnings,
    has_audio: hasAudio,
    has_time: hasTime,
    family,
  };
}

for (const file of listMilkFiles(dir)) {
  console.log(JSON.stringify(lintFile(file)));
}
