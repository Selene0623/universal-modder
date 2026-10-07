/**
 * universal-modder — OpenCode plugin.
 *
 * Wraps the `um` CLI (bin/um) as namespaced tools (`um_scan`, `um_kb`, …) and registers the
 * fal MCP server, so installing the plugin is enough to work on a game. The CLI itself is never
 * modified: the agent always calls the same launcher a human would.
 */
import { spawn } from "node:child_process"
import { constants } from "node:fs"
import { accessSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { Plugin } from "@opencode/plugin"

/** plugins/opencode/index.ts -> repository root */
const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

const FAL_MCP = {
  type: "remote" as const,
  url: "https://mcp.fal.ai/mcp",
  headers: { Authorization: "Bearer {env:FAL_KEY}" },
  oauth: false,
  disabled: false,
}

/** One tool per CLI group. `args` is passed through, so `--help` works on every group. */
const GROUPS = [
  { name: "scan", blurb: "find installed games and report engine, anti-cheat, loaders, saves and modding routes" },
  { name: "fal", blurb: "generate art through fal: sprites, textures, PBR maps, 3D models, rigs, SFX, music, voice, video" },
  { name: "comfy", blurb: "generate images on a local ComfyUI server, no API key (status / image / run)" },
  { name: "sprite", blurb: "turn generated art into engine-ready sprites: trim, pixelate, palette, sheets and strips" },
  { name: "render3d", blurb: "render a 3D model to isometric, side-view or top-down sprite frames with Blender" },
  { name: "video", blurb: "build contact sheets and EDL-driven showcase video edits with ffmpeg" },
  { name: "win", blurb: "launch, screenshot, send input to and record a game window on Windows (also from WSL)" },
  { name: "backup", blurb: "snapshot and restore a game's save files before a modded launch" },
  { name: "publish", blurb: "pre-release lint for a mod: no game files, no decompiled code, no leaked keys" },
  { name: "kb", blurb: "search, scaffold, check and index the field-note knowledge base (search / new / check / index)" },
]

function resolveUm(root: string, override?: string): string {
  if (override) return override
  const local = join(root, "bin", "um")
  try {
    accessSync(local, constants.X_OK)
    return local
  } catch {
    return "um" // installed with `uv tool install` and already on PATH
  }
}

function run(
  command: string,
  args: string[],
  cwd: string,
  signal: AbortSignal,
): Promise<{ code: number; out: string; err: string }> {
  return new Promise((done) => {
    const child = spawn(command, args, { cwd, signal, env: process.env })
    let out = ""
    let err = ""
    child.stdout?.on("data", (chunk) => (out += chunk))
    child.stderr?.on("data", (chunk) => (err += chunk))
    child.on("error", (error) => done({ code: -1, out, err: `${err}${String(error)}` }))
    child.on("close", (code) => done({ code: code ?? -1, out, err }))
  })
}

export default Plugin.define({
  id: "universal-modder",
  async setup(ctx) {
    const root = typeof ctx.options.root === "string" ? ctx.options.root : PLUGIN_ROOT
    const um = resolveUm(root, typeof ctx.options.command === "string" ? ctx.options.command : undefined)

    // Self-contained install: give the session fal's asset server unless the user configured their own.
    await ctx.mcp.transform((editor) => {
      if (!editor.get("fal")) editor.set("fal", FAL_MCP)
    })

    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "um",
        description: `universal-modder toolkit (${um}). ` +
          "Recon a game, generate assets, build sprites, verify in-game, and publish — and read the shared " +
          "knowledge base of how other games were modded before starting.",
      })

      for (const group of GROUPS) {
        editor.add({
          name: group.name,
          description: `universal-modder: ${group.blurb}. Runs \`um ${group.name} <args>\`.`,
          input: {
            type: "object",
            properties: {
              args: {
                type: "array",
                items: { type: "string" },
                description: `Arguments for \`um ${group.name}\`. Pass ["--help"] to see them all.`,
              },
              cwd: { type: "string", description: "Working directory. Defaults to the current directory." },
            },
            required: [],
            additionalProperties: false,
          },
          options: { namespace: "um", codemode: true },
          execute: async (input, context) => {
            const parsed = (input ?? {}) as { args?: string[]; cwd?: string }
            const cwd = parsed.cwd ?? process.cwd()
            const result = await run(um, [group.name, ...(parsed.args ?? [])], cwd, context.signal)
            const body = [result.out.trimEnd(), result.err.trimEnd()].filter(Boolean).join("\n")
            return {
              content: `um ${group.name} ${(parsed.args ?? []).join(" ")}` +
                `${result.code === 0 ? "" : ` (exit ${result.code})`}\n\n${body || "(no output)"}`,
            }
          },
        })
      }
    })
  },
})
