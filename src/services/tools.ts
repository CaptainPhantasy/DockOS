import type { SecurityGate, ToolCategory, ToolCall } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/useStore';
import { parseMCPJson } from './customTools';

// ---------- Tool Schemas ----------

const commonButtonProps = {
  label: { type: 'string' as const, description: 'Display label for the button' },
  icon: { type: 'string' as const, description: 'Icon name (e.g. Terminal, Globe, Play)' },
  command: { type: 'string' as const, description: 'The command/script to execute' },
  commandType: {
    type: 'string' as const,
    enum: ['shell', 'applescript', 'terminal', 'url'],
    description: 'How the command is executed',
  },
  color: { type: 'string' as const, description: 'Hex color code (e.g. #007AFF)' },
};

export const TOOL_SCHEMAS = {
  // Read tools
  list_screens: {
    name: 'list_screens',
    description: 'List all screens and their names. Returns screen index, name, and button count.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  get_screen: {
    name: 'get_screen',
    description: 'Get details of a specific screen including all buttons.',
    input_schema: {
      type: 'object',
      properties: {
        screenIndex: { type: 'number', description: 'Zero-based screen index' },
      },
      required: ['screenIndex'],
    },
  },
  get_button: {
    name: 'get_button',
    description: 'Get details of a specific button on a screen.',
    input_schema: {
      type: 'object',
      properties: {
        screenIndex: { type: 'number', description: 'Zero-based screen index' },
        row: { type: 'number', description: 'Row index (0-4)' },
        col: { type: 'number', description: 'Column index (0-2)' },
      },
      required: ['screenIndex', 'row', 'col'],
    },
  },
  list_commands: {
    name: 'list_commands',
    description: 'List all commands across all screens. Returns button label, command, and type.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  get_state: {
    name: 'get_state',
    description: 'Get a full snapshot of the current app state: all screens, current screen, settings.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  // Write tools
  create_button: {
    name: 'create_button',
    description: 'Create a new button at a specific position on a screen.',
    input_schema: {
      type: 'object',
      properties: {
        screenIndex: { type: 'number', description: 'Zero-based screen index' },
        row: { type: 'number', description: 'Row index (0-4)' },
        col: { type: 'number', description: 'Column index (0-2)' },
        ...commonButtonProps,
      },
      required: ['screenIndex', 'row', 'col', 'label', 'command'],
    },
  },
  update_button: {
    name: 'update_button',
    description: 'Update an existing button\'s properties (label, icon, command, color, etc.).',
    input_schema: {
      type: 'object',
      properties: {
        screenIndex: { type: 'number', description: 'Zero-based screen index' },
        row: { type: 'number', description: 'Row index (0-4)' },
        col: { type: 'number', description: 'Column index (0-2)' },
        ...commonButtonProps,
      },
      required: ['screenIndex', 'row', 'col'],
    },
  },
  create_screen: {
    name: 'create_screen',
    description: 'Create a new empty screen.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name for the new screen' },
      },
    },
  },
  rename_screen: {
    name: 'rename_screen',
    description: 'Rename an existing screen.',
    input_schema: {
      type: 'object',
      properties: {
        screenIndex: { type: 'number', description: 'Zero-based screen index' },
        name: { type: 'string', description: 'New name for the screen' },
      },
      required: ['screenIndex', 'name'],
    },
  },

  // Destructive tools
  delete_button: {
    name: 'delete_button',
    description: 'Delete a button from a screen (sets it to empty).',
    input_schema: {
      type: 'object',
      properties: {
        screenIndex: { type: 'number', description: 'Zero-based screen index' },
        row: { type: 'number', description: 'Row index (0-4)' },
        col: { type: 'number', description: 'Column index (0-2)' },
      },
      required: ['screenIndex', 'row', 'col'],
    },
  },
  delete_screen: {
    name: 'delete_screen',
    description: 'Delete an entire screen. Cannot delete the last screen.',
    input_schema: {
      type: 'object',
      properties: {
        screenIndex: { type: 'number', description: 'Zero-based screen index to delete' },
      },
      required: ['screenIndex'],
    },
  },

  // MCP Tool Management (read)
  list_custom_tools: {
    name: 'list_custom_tools',
    description: 'List all custom MCP tools currently registered. Returns name, description, endpoint, and enabled status for each.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  add_custom_tool: {
    name: 'add_custom_tool',
    description: 'Register a new custom MCP tool. Provide name, description, inputSchema (JSON Schema), endpointUrl, and optional HTTP method/headers. The tool becomes available for future use.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Unique tool name (e.g. my_api_query)' },
        description: { type: 'string', description: 'What this tool does' },
        inputSchema: { type: 'object', description: 'JSON Schema object defining the tool parameters' },
        category: { type: 'string', enum: ['read', 'write', 'destructive'], description: 'Security category for the tool' },
        endpointUrl: { type: 'string', description: 'HTTP URL to call when this tool is invoked' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method (default: POST)' },
        headers: { type: 'object', description: 'Optional HTTP headers (e.g. {"Authorization": "Bearer ..."})' },
      },
      required: ['name', 'description', 'inputSchema', 'category', 'endpointUrl'],
    },
  },
  remove_custom_tool: {
    name: 'remove_custom_tool',
    description: 'Remove a custom MCP tool by name.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the custom tool to remove' },
      },
      required: ['name'],
    },
  },
  import_mcp_json: {
    name: 'import_mcp_json',
    description: 'Import MCP tool definitions from pasted JSON. Accepts Anthropic format ({name, description, input_schema}), OpenAI format ({type: "function", function: {name, description, parameters}}), or arrays of either. You must also provide an endpointUrl that the imported tools will call. Returns count of tools imported.',
    input_schema: {
      type: 'object',
      properties: {
        json: { type: 'string', description: 'Raw JSON string containing MCP tool definition(s)' },
        endpointUrl: { type: 'string', description: 'HTTP endpoint URL these tools will call' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method for the endpoint (default: POST)' },
        headers: { type: 'object', description: 'Optional HTTP headers for authentication' },
      },
      required: ['json', 'endpointUrl'],
    },
  },
  search_brand_logo: {
    name: 'search_brand_logo',
    description: 'Search for a brand/company logo by name and return a direct image URL. Use the returned URL as the icon value in update_button. Powered by Clearbit (no API key required).',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Brand or company name to search for (e.g. "Netflix", "GitHub", "Figma")' },
      },
      required: ['query'],
    },
  },
} as const;

// ---------- Tool Categorization ----------

const READ_TOOLS = new Set(['list_screens', 'get_screen', 'get_button', 'list_commands', 'get_state', 'list_custom_tools', 'search_brand_logo']);
const DESTRUCTIVE_TOOLS = new Set(['delete_button', 'delete_screen']);

export function categorizeTool(name: string): ToolCategory {
  if (DESTRUCTIVE_TOOLS.has(name)) return 'destructive';
  if (READ_TOOLS.has(name)) return 'read';
  return 'write';
}

// ---------- Gate Enforcement ----------

export function gateAllows(gate: SecurityGate, category: ToolCategory): 'execute' | 'confirm' | 'blocked' {
  switch (gate) {
    case 'plan_only':
      return category === 'read' ? 'execute' : 'blocked';
    case 'ask_each':
      return 'confirm';
    case 'auto_mode':
      return category === 'read' ? 'execute' : 'confirm';
    case 'yolo':
      return 'execute';
  }
}

// ---------- Tool Execution ----------

function executeListScreens(): string {
  const { screens } = useStore.getState();
  const result = screens.map((s, i) => ({
    index: i,
    name: s.name,
    buttonCount: s.buttons.flat().filter(Boolean).length,
  }));
  return JSON.stringify(result, null, 2);
}

function executeGetScreen(args: Record<string, unknown>): string {
  const idx = Number(args.screenIndex);
  const { screens } = useStore.getState();
  if (idx < 0 || idx >= screens.length) return JSON.stringify({ error: `Screen index ${idx} out of range (0-${screens.length - 1})` });
  const screen = screens[idx];
  const buttons = screen.buttons.map((row, r) =>
    row.map((btn, c) => btn ? { row: r, col: c, label: btn.label, command: btn.command, commandType: btn.commandType, color: btn.color } : null)
  );
  return JSON.stringify({ name: screen.name, buttons }, null, 2);
}

function executeGetButton(args: Record<string, unknown>): string {
  const si = Number(args.screenIndex);
  const r = Number(args.row);
  const c = Number(args.col);
  const { screens } = useStore.getState();
  if (si < 0 || si >= screens.length) return JSON.stringify({ error: 'Invalid screen index' });
  const btn = screens[si].buttons[r]?.[c];
  if (!btn) return JSON.stringify({ error: 'No button at that position', position: { row: r, col: c } });
  return JSON.stringify({ ...btn }, null, 2);
}

function executeListCommands(): string {
  const { screens } = useStore.getState();
  const commands: { screen: string; label: string; command: string; type: string }[] = [];
  screens.forEach((screen) => {
    screen.buttons.flat().filter(Boolean).forEach((btn) => {
      commands.push({ screen: screen.name, label: btn!.label, command: btn!.command, type: btn!.commandType });
    });
  });
  return JSON.stringify(commands, null, 2);
}

function executeGetState(): string {
  const { screens, currentScreenIndex, securityGate, llmConfig } = useStore.getState();
  return JSON.stringify({
    screenCount: screens.length,
    currentScreenIndex,
    currentScreenName: screens[currentScreenIndex]?.name,
    securityGate,
    provider: llmConfig.provider,
    model: llmConfig.model,
    screens: screens.map((s) => ({
      name: s.name,
      buttons: s.buttons.flat().filter(Boolean).length,
    })),
  }, null, 2);
}

function executeCreateButton(args: Record<string, unknown>): string {
  const si = Number(args.screenIndex);
  const r = Number(args.row);
  const c = Number(args.col);
  const { screens, setButton } = useStore.getState();
  if (si < 0 || si >= screens.length) return JSON.stringify({ error: 'Invalid screen index' });
  if (r < 0 || r > 4 || c < 0 || c > 2) return JSON.stringify({ error: 'Invalid position (row 0-4, col 0-2)' });

  const btn = {
    id: uuidv4(),
    label: String(args.label || 'New Button'),
    icon: String(args.icon || 'Terminal'),
    command: String(args.command || ''),
    commandType: (args.commandType as 'shell' | 'applescript' | 'terminal' | 'url') || 'shell',
    color: String(args.color || '#007AFF'),
    lastRun: null,
    createdAt: Date.now(),
  };
  setButton(si, r, c, btn);
  return JSON.stringify({ success: true, button: { row: r, col: c, label: btn.label } });
}

function executeUpdateButton(args: Record<string, unknown>): string {
  const si = Number(args.screenIndex);
  const r = Number(args.row);
  const c = Number(args.col);
  const { screens, updateButton } = useStore.getState();
  if (si < 0 || si >= screens.length) return JSON.stringify({ error: 'Invalid screen index' });
  const existing = screens[si].buttons[r]?.[c];
  if (!existing) return JSON.stringify({ error: 'No button at that position to update' });

  const updates: Record<string, unknown> = {};
  if (args.label !== undefined) updates.label = String(args.label);
  if (args.icon !== undefined) updates.icon = String(args.icon);
  if (args.command !== undefined) updates.command = String(args.command);
  if (args.commandType !== undefined) updates.commandType = args.commandType;
  if (args.color !== undefined) updates.color = String(args.color);

  updateButton(si, r, c, updates);
  return JSON.stringify({ success: true, updated: Object.keys(updates) });
}

function executeCreateScreen(args: Record<string, unknown>): string {
  const { addScreen, screens } = useStore.getState();
  addScreen(String(args.name || undefined));
  return JSON.stringify({ success: true, screenIndex: screens.length, name: args.name || `Screen ${screens.length + 1}` });
}

function executeRenameScreen(args: Record<string, unknown>): string {
  const si = Number(args.screenIndex);
  const { screens, renameScreen } = useStore.getState();
  if (si < 0 || si >= screens.length) return JSON.stringify({ error: 'Invalid screen index' });
  const name = String(args.name);
  renameScreen(si, name);
  return JSON.stringify({ success: true, screenIndex: si, newName: name });
}

function executeDeleteButton(args: Record<string, unknown>): string {
  const si = Number(args.screenIndex);
  const r = Number(args.row);
  const c = Number(args.col);
  const { screens, setButton } = useStore.getState();
  if (si < 0 || si >= screens.length) return JSON.stringify({ error: 'Invalid screen index' });
  const existing = screens[si].buttons[r]?.[c];
  if (!existing) return JSON.stringify({ error: 'No button at that position' });
  setButton(si, r, c, null);
  return JSON.stringify({ success: true, deleted: { row: r, col: c } });
}

function executeDeleteScreen(args: Record<string, unknown>): string {
  const si = Number(args.screenIndex);
  const { screens, removeScreen } = useStore.getState();
  if (si < 0 || si >= screens.length) return JSON.stringify({ error: 'Invalid screen index' });
  if (screens.length <= 1) return JSON.stringify({ error: 'Cannot delete the last screen' });
  const name = screens[si].name;
  removeScreen(si);
  return JSON.stringify({ success: true, deletedScreen: name });
}


function executeListCustomTools(): string {
  const { customTools } = useStore.getState();
  if (customTools.length === 0) return JSON.stringify({ tools: [], message: 'No custom tools registered. Use add_custom_tool or import_mcp_json to add tools.' });
  return JSON.stringify({
    tools: customTools.map((t) => ({
      name: t.name,
      description: t.description,
      category: t.category,
      endpointUrl: t.endpointUrl,
      method: t.method,
      enabled: t.enabled,
    })),
  }, null, 2);
}

function executeAddCustomTool(args: Record<string, unknown>): string {
  const { addCustomTool } = useStore.getState();
  const name = String(args.name);
  if (!name) return JSON.stringify({ error: 'Tool name is required' });

  const tool = {
    name,
    description: String(args.description || ''),
    inputSchema: (args.inputSchema as Record<string, unknown>) || { type: 'object', properties: {} },
    category: (args.category as ToolCategory) || 'write',
    endpointUrl: String(args.endpointUrl),
    method: (args.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'POST',
    headers: (args.headers as Record<string, string>) || {},
    enabled: true,
  };
  addCustomTool(tool);
  return JSON.stringify({ success: true, tool: { name: tool.name, endpointUrl: tool.endpointUrl } });
}

function executeRemoveCustomTool(args: Record<string, unknown>): string {
  const { customTools, removeCustomTool } = useStore.getState();
  const name = String(args.name);
  const existing = customTools.find((t) => t.name === name);
  if (!existing) return JSON.stringify({ error: `Custom tool '${name}' not found` });
  removeCustomTool(existing.id);
  return JSON.stringify({ success: true, removed: name });
}

function executeImportMcpJson(args: Record<string, unknown>): string {
  const { addCustomTool } = useStore.getState();
  const json = String(args.json);
  const endpointUrl = String(args.endpointUrl);
  if (!json || !endpointUrl) return JSON.stringify({ error: 'json and endpointUrl are required' });

  let parsed;
  try {
    parsed = parseMCPJson(json);
  } catch (err) {
    return JSON.stringify({ error: `Failed to parse MCP JSON: ${err instanceof Error ? err.message : 'Invalid JSON'}` });
  }

  if (parsed.length === 0) return JSON.stringify({ error: 'No tool definitions found in the provided JSON' });

  const method = (args.method as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'POST';
  const headers = (args.headers as Record<string, string>) || {};

  for (const t of parsed) {
    addCustomTool({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      category: t.category,
      endpointUrl,
      method,
      headers,
      enabled: true,
    });
  }

  return JSON.stringify({ success: true, imported: parsed.map((t) => t.name), endpointUrl });
}

// ---------- Logo Search ----------

async function executeSearchBrandLogo(args: Record<string, unknown>): Promise<string> {
  const query = String(args.query || '').trim();
  if (!query) return JSON.stringify({ error: 'query is required' });

  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`
    );
    if (!res.ok) return JSON.stringify({ error: `Clearbit API returned ${res.status}` });

    const suggestions = await res.json();
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return JSON.stringify({ error: `No brand found matching '${query}'` });
    }

    const best = suggestions[0];
    return JSON.stringify({
      success: true,
      brand: best.name,
      domain: best.domain,
      iconUrl: best.logo,
      tip: 'Use the iconUrl value as the icon parameter in update_button'
    }, null, 2);
  } catch (err) {
    return JSON.stringify({ error: `Logo search failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
  }
}

type ToolHandler = (args: Record<string, unknown>) => string | Promise<string>;

const HANDLERS: Record<string, ToolHandler> = {
  list_screens: executeListScreens,
  get_screen: executeGetScreen,
  get_button: executeGetButton,
  list_commands: executeListCommands,
  get_state: executeGetState,
  create_button: executeCreateButton,
  update_button: executeUpdateButton,
  create_screen: executeCreateScreen,
  rename_screen: executeRenameScreen,
  delete_button: executeDeleteButton,
  delete_screen: executeDeleteScreen,
  list_custom_tools: executeListCustomTools,
  add_custom_tool: executeAddCustomTool,
  remove_custom_tool: executeRemoveCustomTool,
  import_mcp_json: executeImportMcpJson,
  search_brand_logo: executeSearchBrandLogo,
};

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const handler = HANDLERS[name];
  if (!handler) return JSON.stringify({ error: `Unknown tool: ${name}` });
  return handler(args);
}

// ---------- Tool Schema Formatting for LLM APIs ----------

/** Format tool schemas for Anthropic API (uses input_schema) */
export function getAnthropicTools() {
  return Object.values(TOOL_SCHEMAS).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));
}

/** Format tool schemas for OpenAI-compatible APIs (uses parameters wrapped in function) */
export function getOpenAITools() {
  return Object.values(TOOL_SCHEMAS).map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

/** Check if a tool call needs human approval given the current gate */
export function needsApproval(toolCall: ToolCall, gate: SecurityGate): boolean {
  const category = categorizeTool(toolCall.name);
  return gateAllows(gate, category) === 'confirm';
}

/** Check if a tool call is blocked by the current gate */
export function isBlocked(toolCall: ToolCall, gate: SecurityGate): boolean {
  const category = categorizeTool(toolCall.name);
  return gateAllows(gate, category) === 'blocked';
}
