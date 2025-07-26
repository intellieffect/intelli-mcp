/**
 * Polyfills for Electron renderer process
 * This file must be imported at the very beginning of the renderer entry point
 */

// Polyfill for global object
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Polyfill for process object (minimal)
if (typeof process === 'undefined') {
  (window as any).process = {
    env: {},
    version: '',
    versions: {},
    platform: 'browser',
    nextTick: (fn: Function) => setTimeout(fn, 0),
  };
}

// Polyfill for Buffer (if needed by dependencies)
if (typeof Buffer === 'undefined') {
  (window as any).Buffer = {
    isBuffer: () => false,
    from: () => null,
    alloc: () => null,
  };
}

// Export to ensure the file is included
export {};