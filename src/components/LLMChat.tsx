import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Trash2, Sparkles, Copy, Check, ChevronDown, ChevronRight, Shield, ShieldAlert, ShieldCheck, ShieldOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import { callLLMWithTools, validateConfig } from '../services/llm';
import { categorizeTool, isBlocked } from '../services/tools';
import type { ToolCall, ToolResult, SecurityGate, ChatMessage } from '../types';
import { SECURITY_GATE_INFO } from '../types';
import { buildSystemPrompt } from '../services/systemPrompt';

interface LLMChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const GateIcon: React.FC<{ gate: SecurityGate; size?: number }> = ({ gate, size = 12 }) => {
  switch (gate) {
    case 'plan_only': return <ShieldOff size={size} />;
    case 'ask_each': return <ShieldAlert size={size} />;
    case 'auto_mode': return <Shield size={size} />;
    case 'yolo': return <ShieldCheck size={size} />;
  }
};

const ToolCallBlock: React.FC<{
  toolCall: ToolCall;
  result?: ToolResult;
  gate: SecurityGate;
  onApprove?: () => void;
  onDeny?: () => void;
  waitingForApproval?: boolean;
}> = ({ toolCall, result, gate, onApprove, onDeny, waitingForApproval }) => {
  const [expanded, setExpanded] = useState(false);
  const category = categorizeTool(toolCall.name);
  const blocked = isBlocked(toolCall, gate);

  const categoryColors: Record<string, string> = {
    read: '#007AFF',
    write: '#FF9500',
    destructive: '#FF3B30',
  };

  return (
    <div className={`tool-call-block ${blocked ? 'blocked' : ''} ${category}`}>
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-call-toggle">{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
        <span className="security-badge" style={{ background: categoryColors[category] || '#8E8E93' }}>
          {category}
        </span>
        <span className="tool-call-name">{toolCall.name.replace(/_/g, ' ')}</span>
        {blocked && <span className="tool-call-status blocked">BLOCKED</span>}
        {waitingForApproval && <span className="tool-call-status pending">PENDING</span>}
        {result && !result.is_error && <span className="tool-call-status success">DONE</span>}
        {result?.is_error && <span className="tool-call-status error">ERROR</span>}
      </div>

      {expanded && (
        <div className="tool-call-body">
          <div className="tool-call-args">
            <span className="tool-call-label">Input:</span>
            <pre>{JSON.stringify(toolCall.input, null, 2)}</pre>
          </div>
          {result && (
            <div className={`tool-call-result ${result.is_error ? 'error' : ''}`}>
              <span className="tool-call-label">Output:</span>
              <pre>{result.content}</pre>
            </div>
          )}
        </div>
      )}

      {waitingForApproval && onApprove && onDeny && (
        <div className="tool-approval-prompt">
          <span>Allow this action?</span>
          <div className="tool-approval-buttons">
            <motion.button
              className="btn-primary tool-approve-btn"
              onClick={onApprove}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Approve
            </motion.button>
            <motion.button
              className="btn-danger tool-deny-btn"
              onClick={onDeny}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Deny
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export const LLMChat: React.FC<LLMChatProps> = ({ isOpen, onClose }) => {
  const chatMessages = useStore((s) => s.chatMessages);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const clearChatMessages = useStore((s) => s.clearChatMessages);
  const llmConfig = useStore((s) => s.llmConfig);
  const securityGate = useStore((s) => s.securityGate);
  const isLLMLoading = useStore((s) => s.isLLMLoading);
  const setLLMLoading = useStore((s) => s.setLLMLoading);

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Pending approvals: tool_use_id -> { resolve, toolCall }
  const [pendingApprovals, setPendingApprovals] = useState<Map<string, { resolve: (v: boolean) => void; toolCall: ToolCall }>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const approvalResolverRef = useRef<Map<string, (v: boolean) => void>>(new Map());
  const isUserScrolledRef = useRef(false);

  // Smart auto-scroll: scrolls on new messages, respects user scroll
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (isUserScrolledRef.current) return;
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior,
    });
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [chatMessages, scrollToBottom]);

  // MutationObserver for content changes within messages (markdown rendering, etc)
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      if (!isUserScrolledRef.current) {
        scrollToBottom('auto');
      }
    });

    observer.observe(container, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [scrollToBottom]);

  // Detect user scroll (pause auto-scroll when user scrolls up)
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!container) return;
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
      isUserScrolledRef.current = !atBottom;
      // If user scrolls to bottom, resume auto-scroll
      if (atBottom) isUserScrolledRef.current = false;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleApproval = useCallback((toolUseId: string, approved: boolean) => {
    const resolver = approvalResolverRef.current.get(toolUseId);
    if (resolver) {
      resolver(approved);
      approvalResolverRef.current.delete(toolUseId);
    }
    setPendingApprovals((prev) => {
      const next = new Map(prev);
      next.delete(toolUseId);
      return next;
    });
  }, []);

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
      const { customTools } = useStore.getState();
      const systemPrompt = buildSystemPrompt(customTools.map((t) => t.name));

      const recentMessages = chatMessages.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      const result = await callLLMWithTools(
        [...recentMessages, { role: 'user', content: userMessage }],
        llmConfig,
        securityGate,
        systemPrompt,
        // onToolCall — add intermediate messages to chat
        (tc, _category) => {
          addChatMessage({
            role: 'assistant',
            content: '',
            toolCalls: [tc],
          });
        },
        // onToolResult — add result to chat
        (tr) => {
          addChatMessage({
            role: 'assistant',
            content: '',
            toolResults: [tr],
          });
        },
        // onApprovalNeeded — show approval UI and wait
        async (tc) => {
          return new Promise<boolean>((resolve) => {
            approvalResolverRef.current.set(tc.id, resolve);
            setPendingApprovals((prev) => {
              const next = new Map(prev);
              next.set(tc.id, { resolve, toolCall: tc });
              return next;
            });
          });
        },
      );

      // Add the final text response
      if (result.text) {
        addChatMessage({ role: 'assistant', content: result.text });
      } else if (result.allToolCalls.length > 0 && !result.text) {
        // If the LLM only made tool calls without text, add a summary
        addChatMessage({ role: 'assistant', content: `Completed ${result.allToolCalls.length} action(s).` });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      addChatMessage({
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`,
      });
    } finally {
      setLLMLoading(false);
    }
  }, [input, isLLMLoading, llmConfig, chatMessages, addChatMessage, setLLMLoading, securityGate]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  const gateInfo = SECURITY_GATE_INFO[securityGate];

  const renderMessage = (msg: ChatMessage) => {
    // Tool call message (no text, just tool calls)
    if (msg.toolCalls && msg.toolCalls.length > 0 && !msg.content) {
      return msg.toolCalls.map((tc) => (
        <ToolCallBlock
          key={tc.id}
          toolCall={tc}
          gate={securityGate}
          waitingForApproval={pendingApprovals.has(tc.id)}
          onApprove={() => handleApproval(tc.id, true)}
          onDeny={() => handleApproval(tc.id, false)}
        />
      ));
    }

    // Tool result message
    if (msg.toolResults && msg.toolResults.length > 0 && !msg.content) {
      return msg.toolResults.map((tr) => {
        // Find the corresponding tool call from previous messages
        const tcId = tr.tool_use_id;
        return (
          <div key={tcId} className="tool-call-block result-only">
            <div className="tool-call-result-compact">
              {tr.is_error ? (
                <span className="tool-call-status error">Tool error</span>
              ) : (
                <span className="tool-call-status success">Tool completed</span>
              )}
            </div>
          </div>
        );
      });
    }

    // Proper markdown renderer supporting code blocks, headers, links,
    // bold, italic, inline code, and lists
    const renderMarkdown = (content: string) => {
      const lines = content.split('\n');
      const elements: React.ReactNode[] = [];
      let inCodeBlock = false;
      let codeBlockLang = '';
      let codeBlockLines: string[] = [];
      let listItems: React.ReactNode[] = [];
      let listType: 'ul' | 'ol' | null = null;

      const flushList = () => {
        if (listItems.length === 0) return;
        if (listType === 'ul') {
          elements.push(<ul key={`ul-${elements.length}`} className="chat-md-list">{listItems}</ul>);
        } else {
          elements.push(<ol key={`ol-${elements.length}`} className="chat-md-list chat-md-ordered">{listItems}</ol>);
        }
        listItems = [];
        listType = null;
      };

      const renderInline = (text: string): React.ReactNode => {
        const tokens: React.ReactNode[] = [];
        // Match bold, italic, inline code, links
        const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        let key = 0;
        while ((match = regex.exec(text)) !== null) {
          // Text before this match
          if (match.index > lastIndex) {
            tokens.push(text.slice(lastIndex, match.index));
          }
          if (match[1]) {
            // Bold
            tokens.push(<strong key={key++}>{match[2]}</strong>);
          } else if (match[3]) {
            // Italic
            tokens.push(<em key={key++}>{match[4]}</em>);
          } else if (match[5]) {
            // Inline code
            tokens.push(<code key={key++} className="chat-code">{match[6]}</code>);
          } else if (match[7]) {
            // Link
            tokens.push(
              <a key={key++} href={match[9]} target="_blank" rel="noopener noreferrer" className="chat-md-link">
                {match[8]}
              </a>
            );
          }
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
          tokens.push(text.slice(lastIndex));
        }
        return tokens.length === 1 ? tokens[0] : <>{tokens}</>;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code block fences
        if (line.startsWith('```')) {
          if (inCodeBlock) {
            // End code block
            elements.push(
              <pre key={`code-${elements.length}`} className={`chat-md-code-block ${codeBlockLang ? `lang-${codeBlockLang}` : ''}`}>
                <code>{codeBlockLines.join('\n')}</code>
              </pre>
            );
            inCodeBlock = false;
            codeBlockLines = [];
            codeBlockLang = '';
          } else {
            flushList();
            inCodeBlock = true;
            codeBlockLang = line.slice(3).trim();
            codeBlockLines = [];
          }
          continue;
        }

        if (inCodeBlock) {
          codeBlockLines.push(line);
          continue;
        }

        // Headers
        if (line.startsWith('### ')) {
          flushList();
          elements.push(<h4 key={`h-${i}`} className="chat-md-h3">{renderInline(line.slice(4))}</h4>);
          continue;
        }
        if (line.startsWith('## ')) {
          flushList();
          elements.push(<h3 key={`h-${i}`} className="chat-md-h2">{renderInline(line.slice(3))}</h3>);
          continue;
        }
        if (line.startsWith('# ')) {
          flushList();
          elements.push(<h2 key={`h-${i}`} className="chat-md-h1">{renderInline(line.slice(2))}</h2>);
          continue;
        }

        // Horizontal rule
        if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
          flushList();
          elements.push(<hr key={`hr-${i}`} className="chat-md-hr" />);
          continue;
        }

        // Unordered list
        if (/^[-*+]\s/.test(line)) {
          if (listType !== 'ul') flushList();
          listType = 'ul';
          listItems.push(
            <li key={`li-${i}`} className="chat-md-li">{renderInline(line.replace(/^[-*+]\s+/, ''))}</li>
          );
          continue;
        }

        // Ordered list
        if (/^\d+\.\s/.test(line)) {
          if (listType !== 'ol') flushList();
          listType = 'ol';
          listItems.push(
            <li key={`li-${i}`} className="chat-md-li">{renderInline(line.replace(/^\d+\.\s+/, ''))}</li>
          );
          continue;
        }

        // Blockquote
        if (line.startsWith('> ')) {
          flushList();
          elements.push(
            <blockquote key={`bq-${i}`} className="chat-md-blockquote">
              {renderInline(line.slice(2))}
            </blockquote>
          );
          continue;
        }

        // Blank line
        if (line.trim() === '') {
          flushList();
          elements.push(<div key={`sp-${i}`} className="chat-md-spacer" />);
          continue;
        }

        // Regular paragraph
        flushList();
        elements.push(<p key={`p-${i}`} className="chat-md-p">{renderInline(line)}</p>);
      }

      // Close any remaining code block
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-final`} className="chat-md-code-block">
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
      }
      flushList();

      return elements;
    };

    return (
      <div className="chat-message-content">
        {renderMarkdown(msg.content)}
      </div>
    );
  };

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
                <span className="chat-gate-badge" style={{ color: gateInfo.color }}>
                  <GateIcon gate={securityGate} size={11} />
                  {gateInfo.label}
                </span>
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
                  whileHover={{ scale: 1.1, opacity: 0.7 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={18} />
                </motion.button>
              </div>
            </div>

            <div className="chat-messages" ref={chatContainerRef}>
              {chatMessages.length === 0 && (
                <div className="chat-empty">
                  <Sparkles size={28} style={{ color: 'var(--color-text-muted)' }} />
                  <p className="chat-empty-title">What can I help with?</p>
                  <div className="chat-suggestions">
                    {['Show my screens', 'Create a build button', 'List all commands'].map((s) => (
                      <motion.button
                        key={s}
                        className="chat-suggestion-chip"
                        onClick={() => { setInput(s); }}
                        whileHover={{ scale: 1.03, background: 'rgba(0, 122, 255, 0.15)' }}
                        whileTap={{ scale: 0.97 }}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`chat-message ${msg.role} ${msg.toolCalls ? 'tool-message' : ''} ${msg.toolResults ? 'tool-result-message' : ''}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {renderMessage(msg)}
                  <span className="chat-timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === 'assistant' && msg.content && (
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
                    <div className="chat-loading-dots">
                      <motion.span
                        className="chat-loading-dot"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                      />
                      <motion.span
                        className="chat-loading-dot"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.span
                        className="chat-loading-dot"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
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
                  placeholder="Ask me to set up a button..."
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
                  title="Send (Enter)"
                >
                  {isLLMLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </motion.button>
              </div>
              {!isLLMLoading && !input.trim() && (
                <span className="chat-input-hint">Press Enter to send</span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LLMChat;
