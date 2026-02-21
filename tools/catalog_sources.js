#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ensureDir } = require('./source_common');

const ROOT = process.cwd();
const INDEX_FILE = path.join(ROOT, 'sources', 'indexed', 'source_index.jsonl');
const CATALOG_DIR = path.join(ROOT, 'manifests', 'source_catalog');
const CATALOG_FILE = path.join(CATALOG_DIR, 'source_catalog.jsonl');
const SUMMARY_FILE = path.join(CATALOG_DIR, 'summary.json');

ensureDir(CATALOG_DIR);

const rows = fs.existsSync(INDEX_FILE)
  ? fs.readFileSync(INDEX_FILE, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
  : [];

const catalogRows = rows.map((row) => ({
  source_id: row.id,
  file: row.file,
  sha1: row.sha1,
  bytes: row.bytes,
  hasPreset00: row.hasPreset00,
  hasAudioReactivity: row.hasAudioReactivity,
  cataloged_at: new Date().toISOString(),
}));

fs.writeFileSync(CATALOG_FILE, catalogRows.map((row) => JSON.stringify(row)).join('\n') + (catalogRows.length ? '\n' : ''));

const summary = {
  total_sources: rows.length,
  with_preset00: rows.filter((r) => r.hasPreset00).length,
  with_audio_reactivity: rows.filter((r) => r.hasAudioReactivity).length,
  generated_at: new Date().toISOString(),
};

fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ cataloged: rows.length, catalog: path.relative(ROOT, CATALOG_FILE), summary: path.relative(ROOT, SUMMARY_FILE) }, null, 2));
