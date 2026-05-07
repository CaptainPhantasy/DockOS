export type LLMProvider = 'anthropic' | 'openai' | 'opencode';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
}

export interface DockButton {
  id: string;
  label: string;
  icon: string;
  command: string;
  commandType: 'shell' | 'applescript' | 'terminal' | 'url';
  color: string;
  lastRun: number | null;
  createdAt: number;
}

export interface Screen {
  id: string;
  name: string;
  buttons: (DockButton | null)[][];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AppState {
  // Screen management
  screens: Screen[];
  currentScreenIndex: number;

  // UI State
  isPanelOpen: boolean;
  isSettingsOpen: boolean;
  isButtonEditorOpen: boolean;
  isLLMChatOpen: boolean;
  editingButton: { screenIndex: number; row: number; col: number } | null;

  // LLM Config
  llmConfig: LLMConfig;

  // Chat history
  chatMessages: ChatMessage[];
  isLLMLoading: boolean;

  // Actions
  setPanelOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setButtonEditorOpen: (open: boolean) => void;
  setLLMChatOpen: (open: boolean) => void;
  setEditingButton: (edit: { screenIndex: number; row: number; col: number } | null) => void;

  addScreen: (name?: string) => void;
  removeScreen: (index: number) => void;
  setCurrentScreenIndex: (index: number) => void;
  nextScreen: () => void;
  prevScreen: () => void;
  renameScreen: (index: number, name: string) => void;

  setButton: (screenIndex: number, row: number, col: number, button: DockButton | null) => void;
  updateButton: (screenIndex: number, row: number, col: number, updates: Partial<DockButton>) => void;

  updateLLMConfig: (config: Partial<LLMConfig>) => void;

  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChatMessages: () => void;
  setLLMLoading: (loading: boolean) => void;
}

export const DEFAULT_BUTTON_COLORS = [
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF3B30',
  '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#64D2FF',
  '#30B0C7', '#00C7BE', '#FF6B6B', '#A2845E', '#8E8E93',
];

export const DEFAULT_ICONS = [
  'Terminal', 'Globe', 'Folder', 'FileText', 'Settings',
  'Play', 'Zap', 'Command', 'Code', 'GitBranch',
  'Database', 'Server', 'Cpu', 'Monitor', 'HardDrive',
  'Wifi', 'Lock', 'Key', 'Shield', 'Bug',
  'Package', 'Layers', 'Box', 'Coffee', 'Rocket',
  'Star', 'Heart', 'Music', 'Camera', 'Bell',
  'Calendar', 'Clock', 'Map', 'Phone', 'Mail',
];

export const PROVIDER_CONFIGS: Record<LLMProvider, { name: string; defaultModel: string; defaultBaseUrl: string }> = {
  anthropic: {
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    defaultBaseUrl: 'https://api.anthropic.com',
  },
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    defaultBaseUrl: 'https://api.openai.com',
  },
  opencode: {
    name: 'OpenCode GO',
    defaultModel: 'default',
    defaultBaseUrl: 'http://localhost:8080',
  },
};
