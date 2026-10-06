---
kind: technique
title: "Spatial-audio HRTF analysis and the Immerse Gamepack dead end"
tags: [spatial-audio, hrtf, hesuvi, windows-audio, steam, ghidra, steamless, reverse-engineering]
date: 2026-10-05
status: abandoned
agents: ["OpenCode (DeepSeek V4.1 Flash)"]
humans: ["Selene0623"]
links: []
---
# Spatial-audio HRTF analysis and the Immerse Gamepack dead end

> Analysis of Immerse Gamepack (Steam app 3138960, v2.2.0.2), a Windows-only
> spatial-audio product. The internal HRTF format is standard HeSuVi-style
> 14-channel WAV, but every asset ships encrypted with in-house crypto, so the
> data could not be extracted. The practical outcome was to use public HeSuVi
> HRTF datasets instead, with ASH KU100 BRIRs as the closest equivalent.

## When to use it

- You want to understand how a Windows spatial-audio / HRTF product is
  structured before investing in extraction work.
- You are deciding whether a commercial HRTF bundle is worth reversing, or
  whether a public HeSuVi dataset already covers the need.
- You are auditing a game/app that ships `.dat` audio assets and want a
  realistic read on how far static analysis gets.

## How

### 1. Establish the audio architecture first

- The product is a Windows spatial-audio layer: a native audio engine plus an
  OS spatial-audio bridge.
- Key modules identified:
  - `IMLMT.dll` — the audio engine, built on **JUCE**. Strings seen:
    `BitwiseXorOp`, `GZIPCompressorOutputStream`, `base64:`, `TDR_Limiter`,
    `ChannelRemappingAudioSource`. No crypto-library imports.
  - `EMBHT.dll` — MediaPipe-based face scanning, **not** audio. Easy to
    misidentify; keep it out of the audio analysis.
  - `hrtfapo.dll` — a Wine/Proton builtin stub, **not** vendor code. Do not
    attribute its behaviour to the product.
- Lesson: on Linux/Proton prefixes, always check whether a DLL is a real vendor
  module or a Wine builtin symlink before analysing it.

### 2. Identify the internal data format from the executable

- Static string scan of the main executable (95 MB; mangled PE section names
  are compiler/linker output, not DRM; `.text` is 7.4 MB) revealed the format:
  - 44 WAV filenames of the form `NF{3,5,7,10}_{angle}.wav` at `0x00a8be80`.
  - This matches the **HeSuVi** naming/format convention and confirms the
    engine's native HRTF assets are standard HeSuVi-style 14-channel WAV.
  - Other strings: `HPEQ_Generic_Gaming_ClosedBack_Impulse_EQ_Left.mat`,
    `headphone_eq`, `use_headphone_eq` — a headphone EQ stage sits alongside
    the HRTF stage.
- Lesson: string archaeology on the executable tells you the *intended* format
  even when the shipped assets are obfuscated.

### 3. Characterise the shipped assets

- Asset layout observed:
  - `UserData/defaultAssets/hr/` — 219 encrypted HRTF `.dat` files
    (68 left, 68 right, 68 `_1x.dat.dat`, 15 standalone).
  - `UserData/defaultAssets/as/` — 5 `.dat` (audio settings).
  - `UserData/defaultAssets/mk/` — 4 `.dat` (markup).
  - `UserData/defaultresources.dat` (74 KB, magic `jMN0`, encrypted).
  - `UserData/defaultassetsresources.dat` (6.6 KB, magic `7901`, encrypted).
- Left/right `.dat` sizes are 3342–4275 bytes, **not** aligned to PCM
  boundaries. `_1x.dat.dat` files are 34–166 KB.
- Magic `jMN0` appears 7 times in the executable; 5 of those form a lookup
  table at `0x04b3b810`–`0x04c1b7b0`.

### 4. Rule out the easy wins

- **Steamless** (built from source, `tools/Steamless-linux/`) confirmed the
  executable is **not** SteamStub-packed, so packer removal is a dead end
  rather than a blocker.
- **Ghidra headless** was run on `IMLMT.dll` and `EMBHT.dll`. Static analysis
  surfaced crypto markers but no usable key path: obfuscated strings include
  `xor0`, `TRc4k`, `!_Aes`, `grC4`, `caeSC`, `AeS@`.
- The encryption is custom (XOR/AES/RC4 mix) and in-house; no public unpacker
  exists. This is where the work stopped.

### 5. Take the practical alternative

- For the underlying need (better HRTF for a HeSuVi-style pipeline), do not
  fight the encrypted bundle — use the **public HeSuVi dataset collection**
  (33 datasets, ~1,193 WAVs, e.g. under
  `~/.local/share/irate_goose/hrtf/`).
- Closest public equivalent to the Immerse sound: **ASH KU100 BRIRs**
  (`_ASH_Listening_Room_KU100.wav`, 48 kHz, 14-channel, 24-bit).
- Cross-reference: the IrateGoose project
  (`~/Documents/Code/game-tools/irate-goose/`) consumes HeSuVi-style
  14-channel WAV HRTFs directly, so a public dataset drops straight in.

## Gotchas

- **Encrypted assets are the wall.** All `.dat` files under
  `UserData/defaultAssets/` use custom XOR/AES/RC4 crypto with no known
  unpacker. Do not plan an extraction around the shipped files.
- **Not SteamStub.** Steamless returns a clean result; time spent on
  DRM/packer removal here is wasted.
- **Two red herrings:** `EMBHT.dll` is face scanning (MediaPipe), and
  `hrtfapo.dll` is a Wine builtin stub. Neither is part of the audio path.
- **Format ≠ content.** Knowing the intended format is HeSuVi 14-channel WAV
  does not help if the bytes are encrypted.
- **Sizes are a clue, not a container.** The left/right `.dat` sizes are not
  PCM-aligned, so they are not raw WAV with a thin header.
- Public KB rule: this note deliberately contains no asset bytes, no
  decompiled listings, and no decryption/key-recovery steps.

## Seen in

- Immerse Gamepack — Steam app **3138960**, version **2.2.0.2**,
  Windows-only spatial audio. Working copy:
  `~/Documents/Code/re/Immerse Gamepack/`.
- Analysis artifacts: `IMLMT.dll` (JUCE audio engine), `EMBHT.dll`
  (MediaPipe face scanning), executable string table, `UserData/` asset tree.
- Related: IrateGoose (`~/Documents/Code/game-tools/irate-goose/`) — HeSuVi
  14-channel WAV consumer; public HeSuVi HRTF collection at
  `~/.local/share/irate_goose/hrtf/`.

## Open questions

- What exact cipher/key schedule protects the `.dat` assets? Static strings
  (`xor0`, `TRc4k`, `!_Aes`, `grC4`, `caeSC`, `AeS@`) suggest a mix, but the
  key path was not recovered.
- What is the structure of the `jMN0` lookup table at
  `0x04b3b810`–`0x04c1b7b0`, and how does it relate to the encrypted HRTF
  files?
- Are `defaultresources.dat` (`jMN0`) and `defaultassetsresources.dat`
  (`7901`) the same container with different magics?
- Would the `_1x.dat.dat` files (34–166 KB) decode to the 14-channel WAVs
  directly, if the cipher were known?
