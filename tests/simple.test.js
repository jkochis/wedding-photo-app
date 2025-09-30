/**
 * Simple test to verify Jest configuration works
 */

describe('Basic Jest Setup', () => {
  it('should be able to run basic tests', () => {
    expect(true).toBe(true);
    expect(1 + 1).toBe(2);
  });

  it('should have access to basic globals', () => {
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
  });
});