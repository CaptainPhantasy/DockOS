/**
 * Command execution bridge.
 *
 * When running inside the native StreamDock WKWebView wrapper,
 * commands are dispatched to Swift via the WKScriptMessageHandler
 * registered as "streamDock".
 *
 * When running in a browser (dev mode), falls back to clipboard copy.
 */

export type CommandType = 'shell' | 'applescript' | 'terminal' | 'url';

interface BridgePayload {
  type: CommandType;
  command: string;
}

/** Returns true if we're running inside the native WKWebView wrapper. */
function isNative(): boolean {
  return !!(window as any).__STREAMDOCK_NATIVE__;
}

/**
 * Execute a command via the native bridge.
 *
 * Returns a promise that resolves to 'sent' in native mode,
 * or 'copied' in browser fallback mode.
 */
export function executeCommand(type: CommandType, command: string): Promise<'sent' | 'copied'> {
  if (isNative()) {
    return executeNative(type, command);
  }
  return executeFallback(type, command);
}

function executeNative(type: CommandType, command: string): Promise<'sent'> {
  const payload: BridgePayload = { type, command };

  return new Promise((resolve, reject) => {
    try {
      (window as any).webkit.messageHandlers.streamDock.postMessage(payload);
      resolve('sent');
    } catch (err) {
      reject(new Error(`Native bridge error: ${err}`));
    }
  });
}

async function executeFallback(type: CommandType, command: string): Promise<'copied'> {
  // Browser fallback: copy command to clipboard
  await navigator.clipboard.writeText(command);
  return 'copied';
}
