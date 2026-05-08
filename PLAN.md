# DockOS MCP Tool-Use Implementation Plan

## Goal
Give the onboard AI Assistant tool-use capabilities so it can read/write DockOS state (screens, buttons, commands) directly, with a 4-tier security gate system controlling autonomy.

## Architecture

### Not an external MCP server
This is **client-side tool-use** — the LLM APIs already support it. We define tools as JSON schemas, send them with each request, and the LLM returns structured `tool_use` blocks instead of (or in addition to) text. Our code executes the tools and returns results.

### The agentic loop
```
User message → LLM (with tools) → stop_reason: "tool_use"
  → Execute tool (check security gate) → tool_result
  → LLM continues → stop_reason: "tool_use" | "end_turn"
  → Repeat until end_turn
  → Render final response in chat
```

### Security Gates

| Gate | Read ops | Write ops | Destructive ops |
|------|----------|-----------|-----------------|
| PLAN_ONLY | Execute | Blocked | Blocked |
| ASK_EACH | Confirm each | Confirm each | Confirm each |
| AUTO_MODE | Execute | Confirm each | Always confirm |
| YOLO | Execute | Execute | Execute |

- **Read ops**: list_screens, get_button, list_commands, get_state
- **Write ops**: create_button, update_button, create_screen, rename_screen
- **Destructive ops**: delete_button, delete_screen, execute_command

## Tool Definitions (11 tools)

### Read tools (safe)
1. `list_screens` — returns all screens with names and button counts
2. `get_screen` — returns full button layout for a screen (by index or name)
3. `get_button` — returns a specific button's config (screen, row, col)
4. `list_commands` — returns all configured commands across all screens
5. `get_state` — returns full app state summary (providers, screens, settings)

### Write tools (mutation)
6. `create_button` — add a button to an empty slot (screen, row, col, config)
7. `update_button` — modify an existing button's label/icon/command/color
8. `create_screen` — add a new screen with optional name
9. `rename_screen` — rename a screen by index

### Destructive tools (irreversible)
10. `delete_button` — remove a button from a slot
11. `delete_screen` — remove a screen entirely

## Files to Modify

### New file: `src/services/tools.ts`
- Tool schema definitions (JSON Schema for each tool)
- `executeTool(name, args, gate)` — dispatches to handler, enforces gate
- `categorizeTool(name)` → 'read' | 'write' | 'destructive'
- Gate enforcement: returns "blocked by security policy" for disallowed ops
- All tools operate on Zustand store via `useStore.getState()`

### Modified: `src/types/index.ts`
- Add `SecurityGate` type: 'plan_only' | 'ask_each' | 'auto_mode' | 'yolo'
- Add `ToolCall` interface: { id, name, input }
- Add `ToolResult` interface: { tool_use_id, content, is_error? }
- Add `ApprovalRequest` interface for ASK_EACH/AUTO_MODE gates

### Modified: `src/store/useStore.ts`
- Add `securityGate: SecurityGate` to state (default: 'auto_mode')
- Add `updateSecurityGate` action
- Persist `securityGate` in localStorage

### Modified: `src/services/llm.ts`
- Refactor `callAnthropic` and `callOpenAI` to accept `tools` parameter
- Add `callLLMWithTools` that drives the agentic loop:
  1. Send messages + tools
  2. If stop_reason === 'tool_use', execute tools (check gate)
  3. For blocked/ask ops, return pending approval instead of executing
  4. Send tool_results back to LLM
  5. Repeat until end_turn
  6. Return final text + tool call log

### Modified: `src/components/LLMChat.tsx`
- Render tool calls in chat (collapsible, shows tool name + args + result)
- Show approval prompt when gate requires confirmation
- Approval buttons: Approve / Deny
- Show security badge on each tool call (gate level)

### Modified: `src/components/Settings.tsx`
- Add "AI Security" section with 4 gate options
- Visual descriptions of each gate level
- Gate stored in llmConfig persist

### Modified: `src/index.css`
- Tool call bubble styles
- Approval prompt styles
- Security badge styles

## Implementation Order

1. Types + store (SecurityGate, tool types, gate in store)
2. `src/services/tools.ts` (tool schemas + execution)
3. `src/services/llm.ts` (tool-use API calls + agentic loop)
4. `src/components/LLMChat.tsx` (tool call rendering + approval flow)
5. `src/components/Settings.tsx` (security gate picker)
6. `src/index.css` (tool call styles)
7. Build + test
