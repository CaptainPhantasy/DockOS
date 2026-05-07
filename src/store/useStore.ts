import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { AppState, Screen, LLMConfig, LLMProvider, SecurityGate, CustomTool } from '../types';
import { PROVIDER_CONFIGS } from '../types';

const createEmptyScreen = (name?: string, index?: number): Screen => ({
  id: uuidv4(),
  name: name || `Screen ${(index ?? 0) + 1}`,
  buttons: Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => null)),
});

const defaultLLMConfig: LLMConfig = {
  provider: 'openai' as LLMProvider,
  apiKey: '',
  model: PROVIDER_CONFIGS.openai.defaultModel,
  baseUrl: PROVIDER_CONFIGS.openai.defaultBaseUrl,
  temperature: 0.7,
  maxTokens: 2048,
};

export const useStore = create<AppState>()(
  persist(
    (set) => {
      const initialScreens = [createEmptyScreen('Home', 0)];

      return {
        screens: initialScreens,
        currentScreenIndex: 0,

        isPanelOpen: false,
        isSettingsOpen: false,
        isButtonEditorOpen: false,
        isLLMChatOpen: false,
        editingButton: null,

        llmConfig: defaultLLMConfig,
        securityGate: 'auto_mode' as SecurityGate,
        customTools: [] as CustomTool[],


        chatMessages: [],
        isLLMLoading: false,

        setPanelOpen: (open) => set({ isPanelOpen: open }),
        setSettingsOpen: (open) => set({ isSettingsOpen: open }),
        setButtonEditorOpen: (open) => set({ isButtonEditorOpen: open }),
        setLLMChatOpen: (open) => set({ isLLMChatOpen: open }),
        setEditingButton: (edit) => set({ editingButton: edit }),

        addScreen: (name) =>
          set((state) => {
            const newScreen = createEmptyScreen(name, state.screens.length);
            return { screens: [...state.screens, newScreen] };
          }),

        removeScreen: (index) =>
          set((state) => {
            if (state.screens.length <= 1) return state;
            const newScreens = state.screens.filter((_, i) => i !== index);
            const newIndex = Math.min(state.currentScreenIndex, newScreens.length - 1);
            return { screens: newScreens, currentScreenIndex: newIndex };
          }),

        setCurrentScreenIndex: (index) => set({ currentScreenIndex: index }),

        nextScreen: () =>
          set((state) => ({
            currentScreenIndex:
              state.currentScreenIndex < state.screens.length - 1
                ? state.currentScreenIndex + 1
                : 0,
          })),

        prevScreen: () =>
          set((state) => ({
            currentScreenIndex:
              state.currentScreenIndex > 0
                ? state.currentScreenIndex - 1
                : state.screens.length - 1,
          })),

        renameScreen: (index, name) =>
          set((state) => {
            const newScreens = [...state.screens];
            newScreens[index] = { ...newScreens[index], name };
            return { screens: newScreens };
          }),

        setButton: (screenIndex, row, col, button) =>
          set((state) => {
            const newScreens = [...state.screens];
            const screen = { ...newScreens[screenIndex] };
            const newButtons = screen.buttons.map((r) => [...r]);
            newButtons[row][col] = button;
            screen.buttons = newButtons;
            newScreens[screenIndex] = screen;
            return { screens: newScreens };
          }),

        updateButton: (screenIndex, row, col, updates) =>
          set((state) => {
            const newScreens = [...state.screens];
            const screen = { ...newScreens[screenIndex] };
            const newButtons = screen.buttons.map((r) => [...r]);
            const existing = newButtons[row][col];
            if (existing) {
              newButtons[row][col] = { ...existing, ...updates };
            }
            screen.buttons = newButtons;
            newScreens[screenIndex] = screen;
            return { screens: newScreens };
          }),

        updateLLMConfig: (config) =>
          set((state) => ({
            llmConfig: { ...state.llmConfig, ...config },
          })),

        updateSecurityGate: (gate) => set({ securityGate: gate }),

        addCustomTool: (tool) =>
          set((state) => ({
            customTools: [...state.customTools, { ...tool, id: uuidv4(), createdAt: Date.now() }],
          })),

        removeCustomTool: (id) =>
          set((state) => ({
            customTools: state.customTools.filter((t) => t.id !== id),
          })),

        toggleCustomTool: (id) =>
          set((state) => ({
            customTools: state.customTools.map((t) =>
              t.id === id ? { ...t, enabled: !t.enabled } : t
            ),
          })),

        updateCustomTool: (id, updates) =>
          set((state) => ({
            customTools: state.customTools.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          })),

        addChatMessage: (message) =>
          set((state) => ({
            chatMessages: [
              ...state.chatMessages,
              { ...message, id: uuidv4(), timestamp: Date.now() },
            ],
          })),

        clearChatMessages: () => set({ chatMessages: [] }),

        setLLMLoading: (loading) => set({ isLLMLoading: loading }),
      };
    },
    {
      name: 'streamdock-storage',
      partialize: (state) => ({
        screens: state.screens,
        currentScreenIndex: state.currentScreenIndex,
        llmConfig: state.llmConfig,
        securityGate: state.securityGate,
        chatMessages: state.chatMessages,
        customTools: state.customTools,
      }),
    }
  )
);
