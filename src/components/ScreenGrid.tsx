import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  MessageSquare,
  Layers,
  Trash2,
  Grid3x3,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { DockButtonComponent } from './DockButton';

export const ScreenGrid: React.FC<{
  onOpenSettings: () => void;
  onOpenChat: () => void;
  onEditButton: (row: number, col: number) => void;
}> = ({ onOpenSettings, onOpenChat, onEditButton }) => {
  const screens = useStore((s) => s.screens);
  const currentScreenIndex = useStore((s) => s.currentScreenIndex);
  const nextScreen = useStore((s) => s.nextScreen);
  const prevScreen = useStore((s) => s.prevScreen);
  const setCurrentScreenIndex = useStore((s) => s.setCurrentScreenIndex);
  const addScreen = useStore((s) => s.addScreen);
  const removeScreen = useStore((s) => s.removeScreen);
  const llmConfig = useStore((s) => s.llmConfig);

  const [isScreenMenuOpen, setIsScreenMenuOpen] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const currentScreen = screens[currentScreenIndex];

  // Keyboard navigation for button grid
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const ROWS = 5;
      const COLS = 3;

      if (e.key === 'Escape') {
        setFocusedCell(null);
        (document.activeElement as HTMLElement)?.blur();
        return;
      }

      let row = focusedCell?.row ?? -1;
      let col = focusedCell?.col ?? -1;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          col = Math.min(col + 1, COLS - 1);
          if (row === -1) row = 0;
          if (focusedCell && col === focusedCell.col && focusedCell.col === COLS - 1) break;
          setFocusedCell({ row, col });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          col = Math.max(col - 1, 0);
          if (row === -1) row = 0;
          if (focusedCell && col === focusedCell.col && focusedCell.col === 0) break;
          setFocusedCell({ row, col });
          break;
        case 'ArrowDown':
          e.preventDefault();
          row = Math.min(row + 1, ROWS - 1);
          if (col === -1) col = 0;
          if (focusedCell && row === focusedCell.row && focusedCell.row === ROWS - 1) break;
          setFocusedCell({ row, col });
          break;
        case 'ArrowUp':
          e.preventDefault();
          row = Math.max(row - 1, 0);
          if (col === -1) col = 0;
          if (focusedCell && row === focusedCell.row && focusedCell.row === 0) break;
          setFocusedCell({ row, col });
          break;
        case 'Enter':
        case ' ':
          if (focusedCell) {
            e.preventDefault();
            onEditButton(focusedCell.row, focusedCell.col);
          }
          break;
        case 'Tab':
          // Allow Tab to leave the grid
          setFocusedCell(null);
          break;
      }
    },
    [focusedCell, onEditButton]
  );

  // Reset focus when screen changes
  useEffect(() => {
    setFocusedCell(null);
  }, [currentScreenIndex]);

  const handleAddScreen = useCallback(() => {
    addScreen();
    setCurrentScreenIndex(screens.length);
  }, [addScreen, screens.length, setCurrentScreenIndex]);

  return (
    <div className="screen-container">
      {/* Toolbar */}
      <div className="toolbar">
        <motion.button
          className="toolbar-btn"
          onClick={onOpenSettings}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Settings"
        >
          <Settings size={16} />
        </motion.button>

        <motion.button
          className="toolbar-btn"
          onClick={onOpenChat}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="AI Assistant"
          style={{ position: 'relative' }}
        >
          <MessageSquare size={16} />
          {!llmConfig.apiKey && (
            <motion.div
              className="toolbar-badge"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>

        <div className="toolbar-spacer" />

        <motion.button
          className="toolbar-btn"
          onClick={() => setIsScreenMenuOpen(!isScreenMenuOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Screens"
        >
          <Layers size={16} />
          <span className="toolbar-label">{screens.length}</span>
        </motion.button>

        <motion.button
          className="toolbar-btn"
          onClick={handleAddScreen}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Add Screen"
        >
          <Plus size={16} />
        </motion.button>
      </div>

      {/* Screen Menu Dropdown */}
      <AnimatePresence>
        {isScreenMenuOpen && (
          <motion.div
            className="screen-menu glass-panel"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {screens.map((screen, index) => (
              <motion.button
                key={screen.id}
                className={`screen-menu-item ${index === currentScreenIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentScreenIndex(index);
                  setIsScreenMenuOpen(false);
                }}
                whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <Grid3x3 size={14} />
                <span className="screen-menu-name">{screen.name}</span>
                {screens.length > 1 && (
                  <motion.button
                    className="screen-menu-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeScreen(index);
                    }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    <Trash2 size={12} />
                  </motion.button>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Header with Navigation */}
      <div className="screen-nav">
        <motion.button
          className="nav-btn"
          onClick={prevScreen}
          whileHover={{ scale: 1.15, x: -2 }}
          whileTap={{ scale: 0.9 }}
          disabled={screens.length <= 1}
        >
          <ChevronLeft size={16} />
        </motion.button>

        <div className="screen-info">
          <motion.span
            className="screen-name"
            key={currentScreenIndex}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {currentScreen?.name || 'Unknown'}
          </motion.span>
          <div className="screen-dots">
            {screens.map((_, index) => (
              <motion.button
                key={index}
                className={`screen-dot ${index === currentScreenIndex ? 'active' : ''}`}
                onClick={() => setCurrentScreenIndex(index)}
                whileHover={{ scale: 1.4 }}
                whileTap={{ scale: 0.8 }}
              />
            ))}
          </div>
        </div>

        <motion.button
          className="nav-btn"
          onClick={nextScreen}
          whileHover={{ scale: 1.15, x: 2 }}
          whileTap={{ scale: 0.9 }}
          disabled={screens.length <= 1}
        >
          <ChevronRight size={16} />
        </motion.button>
      </div>

      {/* Button Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          ref={gridRef}
          className="button-grid"
          key={currentScreenIndex}
          tabIndex={0}
          role="grid"
          aria-label="Button grid"
          onKeyDown={handleGridKeyDown}
          onFocus={() => {
            if (!focusedCell) setFocusedCell({ row: 0, col: 0 });
          }}
          onBlur={() => setFocusedCell(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {Array.from({ length: 5 }).map((_, row) => (
            <div className="grid-row" key={row} role="row">
              {Array.from({ length: 3 }).map((_, col) => {
                const button = currentScreen?.buttons?.[row]?.[col] || null;
                const isFocused = focusedCell?.row === row && focusedCell?.col === col;
                const staggerDelay = (row * 3 + col) * 0.04;
                return (
                  <motion.div
                    key={`${row}-${col}`}
                    role="gridcell"
                    className={`grid-cell ${isFocused ? 'grid-cell-focused' : ''}`}
                    initial={{ opacity: 0, scale: 0.6, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 350,
                      damping: 25,
                      delay: staggerDelay,
                    }}
                  >
                    <DockButtonComponent
                      button={button}
                      row={row}
                      col={col}
                      screenIndex={currentScreenIndex}
                      onEdit={() => onEditButton(row, col)}
                    />
                  </motion.div>
                );
              })}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Screen counter */}
      <div className="screen-counter">
        <motion.span
          key={currentScreenIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {currentScreenIndex + 1} / {screens.length}
        </motion.span>
      </div>
    </div>
  );
};

export default ScreenGrid;
