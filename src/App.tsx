import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Zap,
  Minimize2,
  Maximize2,
  GripVertical,
} from 'lucide-react';
import { useStore } from './store/useStore';
import ScreenGrid from './components/ScreenGrid';
import { ButtonEditor } from './components/ButtonEditor';
import { Settings } from './components/Settings';
import { LLMChat } from './components/LLMChat';

// Detect whether we're running inside the native menu bar wrapper.
// The Swift wrapper injects window.__STREAMDOCK_NATIVE__ = true at document start.
// Falls back to viewport width for browsers.
function useIsMenuBarMode() {
  const isNative = !!(window as any).__STREAMDOCK_NATIVE__;
  const [isMenuBar, setIsMenuBar] = useState(isNative || window.innerWidth <= 420);
  useEffect(() => {
    const check = () => {
      setIsMenuBar(!!(window as any).__STREAMDOCK_NATIVE__ || window.innerWidth <= 420);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMenuBar;
}

const App: React.FC = () => {
  const isPanelOpen = useStore((s) => s.isPanelOpen);
  const setPanelOpen = useStore((s) => s.setPanelOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const setButtonEditorOpen = useStore((s) => s.setButtonEditorOpen);
  const setLLMChatOpen = useStore((s) => s.setLLMChatOpen);
  const setEditingButton = useStore((s) => s.setEditingButton);
  const screens = useStore((s) => s.screens);

  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const isMenuBarMode = useIsMenuBarMode();

  // Count total configured buttons
  const totalButtons = screens.reduce(
    (acc, screen) =>
      acc +
      screen.buttons.flat().filter((b) => b !== null).length,
    0
  );

  // Close on click outside (desktop mode only)
  useEffect(() => {
    if (isMenuBarMode) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isPanelOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPanelOpen, setPanelOpen, isMenuBarMode]);

  // Keyboard shortcut: Cmd+D to toggle (desktop mode only)
  useEffect(() => {
    if (isMenuBarMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        setPanelOpen(!isPanelOpen);
      }
      if (e.key === 'Escape' && isPanelOpen) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, setPanelOpen, isMenuBarMode]);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, [setSettingsOpen]);

  const handleOpenChat = useCallback(() => {
    setLLMChatOpen(true);
  }, [setLLMChatOpen]);

  const handleEditButton = useCallback(
    (row: number, col: number) => {
      const currentScreenIndex = useStore.getState().currentScreenIndex;
      setEditingButton({ screenIndex: currentScreenIndex, row, col });
      setButtonEditorOpen(true);
    },
    [setEditingButton, setButtonEditorOpen]
  );

  // ---- Menu bar mode: show the dock panel directly, no chrome ----
  if (isMenuBarMode) {
    return (
      <div className="app-container menubar-mode">
        <div className="menubar-app">
          {/* Compact header */}
          <div className="menubar-app-header">
            <div className="menubar-app-title-area">
              <Zap size={16} className="text-blue-400" />
              <span className="menubar-app-title">StreamDock</span>
              {totalButtons > 0 && (
                <span className="menubar-app-badge">{totalButtons}</span>
              )}
            </div>
            <div className="menubar-app-actions">
              <motion.button
                className="panel-action-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title={isExpanded ? 'Compact' : 'Expand'}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </motion.button>
            </div>
          </div>

          <div className="menubar-app-separator" />

          {/* Screen grid fills the remaining space */}
          <div className="menubar-app-body">
            <ScreenGrid
              onOpenSettings={handleOpenSettings}
              onOpenChat={handleOpenChat}
              onEditButton={handleEditButton}
            />
          </div>

          {/* Compact footer */}
          <div className="menubar-app-footer">
            <span className="footer-text">
              {totalButtons} command{totalButtons !== 1 ? 's' : ''}
            </span>
            <span className="footer-text">
              {screens.length} screen{screens.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Modals */}
        <ButtonEditor
          isOpen={useStore((s) => s.isButtonEditorOpen)}
          onClose={() => {
            setButtonEditorOpen(false);
            setEditingButton(null);
          }}
        />
        <Settings
          isOpen={useStore((s) => s.isSettingsOpen)}
          onClose={() => setSettingsOpen(false)}
        />
        <LLMChat
          isOpen={useStore((s) => s.isLLMChatOpen)}
          onClose={() => setLLMChatOpen(false)}
        />
      </div>
    );
  }

  // ---- Desktop mode: original full-page layout ----
  return (
    <div className="app-container">
      {/* macOS Desktop Background */}
      <div className="desktop-bg" />

      {/* Menu Bar */}
      <div className="menu-bar glass-menubar">
        <div className="menubar-left">
          <motion.div
            className="apple-logo"
            whileHover={{ scale: 1.2, rotate: 10 }}
            whileTap={{ scale: 0.9 }}
          >
            
          </motion.div>
          <span className="menubar-app-name">Finder</span>
          <span className="menubar-item">File</span>
          <span className="menubar-item">Edit</span>
          <span className="menubar-item">View</span>
          <span className="menubar-item">Go</span>
          <span className="menubar-item">Window</span>
          <span className="menubar-item">Help</span>
        </div>

        <div className="menubar-right">
          <span className="menubar-status">100%</span>
          <span className="menubar-status">Wi-Fi</span>
          <span className="menubar-status">Search</span>

          {/* StreamDock Menu Bar Icon */}
          <motion.button
            className={`menubar-dock-toggle ${isPanelOpen ? 'active' : ''}`}
            onClick={() => setPanelOpen(!isPanelOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Zap size={14} />
            <span className="dock-toggle-label">StreamDock</span>
            {totalButtons > 0 && (
              <motion.span
                className="dock-toggle-count"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                {totalButtons}
              </motion.span>
            )}
          </motion.button>

          <span className="menubar-clock">
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* Main Content - Instructions when panel is not open */}
      <div className="main-content">
        <AnimatePresence>
          {!isPanelOpen && (
            <motion.div
              className="hero-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              <motion.div
                className="hero-icon"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0,122,255,0.3)',
                    '0 0 40px rgba(0,122,255,0.5)',
                    '0 0 20px rgba(0,122,255,0.3)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Zap size={48} className="text-blue-400" />
              </motion.div>
              <h1 className="hero-title">StreamDock</h1>
              <p className="hero-subtitle">
                AI-Powered macOS Stream Deck
              </p>
              <motion.p
                className="hero-hint"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Click the <Zap size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> StreamDock icon in the menu bar to open
              </motion.p>
              <p className="hero-shortcut">
                Or press <kbd>⌘</kbd> + <kbd>D</kbd>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dock Panel Dropdown */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            ref={panelRef}
            className="dock-panel glass-panel"
            initial={{ opacity: 0, y: -20, scale: 0.95, transformOrigin: 'top right' }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              width: isExpanded ? 520 : 380,
            }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            drag
            dragControls={dragControls}
            dragMomentum={false}
            dragElastic={0}
            dragListener={false}
          >
            {/* Drag Handle */}
            <div
              className="dock-panel-handle"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripVertical size={14} className="text-white/20" />
              <div className="handle-line" />
            </div>

            {/* Panel Header */}
            <div className="dock-panel-header">
              <div className="panel-title-area">
                <Zap size={16} className="text-blue-400" />
                <span className="panel-title">StreamDock</span>
              </div>
              <div className="panel-actions">
                <motion.button
                  className="panel-action-btn"
                  onClick={() => setIsExpanded(!isExpanded)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={isExpanded ? 'Minimize' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </motion.button>
              </div>
            </div>

            {/* Separator */}
            <div className="panel-separator" />

            {/* Screen Grid Content */}
            <ScreenGrid
              onOpenSettings={handleOpenSettings}
              onOpenChat={handleOpenChat}
              onEditButton={handleEditButton}
            />

            {/* Footer */}
            <div className="dock-panel-footer">
              <span className="footer-text">
                {totalButtons} command{totalButtons !== 1 ? 's' : ''} configured
              </span>
              <span className="footer-text">
                {screens.length} screen{screens.length !== 1 ? 's' : ''}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ButtonEditor
        isOpen={useStore((s) => s.isButtonEditorOpen)}
        onClose={() => {
          setButtonEditorOpen(false);
          setEditingButton(null);
        }}
      />
      <Settings
        isOpen={useStore((s) => s.isSettingsOpen)}
        onClose={() => setSettingsOpen(false)}
      />
      <LLMChat
        isOpen={useStore((s) => s.isLLMChatOpen)}
        onClose={() => setLLMChatOpen(false)}
      />
    </div>
  );
};

export default App;

