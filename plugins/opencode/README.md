# universal-modder — OpenCode plugin

Exposes the `um` CLI as an OpenCode tool and registers the fal MCP server, so installing the plugin is
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

- **One tool, `um_run`.** `args` is the command line after `um`:
  `["scan"]`, `["scan", "--help"]`, `["kb", "search", "disrupt"]`, `["backup", "create"]`. An optional
  `cwd` sets the working directory. The tool names the groups in its description and answers a typo
  with the group list instead of spawning the CLI.
- The **fal MCP server** (`https://mcp.fal.ai/mcp`), unless the session already configures one. It needs
  `FAL_KEY` in the environment; a local ComfyUI server via `um comfy` needs no key.

One passthrough tool rather than one per group: `um --help` and `um <group> --help` already document the
groups, and each extra tool costs context in every session.

The tool shells out to the same `bin/um` launcher a human would use — the plugin never reimplements the
toolkit, so the CLI stays the single source of truth. Skills come from the repo's `skills/` directory
(`skills.paths` in `opencode.json`), not from this plugin.

`tests/test_opencode_plugin.py` asserts the group list above against `GROUPS` in `um/cli.py`.
