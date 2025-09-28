/**
 * Unit tests for Utils module
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import Utils from '../../public/js/utils.js';

describe('Utils Module', () => {
  describe('getUrlParam', () => {
    it('should extract URL parameters correctly', () => {
      // Mock URLSearchParams behavior instead of location
      const originalURLSearchParams = global.URLSearchParams;
      
      global.URLSearchParams = jest.fn().mockImplementation(() => ({
        get: jest.fn((key) => {
          const params = { token: 'test-token', foo: 'bar' };
          return params[key] || null;
        })
      }));
      
      expect(Utils.getUrlParam('token')).toBe('test-token');
      expect(Utils.getUrlParam('foo')).toBe('bar');
      expect(Utils.getUrlParam('nonexistent')).toBeNull();
      
      // Restore original URLSearchParams
      global.URLSearchParams = originalURLSearchParams;
    });

    it('should handle empty query string', () => {
      const originalURLSearchParams = global.URLSearchParams;
      
      global.URLSearchParams = jest.fn().mockImplementation(() => ({
        get: jest.fn(() => null)
      }));
      
      expect(Utils.getUrlParam('token')).toBeNull();
      
      // Restore original URLSearchParams
      global.URLSearchParams = originalURLSearchParams;
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize the first letter of a string', () => {
      expect(Utils.capitalizeFirst('hello')).toBe('Hello');
      expect(Utils.capitalizeFirst('world')).toBe('World');
      expect(Utils.capitalizeFirst('CAPS')).toBe('CAPS');
    });

    it('should handle empty strings', () => {
      expect(Utils.capitalizeFirst('')).toBe('');
    });

    it('should handle single character strings', () => {
      expect(Utils.capitalizeFirst('a')).toBe('A');
      expect(Utils.capitalizeFirst('A')).toBe('A');
    });

    it('should not affect other characters', () => {
      expect(Utils.capitalizeFirst('hello world')).toBe('Hello world');
      expect(Utils.capitalizeFirst('test123')).toBe('Test123');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(Utils.formatFileSize(0)).toBe('0 Bytes');
      expect(Utils.formatFileSize(1)).toBe('1 Bytes');
      expect(Utils.formatFileSize(512)).toBe('512 Bytes');
      expect(Utils.formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(Utils.formatFileSize(1024)).toBe('1 KB');
      expect(Utils.formatFileSize(1536)).toBe('1.5 KB'); // 1.5 KB
      expect(Utils.formatFileSize(2048)).toBe('2 KB');
    });

    it('should format megabytes correctly', () => {
      expect(Utils.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(Utils.formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
      expect(Utils.formatFileSize(25 * 1024 * 1024)).toBe('25 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(Utils.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(Utils.formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
    });

    it('should handle decimal precision', () => {
      const result = Utils.formatFileSize(1536); // 1.5 KB
      expect(result).toMatch(/^1\.5 KB$/);
    });
  });

  describe('formatDate', () => {
    it('should format date strings correctly', () => {
      const dateString = '2025-01-01T12:00:00.000Z';
      const result = Utils.formatDate(dateString);
      
      expect(result).toContain('Uploaded');
      expect(result).toMatch(/Uploaded \d{1,2}\/\d{1,2}\/\d{4} at \d{1,2}:\d{2}:\d{2}/);
    });

    it('should handle different date formats', () => {
      const dateString = '2025-12-25T15:30:45.123Z';
      const result = Utils.formatDate(dateString);
      
      expect(result).toContain('Uploaded');
      expect(typeof result).toBe('string');
    });
  });

  describe('isValidImageFile', () => {
    it('should validate image files correctly', () => {
      const jpegFile = testUtils.createMockFile('test.jpg', 'image/jpeg');
      const pngFile = testUtils.createMockFile('test.png', 'image/png');
      const gifFile = testUtils.createMockFile('test.gif', 'image/gif');
      const webpFile = testUtils.createMockFile('test.webp', 'image/webp');
      
      expect(Utils.isValidImageFile(jpegFile)).toBe(true);
      expect(Utils.isValidImageFile(pngFile)).toBe(true);
      expect(Utils.isValidImageFile(gifFile)).toBe(true);
      expect(Utils.isValidImageFile(webpFile)).toBe(true);
    });

    it('should reject non-image files', () => {
      const textFile = testUtils.createMockFile('test.txt', 'text/plain');
      const pdfFile = testUtils.createMockFile('test.pdf', 'application/pdf');
      const videoFile = testUtils.createMockFile('test.mp4', 'video/mp4');
      
      expect(Utils.isValidImageFile(textFile)).toBe(false);
      expect(Utils.isValidImageFile(pdfFile)).toBe(false);
      expect(Utils.isValidImageFile(videoFile)).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    it('should validate file sizes correctly', () => {
      const smallFile = testUtils.createMockFile('small.jpg', 'image/jpeg', 1024); // 1KB
      const mediumFile = testUtils.createMockFile('medium.jpg', 'image/jpeg', 10 * 1024 * 1024); // 10MB
      const largeFile = testUtils.createMockFile('large.jpg', 'image/jpeg', 30 * 1024 * 1024); // 30MB
      
      expect(Utils.isValidFileSize(smallFile)).toBe(true);
      expect(Utils.isValidFileSize(mediumFile)).toBe(true);
      expect(Utils.isValidFileSize(largeFile)).toBe(false); // Over 25MB limit
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = Utils.generateId();
      const id2 = Utils.generateId();
      
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
      expect(id2.length).toBeGreaterThan(0);
    });

    it('should generate IDs with expected format', () => {
      const id = Utils.generateId();
      
      // Should be alphanumeric (base36)
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = Utils.debounce(mockFn, 100);
      
      // Call multiple times rapidly
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();
      
      // Fast-forward time
      jest.advanceTimersByTime(100);
      
      // Should have been called once
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
      const mockFn = jest.fn();
      const debouncedFn = Utils.debounce(mockFn, 100);
      
      debouncedFn('arg1', 'arg2');
      
      jest.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should reset timer on subsequent calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = Utils.debounce(mockFn, 100);
      
      debouncedFn();
      jest.advanceTimersByTime(50);
      debouncedFn(); // Reset timer
      jest.advanceTimersByTime(50);
      
      // Should not have been called yet (timer was reset)
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(50);
      
      // Now should be called
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('wait', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return a promise that resolves after specified time', async () => {
      const promise = Utils.wait(100);
      
      expect(promise).toBeInstanceOf(Promise);
      
      // Fast-forward time
      jest.advanceTimersByTime(100);
      
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('waitForImageLoad', () => {
    it('should resolve immediately for already loaded images', async () => {
      const img = document.createElement('img');
      
      // Mock image as already loaded
      Object.defineProperties(img, {
        complete: { value: true },
        naturalWidth: { value: 100 }
      });
      
      const promise = Utils.waitForImageLoad(img);
      
      await expect(promise).resolves.toBeUndefined();
    });

    it('should wait for image load event', async () => {
      const img = document.createElement('img');
      
      // Mock image as not loaded
      Object.defineProperties(img, {
        complete: { value: false },
        naturalWidth: { value: 0 }
      });
      
      const promise = Utils.waitForImageLoad(img);
      
      // Simulate load event
      setTimeout(() => {
        img.onload();
      }, 0);
      
      await expect(promise).resolves.toBeUndefined();
    });

    it('should resolve even on error', async () => {
      const img = document.createElement('img');
      
      Object.defineProperties(img, {
        complete: { value: false },
        naturalWidth: { value: 0 }
      });
      
      const promise = Utils.waitForImageLoad(img);
      
      // Simulate error event
      setTimeout(() => {
        img.onerror();
      }, 0);
      
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const jsonString = '{"key": "value", "number": 42}';
      const result = Utils.safeJsonParse(jsonString);
      
      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('should return fallback for invalid JSON', () => {
      const invalidJson = '{"key": value}'; // Invalid JSON
      const fallback = { error: 'invalid' };
      const result = Utils.safeJsonParse(invalidJson, fallback);
      
      expect(result).toBe(fallback);
    });

    it('should return null fallback by default', () => {
      const invalidJson = 'not json at all';
      const result = Utils.safeJsonParse(invalidJson);
      
      expect(result).toBeNull();
    });
  });

  describe('createElement', () => {
    it('should create DOM elements with properties', () => {
      const element = Utils.createElement('div', {
        className: 'test-class',
        id: 'test-id'
      });
      
      expect(element.tagName).toBe('DIV');
      expect(element.className).toBe('test-class');
      expect(element.id).toBe('test-id');
    });

    it('should handle style properties as objects', () => {
      const element = Utils.createElement('div', {
        style: {
          color: 'red',
          fontSize: '16px'
        }
      });
      
      expect(element.style.color).toBe('red');
      expect(element.style.fontSize).toBe('16px');
    });

    it('should handle data attributes', () => {
      const element = Utils.createElement('div', {
        'data-test': 'value',
        'data-id': '123'
      });
      
      expect(element.getAttribute('data-test')).toBe('value');
      expect(element.getAttribute('data-id')).toBe('123');
    });

    it('should append text children', () => {
      const element = Utils.createElement('div', {}, ['Hello', ' World']);
      
      expect(element.textContent).toBe('Hello World');
    });

    it('should append DOM node children', () => {
      const child1 = document.createElement('span');
      child1.textContent = 'Child 1';
      
      const child2 = document.createElement('span');
      child2.textContent = 'Child 2';
      
      const element = Utils.createElement('div', {}, [child1, child2]);
      
      expect(element.children.length).toBe(2);
      expect(element.children[0].textContent).toBe('Child 1');
      expect(element.children[1].textContent).toBe('Child 2');
    });

    it('should handle mixed text and node children', () => {
      const span = document.createElement('span');
      span.textContent = 'Span';
      
      const element = Utils.createElement('div', {}, ['Text ', span, ' More text']);
      
      expect(element.textContent).toBe('Text Span More text');
      expect(element.children.length).toBe(1);
    });
  });
});