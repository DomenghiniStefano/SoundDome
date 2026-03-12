// In Electron renderer, electron-log/renderer transports logs to the main process file.
// In vitest/Node.js, fall back to console to avoid hanging on missing IPC.
let log: {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
};

try {
  // electron-log/renderer only works inside an Electron BrowserWindow
  if (typeof window !== 'undefined' && 'api' in window) {
    log = require('electron-log/renderer');
  } else {
    throw new Error('Not in Electron renderer');
  }
} catch {
  log = {
    info: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.log.bind(console),
  };
}

export { log };
