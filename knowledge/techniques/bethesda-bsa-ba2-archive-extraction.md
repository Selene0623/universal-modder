---
kind: technique
title: "Bethesda BSA/BA2 archive extraction: header layout and what BAE knows"
tags: [bethesda, bsa, ba2, archive, extraction, fallout4, skyrim, starfield, bae]
date: 2026-10-05
agents: ["OpenCode (DeepSeek V4.1 Flash)"]
humans: ["Selene0623"]
links:
  - "https://github.com/fo76utils/ba2"
  - "https://github.com/Ortham/libbsa"
  - "https://github.com/Ghost-in-the-code/BSA_Browser"
---

# Bethesda BSA/BA2 archive extraction: header layout and what BAE knows

> Bethesda's archives come in two generations: the older **BSA** (Skyrim/FO4-era, with a folder →
> file tree) and the newer **BA2** (Fallout 4+, with per-format variants and LZ4/Zlib payloads).
> This note records the header fields recovered from Bethesda Archive Extractor v0.11 and points at
> the mature open-source extractors to use instead of reinventing one.

## When to use it

Inspecting a `.bsa`/`.ba2` header by hand, or choosing an extraction library. If you just want files
out, use `libbsa`/`bsa`/BSA Browser — this note is for when you need to understand the container.

## How

### BSA header (older generation)

| Field | Size |
|---|---|
| file magic | 4 |
| file version | 4 |
| header flags | 4 |
| file count | 4 |
| folder count | 4 |
| folder info offset | 4 |
| file flags offset | 4 |
| header CRC / checksum | 4 |

### BA2 header (newer generation)

| Field | Size |
|---|---|
| file magic | 4 |
| file version | 4 |
| header flags | 4 |
| file count | 4 |
| folder count | 4 |

### Compression

- **BSA v105 uses LZ4.** Decompression error paths seen in the extractor:
  `frameHeader_incomplete`, `decompressionFailed`, `headerChecksum_invalid`.

### Validation

The extractor checks three checksums: **header CRC**, **header checksum**, and **content checksum**.
A mismatch is a hard failure — useful as an oracle that an archive was reassembled correctly.

### What BAE v0.11 adds

- Extended-ASCII filepath support (v0.10).
- **BCn texture variants** (v0.11) — recognises the DXT/BCn texture types.
- Qt model/view architecture: `BSAModel`, `BSAProxyModel`, `BSATreeView`.

### Mature open-source alternatives

`libbsa` (Ortham), `ba2` (fo76utils), and BSA Browser implement the full specs including the BA2
per-format variants. Prefer these unless you need BAE's specific behaviour.

## Gotchas

1. **BSA and BA2 are not the same container.** **Symptom:** a BSA reader fails on a BA2 (or vice
   versa). **Cause:** different headers and payload schemes. **Fix:** detect by magic/extension and
   dispatch.
2. **BA2 has format-specific payloads.** **Symptom:** extracted textures come out wrong. **Cause:**
   BA2 stores textures with BCn handling distinct from the generic path. **Fix:** use a spec-complete
   extractor; BAE's BCn support was added late (v0.11).
3. **BSA v105 is LZ4, not zlib.** **Symptom:** decompression errors. **Cause:** assuming zlib.
   **Fix:** LZ4 frame decode; watch for `frameHeader_incomplete`.
4. **Checksum failures are meaningful.** **Symptom:** an archive "opens" but extraction aborts.
   **Cause:** header/content CRC mismatch from a bad repack. **Fix:** treat checksum validation as a
   correctness oracle, not a warning.

## Seen in

- BAE (Bethesda Archive Extractor) v0.11 RE workbench (`re/BAE/`)
- Relevant to Fallout 4, Skyrim SE, Starfield archive work
- Companion notes: `techniques/bethesda-plugin-record-format-esm-esp-esl.md` (record header, GRUP,
  FormID slot algebra, strings) and `techniques/bethesda-esl-light-masters-and-plugin-archive-pairing.md`
  (which plugin makes a `.ba2` actually load, and the light-master rules).

## Open questions

- Full BA2 spec (format variants, per-format compression) — not yet extracted from the decompilation;
  `libbsa`/`ba2` are the reference.
- A standalone Python BA2 extractor was a TODO in the source notes, not yet built.
