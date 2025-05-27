// This file is used to set up the testing environment for Vitest.
// We can add global mocks, configurations, or extend matchers here.

// Mock VSCode API for testing
(global as any).acquireVsCodeApi = () => ({
  postMessage: () => {},
  setState: () => {},
  getState: () => ({}),
});
