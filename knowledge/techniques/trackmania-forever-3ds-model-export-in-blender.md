---
kind: technique
title: "Exporting models to TrackMania Forever (TMF) with the Blender .3ds exporter"
tags: [3ds, blender, trackmania, trackmania-forever, tmf, model-export, uv, vertex-colors]
date: 2026-10-05
agents: ["OpenCode (DeepSeek V4.1 Flash)"]
humans: ["Selene0623"]
links: ["https://docs.blender.org/manual/en/latest/addons/import_export/scene_3ds.html", "https://en.wikipedia.org/wiki/TrackMania"]
---

# Exporting models to TrackMania Forever (TMF) with the Blender .3ds exporter

> TrackMania Forever (the original 2008 TrackMania era) ingests models as plain Autodesk
> `.3ds` files, not ManiaPlanet's `.Gbx` container. Two forks of the classic Blender 3DS
> exporter add TMF-specific chunks on top of the standard format: vertex normals, vertex
> colors, multiple UV layers, and a lifted 12-character name limit. Those chunks are what
> break a file for ordinary 3DS consumers — and exactly what TMF wants. This note covers the
> options and the install/export path; a round-trip inside a real TMF client was **not**
> verified here (see Open questions).

## When to use it

- You are authoring a **TrackMania Forever** model and need to hand it to the game as `.3ds`.
- You want to know what the four non-standard export options actually change in the binary,
  so you can decide whether to keep a file portable or TMF-optimized.
- You are reading a legacy TMF asset and want to recognize the custom chunk IDs.

**Era check first.** This is the *old* TrackMania Forever pipeline. ManiaPlanet (TrackMania
2 Canyon/Stadium, ShootMania) uses `.Gbx` files with a completely different content layout —
see `games/trackmania-2/maniaplanet-content-locations-and-custom-pack-layout.md` in this
knowledge base. If your target is TM2/ShootMania, stop: you are in the wrong era and this
exporter will not produce something the client will load.

## How

Two source trees implement the same exporter; pick whichever is easier to install.

**A. Single-file add-on** — `~/Documents/Code/game-tools/blender-io-gbx/3ds_export_tmf.py`.
`bl_info` declares `version (1,1,2)`, `blender (5,1,2)`, category Import-Export, GPL.
- Install: **Edit → Preferences → Add-ons → Install** → pick the `.py` → enable it.
- Export: **File → Export → 3DS for TMF (.3ds)**.
- It also runs headless: the module ends with `do_export("/tmp/tmf_export.3ds")` under
  `if __name__ == "__main__"`.

**B. Folder add-on** — `~/Documents/Code/game-tools/blender-io-addons/io_scene_tmf/`
(`__init__.py`, `export_tmf.py`, `README.md`, `LICENSE`, GPL-2.0-or-later). The reviewed body
is byte-for-byte the same exporter as (A) apart from class/operator naming
(`ExportTMF` / `export_scene.tmf` vs `Export_tm` / `export_scene.tm`); the sibling
`io_scene_3ds/`, `io_autodesk_3ds/`, `io_autodesk_max/` and `LTS/` folders are unrelated
stock/legacy handlers.
- Install: copy `io_scene_tmf/` into Blender's `scripts/addons/`, or
  **Edit → Preferences → Add-ons → Install** → select the folder → enable.
- Export: **File → Export → TrackMania Forever (.3ds)** (menu label in `__init__.py`).

**Export dialog options** (all default ON; the bools are read into module globals
`p_do_no_name_limit`, `p_do_normals`, `p_do_colors`, `p_do_uvs` in `execute()`):

| Option | Description string | Effect |
|---|---|---|
| Selection Only | "Export selected objects only" | Filters `sce.objects` by `not ob.hide_viewport and ob.select`; default off = whole scene |
| Remove Name Limit | "Remove default 12 character name limit (breaks compatibility)" | When ON, `sane_name()` keeps names longer than 12 chars |
| Vertex Normals | "Export Vertex Normals (breaks compatibility)" | Adds custom chunk `OBJECT_VERTEX_NORMALS = 0x4112` |
| Vertex Colors | "Export Vertex Colors (breaks compatibility)" | Adds custom chunk `OBJECT_VERTEX_COLORS = 0x4115` |
| All UV Layers | "Export all UV layers (breaks compatibility)" | Adds custom chunk `OBJECT_UV_LIST = 0x4145` alongside the single standard `OBJECT_UV = 0x4140` |

**What "breaks compatibility" means in the bytes.** Standard 3DS has no slot for per-vertex
normals, per-vertex colors, or more than one UV set, so the fork assigns fresh chunk IDs:
`0x4112` normals, `0x4115` colors, `0x4145` a UV *list* (a `ushort` count followed by several
full UV arrays). Ordinary 3DS readers (and 3ds Max) skip unknown chunks or choke on them;
TMF reads them. Keep all four ON for a TMF-targeted asset; turn them OFF if the same mesh
must also open in a vanilla `.3ds` tool.

**Why the 12-char limit exists.** `sane_name()` truncates each name to ASCII `[:12]` (and
de-dupes with a `.000` suffix) only when `p_do_no_name_limit` is false — the toggle's name
"Remove Name Limit" is optimistic: when checked, `p_do_no_name_limit=True`, so the `[:12]`
slice is skipped and full names survive. The `.3ds` name field is a zero-terminated string,
so the "limit" is a 3ds Max convention, not a hard format bound.

**Coordinates.** The exporter builds a global matrix with
`axis_conversion(to_forward='-Z', to_up='Y')` and bakes object transform/track data into
keyframe chunks (`KFDATA`, position/rotation/scale track tags) plus an `OBJECT_TRANS_MATRIX`
per mesh.

## Gotchas

1. **Names silently clipped / renamed.** Symptom: objects or materials come out truncated to
   12 chars or with `.000` suffixed duplicates. Cause: `sane_name()` applies an ASCII `[:12]`
   slice and a uniqueness pass whenever "Remove Name Limit" is off. Fix: enable **Remove Name
   Limit**, and prefer ASCII-only names since non-ASCII is replaced, not encoded.

2. **Mesh opens in TMF but not in 3ds Max / other viewers.** Symptom: file rejected or
   misread outside the game. Cause: the custom `0x4112`/`0x4115`/`0x4145` chunks are
   non-standard by design. Fix: this is expected for a TMF asset; if you need a portable
   copy, re-export with Vertex Normals, Vertex Colors and All UV Layers all OFF.

3. **Second UV layer ignored downstream.** Symptom: only the first UV set survives. Cause:
   the active layer is written into the standard single `OBJECT_UV`; extra layers go only
   into the custom `OBJECT_UV_LIST` and any consumer that ignores `0x4145` sees one set.
   Fix: confirm the consuming tool understands the UV-list chunk, or bake multiple maps into
   one UV layout.

4. **Wrong orientation or displaced objects.** Symptom: model rotated/mirrored or offset in
   the game. Cause: exporter applies `axis_conversion(to_forward='-Z', to_up='Y')` and derives
   placement from parent-relative transform/keyframe track data, not from world matrices.
   Fix: keep a simple, flat object hierarchy, avoid scaled/rotated parents, and check
   placement before trusting a complex rig.

5. **Installed but no menu entry.** Symptom: the File → Export item is missing. Cause: the
   add-on is not enabled, or a required Blender version/API mismatch — `bl_info` targets
   Blender `(5, 1, 2)`. Fix: enable it under Preferences → Add-ons and match the Blender
   build; the source references 2.80-era APIs and carries notes about 2.80 breakage, so an
   older Blender is not a supported target.

## Seen in

- `~/Documents/Code/game-tools/blender-io-gbx/3ds_export_tmf.py` (single-file add-on,
  `bl_info` v1.1.2, Blender 5.1.2, GPL) and its `AGENTS.md`.
- `~/Documents/Code/game-tools/blender-io-addons/io_scene_tmf/` (`export_tmf.py` fork,
  `README.md`, GPL-2.0-or-later) and its `AGENTS.md`.
- Era contrast: `games/trackmania-2/maniaplanet-content-locations-and-custom-pack-layout.md`
  (ManiaPlanet `.Gbx` content, a different pipeline entirely).

## Open questions

- Was any export actually round-tripped in a running TrackMania Forever client? The local
  `AGENTS.md` files only suggest testing "in TMF or 3DS viewer"; no successful in-game import
  is recorded, so the four custom options being *accepted* by TMF is asserted by the add-on
  authors, not verified here.
- Exact TMF-side semantics of the custom chunks (`0x4112` normals ordering, whether
  `0x4115` colors are sRGB or linear, how TMF binds the `0x4145` UV list to its shaders) are
  undocumented in the source.
- Correctness of the derived-object/quaternion path is unproven: `re_create_derived_objects`
  is annotated "Broken for 2.80 at this moment", and parent-child rotation math uses
  quaternion ops whose exact behaviour under current Blender was not exercised.
- Where in the TMF install a `.3ds` model is expected to be dropped for the client to pick it
  up — not established by these sources (the add-on only emits the file).
