---
kind: technique
title: "Havok SDK-derived knowledge: what the licence forbids, what actually gets enforced, and how to write it up"
tags: [havok, hkx, licensing, leaks, provenance, takedowns, research-ethics]
date: 2026-10-06
agents: ["OpenCode (DeepSeek V4.1 Flash)"]
humans: ["Selene0623"]
links:
  - "https://www.havok.com/havok-for-unity-license-1-0/"
  - "https://courtlistener.com/docket/6256484/crytek-gmbh-v-cloud-imperium-games-corp/"
  - "https://storage.courtlistener.com/recap/gov.uscourts.cand.384429/gov.uscourts.cand.384429.1.0.pdf"
  - "https://storage.courtlistener.com/recap/gov.uscourts.rid.56980/gov.uscourts.rid.56980.11.0.pdf"
---

# Havok SDK-derived knowledge: what the licence forbids, what actually gets enforced, and how to write it up

> Havok is the one middleware where the written rules are stricter than anything ever enforced. The licence
> forbids disclosure and reverse engineering outright, yet public mirrors of legacy SDK trees have sat online
> for years without a visible takedown or suit. This note records what the licence says, what the enforcement
> record shows, and the line that keeps a write-up safe: keep the knowledge, never the artefact.

## When to use it

Whenever a format question bottoms out in "the SDK source would answer this" — HKX class layouts, packfile
version behaviour, collision serialization, the spline codec, keycode headers — and you are deciding what may
go into a note, a repo or a public page. Also when another agent tells you the source is mandatory, because
for reading shipped files it usually is not.

## What the licence says

- The IP is Microsoft's. Telekinesys Research Ltd (t/a Havok) went to Intel in 2007 and to Microsoft in 2015;
  the modern EULA is a Microsoft licence.
- Source code other than shipped headers and demonstration code is confidential, proprietary and a trade
  secret of Microsoft and its licensors.
- The licence forbids disclosure to third parties, sublicensing, modification, and reverse engineering,
  disassembly or decompilation "even for purposes of interoperability or error correction". A licensee is
  also obliged to report suspected violations.
- So on paper: republishing SDK code, files or keys is infringement, and there is no interoperability
  carve-out to lean on. The only live question is whether anyone acts on it.

## Who enforces what: the observed record

Checked 2026-10-06.

- **No published takedown names Havok.** GitHub's whole public DMCA notice corpus returns zero hits for
  Havok, Telekinesys or representative header names. The same searches hit for control terms (Nintendo,
  Unreal Engine, dozens of Microsoft notices), so the corpus is searchable and the null is real.
- **No litigation.** Public litigation databases list no case with Telekinesys or Havok as a party.
- **Mirrors survive.** Public trees of legacy SDK headers and source have been online since at least 2019 and
  still receive commits. One such project restricts itself to headers as self-imposed caution, not in
  response to a notice.
- **Microsoft's published DMCA activity is elsewhere.** Its notices target game piracy and derivative game
  clones (Xbox releases, a Minecraft rewrite), not physics middleware.
- **The one Havok source incident was a theft, not enforcement.** In October 2003 components of the physics
  engine may have gone out with the Half-Life 2 source heist; Havok said it was investigating. Nothing
  public followed.
- **Middleware vendors do sue, but over commercial licence breach.** Crytek v Cloud Imperium (C.D. Cal.
  2:17-cv-08937) was filed December 2017 over an engine licence agreement, settled February 2020 and
  dismissed with prejudice the following month. That is a licensee dispute, not a modder pattern.
- **When this scene does get hit, the notice lands on the artefact, not the knowledge.** Take-Two's February
  2021 notice removed the reverse-engineered GTA III and Vice City repositories "against the entire fork
  network", and the follow-up suit (`Take-Two v. Papenhoff`, N.D. Cal. 3:21-cv-6831) added a Digital
  Millennium Copyright Act section 512(f) claim over the counter-notices. Nintendo's Switch emulator case
  (`Nintendo v. Tropic Haze`, D.R.I. 1:24-cv-00082, final judgment 6 March 2024) turned on the same shape:
  2.4 million dollars, findings under the anti-trafficking provision, the domain surrendered, and an order to
  destroy the extracted keys and the key-dumping tools. Neither case was about describing a format; both were
  about distributing circumventing code, keys or tools. That is the line the write-up rules below already draw.
- **The live risk is platform and publisher policy.** Hosting rules and publisher letters are what actually
  stop projects: the August 2024 H2M case was a retail-copy mod shipping no leaked assets and it still drew a
  pre-launch C&D. Microsoft has been relaxed in the other direction, waiving the Havok fee for Source mods
  going commercial.

## How to write it up

Keep the knowledge, drop the artefact.

- Write the structure in your own words: field names, offsets, ordering, semantics, invariants, the
  version map. That is what is worth keeping, and it is not the file.
- Never paste SDK code, attach headers, link a mirror or a torrent, reproduce keys or keycodes, or write
  "fetch the SDK from X". Pointing at the material is the thing that draws the notice, not knowing it.
- Saying where a fact came from is fine and expected — "the class layout comes from the engine's own
  headers" — without naming a route to them.
- Redirect the agent instead of the reader. Not "get the 2014.1 SDK", but "read the packfile's own
  reflection instead of hard-coding a version" plus the parser set that needs no SDK at all.
- Ask the file first. A shipped packfile is usually self-describing: the reflection registry carries the
  class layouts and member order that a header would have given you, so the source stops being mandatory.
- Draft drift is the real failure mode. A note that begins as a layout table acquires a header fence, then a
  "reference" link. Audit the finished note and its history for links, keys and pasted code before it is
  pushed, because removal after publication is a much bigger job.
- When the source is genuinely the only route, write that down as an open question. Do not answer it by
  handing over a pointer.

## Gotchas

1. **"Mirrors are up, so it must be fine."** **Cause:** survivorship. They are up because nobody filed against
   them, not because nobody files. **Fix:** treat the licence text as the rule and the enforcement record as a
   risk estimate; keep the material out either way.
2. **The artefact creeps into a good write-up.** **Cause:** knowledge and material blur across drafts.
   **Fix:** before pushing, grep the note and its history for links, keys and long code blocks; the checker's
   secret and decompile patterns catch the easy ones.
3. **You name the source instead of describing it.** **Cause:** a name is a pointer. **Fix:** name the kind of
   source ("the engine's own headers") and stop there.
4. **"The keys are useless to modding, so they are harmless."** **Cause:** a key is the licence artefact, not
   the knowledge, and it is the exact thing that gets flagged. **Fix:** delete the value, keep only what it is
   and where it sits in the file.
5. **A working-tree scrub that leaves history and generated deploys.** **Cause:** old blobs remain in git
   history and build output branches. **Fix:** rewrite history and force-push, or accept that everything ever
   committed is published.
6. **The agent is blocked because it wants a header layout.** **Cause:** it is matching a version by name
   instead of reading the file. **Fix:** make the file answer the question — version string plus reflection
   registry — which removes the need for the source entirely.
7. **"Everyone does it" read as a permission.** **Cause:** a norm describes behaviour, not consent; the
   tolerated mirrors are tolerated because nobody has bothered to file, and vendor incentives (physics
   middleware earns from games shipping, enforcement costs more than it returns) explain the silence without
   implying anyone approved. **Fix:** use the norm to estimate risk, not to justify a publication, and check
   the artefact line instead: is what you are about to publish knowledge, or the SDK itself.

## What this does not prove

- Only one notice corpus could be searched exhaustively from the machine that did the check; another large
  one sits behind a bot wall. Private C&D letters are never published, so a null result is not proof that
  none were sent.
- The surviving mirrors are a biased sample. They are visible because they survived; anything that drew a
  notice is gone or renamed, and nothing in the record lets us count the ones we cannot see.
- "Normal practice in this scene" is a description of what modders do, not a legal position. The same record
  shows how cheap a takedown is: one notice removes a repository and its entire fork network before a
  counter-notice is even possible, which is a low ceiling on how much any norm protects.
- Litigation coverage is strongest for US federal dockets; Irish courts are not covered.
- Nothing here is legal advice, only a record of what happened in public.

## Seen in

- The KB's own leak rule discussion: knowledge from leaked SDKs and beta builds is now allowed in your own
  words, with the material itself kept out.
- Havok format work across Fallout 4, Skyrim SE, Watch Dogs: Legion, Starfield and Test Drive Unlimited 2,
  where the SDK was treated as a reading aid and never as a dependency.
