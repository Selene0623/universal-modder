---
kind: game
title: "Watch Dogs 1: compiling and delivering the shader pack (shadersobj)"
game: "Watch Dogs"
games_also: []
game_version: "Watch Dogs 1 retail (Steam/uPlay) + NexusTools 1.1.12/1.1.13"
platform: windows
engine: unknown
route: passthrough
tools: ["Disrupt-Shader-Compiler", "Gibbed.Disrupt", "NexusTools", "fxc (d3dcompiler_43/46/47)", "dxc"]
anti_cheat: "none on WD1; delivering files through NexusTools is first-class, no bypass involved"
status: working
agents: ["OpenCode (DeepSeek V4.1 Flash)"]
humans: ["@Selene0623"]
date: 2026-10-06
links: ["https://github.com/Open-Source-Modding/Disrupt-Shader-Compiler", "https://github.com/Open-Source-Modding/Gibbed.Disrupt"]
tags: [shaders, dxbc, fxc, dxc, hlsl, shadersobj, nexus-tools, signatures, semantics, black-screen, disrupt, dunia]
---

# Watch Dogs 1: compiling and delivering the shader pack (shadersobj)

> The shipped HLSL under `engine/shaders/` compiles to a single `shadersobj.dat` archive of ~39k
> permutations, and the engine loads it before anything else. This note is what we had to learn to rebuild
> all of them on Linux with an era-correct compiler and get the archive accepted in-game: the bytecode
> dialect the 2014 runtime actually accepts, and the input-signature contract that fails silently as a black
> screen when it is violated. Verified end to end on retail WD1 through NexusTools (hook layer, ASI, pack
> installed and loaded).

## Setup
- Watch Dogs 1 retail, launched through uPlay in a Wine/Proton prefix, with NexusTools 1.1.12+ as the mod
  loader (`bin/dinput8.dll`, `bin/TroploAsiInjectionHelper.asi`, `bin/TroploNexusTools.ipe`).
- `Disrupt-Shader-Compiler` holds the shipped `.fx`/`.inc.fx` sources, per-file header stubs
  (`obj/hXX/<name>.pso.header`) and the permutation list `Shader_Compile_Command_Sorted.txt` (about 39k fxc
  command lines: profile, entry point, `-D` defines, output name).
- Compiler side: `dxc` compiles on Linux but produces DXIL; real `fxc` is a Windows DLL
  (`d3dcompiler_43/46/47.dll`) and can be driven under Wine. A thin shim that forwards each command line to
  `D3DCompileFromFile` in a chosen `d3dcompiler_*.dll` is enough to run the whole list headlessly.
- `Gibbed.Disrupt` (Open-Source-Modding fork) packs `shadersobj.fat` and writes its own `.nfo`.

## Route and why
Passthrough: the engine's own family registry and dispatch stay untouched, we only replace compiled shader
bytes with freshly compiled ones from the shipped sources. The alternatives we rejected:
- **Adding new shader families.** The set of families that the renderer knows is fixed in the binary
  (`fastinitdata.bin` plus C++ constructor pre-fetch); only the shipped source *contents* are meant to be
  replaced. Adding a family means driving the engine's own shader generator at build time, which is a
  different (and much larger) project.
- **A newer compiler.** `dxc` happily compiles these sources, but it promotes `cs_5_0`/`ps_5_0` to shader
  model 6 and emits DXIL. The engine's 2014-era runtime takes era `fxc` SM5.0 DXBC and rejects DXIL, and the
  rejection is total rather than partial: the game boots to a black screen with the menus black too, and the log
  stays clean (no shader-load or pipeline error).

## How the game works (what we had to learn)
- **The archive is the whole shader set.** `shadersobj.dat`/`.fat` ships ~39,370 files (`pso`, `vso`, `cso`,
  `gso`, plus render-state blobs and a `shaders.crc` verifier that is identical between retail and working
  mods, so it is not a per-build checksum). Retail stores its entries XMemCompress-compressed; a repack with
  raw entries is accepted, so compression is not part of the contract.
- **Every compiled shader is a stub plus DXBC.** `obj/hXX/<name>.pso` starts with a 4- or 12-byte header stub
  whose first `u32` is a content version (0-9), and the first `DXBC` four-character code follows it. The
  per-file stub lives next to the source as `<name>.pso.header`; packing must prepend it, because a bare DXBC
  blob is not loaded.
- **DXBC carries the two signatures that matter.** Brute-scanning the container for the `ISGN`/`OSGN` fourcc
  (element size 24: semantic name offset, index, register, system-value flag, component type, mask,
  read-mask) gives ground truth for what the runtime actually binds. The vertex shader's input signature and
  the pixel shader's output signature are engine-bound (they must match what the vertex declaration and the
  render-target layout expect); the vertex shader's output signature and the pixel shader's input signature
  must agree with each other, and D3D11 in release mode does **not** validate that pairing at draw time. The
  pairing is the contract, not the numbering: a mod can use different semantic indices from retail and still
  render, as one shipping shader mod does.
- **A signature mismatch is silent.** Mismatched semantics/registers do not error and do not crash; the shader
  links to the wrong registers and the frame renders black or garbage. This is the failure mode to suspect
  first when the game runs, no shader-load errors appear, and nothing draws.
- **Era fxc is stricter than the sources assume.** Members of a struct used as an entry-point parameter must
  carry explicit semantics (bare struct members fail with `X3502`), entry points must declare output semantics
  (`X3503`), duplicated non-system semantics are fatal (`X3506`/`X3536`) while duplicate `IGNORE` is only a
  warning, and `SHADERMODEL` is a compiler built-in that must be defined explicitly when driving the compiler
  from a script. Custom semantic names are passed through verbatim, so a source written as `SEMANTIC_VAR(x)`
  (`x : x`) produces those literal names in `ISGN`/`OSGN`; that is legal and is what one shipping shader mod
  does.

## Build steps
1. Compile every permutation in `Shader_Compile_Command_Sorted.txt` with an era-correct fxc (Wine + a real
   `d3dcompiler_*.dll`), one shim invocation per line, output under `COMPILED/engine/shaders/obj/hXX/`.
   Resume-safe reruns matter: a full pass is ~39k invocations.
2. Prepend each file's `.header` stub (idempotent; skip files that already start with a stub).
3. Copy the archive's non-compiled members verbatim from a retail unpack (render-state blobs, `shaders.crc`,
   the index/family blobs, and any family with no source) so the pack is a superset of retail.
4. Pack: `Gibbed.Disrupt.Packing.dll --pv 8 <out>/shadersobj.fat <COMPILED_DIR>/`, then confirm the `.fat`
   entry count matches the file count and that the `.nfo` was regenerated by the packer.
5. Deliver. Either replace the archive in the game's `data_win64/` or hand it to NexusTools as a mod pack —
   a mod directory under `data_win64/mods/<id>/` with `modconfig.json` (`packs`, `incompatibleMods`,
   `minTntVersion`) and the `shadersobj` files beside it. NexusTools redirects per file, so a pack need not
   carry every member.
6. Verify: unpack your own pack and compare a random sample of entries to your build directory byte-for-byte,
   then confirm the control case — repacking unmodified retail files through the same pipeline and seeing it
   run — before blaming the packer for a black screen.

## Verification
- A repack of the *unmodified* retail archive through our packer launched and rendered; that control isolated
  the failure to shader *content*, not container format.
- With era-correct SM5.0 DXBC for all permutations, the game launched and rendered with our pack installed.
- Signature ground truth came from unpacking retail and from the DXBC signature scan, not from guessing which
  semantics the engine wants.

## Gotchas
1. **Symptom:** game boots to a black screen (menus included) with no shader or pipeline errors in the log.
   **Cause:** wrong bytecode dialect — `dxc`-produced DXIL or shader model 6 in the pack. **Fix:** compile with
   an era `d3dcompiler_*.dll` at `ps_5_0`/`vs_5_0`/`cs_5_0`.
2. **Symptom:** game runs, world loads, nothing renders, no errors. **Cause:** vertex-shader output and
   pixel-shader input no longer agree (semantic name/index/register), which D3D11 release mode never checks.
   **Fix:** compare `ISGN`/`OSGN` between your build and retail and make the *pairing* hold, i.e. the vertex
   shader's output signature and the pixel shader's input signature must agree with each other. Do not chase
   retail's numbering: a shipping shader mod does not reproduce it and still renders, so the contract is the
   pair, not the numbers.
3. **Symptom:** `X3502 input parameter 'x' missing semantics` / `X3503 function return value missing
   semantics`. **Cause:** the shipped sources were written for the engine's own generator, which fills these in.
   **Fix:** annotate bare struct members and entry-point returns before compiling; carry the annotation pass in
   the toolchain rather than editing each source by hand.
4. **Symptom:** `X3536 duplicated input semantics` / `X4503 output used more than once`. **Cause:** two members
   in the same struct got the same generated semantic (or a real duplicate such as two `IGNORE` members).
   **Fix:** unique per-file names, and never renumber members that already carry a semantic.
5. **Symptom:** compiling fails with a missing include that exists on disk (`PostEffect/`, `Lightmap/`).
   **Cause:** case-variant directories holding curated symlinks; the compiler resolves the variant directory
   first and cannot see the real files. **Fix:** mirror the real files into every case variant.
6. **Symptom:** a family compiles from a command line copied by eye but not from the list. **Cause:** the list
   is the contract (defines included), and `SHADERMODEL` is not implied. **Fix:** drive the compiler from the
   list, and pass the platform and `SHADERMODEL` defines explicitly.
7. **Symptom:** the archive is accepted, but only some surfaces look wrong. **Cause:** a per-family source edit
   that changed signatures for that family only. **Fix:** recompile the whole set after touching shared
   includes; the reps in one family are not independent of the others.

**Credits:** built on the Open-Source-Modding `Disrupt-Shader-Compiler` sources and the community's shader
tooling (Miru's shader-editing work, Troplo's NexusTools, qstlijku's material tooling), and on signatures
recovered from retail archives. Compile/deploy pipeline and the signature contract were established by
@Selene0623 with OpenCode (DeepSeek V4.1 Flash) while shipping a Watch Dogs 1 shader mod.
