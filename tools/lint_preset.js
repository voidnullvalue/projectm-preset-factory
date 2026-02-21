#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) { console.error('Usage: node tools/lint_preset.js <batch_dir>'); process.exit(1); }

const allowedSections = [/^\[Preset00\]$/, /^\[Wave\d\d\]$/, /^\[Shape\d\d\]$/];
const allowedEqPrefixes = ['per_frame_', 'per_point_'];
const allowedFunctions = ['sin','cos','abs','sqrt','pow','min','max','if','int','above','below','equal','rand','atan','atan2','log','exp'];
const audioVars = ['bass','mid','treb'];

function listMilkFiles(d) {
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d)
    .filter(f => f.toLowerCase().endsWith('.milk'))
    .map(f => path.join(d, f));
}

function sectionAllowed(line) {
  return allowedSections.some(re => re.test(line.trim()));
}

function lintFile(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split(/\r?\n/);
  const errors = [];
  const warnings = [];
  const sections = [];
  let hasPreset00 = false;
  let hasAudio = false;
  let hasTime = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('//') || line.startsWith(';') || line.startsWith('#')) {
      if (/\b(bass|mid|treb)\b/.test(line)) hasAudio = true;
      if (/\btime\b/.test(line)) hasTime = true;
      continue;
    }

    if (/^\[.*\]$/.test(line)) {
      sections.push(line);
      if (line === '[Preset00]') hasPreset00 = true;
      if (!sectionAllowed(line)) errors.push(`line ${i+1}: disallowed section ${line}`);
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();

    if (allowedEqPrefixes.some(p => key.startsWith(p))) {
      if (/[{}]/.test(val)) errors.push(`line ${i+1}: braces not allowed in equations`);
      if (/\/\s*0(\D|$)/.test(val)) errors.push(`line ${i+1}: obvious divide-by-zero`);
      if (/\btime\b/.test(val)) hasTime = true;
      if (/\b(bass|mid|treb)\b/.test(val)) hasAudio = true;
      if (/\btan\s*\(/.test(val)) warnings.push(`line ${i+1}: tan() may be unstable`);
      const hugeNums = val.match(/\b\d+(\.\d+)?\b/g) || [];
      if (hugeNums.some(n => Number(n) > 1000)) warnings.push(`line ${i+1}: very large constant`);
      continue;
    }

    // sanity checks for common numeric keys
    const numericKeys = ['fDecay','fWaveAlpha','fWaveScale','fGammaAdj','fWarpScale','fWarpAnimSpeed','fZoomExponent'];
    if (numericKeys.includes(key)) {
      const num = Number(val);
      if (Number.isNaN(num)) errors.push(`line ${i+1}: ${key} not numeric`);
      if (key === 'fDecay' && !(num >= 0.90 && num <= 0.995)) warnings.push(`line ${i+1}: fDecay outside recommended range`);
      if (key === 'fWaveAlpha' && !(num >= 0 && num <= 1.5)) warnings.push(`line ${i+1}: fWaveAlpha unusual`);
    }

    // color sanity (common keys)
    if (/^(fR|fG|fB|fA|fBorderR|fBorderG|fBorderB|fBorderA|wave_r|wave_g|wave_b|wave_a)$/.test(key)) {
      if (/\btime\b/.test(val)) hasTime = true;
      if (/\b(bass|mid|treb)\b/.test(val)) hasAudio = true;
    }
  }

  if (!hasPreset00) errors.push('missing [Preset00]');
  if (!hasAudio) errors.push('missing audio reactivity (bass|mid|treb)');
  if (!hasTime) warnings.push('no time-varying expression detected');

  // family from header comment (optional)
  let family = null;
  const famMatch = txt.match(/family\s*:\s*(ambient|tunnel|geometric|waveform|aggressive)/i);
  if (famMatch) family = famMatch[1].toLowerCase();

  return {
    file,
    valid: errors.length === 0,
    errors,
    warnings,
    sections_count: sections.length,
    has_audio: hasAudio,
    has_time: hasTime,
    family
  };
}

for (const file of listMilkFiles(dir)) {
  console.log(JSON.stringify(lintFile(file)));
}
