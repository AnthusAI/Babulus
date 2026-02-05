// Jest setup file for React testing
require('@testing-library/jest-dom');

// jsdom doesn't provide ResizeObserver. Several client components (e.g. PreviewPlayer)
// rely on it for layout measurement, so we polyfill it for unit tests.
if (typeof global.ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this._callback = callback;
    }
    observe(_target) {
      // Fire a minimal callback once so components can initialize.
      // The shape matches the subset they read (entries[0].contentRect).
      this._callback([{ contentRect: { width: 0, height: 0 } }]);
    }
    unobserve() {}
    disconnect() {}
  };
}
