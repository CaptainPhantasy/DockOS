# glassmorphic-llm-command-dock SSOT (Single Source of Truth)
**Created:** 2026-05-07
**Last Updated:** 2026-05-07
**Governance:** .supercache/ v1.7.0

> **Compliance Notice:** This file must match the structure at
> `.supercache/templates/ssot-template.md`. This is the authoritative
> document for architecture and programmatic change facts of **glassmorphic-llm-command-dock**.

---

## Authority

This document is the **single source of truth** for architecture and programmatic change facts of glassmorphic-llm-command-dock. All other documents must be treated as **potentially flawed** unless their facts are confirmed here.

When a fact in any other document contradicts this SSOT, the SSOT wins. If the SSOT itself is wrong, it is corrected via the **Verification Sweep Protocol** below, not by editing other documents to match.

---

## Verification Sweep Protocol (required on every read)

When an agent reads this SSOT to perform a task:

1. Perform a **line-by-line verification review** of the sections relevant to the current task.
2. For each verified fact, append a verification entry to the **Verification Log** at the bottom of this file with:
   - Timestamp (`YYYY-MM-DD HH:MM TZ`)
   - Section/line reference
   - Evidence source (code path + line, command + output, build log, runtime behavior, etc.)
   - Confidence = 100%
3. If any fact cannot be verified to 100% confidence:
   - Mark it **UNVERIFIED** inline in the section where it appears
   - Add an entry to `Issues/glassmorphic-llm-command-dock_ISSUES.md` to track the discrepancy
   - do NOT proceed on the assumption that the fact is true

### Positive Reinforcement (required)

For each fact verified at 100% confidence during a sweep, emit the acknowledgement:

```
Verified as fact (100%): <fact summary>
```

---

## Current State

**Phase:** Active development
**Status:** Active
**Last Agent Session:** 2026-05-07 10:36 EDT

---

## Architecture Facts

### Stack

- **Primary language**: TypeScript (ES2020, strict mode)
- **Framework**: React 19 + Vite 7 + Tailwind CSS 4
- **Runtime**: Browser (client-side SPA, built to single HTML file via vite-plugin-singlefile)
- **Module system**: ESM

### Key architectural choices

1. **Single-file build.** `vite-plugin-singlefile` bundles everything (JS, CSS, HTML) into a single `dist/index.html` with no external dependencies. This was chosen because the deployment target is a local file opened in a browser, not a hosted web app.

2. **Client-side state only.** Zustand with `persist` middleware stores all app state (screens, buttons, LLM config, chat history) in `localStorage`. No server, no database. This means state is per-browser and not syncable across devices.

3. **Multi-provider LLM chat.** The `services/llm.ts` module supports three LLM providers (Anthropic, OpenAI, OpenCode GO) with direct browser-to-API calls. The `anthropic-dangerous-direct-browser-access` header is used for Anthropic, indicating this is a local-use tool where CORS bypass is acceptable.

4. **No git repository initialized.** The project has no `.git/` directory and no remote. This is a standalone local project.

---

## Key Decisions

| Date | Decision | Rationale | Decided By |
|---|---|---|---|
| 2026-05-07 | Bootstrapped governance under .supercache/ v1.7.0 | Governance alignment requirement | Agent (Floyd) |

---

## Dependencies

| Dependency | Version | Purpose | Criticality |
|---|---|---|---|
| react | 19.2.3 | UI framework | critical |
| react-dom | 19.2.3 | DOM renderer | critical |
| zustand | ^5.0.13 | State management with persistence | critical |
| framer-motion | ^12.38.0 | Animations and drag | supporting |
| lucide-react | ^1.14.0 | Icon library | supporting |
| tailwindcss | 4.1.17 | CSS utility framework | supporting |
| clsx | 2.1.1 | Class name utility | supporting |
| tailwind-merge | 3.4.0 | Tailwind class merge utility | supporting |
| uuid | ^14.0.0 | Unique ID generation | supporting |
| vite | 7.3.2 | Build tool | critical |
| typescript | 5.9.3 | Type system | critical |
| vite-plugin-singlefile | 2.3.0 | Single-file build output | critical |

---

## Deployment

| Environment | URL / Location | Status | Last Deploy |
|---|---|---|---|
| local | `dist/index.html` (single-file build) | dev | N/A — not yet built for production |

---

## Known Patterns & Lessons

| Pattern | Trigger | Fix | Confidence |
|---------|---------|-----|------------|
| (none yet — project newly bootstrapped) | | | |

---

## Verification Log (append-only)

Every sweep of this SSOT must append one or more entries here. Never edit or remove existing entries.

| Timestamp | Section / Line | Fact Verified | Evidence Source | Confidence |
|---|---|---|---|---|
| 2026-05-07 10:36 EDT | Authority | Document initialized as SSOT | bootstrap sequence | 100% |
| 2026-05-07 10:36 EDT | Stack | TypeScript, React 19, Vite 7, Tailwind 4 | CMD:cat package.json — dependencies match | 100% |
| 2026-05-07 10:36 EDT | Architecture | Single-file build via vite-plugin-singlefile | FILE:vite.config.ts:8 — `viteSingleFile()` plugin | 100% |
| 2026-05-07 10:36 EDT | Architecture | Client-side state via Zustand + localStorage | FILE:src/store/useStore.ts:1 — `persist` middleware | 100% |
| 2026-05-07 10:36 EDT | Architecture | No git repo initialized | CMD:git status — "not a git repository" | 100% |

---

## Change Log (append-only)

- 2026-05-07 — Initialized SSOT.

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
