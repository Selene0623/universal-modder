---
kind: technique
title: 'Disrupt engine cross-game toolchain: picking tools for WD1, WD2 and Legion'
status: working
agents:
- OpenCode (MiMo-V2.6-Flash)
- OpenCode (DeepSeek V4.1 Flash)
humans:
- '@Selene0623'
date: '2026-10-05'
links:
- https://open-source-modding.github.io
- https://github.com/Open-Source-Modding/open-source-modding.github.io
tags: [disrupt, dunia, watch-dogs, far-cry, archives, reverse-engineering, toolchain, ubisoft]
---
# Disrupt engine cross-game toolchain: picking tools for WD1, WD2 and Legion

> Which tool to reach for when modding a Disrupt title (WD1 / WD2 / Legion), and the gotchas that
> silently corrupt your data. Disrupt is a Dunia 2 (Far Cry 3) fork, so tool conventions and the
> compiled-XML object serialization run through Far Cry 3–6 too — but the container and the details
> fork per game (WD1/WD2 pack `Depload`, WDL packs `BigFile`; Dunia uses `FAT2`/BigFile v11), so never
> assume a tool or an offset carries across. Distilled from the Open-Source-Modding Disrupt/Far Cry
> reference docs; no unpack→repack cycle was run by this agent for this note, and the per-claim source
> is marked in the text.

## When to use it
Any session on a Disrupt game: unpacking/repacking `.dat`/`.fat` archives, converting binary objects,
porting XBG meshes or XBT textures across titles, or deciding where a mod file should live so it loads.

## How
- **Unpack:** `UnpackLegion.exe` for WDL; `UnpackWD2.exe` for WD2; Gibbed.Disrupt for WD1 (archives
  under 4GB only).
- **Pack:** DisruptManager (rootCBR) for WDL — packs only into `patch*` archives, it skips
  `installpackage/`.
- **Binary objects:** `Gibbed.Disrupt.ConvertBinaryObject.exe` — use the **WD2 build**, it is the one
  that handles WDL's binary objects.
- **Where files load from — per game, not shared:** the priority list is hardcoded per title
  (decompiled from `DisruptManager.Model.GameInfos.*`): WD1 = `patch1` > `patch` > `common` >
  `worlds\windy_city\windy_city`; WD2 = `patch2` > `patch1` > `patch` > `common` >
  `worlds\san_francisco\san_francisco`; WDL = `patch` (+ `patch0`, `patch1`) > `common` >
  `worlds\london\london`. `installpackage` exists in all three but is unused by default; the DLL hex
  edit gives it top priority so a loose `installpackage/` folder wins permanently. The two byte
  patterns are identical across WD1 `Disrupt_b64.dll`, WD2 `Disrupt_64.dll` and WDL
  `DuniaDemo_clang_64_dx11/_dx12.dll` and unchanged since 2021 — but the resulting order is per game.
- **Hash namespaces differ per title:** WDL/WD2 key off a 64-bit hash; the one tools call `CRC64_WD2`
  is *not* a CRC — it is FNV-1 64 (same prime/offset as FNV64) with `/`→`\` normalization, lowercase,
  a low-61-bit fold (`& 0x1FFFFFFFFFFFFFFF`) and a namespace tag (`| 0xA000000000000000`); a plain
  FNV64 row exists too, and a case-preserving variant skips the lowercase. WD1's "FNV32" is just the
  **low 32 bits of that 64-bit value**, not a standalone FNV-1a 32, so IDs never carry across games.
  `CBR.Disrupt.dll` gets all three of these wrong (it ships a polynomial CRC64 and an unnormalized
  FNV1a64) — use `hash_tool.py` output, not the CBR classes.
- **Multiplayer with mods (community-reported):** it works, but the mod set has to match. The WD modding
  multiplayer server is a NexusTools variant, not the vanilla game — players must run the *exact same* mods,
  or all enable the mixed-mod option, otherwise each is locked to their own mod hash, and NexusTools
  otherwise keeps multiplayer off. Some mods carry their own rule on top of that: WD2 Extended requires both
  players to have it, and a mismatch has been seen to drop one player out of the session (crash or
  disconnect — the mechanism is not established). Reported by @Selene0623 (2026-10-03, extended 2026-10-05),
  not from the reference docs, so re-verify before relying on it. What the docs do confirm: NexusTools is a
  WD1 mod-delivery layer (ASI loader plus a `workspace/` overlay), and delivering a whole archive as one pack
  shadows every file beneath it. Weight this accordingly: WD2's public/competitive multiplayer is largely
  dead at the time of writing, so the mod-set rules matter for arranged sessions on that community server,
  not for matchmaking.
- **Anti-cheat status:** WD1 ships none. WD2 ships EasyAntiCheat: while EAC's service was live, modded files
  tripped it and EAC-gated online play was closed to mods; the documented community launch parameter
  `-eac_launcher` skips the check only by giving up multiplayer, so that route is single-player-only. WD2's
  EAC service lapsed earlier in 2026 (reported by @Selene0623, 2026-10-05), so the check no longer runs and
  modded multiplayer is gated by mod-set compatibility rather than by anti-cheat. WDL shipped BattlEye, whose
  modified-file check trips on a patched DLL (documented bypass: `-BattlEyeLauncher`); BattlEye was removed in
  the final WDL update, so the check no longer applies there. Online behaviour is nowhere in the reference
  docs — it is community-reported only — and bypassing an anti-cheat client stays out of scope for anything
  published here.

## Gotchas
1. **Symptom:** unpacked WDL files are garbage. **Cause:** UnpackWD2 or Gibbed.Disrupt was used on
   WDL archives — both break there. **Fix:** UnpackLegion for WDL.
2. **Symptom:** repacked archive is wrong/ignored. **Cause:** PackLegion and ManageLegion are
   outdated. **Fix:** DisruptManager (or the loose `installpackage/` route) instead.
3. **Symptom:** unpacker dies mid-archive. **Cause:** Gibbed.Disrupt breaks above 4GB. **Fix:** skip
   it for big archives; WDL patch archives can exceed the limit.
4. **Symptom:** WDL binary object won't convert. **Cause:** wrong converter build. **Fix:** the WD2
   `Gibbed.Disrupt.ConvertBinaryObject.exe`.
5. **Symptom:** FCBastard crashes mid-run on WD2/WDL entity data. **Cause:** a Vector3 buffer overflow
   on `colorColor` in the stock build; the upstream release is effectively WD1-only (its WD1 build also
   breaks on a WLU FCB repack, losing road data). **Fix:** for WDL use the overflow-fixed Legion build —
   `FCBastard_Legion_Dist/FCBastard.exe`, "Encrypted's Update", run under wine with `z:\` absolute
   paths; it round-trips `entitylibrary` FCB ↔ XML byte-faithfully. For WD1 keep the WD1 build and check
   the round trip.
6. **Symptom:** a cross-game ID silently misses (mesh lookup, entity UID, playlist entry). **Cause:** the
   hash namespace differs — WD1's hash is the low 32 bits of the same 64-bit computation WD2/WDL mask
   and tag. **Fix:** recompute in the target game's namespace with `hash_tool.py --crc64wd2`, never with
   the `CBR.Disrupt.dll` classes.
7. **Symptom:** ported XBG/XBT is rejected. **Cause:** format forks per game (XBG chunk chain and
   vertex-stride encoding differ FC5 vs FC6 — FC5 states a 40-byte stride, FC6 infers it from vertex
   size; WDL geometry is MOEG with its own version pair; XBT version u16 at +0x04 is platform-specific,
   `0x0092` = PC). **Fix:** convert through the target game's importer rather than byte-copying. The
   Blender addon's XBG import is the practical route for static props (WD2 headers 0x89/0x46, WDL
   0x95/0x46); character-model import is the weak spot — the addon's own known-issues list records WD2
   character files crashing while another tool note claims support landed 2026-09-05, so test it on the
   actual file before promising anything.

## Seen in
- No `knowledge/games/` note exists for WD1, WD2 or Legion yet. A Watch Dogs: Legion game note referenced by
  the first revision of this file is no longer in the tree (it was never committed), so its link is gone.
- Source material: the Disrupt/Far Cry pages on the Open-Source-Modding site (links above), specifically
  `disrupt/tool-gotchas`, `disrupt/installpackage-patch`, `disrupt/watch_dogs/archive-priorities`,
  `disrupt/watch_dogs/hashing`, `disrupt/watch_dogs/fat-archive-format`,
  `disrupt/watch_dogs_legion/modding-workflow`, `disrupt/watch_dogs_legion/vehicle-add-process` and
  `disrupt/blender-addon`.

---

**Corrections (2026-10-05, @Selene0623 with OpenCode/DeepSeek V4.1 Flash):** the first revision generalised
WDL's archive order to all three games, described `CRC64_WD2` as a CRC, stated the FCBastard limit as a total
WD1-only tool, and reported Blender character-model import as working. All four were checked against the docs
pages above and rewritten: priorities are per game, `CRC64_WD2` is FNV-1 64 with a fold and a tag, the
overflow-fixed Legion FCBastard build round-trips WDL entity libraries, and the addon's own known-issues list
still records WD2 character files crashing.

**Clarified after review (2026-10-05, same session):** the anti-cheat and multiplayer bullets were rewritten
once @Selene0623 filled in the online side. Mods do reach multiplayer, through a community NexusTools server;
`-eac_launcher` costs multiplayer rather than being a free bypass; per-mod compatibility rules exist on top of
the same-mod requirement (WD2 Extended needs both players to have it, mismatch drops someone out of the
session); and WD2's EAC service lapsed earlier in 2026, so nothing anti-cheat-related gates mods there any
more. The earlier "mods and multiplayer do not work together" line was the pre-lapse state, not the current
one.

**Credits:** distilled from [Open-Source-Modding](https://open-source-modding.github.io) Disrupt and
Far Cry reference docs, assembled by @Selene0623 from XeNTaX archive threads and the WD/Disrupt/Dunia
Discord communities, with in-doc confirmations credited to Pesky Fly (HeySlickThatsMe, aka slick),
qstlijku, and rootCBR (jason098/Cobra — same person). NexusTools multiplayer behaviour reported by
@Selene0623 (2026-10-03) and marked unverified above.
