# AGENTS.md - projectM Preset Factory Rules

## Goal
Generate projectM-compatible MilkDrop `.milk` presets in batches. Prioritize compatibility, diversity, and static quality heuristics.

## Hard Constraints
- Target engine: projectM
- Output files must be `.milk`
- Each file must contain `[Preset00]`
- Allowed sections only:
  - [Preset00]
  - [Wave00]...[Wave09]
  - [Shape00]...[Shape09]
- Allowed equation prefixes only:
  - per_frame_
  - per_point_
- Each preset must include audio reactivity (`bass`, `mid`, or `treb`)
- Use time-varying expressions
- Keep colors/alphas in sane [0,1] ranges
- No duplicate filenames
- No prose in preset files
- Candidate files MUST go to `presets/candidates/<batch_id>/`
- Never write directly to `presets/accepted/`

## Generation Rules
- Generate in style families: ambient, tunnel, geometric, waveform, aggressive
- Prefer 1-3 waves and 0-4 shapes per preset
- Keep formulas varied and readable
- Avoid likely unstable expressions (divide-by-zero patterns, tan spikes, extreme powers)
- Add metadata comment header at top of each preset:
  - family
  - batch_id
  - brief
  - parent_id (optional)

## Pipeline Rules
- Append score rows to `manifests/scores.jsonl`
- If linter reports failures, only fix failed files
- Preserve valid files
