import type { ToolCategory } from '../types';
import { useStore } from '../store/useStore';

// ---------- Schema Merging ----------

/** Get custom tools formatted for Anthropic API */
export function getCustomAnthropicTools(): { name: string; description: string; input_schema: Record<string, unknown> }[] {
  const { customTools } = useStore.getState();
  return customTools
    .filter((t) => t.enabled)
    .map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
}

/** Get custom tools formatted for OpenAI-compatible API */
export function getCustomOpenAITools(): { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }[] {
  const { customTools } = useStore.getState();
  return customTools
    .filter((t) => t.enabled)
    .map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
}

// ---------- Custom Tool Execution ----------

/** Execute a custom tool by making an HTTP request to its endpoint */
export async function executeCustomTool(name: string, args: Record<string, unknown>): Promise<string> {
  const { customTools } = useStore.getState();
  const tool = customTools.find((t) => t.name === name && t.enabled);
  if (!tool) return JSON.stringify({ error: `Unknown custom tool: ${name}` });

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...tool.headers,
    };

    const response = await fetch(tool.endpointUrl, {
      method: tool.method,
      headers,
      body: tool.method !== 'GET' ? JSON.stringify(args) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      return JSON.stringify({ error: `Custom tool '${name}' returned ${response.status}: ${text}` });
    }

    const data = await response.json();
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  } catch (err) {
    return JSON.stringify({ error: `Custom tool '${name}' request failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
  }
}

/** Check if a tool name is a custom tool (not built-in) */
export function isCustomTool(name: string): boolean {
  const { customTools } = useStore.getState();
  return customTools.some((t) => t.name === name);
}

// ---------- Auto-Detect ----------

export interface DetectedServer {
  url: string;
  name: string;
  tools?: Array<{ name: string; description: string }>;
  status: 'online' | 'error';
}

/** Scan common MCP server ports for available tools */
export async function autoDetectLocalServers(): Promise<DetectedServer[]> {
  // Common MCP server ports and paths to scan
  const endpoints = [
    { url: 'http://localhost:3000', name: 'localhost:3000' },
    { url: 'http://localhost:3001', name: 'localhost:3001' },
    { url: 'http://localhost:4000', name: 'localhost:4000' },
    { url: 'http://localhost:5000', name: 'localhost:5000' },
    { url: 'http://localhost:5173', name: 'localhost:5173' },
    { url: 'http://localhost:5174', name: 'localhost:5174' },
    { url: 'http://localhost:8000', name: 'localhost:8000' },
    { url: 'http://localhost:8080', name: 'localhost:8080' },
    { url: 'http://localhost:8088', name: 'localhost:8088' },
    { url: 'http://localhost:8787', name: 'localhost:8787' },
    { url: 'http://localhost:9000', name: 'localhost:9000' },
    { url: 'http://localhost:9090', name: 'localhost:9090' },
    { url: 'http://localhost:9292', name: 'localhost:9292' },
    { url: 'http://localhost:9999', name: 'localhost:9999' },
    { url: 'http://localhost:11434', name: 'Ollama' },
    { url: 'http://localhost:6333', name: 'Qdrant' },
    { url: 'http://localhost:27017', name: 'MongoDB' },
    { url: 'http://localhost:7474', name: 'Neo4j' },
  ];

  const results: DetectedServer[] = [];

  // Scan all endpoints in parallel with a short timeout
  const checks = endpoints.map(async (ep) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      // Try /tools endpoint first (common MCP pattern)
      const res = await fetch(`${ep.url}/tools`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      }).catch(() => null);

      clearTimeout(timeout);

      if (res && res.ok) {
        let tools: Array<{ name: string; description: string }> | undefined;
        try {
          const data = await res.json();
          if (Array.isArray(data)) {
            tools = data.map((t: any) => ({ name: t.name || t.function?.name || 'unknown', description: t.description || t.function?.description || '' }));
          } else if (data.tools && Array.isArray(data.tools)) {
            tools = data.tools.map((t: any) => ({ name: t.name || t.function?.name || 'unknown', description: t.description || t.function?.description || '' }));
          }
        } catch { /* not JSON, that's fine */ }

        results.push({ url: ep.url, name: ep.name, tools, status: 'online' });
        return;
      }

      // Fallback: just try the root to see if something is listening
      const rootController = new AbortController();
      const rootTimeout = setTimeout(() => rootController.abort(), 2000);
      const rootRes = await fetch(ep.url, {
        signal: rootController.signal,
      }).catch(() => null);
      clearTimeout(rootTimeout);

      if (rootRes) {
        results.push({ url: ep.url, name: ep.name, status: 'online' });
      }
    } catch {
      // Server not reachable — skip
    }
  });

  await Promise.allSettled(checks);
  return results;
}

// ---------- MCP JSON Import ----------

export interface ParsedMCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  category: ToolCategory;
}

/** Parse an MCP JSON string and extract tool definitions.
 *  Accepts both Anthropic format ({ tools: [{ name, description, input_schema }] })
 *  and OpenAI format ({ tools: [{ type: "function", function: { name, description, parameters } }] })
 *  and also raw tool objects or arrays of them.
 */
export function parseMCPJson(json: string): ParsedMCPTool[] {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON. Please paste valid MCP tool definition JSON.');
  }

  const tools: ParsedMCPTool[] = [];

  // Handle array of tools
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      extractTool(item, tools);
    }
    return tools;
  }

  // Handle { tools: [...] } wrapper
  if (parsed.tools && Array.isArray(parsed.tools)) {
    for (const item of parsed.tools) {
      extractTool(item, tools);
    }
    return tools;
  }

  // Handle single tool object
  extractTool(parsed, tools);
  return tools;
}

function extractTool(item: any, tools: ParsedMCPTool[]): void {
  // Anthropic format: { name, description, input_schema }
  if (item.name && item.input_schema) {
    tools.push({
      name: item.name,
      description: item.description || '',
      inputSchema: item.input_schema,
      category: guessCategory(item.name),
    });
    return;
  }

  // OpenAI format: { type: "function", function: { name, description, parameters } }
  if (item.function && item.function.name) {
    tools.push({
      name: item.function.name,
      description: item.function.description || '',
      inputSchema: item.function.parameters || { type: 'object', properties: {} },
      category: guessCategory(item.function.name),
    });
    return;
  }

  // Raw format: { name, description, parameters/inputSchema }
  if (item.name) {
    tools.push({
      name: item.name,
      description: item.description || '',
      inputSchema: item.parameters || item.inputSchema || item.input_schema || { type: 'object', properties: {} },
      category: guessCategory(item.name),
    });
  }
}

function guessCategory(name: string): ToolCategory {
  const lower = name.toLowerCase();
  if (lower.includes('delete') || lower.includes('remove') || lower.includes('destroy')) return 'destructive';
  if (lower.includes('get') || lower.includes('list') || lower.includes('search') || lower.includes('find') || lower.includes('read') || lower.includes('status') || lower.includes('health') || lower.includes('check')) return 'read';
  return 'write';
}
