# glassmorphic-llm-command-dock — FLOYD.md
**Version:** 1.7.0
**Initialized:** 2026-05-07
**Governance:** .supercache/ v1.7.0
**Port:** No port binding — client-side SPA built to a single HTML file via vite-plugin-singlefile
**Drive:** SanDisk1Tb
**Path:** /Volumes/SanDisk1Tb/Dock/glassmorphic-llm-command-dock

> **Compliance Notice:** This file must match the template at
> `.supercache/templates/floyd-md-template.md`. If you are an agent reading
> this file and it is missing sections from the template, edit this file to
> add them. Preserve all project-specific content below. The template is the
> spec. This file is the implementation. Make them match.

---

## Agent Contract

You are working on **glassmorphic-llm-command-dock**, a Legacy AI project.

**This file (`FLOYD.md`) is the canonical project spec.** It is authoritative for project identity, stack, ports, build commands, environment variables, and project-specific rules. All agents — Floyd, Claude, or any model routed through the OhMyFloyd harness — read this file first.

**Some projects also have a `CLAUDE.md` adapter** alongside this file. That adapter is optional and applies only when Claude is the active agent. It does not duplicate anything here; it layers Claude-specific behavior and role guidance on top. If `CLAUDE.md` conflicts with `FLOYD.md` on project facts, `FLOYD.md` wins. See `.supercache/templates/claude-md-template.md` for the adapter spec.

### Before You Start
1. Read this file completely. Do not skim. Every section constrains your behavior.
2. **If you are Claude Code**: also read `CLAUDE.md` if it exists at the project root. It contains your role, division of labor with Floyd, and Claude-specific rules.
3. Read `.supercache/READONLY` — you MUST NOT write to `.supercache/`.
4. Read `SSOT/glassmorphic-llm-command-dock_SSOT.md` for current project state. Perform the Verification Sweep Protocol defined in `.supercache/contracts/document-management.md` for sections relevant to your task.
5. Read `Issues/glassmorphic-llm-command-dock_ISSUES.md` for open issues and blockers.
6. Read `.supercache/manifests/port-allocation-policy.yaml` — NEVER use port 3000, 5000, 8000, 8080, or any other forbidden port. This project does not bind a port (client-side SPA).
7. Read `.supercache/contracts/execution-contract.md` — this governs how you prove your work.
8. Read `.supercache/contracts/repo-structure.md` — canonical layout for this project's language, plus the migration workflow if structural changes are needed.
9. Read `.supercache/contracts/git-discipline.md` — pre-commit checklist, commit message standards, secret hygiene, and reputation guardrails.
10. Read `.supercache/contracts/document-management.md` — Anti-Cruft Rule, canonical document homes, SSOT verification sweep, reference materials tier.
11. Read `.supercache/contracts/repo-hygiene.md` — `.gitignore` baseline for this language, cleanup triggers, project root tidiness standards.
12. Read `.supercache/manifests/model-routing.yaml` — this tells you which LLM to use for what.

### Governance Location
```
.supercache/ → /Volumes/SanDisk1Tb/.supercache/
```
This directory contains global templates, contracts, manifests, and routing config.
It is **READ-ONLY**. Do not create, modify, or delete any file there.

### Where You Write

| Location             | Purpose                                          | Example                                         |
|----------------------|--------------------------------------------------|-------------------------------------------------|
| `SSOT/`              | Project status, decisions, findings, verification | `SSOT/glassmorphic-llm-command-dock_SSOT.md` |
| `Issues/`            | Bugs, blockers, tasks, help-desk ledger          | `Issues/glassmorphic-llm-command-dock_ISSUES.md` |
| `.floyd/`            | Agent working state, session logs, runtime cache | `.floyd/agent_log.jsonl`                        |
| Project source files | Your actual work                                 | `src/`, `index.html`, `vite.config.ts`         |

### Where You Do NOT Write

| Location          | Reason                                       |
|-------------------|----------------------------------------------|
| `.supercache/`    | Global governance — READ-ONLY for all agents |
| `package-lock.json` | Auto-generated — never edit manually       |

---

## Project Identity

| Field                | Value                                                                   |
|----------------------|-------------------------------------------------------------------------|
| **Name**             | glassmorphic-llm-command-dock                                           |
| **Purpose**          | AI-powered macOS Stream Deck clone — a glassmorphic floating dock for launching shell commands, AppleScripts, URLs, and LLM chat via Anthropic/OpenAI/OpenCode APIs |
| **Primary Language** | TypeScript (ES2020, strict)                                             |
| **Runtime**          | Browser (client-side SPA, built to single HTML file)                    |
| **Module System**    | ESM                                                                     |
| **Framework**        | React 19 + Vite 7 + Tailwind CSS 4                                      |
| **Database**         | None — client-side state via Zustand with localStorage persistence      |
| **Port**             | No port binding — client-side SPA. No claim needed.                    |
| **Repository**       | None — not yet initialized with git remote                              |
| **Current Phase**    | Active development                                                      |

---

## Project Structure

```
glassmorphic-llm-command-dock/
├── src/
│   ├── App.tsx                    # Main application component — dock panel, screen management, drag
│   ├── main.tsx                   # React entry point
│   ├── index.css                  # Global styles (Tailwind)
│   ├── types/
│   │   └── index.ts               # Type definitions — DockButton, Screen, LLMConfig, ChatMessage, AppState
│   ├── components/
│   │   ├── ButtonEditor.tsx       # Button configuration modal (label, icon, command, color)
│   │   ├── DockButton.tsx         # Individual dock button with glassmorphic styling and drag
│   │   ├── ScreenGrid.tsx         # 5x3 button grid for a single screen
│   │   ├── Settings.tsx           # LLM provider/model/API key configuration
│   │   └── LLMChat.tsx            # Floating LLM chat panel (Anthropic/OpenAI/OpenCode)
│   ├── services/
│   │   └── llm.ts                 # LLM API clients — Anthropic, OpenAI, OpenCode GO
│   ├── store/
│   │   └── useStore.ts            # Zustand store with localStorage persistence
│   └── utils/
│       └── cn.ts                  # clsx + tailwind-merge utility
├── index.html                     # HTML shell — title: "StreamDock"
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript config (strict, bundler resolution)
├── vite.config.ts                 # Vite config with single-file plugin
├── SSOT/                          # Project status and decisions
├── Issues/                        # Bug and task tracking
├── .floyd/                        # Agent working state
└── FLOYD.md                       # This file
```

---

## Build & Verify Commands

| Action         | Command              | Expected Result             |
|----------------|----------------------|-----------------------------|
| **Type check** | `npx tsc --noEmit`   | Exit 0, no errors           |
| **Build**      | `npm run build`      | Exit 0, dist/index.html     |
| **Test**       | N/A — no test suite configured | N/A                |
| **Lint**       | N/A — no linter configured | N/A                    |
| **Start**      | N/A — client-side SPA, no server | N/A                |
| **Dev**        | `npm run dev`        | Vite dev server with HMR    |

### Verification sequence after any change:
```bash
npx tsc --noEmit && npm run build
```

---

## Port Allocation

This project is a client-side SPA built to a single HTML file via `vite-plugin-singlefile`. No port binding. No claim needed.

---

## Project-Specific Rules

| #   | Rule                                                                | Rationale                                                     |
|-----|---------------------------------------------------------------------|---------------------------------------------------------------|
| R1  | API keys are stored in Zustand/localStorage only — never commit to source | Prevents secret leakage from a client-side app               |
| R2  | The build must produce a single HTML file (vite-plugin-singlefile)  | Deployment target is a local HTML file, not a web server     |
| R3  | Do not add a server-side component without Douglas's explicit approval | Project scope is a client-side tool                           |

---

## Known Patterns & Lessons

| Pattern | Trigger | Fix | Confidence |
|---------|---------|-----|------------|
| (none yet — project newly bootstrapped) | | | |

---

## Environment Variables

None — all configuration is stored in Zustand state persisted to localStorage. LLM API keys are entered at runtime via the Settings panel.

---

## Execution Contract

Before claiming any task complete, provide:

1. **Exact action taken** — what you did, specifically
2. **Direct evidence** — file path + line, command + output, diff, or screenshot
3. **Verification result** — run the verification sequence above, all must exit 0
4. **Status** — mark COMPLETE only after steps 1-3 are proven

See `.supercache/contracts/execution-contract.md` for the full contract.

---

## Mandatory execution contract
For EACH requested item:
1) Show exact action taken
2) Show direct evidence (file/line/command/output)
3) Show verification result
4) Mark status only after proof

## Forbidden behaviors
- Declaring "done" without evidence
- Collapsing multiple requested items into one vague summary
- Skipping failed steps without explicit blocker report

## Required output structure
A) Requested items checklist
B) Per-item evidence ledger
C) Verification receipts
D) Completeness matrix (item -> done/blocked -> evidence)

## Hard gate
If any requested item has no evidence row, final status MUST be INCOMPLETE.
