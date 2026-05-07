# glassmorphic-llm-command-dock Issues Ledger
**Created:** 2026-05-07
**Governance:** .supercache/ v1.7.0

> **Compliance Notice:** This file must match the structure at
> `.supercache/templates/issues-template.md`. This is the living help-desk
> and issue tracker for **glassmorphic-llm-command-dock**.

---

## How to use this document

- This is the living help-desk for repo operations, CI/CD, bugs, and blockers for glassmorphic-llm-command-dock.
- Every new issue is added as a row in the **Issues Ledger** below with a fresh `ISSUE-NNNN` ID.
- Every significant update to an issue appends a timestamped entry to the **Change Log** at the bottom of this file.
- **Never overwrite historical facts.** Updates append; they do not replace.

---

## Status definitions

| Status | Meaning |
|---|---|
| **New** | Captured; not yet triaged |
| **Triaged** | Scoped; priority set; owner assigned |
| **In progress** | Active work underway |
| **Blocked** | Cannot proceed; blocker and next unblock action recorded |
| **Resolved** | Fix implemented; proof attached |
| **Verified** | Fix confirmed by rerun, test, or log evidence |
| **Closed** | Complete and stable; no further action expected |

---

## Issues Ledger

| ID | Created | Title | Status | Owner | Evidence / Links | Resolution Proof |
|---|---|---|---|---|---|---|
| ISSUE-0001 | 2026-05-07 10:36 EDT | No git repository initialized | New | Unassigned | CMD:git status → "not a git repository" | N/A |
| ISSUE-0002 | 2026-05-07 10:36 EDT | No test suite configured | New | Unassigned | package.json has no "test" script | N/A |
| ISSUE-0003 | 2026-05-07 10:36 EDT | No linter configured | New | Unassigned | package.json has no "lint" script; no eslint/biome config files | N/A |
| ISSUE-0004 | 2026-05-07 10:36 EDT | LLM API keys stored in localStorage — no encryption | New | Unassigned | src/store/useStore.ts persists full llmConfig including apiKey to localStorage | N/A |
| ISSUE-0005 | 2026-05-07 10:36 EDT | anthropic-dangerous-direct-browser-access header used | New | Unassigned | src/services/llm.ts — direct browser-to-Anthropic API calls | N/A |

---

## Change Log (append-only)

- 2026-05-07 — Initialized issues ledger with 5 discovered issues.

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
