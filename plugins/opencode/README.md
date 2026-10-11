# universal-modder: OpenCode plugin

Exposes the `um` CLI as an OpenCode tool and registers the fal MCP server. It uses the OpenCode 2 plugin
API (`@opencode/plugin`), so it needs OpenCode 2; OpenCode 1.x doesn't load it.

## Install

Inside a clone there is nothing to install: the repo's `opencode.json` loads this directory
(`"plugins": ["./plugins/opencode"]`) and adds the skills. OpenCode 1.x skips that key from 1.18.16 on;
1.18.15 and older reject the whole file, so update OpenCode first.

Without a clone:

```sh
opencode plugin add 'github:rehan-remade/universal-modder#main::path:plugins/opencode'
uv tool install git+https://github.com/rehan-remade/universal-modder   # the `um` CLI the tool runs
```

The installed plugin brings the tool and the fal MCP server, not the skills; add those with
`npx skills add https://github.com/rehan-remade/universal-modder`. `opencode plugin update` picks up new
commits on `main`.

To use a checkout's `bin/um` instead of `um` on `PATH`, point the plugin at it in `opencode.json`:

```jsonc
{
  "plugins": [
    {
      "package": "github:rehan-remade/universal-modder#main::path:plugins/opencode",
      "options": { "root": "~/universal-modder" }
    }
  ]
}
```

`options.command` overrides the launcher itself (e.g. `"um"` for a `uv tool install`ed CLI). On Windows the
plugin always runs `um` from `PATH` (or `options.command`), because `bin/um` is a bash script.

## What it adds

- **One tool, `um_run`.** `args` is the command line after `um`:
  `["scan"]`, `["scan", "--help"]`, `["kb", "search", "disrupt"]`, `["backup", "create"]`. An optional
  `cwd` sets the working directory (default: the project directory). The tool names the groups in its
  description and answers a typo with the group list instead of spawning the CLI.
- The **fal MCP server** (`https://mcp.fal.ai/mcp`), when `FAL_KEY` is set in OpenCode's environment and no
  `fal` server is configured already. For images without a key, `um comfy` uses a local ComfyUI server.

One passthrough tool rather than one per group: `um --help` and `um <group> --help` already document the
groups, and each extra tool costs context in every session.

The tool shells out to the same `um` launcher a human would use. The plugin never reimplements the
toolkit, so the CLI stays the single source of truth. Skills come from the repo's `skills/` directory
(`skills.paths` in `opencode.json`), not from this plugin.

`tests/test_opencode_plugin.py` asserts the group list in `index.ts` against `GROUPS` in `um/cli.py`.
