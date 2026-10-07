# universal-modder — OpenCode plugin

Exposes the `um` CLI as OpenCode tools and registers the fal MCP server, so installing the plugin is
enough to start modding — no clone, no PATH wiring.

## Install

```sh
opencode plugin add 'github:rehan-remade/universal-modder#main::path:plugins/opencode'
```

or, inside a clone, the repo's `opencode.json` already points at this directory (`"plugins": ["./plugins/opencode"]`).

If `um` is not on `PATH` and this package does not sit inside a checkout with `bin/um`, point the plugin at
the toolkit:

```jsonc
{
  "plugins": [
    {
      "package": "github:rehan-remade/universal-modder#main::path:plugins/opencode",
      "options": { "root": "~/Documents/Code/game-tools/universal-modder" }
    }
  ]
}
```

`options.command` overrides the launcher itself (e.g. `"um"` for a `uv tool install`ed CLI).

## What it adds

- One tool per CLI group, named `um_<group>`: `um_scan`, `um_fal`, `um_comfy`, `um_sprite`, `um_render3d`,
  `um_video`, `um_win`, `um_backup`, `um_publish`, `um_kb`. Each takes `args` (passed straight through, so
  `["--help"]` documents the group) and an optional `cwd`.
- The fal MCP server (`https://mcp.fal.ai/mcp`), unless the session already configures one. It needs
  `FAL_KEY` in the environment; a local ComfyUI server via `um_comfy` needs no key.

The tools shell out to the same `bin/um` launcher a human would use — the plugin never reimplements the
toolkit, so the CLI stays the single source of truth. Skills come from the repo's `skills/` directory
(`skills.paths` in `opencode.json`), not from this plugin.
