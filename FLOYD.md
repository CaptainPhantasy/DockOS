# StreamDock — Project Config

## Version Protocol

**Source of truth:** `package.json` `version` field (semver).

### To bump the version

1. Update `version` in `package.json`
2. Sync `CFBundleShortVersionString` and `CFBundleVersion` in `StreamDockApp/Info.plist`
3. Run `bash deploy.sh` — builds, copies to `/Applications/StreamDock.app`, restarts
4. Commit and push to `main`

Vite injects `__APP_VERSION__` at build time via `vite.config.ts`. The footer reads it from `src/constants/version.ts`.

### Version history

| Version | Date | Summary |
|---------|------|---------|
| 1.2.0 | 2026-05-08 | Logo search tool (Clearbit), async tool execution, URL image rendering |
| 1.1.0 | 2026-05-08 | Version tag system, remove debug banner |
| 1.0.0 | 2026-05-07 | Native command bridge, CSS variable theme system, max_completion_tokens |

## Architecture

- **Runtime:** Swift WKWebView wrapper (`StreamDockApp/StreamDockApp.swift`) loading a single-file React SPA
- **Build:** `npm run build` → Vite → `dist/index.html` (~1MB single file)
- **Deploy:** `deploy.sh` compiles Swift, builds Vite, copies HTML to app bundle, restarts
- **State:** Zustand store (`src/store/useStore.ts`) — persists to localStorage
- **LLM:** Multi-provider (OpenAI, Anthropic, OpenCode GO) via `src/services/llm.ts`
- **Tools:** Built-in tools in `src/services/tools.ts`, custom MCP tools in `src/services/customTools.ts`
- **Commands:** Native bridge via `window.webkit.messageHandlers.streamDock` → Swift `CommandExecutor`

## Key Constraints

- WKWebView `drawsBackground = false` — web UI provides its own background
- Menu bar only (`LSUIElement: true`) — no Dock icon
- CSS variables for theming — `:root` for dark defaults, `.theme-light` overrides only
- No Chinese/CJK text in source files — English only

## Repository

- GitHub: `CaptainPhantasy/DockOS`
- Default branch: `main`
