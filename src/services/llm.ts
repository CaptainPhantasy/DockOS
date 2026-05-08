import type { LLMConfig, LLMProvider, ToolCall, ToolResult, SecurityGate } from '../types';
import { PROVIDER_CONFIGS } from '../types';
import {
  getAnthropicTools,
  getOpenAITools,
  executeTool,
  categorizeTool,
  isBlocked,
  needsApproval,
} from './tools';
import { getCustomAnthropicTools, getCustomOpenAITools, executeCustomTool, isCustomTool } from './customTools';

// ---------- LLM Message Types ----------

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_use_id?: string;
}

interface AnthropicContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

// ---------- Provider-Specific Calls ----------

async function callAnthropic(
  messages: LLMMessage[],
  config: LLMConfig,
  systemPrompt?: string,
  withTools?: boolean,
): Promise<{ text: string; toolCalls: ToolCall[]; stopReason: string }> {
  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: systemPrompt || 'You are a helpful assistant embedded in a Stream Deck app. You can manage screens and buttons via tool calls. Help the user automate their workflow.',
    messages: messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        // Handle tool results for Anthropic — send as user message with tool_result content blocks
        if (m.role === 'tool' && m.tool_use_id) {
          return {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: m.tool_use_id,
              content: m.content,
            }],
          };
        }
        // Handle assistant messages with tool calls — send as assistant with content blocks
        if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
          const contentBlocks: AnthropicContentBlock[] = [];
          if (m.content) {
            contentBlocks.push({ type: 'text', text: m.content });
          }
          m.tool_calls.forEach((tc) => {
            contentBlocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
          });
          return { role: 'assistant', content: contentBlocks };
        }
        return { role: m.role, content: m.content };
      }),
  };

  if (withTools) {
    body.tools = [...getAnthropicTools(), ...getCustomAnthropicTools()];
  }

  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const textParts: string[] = [];
  const toolCalls: ToolCall[] = [];

  for (const block of data.content || []) {
    if (block.type === 'text') {
      textParts.push(block.text);
    } else if (block.type === 'tool_use') {
      toolCalls.push({ id: block.id, name: block.name, input: block.input || {} });
    }
  }

  return {
    text: textParts.join('\n'),
    toolCalls,
    stopReason: data.stop_reason || 'end_turn',
  };
}

async function callOpenAI(
  messages: LLMMessage[],
  config: LLMConfig,
  systemPrompt?: string,
  withTools?: boolean,
): Promise<{ text: string; toolCalls: ToolCall[]; stopReason: string }> {
  const allMessages: LLMMessage[] = [
    {
      role: 'system',
      content: systemPrompt || 'You are a helpful assistant embedded in a Stream Deck app. You can manage screens and buttons via tool calls. Help the user automate their workflow.',
    },
    ...messages,
  ];

  // Convert our LLMMessage[] to OpenAI format
  const openaiMessages: unknown[] = allMessages.map((m) => {
    if (m.role === 'tool' && m.tool_use_id) {
      return { role: 'tool', tool_call_id: m.tool_use_id, content: m.content };
    }
    if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.input) },
        })),
      };
    }
    return { role: m.role, content: m.content };
  });

  const body: Record<string, unknown> = {
    model: config.model,
    max_completion_tokens: config.maxTokens,
    temperature: config.temperature,
    messages: openaiMessages,
  };

  if (withTools) {
    body.tools = [...getOpenAITools(), ...getCustomOpenAITools()];
  }

  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  const toolCalls: ToolCall[] = [];

  if (message?.tool_calls) {
    for (const tc of message.tool_calls) {
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(tc.function.arguments || '{}');
      } catch { /* leave input empty */ }
      toolCalls.push({ id: tc.id, name: tc.function.name, input });
    }
  }

  return {
    text: message?.content || '',
    toolCalls,
    stopReason: data.choices?.[0]?.finish_reason || 'stop',
  };
}

async function callOpenCode(
  messages: LLMMessage[],
  config: LLMConfig,
  systemPrompt?: string,
  withTools?: boolean,
): Promise<{ text: string; toolCalls: ToolCall[]; stopReason: string }> {
  // OpenCode uses OpenAI-compatible API
  return callOpenAI(messages, config, systemPrompt, withTools);
}

// ---------- Simple Text-Only Call (backward compat) ----------

export async function callLLM(
  messages: LLMMessage[],
  config: LLMConfig,
  systemPrompt?: string,
): Promise<string> {
  switch (config.provider) {
    case 'anthropic': {
      const result = await callAnthropic(messages, config, systemPrompt, false);
      return result.text;
    }
    case 'openai': {
      const result = await callOpenAI(messages, config, systemPrompt, false);
      return result.text;
    }
    case 'opencode': {
      const result = await callOpenCode(messages, config, systemPrompt, false);
      return result.text;
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

// ---------- Agentic Tool-Use Loop ----------

export interface ToolApprovalCallback {
  (toolCall: ToolCall, gate: SecurityGate): Promise<boolean>;
}

export interface AgenticResult {
  text: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  allToolCalls: ToolCall[];
  allToolResults: ToolResult[];
}

export async function callLLMWithTools(
  messages: LLMMessage[],
  config: LLMConfig,
  gate: SecurityGate,
  systemPrompt?: string,
  onToolCall?: (tc: ToolCall, category: string) => void,
  onToolResult?: (tr: ToolResult) => void,
  onApprovalNeeded?: (tc: ToolCall) => Promise<boolean>,
): Promise<AgenticResult> {
  const providerFn = config.provider === 'anthropic' ? callAnthropic : callOpenAI;

  const workingMessages = [...messages];
  const allToolCalls: ToolCall[] = [];
  const allToolResults: ToolResult[] = [];
  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const result = await providerFn(workingMessages, config, systemPrompt, true);

    // No tool calls — done
    if (result.toolCalls.length === 0) {
      return { text: result.text, toolCalls: [], toolResults: [], allToolCalls, allToolResults };
    }

    // Has tool calls — process them
    const toolResultMessages: LLMMessage[] = [];

    // Add the assistant message with tool calls to conversation history
    workingMessages.push({
      role: 'assistant',
      content: result.text,
      tool_calls: result.toolCalls,
    });

    for (const tc of result.toolCalls) {
      allToolCalls.push(tc);
      onToolCall?.(tc, categorizeTool(tc.name));

      // Check if blocked by gate
      if (isBlocked(tc, gate)) {
        const blockedResult: ToolResult = {
          tool_use_id: tc.id,
          content: JSON.stringify({ error: `Blocked by security policy (${gate}). This tool requires a higher security gate.` }),
          is_error: true,
        };
        allToolResults.push(blockedResult);
        toolResultMessages.push({
          role: 'tool',
          tool_use_id: tc.id,
          content: blockedResult.content,
        });
        onToolResult?.(blockedResult);
        continue;
      }

      // Check if needs approval
      if (needsApproval(tc, gate)) {
        const approved = onApprovalNeeded ? await onApprovalNeeded(tc) : false;
        if (!approved) {
          const deniedResult: ToolResult = {
            tool_use_id: tc.id,
            content: JSON.stringify({ error: 'User denied this tool call.' }),
            is_error: true,
          };
          allToolResults.push(deniedResult);
          toolResultMessages.push({
            role: 'tool',
            tool_use_id: tc.id,
            content: deniedResult.content,
          });
          onToolResult?.(deniedResult);
          continue;
        }
      }

      // Execute the tool
      try {
        // Route to custom tool HTTP execution or built-in handler
        const output = isCustomTool(tc.name)
          ? await executeCustomTool(tc.name, tc.input)
          : await executeTool(tc.name, tc.input);
        const tr: ToolResult = { tool_use_id: tc.id, content: output };
        allToolResults.push(tr);
        toolResultMessages.push({ role: 'tool', tool_use_id: tc.id, content: output });
        onToolResult?.(tr);
      } catch (err) {
        const errResult: ToolResult = {
          tool_use_id: tc.id,
          content: JSON.stringify({ error: err instanceof Error ? err.message : 'Tool execution failed' }),
          is_error: true,
        };
        allToolResults.push(errResult);
        toolResultMessages.push({
          role: 'tool',
          tool_use_id: tc.id,
          content: errResult.content,
        });
        onToolResult?.(errResult);
      }
    }

    // Add tool results to conversation and continue loop
    workingMessages.push(...toolResultMessages);
  }

  // If we exhausted iterations, return whatever we have
  return { text: '', toolCalls: [], toolResults: [], allToolCalls, allToolResults };
}

// ---------- Config Utilities ----------

export function validateConfig(config: LLMConfig): string | null {
  if (!config.apiKey.trim()) {
    return 'API key is required';
  }
  if (!config.model.trim()) {
    return 'Model name is required';
  }
  if (!config.baseUrl.trim()) {
    return 'Base URL is required';
  }
  return null;
}

export function getDefaultConfigForProvider(provider: LLMProvider): Partial<LLMConfig> {
  const pc = PROVIDER_CONFIGS[provider];
  return {
    provider,
    model: pc.defaultModel,
    baseUrl: pc.defaultBaseUrl,
  };
}
