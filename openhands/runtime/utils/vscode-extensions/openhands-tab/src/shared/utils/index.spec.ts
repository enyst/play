import { describe, it, expect } from 'vitest';
import { formatTimestamp } from './index';

describe('formatTimestamp', () => {
  it('should format a Unix timestamp into a locale time string', () => {
    // Note: The exact output of toLocaleTimeString can vary based on the environment's locale.
    // For a more robust test, you might mock the Date constructor or use a library that allows timezone/locale pinning.
    // For this initial test, we'll check if it produces a string in a general time format.
    const timestamp = 1678886400000; // March 15, 2023 12:00:00 PM UTC
    const formatted = formatTimestamp(timestamp);

    // Example: "12:00:00 PM" or "12:00:00" or "17:00:00" (if locale is UTC+5 and no AM/PM)
    // We'll check for digits, colons, and potentially AM/PM.
    expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}( (AM|PM))?/i);
  });

  it('should handle timestamp 0 (Epoch time)', () => {
    const timestamp = 0; // January 1, 1970 00:00:00 UTC
    const formatted = formatTimestamp(timestamp);
    // This will be locale-dependent, e.g., "1/1/1970, 12:00:00 AM" or "01/01/1970, 00:00:00"
    // For simplicity, we'll check it's a non-empty string. A more specific check would require knowing the test runner's locale.
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
     // A more specific check for a common format part, e.g. contains a colon
    expect(formatted).toContain(':');
  });
});

// We can also test generateId, though its output is random.
// We can check its type and general format.
import { generateId } from './index';

describe('generateId', () => {
  it('should return a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('should return a string of length 9', () => {
    expect(generateId().length).toBe(9);
  });

  it('should return different ids on subsequent calls', () => {
    expect(generateId()).not.toBe(generateId());
  });
});
