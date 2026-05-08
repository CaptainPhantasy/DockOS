/**
 * Application version — single source of truth.
 *
 * Injected at build time by Vite from package.json "version" field.
 * To bump: update package.json, then rebuild.
 */
declare const __APP_VERSION__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined"
    ? __APP_VERSION__
    : "0.0.0-dev";
