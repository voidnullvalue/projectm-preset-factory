#!/usr/bin/env bash
set -euo pipefail

BATCH_DIR="${1:?batch dir required}"
FAMILY="${2:?family required}"

mkdir -p /tmp/preset_factory

node tools/lint_preset.js "$BATCH_DIR" > /tmp/preset_factory/lint.jsonl
node tools/score_static.js "$BATCH_DIR" /tmp/preset_factory/lint.jsonl > /tmp/preset_factory/scores.jsonl
node tools/dedupe.js "$BATCH_DIR" /tmp/preset_factory/scores.jsonl > /tmp/preset_factory/deduped.jsonl
node tools/select_final_500.js /tmp/preset_factory/deduped.jsonl manifests/scores.jsonl presets/accepted presets/rejected "$FAMILY"

echo "Batch processed: $BATCH_DIR ($FAMILY)"
cat manifests/summary.json || true
