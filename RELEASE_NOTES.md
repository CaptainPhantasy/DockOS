# DockOS — MCP Tool-Use & Custom Tool Management Release Notes

**Release Scope**: Commit `0c30546..9c5ab21` on `main` branch  
**Repository**: [github.com/CaptainPhantasy/DockOS](https://github.com/CaptainPhantasy/DockOS)  
**Diff**: +1,913 / -91 lines across 9 files  
**Build**: Single-file HTML SPA (1,028.90 KB gzipped to 290 KB), deployed via `vite-plugin-singlefile`  

---

## A) Release Notes

### Executive Summary

This release adds full AI tool-use capabilities to DockOS (the StreamDock macOS menu bar app). The embedded AI assistant can now execute structured tool calls against app state, manage custom MCP (Model Context Protocol) tools imported from JSON definitions, and scan localhost for running MCP servers. A four-tier security gate controls which operations execute automatically versus requiring human approval. The AI system prompt enforces a deterministic execution contract with mandatory evidence requirements.

### Detailed Changes by Area

#### 1. Tool-Use Infrastructure

**New types** (`src/types/index.ts`):
- `ToolCategory`: `'read' | 'write' | 'destructive'` — classifies tools by side-effect severity
- `ToolCall`: `{ id, name, input }` — represents a single tool invocation from the LLM
- `ToolResult`: `{ tool_use_id, content, is_error? }` — represents a tool execution result
- `SecurityGate`: `'plan_only' | 'ask_each' | 'auto_mode' | 'yolo'` — four approval tiers
- `ApprovalRequest`: `{ toolCall, gate, category }` — pending human approval
- `SECURITY_GATE_INFO`: Static labels, descriptions, and colors for each gate level
- `ChatMessage` extended with optional `toolCalls?`, `toolResults?`, `approvalRequest?` fields

**15 built-in tool schemas** (`src/services/tools.ts` — 504 lines, new file):

| Category | Tool | Purpose |
|----------|------|---------|
| Read | `list_screens` | List all screens with names and button counts |
| Read | `get_screen` | Get full button layout for a specific screen |
| Read | `get_button` | Get a single button's properties |
| Read | `list_commands` | List all commands across all buttons |
| Read | `get_state` | Dump complete app state |
| Read | `list_custom_tools` | List registered custom MCP tools |
| Write | `create_button` | Add a button at a specific position |
| Write | `update_button` | Modify button label, command, icon, or color |
| Write | `create_screen` | Add a new blank screen |
| Write | `rename_screen` | Change a screen's name |
| Write | `add_custom_tool` | Register a new custom MCP tool |
| Write | `remove_custom_tool` | Unregister a custom tool by name |
| Write | `import_mcp_json` | Bulk-import tool definitions from MCP JSON |
| Destructive | `delete_button` | Remove a button from a screen |
| Destructive | `delete_screen` | Delete an entire screen (cannot delete the last one) |

**Tool execution** (`src/services/tools.ts`):
- `executeTool(name, args)` dispatches to a `HANDLERS` map of 15 functions
- `categorizeTool(name)` classifies by membership in `READ_TOOLS` / `DESTRUCTIVE_TOOLS` sets
- `gateAllows(gate, category)` returns `'execute'` | `'confirm'` | `'blocked'`
- `needsApproval(toolCall, gate)` / `isBlocked(toolCall, gate)` — gate enforcement predicates

**Provider formatters**:
- `getAnthropicTools()` — returns `{ name, description, input_schema }[]`
- `getOpenAITools()` — returns `{ type: "function", function: { name, description, parameters } }[]`

#### 2. Agentic Loop

**File**: `src/services/llm.ts` — rewritten (+349/-27 lines)

- `callLLMWithTools()` implements an agentic loop: sends messages + tools to the LLM, receives tool calls, executes them, feeds results back, repeats up to `MAX_ITERATIONS = 10`
- Supports both Anthropic and OpenAI-compatible providers
- Per-iteration flow:
  1. Parse tool calls from LLM response
  2. For each tool call: check gate → if blocked, return error; if needs approval, invoke `onApprovalNeeded` callback and wait for user decision; if allowed, execute
  3. Route execution: built-in tools via `executeTool()`, custom tools via `executeCustomTool()`
  4. Feed tool results back into conversation
- Returns `{ assistantContent, toolCalls, toolResults }` on completion

#### 3. Custom MCP Tool System

**New types** (`src/types/index.ts`):
- `CustomTool`: `{ id, name, description, inputSchema, category, endpointUrl, method, headers, enabled, createdAt }`

**Store** (`src/store/useStore.ts`):
- `customTools: CustomTool[]` state, initialized to `[]`
- Four CRUD actions: `addCustomTool`, `removeCustomTool`, `toggleCustomTool`, `updateCustomTool`
- Persisted to localStorage via Zustand `persist` middleware (`partialize` includes `customTools`)

**Custom tool service** (`src/services/customTools.ts` — 240 lines, new file):
- `getCustomAnthropicTools()` / `getCustomOpenAITools()` — format custom tools for each provider API
- `executeCustomTool(name, args)` — HTTP `fetch()` to the tool's `endpointUrl` using configured method/headers
- `isCustomTool(name)` — checks if a tool name matches a registered custom tool
- `autoDetectLocalServers()` — scans 18 common localhost ports in parallel (2-second timeout each):
  - Ports: 3000, 3001, 4000, 5000, 5173, 5174, 8000, 8080, 8088, 8787, 9000, 9090, 9292, 9999, 11434 (Ollama), 6333 (Qdrant), 27017 (MongoDB), 7474 (Neo4j)
  - Tries `/tools` endpoint first, falls back to root
  - Returns `DetectedServer[]` with `url`, `name`, `tools?`, `status`
- `parseMCPJson(json)` — accepts three input formats:
  - Anthropic: `{ name, description, input_schema }`
  - OpenAI: `{ type: "function", function: { name, description, parameters } }`
  - Raw: `{ name, description, parameters | inputSchema | input_schema }`
  - Handles arrays, `{ tools: [...] }` wrappers, and single objects
- `guessCategory(name)` — infers `ToolCategory` from tool name keywords

#### 4. System Prompt

**File**: `src/services/systemPrompt.ts` — 84 lines, new file

`buildSystemPrompt(customToolNames[])` generates a deterministic prompt containing:
- **Identity**: DockOS AI, manages screens/buttons/commands/custom MCP integrations
- **Execution rules**: Not sandboxed, always attempt, use tools directly, report concisely
- **Full tool catalog**: All 15 built-in tools documented with category and purpose
- **Security gate reference**: Four tiers with behavior descriptions
- **Output rules**: Concise, report success/failure, never fabricate results
- **Mandatory Execution Contract**: Requires evidence-based output structure (checklist → evidence ledgers → verification receipts → completeness matrix), hard gate on incomplete items
- **Dynamic section**: Lists registered custom tool names when present

#### 5. UI — LLM Chat Tool Rendering

**File**: `src/components/LLMChat.tsx` — rewritten (+225/-16 lines)

- `GateIcon` component — renders shield icon per gate level
- `ToolCallBlock` component — collapsible block showing:
  - Category badge (color-coded: green=read, blue=write, red=destructive)
  - Tool name and input arguments (JSON)
  - Expand/collapse with ChevronDown/ChevronRight
  - Blocked state styling
- Tool result rendering in message stream
- Pending approval system — ref-based Promise resolution for user approval callbacks
- Security gate badge in chat header showing current gate level
- Imports `buildSystemPrompt()` — passes registered custom tool names dynamically

#### 6. UI — Settings MCP Tool Manager

**File**: `src/components/Settings.tsx` — extended (+176/-3 lines)

New "MCP Tools" section in Settings modal:
- **Tool list**: Shows all registered custom tools with name, endpoint URL, test button, remove button
- **Import panel**: Textarea for pasting MCP JSON + endpoint URL input + "Import" button
- **Auto-Detect button**: Triggers `autoDetectLocalServers()` scan, shows results
- **Test result area**: Displays output from tool tests, imports, and auto-detect
- Empty state message when no custom tools registered

#### 7. CSS

**File**: `src/index.css` — extended (+319 lines)

New styles for:
- `.tool-call-block` — collapsible tool call display with category-colored borders
- `.security-badge` — category labels (read/write/destructive)
- `.tool-approval-prompt` — approval request UI
- `.gate-option` — radio-style gate selector buttons
- `.chat-gate-badge` — gate level indicator in chat header
- `.mcp-tool-item` — custom tool list rows
- `.mcp-import-section` — JSON import form
- `.mcp-actions-row` — button row for import/auto-detect
- `.mcp-test-result` — feedback output area

### Who Is Affected

**All users** who use the AI chat feature. The chat now uses an agentic tool-use loop instead of plain text responses. The AI will execute tool calls to read and modify app state.

**Users upgrading** from the previous commit (`0c30546`) will see:
- A new "AI Security" section in Settings with four gate options
- A new "MCP Tools" section in Settings for custom tool management
- Tool call blocks appearing in AI chat messages (collapsible, color-coded)
- Custom tools persisted across app restarts via localStorage

### What to Do

1. **Review your security gate setting** in Settings → AI Security. Default is "Auto Mode" (reads auto-execute, writes/destructive require approval).
2. **Import custom tools** if you have MCP server endpoints — paste JSON in Settings → MCP Tools and provide an endpoint URL.
3. No API key changes required — existing LLM config continues to work.

---

## B) Quickstart (Release Adoption)

### What Changed

The AI assistant now has **15 built-in tools** it can call to interact with app state, plus the ability to register and call **custom MCP tools** via HTTP. A security gate controls automatic vs. approval-required execution.

### How to Enable / Use New Features

**Tool use is always active** when the AI chat is open — no feature flags.

**Security gate configuration**:
1. Open Settings (gear icon)
2. Scroll to "AI Security" section
3. Select a gate level:
   - **Plan Only** — AI reads state but cannot make changes
   - **Auto Mode** (default) — reads auto-execute; writes/destructive need approval
   - **Ask Each Time** — every tool call requires approval
   - **YOLO** — all tools execute immediately

**Import a custom MCP tool**:
1. Open Settings → scroll to "MCP Tools"
2. Paste MCP JSON into the textarea (Anthropic, OpenAI, or raw format accepted)
3. Enter the endpoint URL (e.g., `http://localhost:3000/api`)
4. Click "Import"

**Auto-detect local servers**:
1. Open Settings → "MCP Tools"
2. Click "Auto-Detect"
3. App scans 18 common localhost ports for MCP-compatible `/tools` endpoints
4. Results appear below the button

**Test a custom tool**:
1. In the MCP Tools tool list, click the search icon next to any registered tool
2. Test result appears below

### Upgrade / Roll-Forward Steps

No migration needed. The release is a single `index.html` file:

```bash
cd /Volumes/SanDisk1Tb/Dock/glassmorphic-llm-command-dock
git pull origin main
npm install   # if dependencies changed
npm run build
cp dist/index.html /Applications/StreamDock.app/Contents/Resources/index.html
killall StreamDock; open /Applications/StreamDock.app
```

### Minimal Working Example

After upgrade, open the AI chat and type:

```
What screens do I have?
```

The AI will call `list_screens` and return structured output. If the gate is "Auto Mode" or "YOLO", this executes immediately (read tool). If "Ask Each Time", you'll see an approval prompt.

For a custom tool test, paste this JSON into Settings → MCP Tools with endpoint `http://localhost:3000/api`:

```json
{
  "name": "echo_test",
  "description": "Echo back the input",
  "input_schema": {
    "type": "object",
    "properties": {
      "message": { "type": "string", "description": "Message to echo" }
    }
  }
}
```

Then ask the AI: "Use the echo_test tool to say hello."

---

## C) What's New

### 1. AI Tool-Use (Agentic Loop)

**What it is**: The AI assistant can now execute structured tool calls instead of only generating text. It operates in an agentic loop — receiving tool calls from the LLM, executing them, feeding results back, and repeating up to 10 iterations.

**Why it matters**: Previously the AI could only suggest actions. Now it can read your screen layout, create buttons, rearrange screens, and manage custom tool integrations — all through verified, gate-controlled tool calls.

**How to use**: Open the AI chat and ask in natural language. The AI determines which tools to call. Example: "Create a button called 'Build' in position 0,0 on screen 1 that runs `npm run build`" → the AI calls `create_button` with the correct parameters.

### 2. Security Gate System

**What it is**: A four-tier approval system controlling which AI tool calls execute automatically.

**Why it matters**: Prevents unintended destructive operations while allowing fluid read-heavy workflows.

| Gate | Behavior |
|------|----------|
| Plan Only | Read-only. No mutations allowed. |
| Auto Mode (default) | Reads execute automatically. Writes and destructive ops require approval. |
| Ask Each Time | Every tool call requires human approval. |
| YOLO | All operations execute immediately. Full autonomy. |

**How to use**: Settings → AI Security → select gate level.

### 3. Custom MCP Tool Management

**What it is**: Import, register, and execute custom tools that call external HTTP endpoints. Tools are defined via JSON schemas and persisted in localStorage.

**Why it matters**: Extends the AI's capabilities beyond the 15 built-in tools. Connect to any HTTP-accessible service — internal APIs, local MCP servers, cloud endpoints — and the AI can use them as tools.

**How to use**:
1. Settings → MCP Tools → paste MCP JSON + endpoint URL → Import
2. Or click Auto-Detect to scan localhost for MCP servers
3. Custom tools appear in the tool list; the AI can call them in chat

**Supported JSON formats**: Anthropic (`{ name, description, input_schema }`), OpenAI (`{ type: "function", function: { name, description, parameters } }`), or raw (`{ name, description, parameters }`). Accepts single objects, arrays, or `{ tools: [...] }` wrappers.

### 4. Deterministic System Prompt with Execution Contract

**What it is**: The AI system prompt now includes a mandatory execution contract requiring evidence-based output: checklist → evidence ledgers → verification receipts → completeness matrix.

**Why it matters**: Ensures the AI cannot claim completion without providing verifiable tool output as evidence.

---

## D) Upgrade Guide

### Breaking Changes

**None.** All changes are additive. Existing LLM config, screens, buttons, and chat history are preserved.

### Migration Steps

No migration required. Zustand store migration handles the new `customTools` field (initialized to `[]`) and `securityGate` field (initialized to `'auto_mode'`) automatically.

### Config / Environment Changes

- **New store fields**: `securityGate` (default: `'auto_mode'`), `customTools` (default: `[]`)
- **No new environment variables** or API key changes
- **Build output unchanged**: Single `dist/index.html` file

### Deprecations

None in this release.

---

## E) Troubleshooting

### Symptom: Tool calls appear as "blocked" in chat

**Likely cause**: Security gate is set to "Plan Only" and the tool is a write/destructive operation.

**Fix**: Change gate in Settings → AI Security to "Auto Mode" or "YOLO", or approve the individual call if using "Ask Each Time".

### Symptom: Custom tool returns `{ "error": "Custom tool 'name' request failed: ..." }`

**Likely cause**: The endpoint URL is unreachable or returned an HTTP error.

**Fix**:
1. Verify the endpoint is running: `curl -X POST http://localhost:PORT/api -H "Content-Type: application/json" -d '{}'`
2. Check CORS headers — the app runs in a WKWebView; the endpoint must allow cross-origin requests
3. Click the Test button (search icon) in Settings → MCP Tools to see the error details

### Symptom: Auto-Detect finds no servers

**Likely cause**: No MCP-compatible servers running on the 18 scanned ports (3000-9999, 11434, 6333, 27017, 7474).

**Fix**: Ensure your MCP server is running on one of the scanned ports, or add the tool manually via JSON import with its exact URL.

### Symptom: AI says "Unknown tool: X"

**Likely cause**: The tool name doesn't match any of the 15 built-in tools or any registered custom tool.

**Fix**: Check tool name spelling. For custom tools, verify the tool appears in Settings → MCP Tools list and is enabled.

### Symptom: Import MCP JSON returns "No tool definitions found"

**Likely cause**: The JSON doesn't match any of the three supported formats (Anthropic, OpenAI, or raw).

**Fix**: Ensure the JSON contains objects with a `name` field. For OpenAI format, include `type: "function"` and nested `function` object. For Anthropic format, include `input_schema` (not `parameters`).

---

## F) FAQ

**Q: Does tool use cost more API tokens?**  
A: Yes. Each tool call adds to the conversation context. The agentic loop sends full message history with each iteration (up to 10). Monitor your API usage accordingly.

**Q: Can I disable tool use?**  
A: Not separately. Setting the gate to "Plan Only" effectively disables mutations while still allowing reads. To fully disable AI, don't open the chat.

**Q: Where are custom tools stored?**  
A: In localStorage under `streamdock-storage`, alongside screens and chat history. They persist across app restarts.

**Q: Can custom tools access my filesystem or run shell commands?**  
A: No. The app runs in a WKWebView (browser context). Custom tools can only make HTTP requests to their configured endpoint URL. They cannot execute shell commands or access the filesystem directly.

**Q: What happens if the AI loop hits 10 iterations?**  
A: The loop terminates and returns whatever results have been accumulated. The AI receives the tool results collected so far and generates a final text response.

**Q: Can I import tools from an MCP server's /tools endpoint?**  
A: The Auto-Detect feature discovers servers and lists their tools, but doesn't automatically register them. After detecting a server, use the Import function to paste the tool JSON and point it at the server's URL.

---

## G) Traceability Appendix (Diff → Docs)

| Doc Claim | Evidence (File:Line or Command) |
|-----------|--------------------------------|
| 15 built-in tools | `src/services/tools.ts:20-199` — TOOL_SCHEMAS object with 15 keys |
| 11 app operation tools | `src/services/tools.ts:22-146` — list_screens through delete_screen |
| 4 MCP management tools | `src/services/tools.ts:148-197` — list_custom_tools, add_custom_tool, remove_custom_tool, import_mcp_json |
| Three tool categories | `src/types/index.ts:39` — `type ToolCategory = 'read' \| 'write' \| 'destructive'` |
| Four security gates | `src/types/index.ts:53` — `type SecurityGate = 'plan_only' \| 'ask_each' \| 'auto_mode' \| 'yolo'` |
| Default gate is auto_mode | `src/store/useStore.ts:38` — `securityGate: 'auto_mode' as SecurityGate` |
| Gate enforcement matrix | `src/services/tools.ts:215-226` — `gateAllows()` switch statement |
| Agentic loop max 10 iterations | `src/services/llm.ts:253` — `const MAX_ITERATIONS = 10` |
| Custom tool execution via HTTP | `src/services/customTools.ts:36-63` — `executeCustomTool()` uses `fetch()` |
| Auto-detect scans 18 ports | `src/services/customTools.ts:83-102` — endpoints array with 18 entries |
| Auto-detect 2-second timeout | `src/services/customTools.ts:110` — `setTimeout(() => controller.abort(), 2000)` |
| MCP JSON supports 3 formats | `src/services/customTools.ts:200-231` — `extractTool()` handles Anthropic, OpenAI, raw |
| Custom tools persisted in localStorage | `src/store/useStore.ts:167` — `partialize` includes `customTools: state.customTools` |
| Store has 4 CRUD actions | `src/types/index.ts:121-124` — addCustomTool, removeCustomTool, toggleCustomTool, updateCustomTool |
| System prompt includes execution contract | `src/services/systemPrompt.ts:64-83` — MANDATORY EXECUTION CONTRACT section |
| System prompt includes no-sandbox rule | `src/services/systemPrompt.ts:12` — "NEVER assume sandbox" |
| System prompt lists all tools | `src/services/systemPrompt.ts:19-40` — BUILT-IN TOOLS section |
| Tool routing in agentic loop | `src/services/llm.ts:317-319` — `isCustomTool(name) ? await executeCustomTool() : executeTool()` |
| LLMChat uses buildSystemPrompt | `src/components/LLMChat.tsx:156` — `buildSystemPrompt(customTools.map(...))` |
| Settings has MCP Tool Manager | `src/components/Settings.tsx:407-485` — MCP Tools section JSX |
| Settings has AI Security section | `src/components/Settings.tsx:277-308` — AI Security gate options |
| TypeScript compiles clean | `npx tsc --noEmit` → 0 errors (verified during build) |
| Build output 1,028.90 KB | `npm run build` output: `dist/index.html  1,028.90 kB │ gzip: 290.15 kB` |
| CustomTool type definition | `src/types/index.ts:61-75` — interface with 10 fields |
| Custom tools merged into OpenAI request | `src/services/llm.ts:152` — `[...getOpenAITools(), ...getCustomOpenAITools()]` |
| Custom tools merged into Anthropic request | `src/services/llm.ts:73` — `[...getAnthropicTools(), ...getCustomAnthropicTools()]` |
| Custom tool category auto-guess | `src/services/customTools.ts:234-239` — `guessCategory()` checks name keywords |
| ToolCallBlock component | `src/components/LLMChat.tsx:25-65` — collapsible tool call display |
| MCP CSS styles | `src/index.css:1760-1854` — .mcp-* classes |
| Tool call CSS styles | `src/index.css:1485-1759` — .tool-call-* classes |
| Settings MCP handler functions | `src/components/Settings.tsx:130-176` — handleImportMcpJson, handleAutoDetect, handleTestCustomTool |
| Vite single-file build | `vite.config.ts:9` — `viteSingleFile()` plugin |
| Zustand persist store name | `src/store/useStore.ts:160` — `name: 'streamdock-storage'` |
