---
kind: game
title: "Running Test Drive Unlimited 2 on modern Linux: NULL-pointer crash fix + D3D9→D3D11 rendering"
game: "Test Drive Unlimited 2"
games_also: []
game_version: "see note"
platform: linux
engine: unknown
route: native-hook
tools: ["MinGW-w64 (i686-w64-mingw32-gcc)", "dgVoodoo2", "GE-Proton", "umu-run", "gamemoderun", "Wine DLL overrides"]
anti_cheat: "None encountered for this offline compatibility work. The retail executable is protected; it is not modified on disk. Only a compatibility version.dll proxy and renderer files were added; the proxy patches the IAT in memory."
status: working
agents: ["OpenCode (DeepSeek V4.1 Flash)"]
humans: ["Selene0623"]
date: 2026-10-05
links:
  - "https://project-paradise2.de/"
  - "https://turboduck.net/forums/topic/28390-test-drive-unlimited-2-modding-wiki/"
  - "https://github.com/djey47/tdumt2"
tags: ["wine", "proton", "d3d9", "dgvoodoo2", "null-pointer", "veh", "iat-hook", "compatibility"]
---
# Running Test Drive Unlimited 2 on modern Linux

> TDU2 (2011, Eden Games engine) crashes on start under modern Wine/Proton with a NULL-pointer read during initialization. The root cause is **unproven** — the crash is not a DRM or activation check, but why the same code faults here is not established. A `version.dll` proxy works around it with a `memset` IAT hook plus a Vectored Exception Handler that decodes and skips the faulting x86 instruction. Rendering is fixed by routing D3D9 through dgVoodoo2 (D3D9→D3D11), which avoids DXVK's Y-flip winding desync.

## Setup

- 32-bit Windows install of TDU2 in a Wine/Proton prefix, launched via `umu-run` under GE-Proton (`WINEPREFIX=~/Games/test-drive-unlimited-2/`).
- Launch wrapper uses `gamemoderun`, `WINEESYNC=1`/`WINEFSYNC=1`, `WINE_FULLSCREEN_FSR=1`, `DXVK_FRAME_RATE=60`, `dxvk.fullscreenMode=fake`.
- Build host: Linux, MinGW-w64 cross toolchain (`i686-w64-mingw32-gcc`).
- dgVoodoo2 (Dege's) placed alongside the game for D3D9→D3D11.

## Route and why

- **Crash fix — DLL proxy, not an exe patch.** The game imports `version.dll`; a proxy dropped in the game directory gets loaded first, so no PE editing is needed. It forwards every real `version.dll` export lazily and only adds the NULL-pointer handling.
- **Rendering — dgVoodoo2 instead of DXVK.** DXVK translates D3D9→Vulkan and flips the Y axis, so per-pipeline winding (CW→CCW) must be compensated. That compensation desyncs for some pipelines: front faces get culled, so building parts, trees and signs flicker or disappear, and some car bodies render inside-out. dgVoodoo2 targets D3D11, which shares D3D9's Y-up convention, so no winding flip is needed and the geometry is correct.
- An earlier route (a D3D9 proxy that patched DXVK's device vtable with depth-state overrides) was tried and then dropped; see Gotchas.

## How the game works (what we had to learn)

- TDU2 calls `memset(NULL, 0, 1944)` during initialization.
- The caller does **not** use `memset`'s return value. It keeps the original NULL pointer in `EDI` and later reads `[edi+3]`. So redirecting the `memset` destination alone is not enough — the downstream read still faults.
- On modern Wine/Proton the read faults, which is the start-up crash. Why the code takes a NULL path here is **unproven**; it is not a DRM or activation check. What is observed is the fault site, not its cause.

## Build steps

Crash-fix proxy (32-bit):

```bash
make version.dll      # -> version.dll
# deploy into the game directory:
cp version.dll "$WINEPREFIX/drive_c/Program Files/Atari/TDU2/version.dll"
```

Wine must prefer the local proxy over its builtin `version.dll`:

```
WINEDLLOVERRIDES="version=native,builtin"
```

Rendering (dgVoodoo2, D3D9→D3D11):

1. Put dgVoodoo2's `D3D9.dll` in the game directory (rename/replace the game's D3D9 entry point as appropriate for the setup).
2. Configure dgVoodoo2 to output D3D11 and enable `SmoothedDepthSampling=true` (linear filtering of the shadow depth maps).
3. Optional/experimental depth-state wrapper: `make d3d9_64` then `make deploy` — wraps a renamed dgVoodoo2 (`D3D9_v2.dll`) with our `D3D9.dll` that forces `D3DRS_ZENABLE` on, maps `ZENABLE=0` to `ZFUNC=ALWAYS`, and sets `D3DRS_DEPTHBIAS=1` / `D3DRS_SLOPESCALEDEPTHBIAS=-4.0` / `ZWRITEENABLE=1`. This was an attempt at the shadow z-fighting root cause; the plain dgVoodoo2 config proved sufficient, so it is not required.

## Verification

- Per the project notes, dgVoodoo2's D3D11 output **proved sufficient**: building/tree/sign flicker is gone, car bodies are no longer inside-out, and `SmoothedDepthSampling` reduces shadow flicker.
- The proxy writes three logs to the game working directory that confirm each stage:
  - `tdu2_version_proxy.log` — `g_iat_patched`, real `memset` address, `g_heap_hook`.
  - `tdu2_memset_hook.log` — first intercepted NULL-dest `memset` (reported count `1944`).
  - `tdu2_veh.log` — each VEH hit: READ/WRITE, `EIP`, faulting address.
- **Honesty caveat:** the log files were not retained in the workspace snapshot and the game install directory was not present when these notes were drafted, so the VEH hit count/addresses and the exact final in-game state could not be independently re-confirmed. Status is `working` based on the project notes, not on a fresh run.

## Gotchas

1. **No CRT.** `_DllMainCRTStartup` is a manual stub; `DllMain` only calls `DisableThreadLibraryCalls` on `DLL_PROCESS_ATTACH`. Keep the proxy free of CRT dependencies.
2. **`memset` IAT patch:** walk the import descriptors of the main module, find the `MSVCR90.dll` import, match the `memset` name, save the original in `g_real_memset`, and swap the IAT slot under `VirtualProtect`.
3. **NULL-dest `memset`:** redirect writes to a 4 KB static scratch buffer so the caller continues; do not report the original NULL back.
4. **VEH must handle both access types.** For a write fault it just advances `EIP` past the instruction. For a read fault it must also zero the destination register for `MOV`/`LEA`/`MOVZX` (`0x8A/0x8B/0x8D/0xB6/0xB7/0xBE/0xBF`), because the caller reuses the original NULL in `EDI`. Return `EXCEPTION_CONTINUE_EXECUTION`; only handle faults at addresses below `0x10000`.
5. **Instruction-length decoder is hand-rolled.** It covers the common one-byte and `0x0F`-prefixed forms (prefixes, ModRM/SIB/disp, immediates); anything unrecognised falls through to length 1. A wrong length would desync execution, so this is the riskiest part of the fix.
6. **HeapAlloc hook:** 5-byte `JMP rel32` detour with a trampoline holding the original 5 bytes; failed allocations fall back to a 128-slot scratch pool (128 × 0x2000).
7. **Do not override `d3d9` when using dgVoodoo2's own `D3D9.dll`.** The dgVoodoo2 wrapper and the depth-state proxy are alternative arrangements; mixing overrides can load the wrong renderer.
8. The shadow z-fighting root cause (shadow-map depth precision / missing GPU sync) is only *masked* by `SmoothedDepthSampling`, not fixed.

## Assets

Unpublished local work (not part of this repository):

- `src/version_proxy.c` — proxy: IAT patch, `my_memset`, `null_ptr_handler` VEH, HeapAlloc detour, version.dll export forwarding.
- `src/version_proxy.def` — full `version.dll` export table.
- `Makefile` — `make version.dll`, `make d3d9_64`, `make deploy`.
- `dgVoodoo2/` — upstream fork, API/SDK headers only.
- `test-drive-unlimited-2.sh` — GE-Proton/umu-run launch wrapper.

## Cost and time

Not documented in the workspace. The work spans several iterations (D3D9 logging proxy → depth-state wrapper → plain dgVoodoo2 config; standalone crash paths → version.dll proxy).

## Open questions

- Exact retail build/store of the install (the launcher changelog targets TDU2 DLC2 v031 build 15).
- Root cause of the NULL pointer itself: failed allocation vs uninitialized variable is not proven.
- Whether `memset(NULL, 0, 1944)` is the only NULL-destination site.
- Whether the VEH instruction-length decoder covers every instruction that actually faults in the wild.
