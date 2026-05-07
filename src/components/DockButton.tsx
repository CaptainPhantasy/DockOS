import React, { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useStore } from '../store/useStore';
import type { DockButton as DockButtonType } from '../types';
import * as LucideIcons from 'lucide-react';

interface DockButtonProps {
  button: DockButtonType | null;
  row: number;
  col: number;
  screenIndex: number;
  onEdit: () => void;
}

const IconComponent: React.FC<{ name: string; size?: number }> = ({ name, size = 22 }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  const Icon = icons[name];
  if (!Icon) return <LucideIcons.Command size={size} strokeWidth={1.5} />;
  return <Icon size={size} strokeWidth={1.5} />;
};

export const DockButtonComponent: React.FC<DockButtonProps> = ({ button, row, col, screenIndex, onEdit }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const updateButton = useStore((s) => s.updateButton);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-50, 50], [8, -8]);
  const rotateY = useTransform(x, [-50, 50], [-8, 8]);
  const springConfig = { stiffness: 300, damping: 20 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!button) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set(e.clientX - centerX);
      y.set(e.clientY - centerY);
    },
    [button, x, y]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  }, [x, y]);

  const handleRipple = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!button) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const rippleX = e.clientX - rect.left;
      const rippleY = e.clientY - rect.top;
      const id = Date.now();
      setRipples((prev) => [...prev, { id, x: rippleX, y: rippleY }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);
    },
    [button]
  );

  const handleExecute = useCallback(() => {
    if (!button) return;
    updateButton(screenIndex, row, col, { lastRun: Date.now() });

    // Copy command to clipboard
    navigator.clipboard.writeText(button.command).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
    });
  }, [button, screenIndex, row, col, updateButton]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onEdit();
    },
    [onEdit]
  );

  if (!button) {
    return (
      <motion.div
        className="dock-btn dock-btn-empty"
        onClick={onEdit}
        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        layout
      >
        <motion.div
          animate={{ rotate: [0, 90, 180, 270, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <LucideIcons.Plus size={20} strokeWidth={1.5} className="text-white/20" />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="dock-btn dock-btn-filled"
      style={{
        background: `linear-gradient(135deg, ${button.color}22 0%, ${button.color}44 100%)`,
        borderColor: `${button.color}66`,
        transformStyle: 'preserve-3d',
        perspective: 800,
        rotateX: springRotateX,
        rotateY: springRotateY,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseDown={(e) => {
        setIsPressed(true);
        handleRipple(e);
      }}
      onMouseUp={() => setIsPressed(false)}
      onClick={handleExecute}
      onContextMenu={handleContextMenu}
      animate={{
        scale: isPressed ? 0.93 : isHovered ? 1.06 : 1,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      layout
    >
      {/* Glass shine overlay */}
      <motion.div
        className="btn-shine"
        animate={{
          opacity: isHovered ? 0.3 : 0.1,
          backgroundPosition: isHovered ? '200% 0' : '0% 0%',
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="ripple-effect"
          style={{ left: ripple.x, top: ripple.y }}
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{ width: 120, height: 120, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* Glow effect */}
      <motion.div
        className="btn-glow"
        animate={{
          opacity: isHovered ? 0.6 : 0,
          scale: isHovered ? 1.2 : 0.8,
        }}
        style={{ background: `radial-gradient(circle, ${button.color}44 0%, transparent 70%)` }}
        transition={{ duration: 0.3 }}
      />

      <div className="btn-content" style={{ transform: 'translateZ(20px)' }}>
        <motion.div
          animate={{
            scale: isPressed ? 0.85 : 1,
            filter: isHovered ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <IconComponent name={button.icon} size={26} />
        </motion.div>

        <motion.span
          className="btn-label"
          animate={{
            opacity: isHovered ? 1 : 0.8,
            y: isPressed ? 2 : 0,
          }}
        >
          {button.label}
        </motion.span>
      </div>

      {/* Last run indicator */}
      {button.lastRun && (
        <motion.div
          className="btn-last-run"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500 }}
        >
          <LucideIcons.Check size={8} strokeWidth={3} />
        </motion.div>
      )}

      {/* Copied toast */}
      <AnimatePresenceForCopied show={showCopied} />

      {/* Hover edit hint */}
      <motion.div
        className="btn-edit-hint"
        animate={{ opacity: isHovered ? 0.7 : 0 }}
        transition={{ duration: 0.2 }}
      >
        Right-click to edit
      </motion.div>
    </motion.div>
  );
};

const AnimatePresenceForCopied: React.FC<{ show: boolean }> = ({ show }) => (
  <motion.div
    className="copied-toast"
    initial={{ opacity: 0, y: 10, scale: 0.8 }}
    animate={show ? { opacity: 1, y: -30, scale: 1 } : { opacity: 0, y: 10, scale: 0.8 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
  >
    Copied!
  </motion.div>
);

export default DockButtonComponent;
