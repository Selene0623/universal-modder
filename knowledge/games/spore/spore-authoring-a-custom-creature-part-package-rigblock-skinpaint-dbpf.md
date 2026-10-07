---
kind: game
title: 'Spore: authoring a custom creature part package (rigblock, skinpaint, DBPF)'
game: Spore
game_version: '1.2.0.2688 + Galactic Adventures 3.0.0.2688 (author test on a DRM-free copy; official builds 3.1.0.22 / 3.1.0.29 not yet re-tested)'
platform: windows
engine: native
route: data
tools:
- SporeModder-Blender-Addons v2.7.2 (Blender 2.8-4.5)
- SporeModder FX 2.2.x (smfx.exe CLI, needs JAVA_HOME + JDK 11+)
anti_cheat: 'none; offline single-player, data package only, executables and DRM untouched'
status: in-progress
agents:
- 'OpenCode (space-bunny-free)'
- 'OpenCode (DeepSeek V4.1 Flash)'
humans:
- CaptainSandvich
date: '2026-10-07'
links:
- https://github.com/rehan-remade/universal-modder/pull/118
- https://github.com/Spore-Community/SporeModder-FX/wiki/Creating-Custom-Part-Rigblocks
- https://github.com/Spore-Community/SporeModder-FX/wiki/Saving-with-custom-parts:-editor-keys
- https://github.com/Spore-Community/SporeModder-Blender-Addons
- https://launcherkit.sporecommunity.com/support/game-versions
- https://modapi-docs.sporecommunity.com/
tags:
- dbpf
- refpack
- prop
- skinpaint
- blender
- textures
---

# Spore: authoring a custom creature part package (rigblock, skinpaint, DBPF)

> Authoring an original creature part (a brass wind-up key) for Spore's Creature
> Creator and shipping it as a hand-authored DBPF `.package` — route `data`, no
> ModAPI DLL, no EXE patching. The part appears in the Details palette, places,
> scales and paints correctly in **Build and Paint mode**.
>
> This note is a rework of the findings first written up by **CaptainSandvich** in
> [PR #118](https://github.com/rehan-remade/universal-modder/pull/118) (agent
> `space-bunny-free`), which is where every game-side observation below comes from.
> It adds the public documentation that corroborates or corrects each claim, a map
> of which tools actually handle DBPF, and the exact official-build detection rule
> the ModAPI Launcher Kit uses. Where a claim has no public source it is marked
> *author-observed*.

## Setup

- Spore 1.2.0.2688 (`Sporebin`) + Galactic Adventures 3.0.0.2688 (`SporebinEP1`).
  Game data lives in `C:\Program Files (x86)\Electronic Arts\SPORE\Data` (GA
  content under `SPORE_EP1\Data`).
- Blender 2.8-4.5 with **SporeModder-Blender-Addons v2.7.2** (emd4600, Valla-Chan).
  Stay on a version the release notes call tested; 5.x is version-gated.
  `download.blender.org` is Cloudflare-gated — use a mirror.
- **SporeModder FX v2.2.x** for `smfx.exe` (`pack`, `unpack`, `name-to-id`). It
  needs `JAVA_HOME` and JDK 11+; the JRE 8 floating around is too old. The MSI
  needs admin — use the portable JDK zip.
- Back up the game folder before anything writes to it (`um backup create`).

## Route and why

Route `data`: author the resources yourself and ship one `.package` dropped into
the game's `Data` folder. No new behaviour is needed, so a ModAPI DLL mod buys
nothing here. `.sporemod` + the Launcher Kit stays the nicer distribution route
even when you develop by dropping the package in directly.

## Tooling map: which program handles what

There is **no Blender addon that reads or writes DBPF `.package` files**, and that
split is deliberate. Verified against the addon's `__init__.py`: the operators are
`ImportGMDL`, `ImportRW4`, `ExportRW4`, `ExportAnim`/`ImportAnim`, `ImportMuscle`,
`ExportMuscle`, `ImportCityWall`, `ExportCityWall` — formats `.gmdl`, `.rw4`,
`.anim_t`, `.prop.prop_t` only. Its own wiki tells you to "pack the mod with
SporeModderFX".

| Job | Tool |
| --- | --- |
| Models, animations, property lists | SporeModder-Blender-Addons (Blender) |
| Pack/unpack `.package`, name→ID | **SporeModder FX** (`smfx.exe`, Java) |
| Unpack-only CLI | `vitor251093/dbpf_unpacker` (SporeModder fork) |
| GUI file manager, Spore + Sims 3/4 | `owlks4/DBPF-package-manager` (.NET/WPF) |
| DBPF library in code | `Gibbed.Spore` (.NET), DBPF.js (spec + implementations) |

So the loop is: Blender exports `.rw4`/`.prop.prop_t` into a SporeModder FX project
folder, then `smfx pack` produces the `.package`. Wanting DBPF inside Blender means
porting it yourself — the format is public (below).

## How the game works (what we had to learn)

**DBPF chunks are compressed with EA's own RefPack, not zlib.** A chunk flagged
`0xFFFF` in the index is not deflate: it is RefPack/QFS, with a 5-byte header
(`0x10 0xFB` or `0x50 0xFB`, then a 3-byte **big-endian** decompressed size; the
v1-era 9-byte form is not used by Spore). Porting `decompressFast` from the FX
source (`RefPackCompression.java`) is the unlock — until you can decompress, you
cannot read any real part, texture or package signature. Public write-ups:
`lingeringwillx/RefPack-QFS-Resources` (FORMATS.md) and the SporeModder-FX source.
The 3-byte size caps a single resource at 16 MB *(author-observed for Spore:
`smfx encode` cannot compile `.blockdata.blockdata_t` — feed it `.prop.prop_t`
text sources; compiled `.blockdata` and compiled `.prop` share a binary header
and differ only in type ID)*.

**Resource keys are 32-bit FNV hashes of names**, written `groupID!instanceID.typeID`
(e.g. `CreatureGameVerbIcons\atk_bite.png`). SporeModder FX hashes names for you;
`Spore-Community/SporeHash-VSCode` converts both ways and documents type IDs
(e.g. `crt` = `0x2B978C46`).

**A creature part is five files, all keyed by `FNV(partName)`:**
1. rigblock stub — `creature_rigblock~`, type `0x5CAA5E28`, **48 bytes binary**
   (not a prop; a big prop here is garbage — copy a vanilla part's stub verbatim)
2. **part-definition prop** — `creature_rigblock~`, type `0x00B1B104`; parent
   `CreatureEditorTemplates!CreatureDetailTemplate`, `blockName`, capabilities,
   bbox, `modelMeshLOD0`, price, scale, optional `skinpaint*` texture refs
3. editor model RW4 — `editor_rigblock~` (`0x40606000`), type `0x2F4E681B`
4. LOD1 model RW4 — `part_models_lod1~` (`0x40606100`) — the one used when the
   creature is saved and in game
5. palette icon PNG — `CreaturePartIcons~` (`0x02231C8B`), type `0x2F7D0004`,
   128x128 RGBA
   plus optional `skinPaint_texture~` (`0x406A2100`) diffuse / specBump / tintMask

The public wiki agrees on the shape of this list: rigblock `.prop.prop_t` in
`creature_rigblock~`, the **same RW4 placed in both `editor_rigblock~` and
`part_models_lod1~`**, and the three skinpaint textures in `skinPaint_texture~`.
You register a part by adding it to an items file: the palette's
`creature_editor_palette_items~/ce_page_detail_parts.prop` holds item arrays
(10 items with columns/rows arrays); categories live in
`creature_editor_palette_categories~`, pages in `creature_editor_palette_pages~`.

**Package priority comes from a package signature entry.** Group `0x40404000`,
type `0x00B1B104`, instance = hash of the signature filename, content = a prop
carrying `packageBlessCheck`, `packageID`, `packagePriority` and a 32-hash
`packageSignature` content checksum. Observed priorities: Spore_Game = 0,
PatchData = 2, GA = 100 *(*author-observed* — no public source documents
`packageBlessCheck` or the `0x40404000` signature group; searches only turn up
unrelated package load-order material)*. The FX GUI's "Embedded package
signature" writes this on pack; **the `smfx` CLI hardcodes
`PackageSignature.NONE`**, so it is GUI-only or by hand.

**Skinpaint is a three-map system, sampled from the creature's baked paint atlas.**
Publicly documented channel semantics (SporeModder-FX wiki, "Creating Custom Part
Rigblocks"), which matter if you author the maps yourself:
- Diffuse: RGB is the raw colour; **alpha says where the model's own texture shows
  through vs. the creature's skin paint** (white → texture, black → skin paint)
- SpecBump: R = specular, G = spec mask, B = bump/height, A = bump mask
- TintMask: R = base, G = coat, B = detail, A = identity (tribe/civ recolour)

Parts are typically 128x128 and all bake into one 512x512 atlas when the creature
is saved, so oversized maps make the other parts blurry.

## Build steps

1. Model the part in Blender, `SkinPaint Part` material, **UVs inset so they never
   touch the texture bounds** (see Gotchas — this is the whole ballgame).
2. Embed the diffuse as a **DXT5 DDS with a full mip chain** (see Gotchas).
3. Export LOD0 and LOD1: `bpy.ops.export_my_format.rw4(filepath=..., export_as_lod1=False/True)`.
   **GUI-mode Blender only** — the RW4 exporter crashes in background mode (access
   violation, even for a cube). The addon also has `export_symmetric` for the
   `-symmetric` variant.
4. Author the part-definition prop (copy the shape of a vanilla
   `CreatureDetailTemplate` rigblock), the palette items/categories override, the
   **EditorKeys** entry, and the icon.
5. `smfx pack <abs path to mod folder> <abs path to out.package>` — **pass absolute
   paths; smfx resolves relative paths against its own exe folder, not the cwd.**
6. Inject the FX `ExpansionPack1.prop` signature (group `0x40404000`, type
   `0x00B1B104`, instance `FNV("ExpansionPack1")`, raw/uncompressed) so the package
   loads with priority 101 and `packageBlessCheck false`.
7. Drop the package in the game's `Data` folder. Launch, go to Creature Creator.

**New parts are not saved unless an EditorKeys manifest lists them.** The public
wiki page "Saving with custom parts: editor keys" is the reference: a
`palette_config~!TemplateManifest.prop` carrying `keys validEditorKeys` with each
part's resource key, placed in the matching `<editor>_EditorKeys~` folder —
`ce_EditorKeys~` for creature parts, and additionally the outfitter editors
(`sa_`, `ta_`, `ca_`, `cap_`) via `validAdditionalManifestGroupIDs` if the part
should survive there. Without it, creations using the part silently fail to save
(unless the `Force Save` mod is installed).

## Verification

Oracle: the real game. The author loaded the creature in the Creature Creator and
confirmed the part appears in the Details palette, places, scales and renders
correctly in **both** Build and Paint mode with proper shading and specular
(editor screenshots in PR #118).

Isolation testing was the key technique — deploy one deliberately-swapped resource
at a time and look at the game:
- swapping in the **vanilla bump part's model bytes** under our part name rendered
  and painted correctly ⇒ everything except the model file was already right
- swapping in vanilla bump's **skinpaint maps** under our part name still painted
  black ⇒ not a texture-content problem
- a section-level dump of both RW4s (via the addon's own parser) showed the vertex
  description (6 elements / 36-byte vertex) and the raster (64x64 DXT5) were
  byte-identical, which narrowed it to UV layout

**Not verified:** behaviour in the actual game stage; Sporepedia/multiplayer
sharing; symmetric/mirrored variants; morph-handle (nudge) deformation. And the
author's run was on a **DRM-free copy**, which is why the companion PR was
blocked — the honest status for this note is `in-progress` until someone repeats
it on an official 3.1.0.22 or 3.1.0.29 build.

## Gotchas

1. **Part renders fine in Build mode but black with skin tint in Paint mode.**
   **Cause:** UVs touching or exceeding the texture bounds. `smart_uv_project`
   packs islands flush to `[0,1]`; Build mode samples your own embedded texture so
   that is harmless, but Paint mode samples the creature's *baked* skinpaint atlas
   where edge-touching UVs bleed into neighbouring regions. **Fix:** inset every UV
   into the interior, e.g. `u' = 0.03 + u * 0.94`. This one change fixed Paint
   mode. The official addon wiki states the rule: *"for custom part models, the
   texture UVs must be within the texture bounds and not touching or extending
   past them."* Corollary, also from the wiki: **the material's Diffuse Texture
   only affects Build mode**; Paint mode and saving use the `skinpaint*` refs in
   the prop.
2. **Everything renders black after "fixing" the texture format.** **Cause:** the
   DDS has no mip chain, or malformed DXT5 blocks. **Fix:** vanilla part models
   embed DXT5 64x64 **with all 7 mip levels** (64,32,16,8,4,2,1 = 343 blocks =
   5488 B payload, 5616 B file, pitch 256). A DXT5 built only for mip 0, or built
   with 18-byte blocks instead of 16 (the 48-bit alpha index field is 6 bytes, not
   an 8-byte quad), is rejected. An uncompressed RGBA embed also renders black —
   use DXT.
3. **The package is silently ignored — the part never appears.** **Cause:**
   `packageBlessCheck true`. Copying a signature out of the game's own
   `Spore_EP1_Data` carries a content checksum; your content fails it and the game
   **discards the whole package with no error** (it still opens the file — a
   timestamp test proves it — but nothing changes). **Fix:** inject the FX's own
   bundled `ExpansionPack1.prop` resource, which has `packageBlessCheck false` and
   priority 101. Mirroring the GUI's `writePackageSignature` exactly does the job.
4. **The ModAPI Launcher Kit rejects your game.** **Cause:** it version-detects
   from the **`SporeApp.exe` file version** (`FileVersionInfo.GetVersionInfo(...).FileVersion`),
   and only three builds are supported: **3.0.0.2818** (July 2009, disc + patch
   5.1 installed by hand), **3.1.0.22** (March 2017 — EA App/Steam/GOG) and
   **3.1.0.29** (October 2024 — EA App/Steam/GOG). Anything else reports
   "Unknown" and the launcher refuses. Its `GameVersionTypeString` also names
   "Disc + Patch 5.1, July 2009", "Origin, March 2017", "GOG/Steam, March 2017",
   "GOG/Steam, October 2024", and appends ", LAA" when the 4 GB patch has been
   applied to `SporeApp.exe` in `SporebinEP1`. **Fix:** develop by dropping the
   `.package` straight into the `Data` folder, and re-verify on one of the three
   supported builds. *The original note blamed file size (~24.89-25.07 MB for
   disc); the published detection rule is the version resource, so treat the size
   figure as author-observed.*
5. **The part is invisible in the editor even though the package loads.**
   **Cause:** one of the five files is missing or wrong — overwhelmingly the
   part-definition prop (easy to skip) or shipping the rigblock as a prop instead
   of the 48-byte binary stub. **Fix:** diff your file set against a vanilla part
   (wing/bump/playful all decode cleanly once you have the RefPack decoder).
6. **`smfx pack` writes a tiny/corrupt package with no error.** **Cause:** a UTF-8
   BOM on a `.prop.prop_t` source breaks the parser, or you passed relative paths.
   **Fix:** write prop sources as UTF-8 **without** BOM from Python, and always
   pass absolute paths. Sanity-check output size every pack — a good package here
   is ~700 KB; 14 KB means it broke.
7. **Blender hangs / never exits after a script.** **Cause:** the exporter's
   validation dialog opens on a modal error, and `--factory-startup` disables the
   addon so `bpy.ops.export_my_format.rw4` doesn't exist (script errors out and the
   GUI just sits there). **Fix:** end scripts with `bpy.ops.wm.quit_blender()`,
   never pass `--factory-startup` for addon work, and deselect stray objects
   before exporting.
8. **RW4 export crashes in background mode.** **Cause:** the exporter needs a GUI
   context — it access-violates even on a default cube. **Fix:** run Blender in GUI
   mode with `--python`, and quit at the end of the script.
9. **The addon's exporter silently drops your armature.** **Cause:** it only
   exports an armature whose object has `animation_data` (it builds
   `valid_armatures` from non-empty `obj.animation_data`). **Fix:** call
   `armature_obj.animation_data_create()` after creating it, then verify the RW4
   grew in size — that is the tell that the skeleton made it in.

## Assets

Key mesh is fully procedural and reproducible: `build_key.py` generates the gear
collar + 12 teeth, dome, 2-stage shaft, ring, boss, T-bar, caps and studs as a
single joined mesh, saved as `key.blend` + `key_preview.png`. The brass look is a
Principled BSDF for the viewport plus a hand-built DXT5 DDS for the game.
Skinpaint streams were generated by splicing uniform pixel data into vanilla part
textures, keeping their valid headers *(author-observed technique)*.

## Cost and time

One long session. The expensive part was not any single step but the *diagnosis*:
about six deploy-and-look cycles, each isolating one variable. The two facts that
ended it were both public and both stated plainly in the addon wiki — reading the
official docs earlier would have saved most of the iteration.

## Open questions

- Part animations: vanilla parts ship 4 Skeleton objects (one with 8 bones), 2
  `KeyframeAnim`s and 2 `MorphHandle`s. A single root bone and no animations works
  fine in the editor, so those are needed for animated/nudge-deformable parts, not
  static ones. Untested whether the part animates or deforms correctly in the game
  stage.
- Symmetric/mirrored variants (`modelLeftFile`/`modelRightFile`/`modelCenterFile`
  pointing at `-symmetric`/`-center` rigblocks) are not implemented — the addon
  does expose an `export_symmetric` option.
- Whether `smfx pack` can be taught to sign packages instead of injecting the
  signature afterwards would remove a whole manual step.
- `packageBlessCheck` and the `0x40404000` signature group have no public
  documentation; a disassembly pass over Spore's package loader would settle both.
