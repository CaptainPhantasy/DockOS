/**
 * Central source of truth for theme-dependent inline style values.
 *
 * CSS handles most theming via custom properties, but Framer Motion
 * props and dynamic style objects need JS values. This module maps
 * the current theme to those values so components don't scatter ternaries.
 */

export type ThemeMode = 'dark' | 'light';

interface ThemeTokens {
  /** Hover background for interactive elements (Framer Motion whileHover) */
  hoverBg: string;
  /** Drop-shadow glow on hover */
  hoverShadow: string;
  /** Button gradient start alpha (hex suffix, e.g. '22') */
  btnAlphaStart: string;
  /** Button gradient end alpha (hex suffix, e.g. '44') */
  btnAlphaEnd: string;
  /** Button border alpha (hex suffix, e.g. '66') */
  btnBorderAlpha: string;
}

const darkTokens: ThemeTokens = {
  hoverBg: 'rgba(255,255,255,0.08)',
  hoverShadow: 'rgba(255,255,255,0.3)',
  btnAlphaStart: '22',
  btnAlphaEnd: '44',
  btnBorderAlpha: '66',
};

const lightTokens: ThemeTokens = {
  hoverBg: 'rgba(0,0,0,0.06)',
  hoverShadow: 'rgba(0,0,0,0.15)',
  btnAlphaStart: '33',
  btnAlphaEnd: '55',
  btnBorderAlpha: '88',
};

export function getThemeTokens(theme: ThemeMode): ThemeTokens {
  return theme === 'light' ? lightTokens : darkTokens;
}
