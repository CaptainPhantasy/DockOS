import type { LLMConfig, LLMProvider } from '../types';
import { PROVIDER_CONFIGS } from '../types';

interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

async function callAnthropic(
  messages: LLMMessage[],
  config: LLMConfig,
  systemPrompt?: string
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt || 'You are a helpful assistant that generates macOS shell commands, AppleScripts, and automation scripts.',
      messages: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function callOpenAI(
  messages: LLMMessage[],
  config: LLMConfig,
  systemPrompt?: string
): Promise<string> {
  const allMessages: LLMMessage[] = [
    {
      role: 'system',
      content:
        systemPrompt ||
        'You are a helpful assistant that generates macOS shell commands, AppleScripts, and automation scripts.',
    },
    ...messages,
  ];

  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: allMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenCode(
  messages: LLMMessage[],
  config: LLMConfig,
  systemPrompt?: string
): Promise<string> {
  const allMessages: LLMMessage[] = [
    {
      role: 'system',
      content:
        systemPrompt ||
        'You are a helpful assistant that generates macOS shell commands, AppleScripts, and automation scripts.',
    },
    ...messages,
  ];

  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: allMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenCode GO API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || data.response || '';
}

export async function callLLM(
  messages: LLMMessage[],
  config: LLMConfig,
  systemPrompt?: string
): Promise<string> {
  switch (config.provider) {
    case 'anthropic':
      return callAnthropic(messages, config, systemPrompt);
    case 'openai':
      return callOpenAI(messages, config, systemPrompt);
    case 'opencode':
      return callOpenCode(messages, config, systemPrompt);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

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
