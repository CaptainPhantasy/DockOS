import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Terminal, Globe, FileText, Code } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import type { DockButton } from '../types';
import { DEFAULT_BUTTON_COLORS, DEFAULT_ICONS } from '../types';
import { callLLM, validateConfig } from '../services/llm';

interface ButtonEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMAND_TYPES = [
  { value: 'shell', label: 'Shell Command', icon: Terminal, desc: 'macOS terminal commands' },
  { value: 'applescript', label: 'AppleScript', icon: Code, desc: 'Apple automation scripts' },
  { value: 'terminal', label: 'Terminal Script', icon: FileText, desc: 'Multi-line terminal scripts' },
  { value: 'url', label: 'URL / Link', icon: Globe, desc: 'Open URLs in browser' },
] as const;

export const ButtonEditor: React.FC<ButtonEditorProps> = ({ isOpen, onClose }) => {
  const editingButton = useStore((s) => s.editingButton);
  const screens = useStore((s) => s.screens);
  const setButton = useStore((s) => s.setButton);
  const llmConfig = useStore((s) => s.llmConfig);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const setLLMLoading = useStore((s) => s.setLLMLoading);
  const isLLMLoading = useStore((s) => s.isLLMLoading);
  const setButtonEditorOpen = useStore((s) => s.setButtonEditorOpen);

  const existingButton: DockButton | null =
    editingButton
      ? screens[editingButton.screenIndex]?.buttons[editingButton.row]?.[editingButton.col]
      : null;

  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('Terminal');
  const [command, setCommand] = useState('');
  const [commandType, setCommandType] = useState<DockButton['commandType']>('shell');
  const [color, setColor] = useState('#007AFF');
  const [llmPrompt, setLlmPrompt] = useState('');
  const [error, setError] = useState('');
  const [iconSearch, setIconSearch] = useState('');

  useEffect(() => {
    if (existingButton) {
      setLabel(existingButton.label);
      setIcon(existingButton.icon);
      setCommand(existingButton.command);
      setCommandType(existingButton.commandType);
      setColor(existingButton.color);
    } else {
      setLabel('');
      setIcon('Terminal');
      setCommand('');
      setCommandType('shell');
      setColor('#007AFF');
    }
    setLlmPrompt('');
    setError('');
  }, [existingButton, editingButton]);

  const handleSave = useCallback(() => {
    if (!editingButton || !label.trim()) return;
    const btn: DockButton = {
      id: existingButton?.id || uuidv4(),
      label: label.trim(),
      icon,
      command: command.trim(),
      commandType,
      color,
      lastRun: existingButton?.lastRun || null,
      createdAt: existingButton?.createdAt || Date.now(),
    };
    setButton(editingButton.screenIndex, editingButton.row, editingButton.col, btn);
    onClose();
  }, [editingButton, label, icon, command, commandType, color, existingButton, setButton, onClose]);

  const handleDelete = useCallback(() => {
    if (!editingButton) return;
    setButton(editingButton.screenIndex, editingButton.row, editingButton.col, null);
    onClose();
  }, [editingButton, setButton, onClose]);

  const handleGenerateCommand = useCallback(async () => {
    if (!llmPrompt.trim()) return;
    const configError = validateConfig(llmConfig);
    if (configError) {
      setError(configError);
      return;
    }

    setLLMLoading(true);
    setError('');

    try {
      addChatMessage({ role: 'user', content: llmPrompt });
      const systemPrompt = `You are an expert macOS automation assistant. Generate ONLY the raw command/script for the following request. No explanations, no markdown formatting, no code blocks. Just the raw command that can be directly executed. If it's an AppleScript, provide the complete script. If it's a shell command, provide just the command. If it's a URL, provide just the URL.`;

      const response = await callLLM(
        [{ role: 'user', content: llmPrompt }],
        llmConfig,
        systemPrompt
      );

      const cleanedCommand = response
        .replace(/```[\s\S]*?\n/g, '')
        .replace(/```/g, '')
        .trim();

      setCommand(cleanedCommand);
      addChatMessage({ role: 'assistant', content: cleanedCommand });
      setLlmPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate command');
    } finally {
      setLLMLoading(false);
    }
  }, [llmPrompt, llmConfig, addChatMessage, setLLMLoading]);

  if (!editingButton) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setButtonEditorOpen(false);
            onClose();
          }}
        >
          <motion.div
            className="modal-content glass-panel"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3 className="modal-title">
                {existingButton ? 'Edit Button' : 'Create Button'}
              </h3>
              <motion.button
                className="modal-close"
                onClick={() => {
                  setButtonEditorOpen(false);
                  onClose();
                }}
                whileHover={{ scale: 1.1, opacity: 0.7 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Label */}
              <div className="field-group">
                <label className="field-label">Label</label>
                <input
                  type="text"
                  className="field-input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Button label..."
                />
              </div>

              {/* Command Type */}
              <div className="field-group">
                <label className="field-label">Command Type</label>
                <div className="command-type-grid">
                  {COMMAND_TYPES.map((ct) => (
                    <motion.button
                      key={ct.value}
                      className={`command-type-btn ${commandType === ct.value ? 'active' : ''}`}
                      onClick={() => setCommandType(ct.value as DockButton['commandType'])}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <ct.icon size={16} />
                      <div>
                        <div className="command-type-label">{ct.label}</div>
                        <div className="command-type-desc">{ct.desc}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Command */}
              <div className="field-group">
                <label className="field-label">Command / Script</label>
                <textarea
                  className="field-textarea"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder={
                    commandType === 'shell'
                      ? 'e.g., open -a "Safari"'
                      : commandType === 'applescript'
                        ? 'e.g., tell application "Finder" to activate'
                        : commandType === 'url'
                          ? 'e.g., https://github.com'
                          : 'Enter your script here...'
                  }
                  rows={4}
                />
              </div>

              {/* LLM Generate */}
              <div className="field-group">
                <label className="field-label">
                  <Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  AI Generate Command
                </label>
                <div className="llm-generate-row">
                  <input
                    type="text"
                    className="field-input flex-1"
                    value={llmPrompt}
                    onChange={(e) => setLlmPrompt(e.target.value)}
                    placeholder='e.g., "Open Safari and navigate to GitHub"'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGenerateCommand();
                    }}
                    disabled={isLLMLoading}
                  />
                  <motion.button
                    className="btn-primary"
                    onClick={handleGenerateCommand}
                    disabled={isLLMLoading || !llmPrompt.trim()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isLLMLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    Generate
                  </motion.button>
                </div>
                {error && <div className="field-error">{error}</div>}
              </div>

              {/* Icon */}
              <div className="field-group">
                <label className="field-label">Icon</label>
                <input
                  className="field-input icon-search"
                  type="text"
                  placeholder="Search icons..."
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                />
                <div className="icon-grid">
                  {DEFAULT_ICONS
                    .filter((name) => !iconSearch || name.toLowerCase().includes(iconSearch.toLowerCase()))
                    .slice(0, iconSearch ? 36 : 20)
                    .map((iconName) => {
                    const Icon = (LucideIcons as any)[iconName];
                    return (
                      <motion.button
                        key={iconName}
                        className={`icon-btn ${icon === iconName ? 'active' : ''}`}
                        onClick={() => { setIcon(iconName); setIconSearch(''); }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        title={iconName}
                      >
                        {Icon ? <Icon size={16} strokeWidth={1.5} /> : <span className="icon-name">{iconName}</span>}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <div className="field-group">
                <label className="field-label">Color</label>
                <div className="color-grid">
                  {DEFAULT_BUTTON_COLORS.map((c) => (
                    <motion.button
                      key={c}
                      className={`color-btn ${color === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {color === c && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="color-check"
                        >
                          ✓
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Preview */}
            {label.trim() && (() => {
              const PreviewIcon = (LucideIcons as any)[icon] || LucideIcons.Command;
              return (
                <div className="button-preview-bar">
                  <span className="field-label">Preview</span>
                  <div
                    className="dock-btn dock-btn-filled button-preview"
                    style={{
                      background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
                      borderColor: `${color}66`,
                    }}
                  >
                    <div className="btn-content" style={{ transform: 'none' }}>
                      <PreviewIcon size={22} strokeWidth={1.5} />
                      <span className="btn-label">{label}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div className="modal-footer">
              {existingButton && (
                <motion.button
                  className="btn-danger"
                  onClick={handleDelete}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Delete
                </motion.button>
              )}
              <div className="footer-spacer" />
              <motion.button
                className="btn-secondary"
                onClick={() => {
                  setButtonEditorOpen(false);
                  onClose();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </motion.button>
              <motion.button
                className="btn-primary"
                onClick={handleSave}
                disabled={!label.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {existingButton ? 'Update' : 'Create'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ButtonEditor;
