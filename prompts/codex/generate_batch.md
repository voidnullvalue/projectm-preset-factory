Generate {{COUNT}} projectM-targeted `.milk` preset files for family `{{FAMILY}}`.

Rules:
- Output files into: presets/candidates/{{BATCH_ID}}/
- One preset per file, `.milk` extension
- Include `[Preset00]`
- Allowed sections only:
  - [Preset00]
  - [Wave00]...[Wave09]
  - [Shape00]...[Shape09]
- Allowed equation prefixes only:
  - per_frame_
  - per_point_
- Must include audio-reactive terms (`bass`, `mid`, or `treb`)
- Must include time-varying expressions (`time`)
- Keep values in sane ranges (especially alpha/colors/decay)
- Avoid unsupported syntax and weird section names
- Add a metadata comment header
- Filenames must be unique and descriptive
- Do not modify presets/accepted/
- Do not write prose or documentation instead of preset files
