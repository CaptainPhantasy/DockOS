import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Trash2, Sparkles, Copy, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { callLLM, validateConfig } from '../services/llm';

interface LLMChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LLMChat: React.FC<LLMChatProps> = ({ isOpen, onClose }) => {
  const chatMessages = useStore((s) => s.chatMessages);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const clearChatMessages = useStore((s) => s.clearChatMessages);
  const llmConfig = useStore((s) => s.llmConfig);
  const isLLMLoading = useStore((s) => s.isLLMLoading);
  const setLLMLoading = useStore((s) => s.setLLMLoading);

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLLMLoading) return;
    const configError = validateConfig(llmConfig);
    if (configError) {
      setError(configError);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setError('');
    addChatMessage({ role: 'user', content: userMessage });
    setLLMLoading(true);

    try {
      const systemPrompt = `You are an expert macOS automation assistant embedded in a Stream Dock application. Help the user generate shell commands, AppleScripts, terminal scripts, and automation workflows. Be concise and provide directly executable commands. When suggesting commands, put them in a clear format.`;

      const recentMessages = chatMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await callLLM(
        [...recentMessages, { role: 'user', content: userMessage }],
        llmConfig,
        systemPrompt
      );

      addChatMessage({ role: 'assistant', content: response });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      addChatMessage({
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`,
      });
    } finally {
      setLLMLoading(false);
    }
  }, [input, isLLMLoading, llmConfig, chatMessages, addChatMessage, setLLMLoading]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-content glass-panel chat-modal"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                <Sparkles size={16} /> AI Assistant
              </h3>
              <div className="header-actions">
                <motion.button
                  className="btn-icon"
                  onClick={clearChatMessages}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Clear chat"
                >
                  <Trash2 size={16} />
                </motion.button>
                <motion.button
                  className="modal-close"
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={18} />
                </motion.button>
              </div>
            </div>

            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div className="chat-empty">
                  <Sparkles size={32} className="text-white/20" />
                  <p className="text-white/40 text-sm text-center">
                    Ask me to generate commands, scripts, or automation workflows for your Stream Dock.
                  </p>
                </div>
              )}
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`chat-message ${msg.role}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="chat-message-content">
                    {msg.content.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < msg.content.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  {msg.role === 'assistant' && (
                    <motion.button
                      className="chat-copy-btn"
                      onClick={() => handleCopy(msg.content, msg.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {copiedId === msg.id ? (
                        <Check size={12} className="text-green-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </motion.button>
                  )}
                </motion.div>
              ))}
              {isLLMLoading && (
                <motion.div
                  className="chat-message assistant"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="chat-loading">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              {error && (
                <motion.div
                  className="field-error"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}
              <div className="chat-input-row">
                <input
                  ref={inputRef}
                  type="text"
                  className="field-input flex-1"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me to generate a command..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  disabled={isLLMLoading}
                />
                <motion.button
                  className="btn-primary chat-send-btn"
                  onClick={handleSend}
                  disabled={isLLMLoading || !input.trim()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isLLMLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LLMChat;
