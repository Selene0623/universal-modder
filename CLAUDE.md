@AGENTS.md

## Claude Code specifics
- Installed as a plugin, the skills are namespaced (`/universal-modder:mod-any-game`), the fal MCP server comes
  from `.mcp.json` (takes `FAL_KEY`; feed it from the keyring — `export FAL_KEY="$(secret-tool lookup service
  fal.ai key api)"`), and a SessionStart hook puts `um` on PATH. `um fal` reads the key from the OS keyring
  (`um fal key set`).
- In a clone, `.claude/settings.json` adds the same PATH hook, and `.claude/skills` is a copy of `skills/`.
