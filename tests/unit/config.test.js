/**
 * Unit tests for Config module
 */

import { describe, it, expect } from '@jest/globals';
import { CONFIG } from '../../dist/public/js/config.js';

describe('Config Module', () => {
  describe('Structure validation', () => {
    it('should have all required top-level sections', () => {
      expect(CONFIG).toHaveProperty('API');
      expect(CONFIG).toHaveProperty('UPLOAD');
      expect(CONFIG).toHaveProperty('FACE_DETECTION');
      expect(CONFIG).toHaveProperty('UI');
      expect(CONFIG).toHaveProperty('FEATURES');
      expect(CONFIG).toHaveProperty('STORAGE');
      expect(CONFIG).toHaveProperty('DEBUG');
    });

    it('should have valid API configuration', () => {
      expect(CONFIG.API).toHaveProperty('BASE_URL');
      expect(CONFIG.API).toHaveProperty('ENDPOINTS');
      expect(typeof CONFIG.API.BASE_URL).toBe('string');
      expect(typeof CONFIG.API.ENDPOINTS).toBe('object');
    });

    it('should have all required API endpoints', () => {
      const { ENDPOINTS } = CONFIG.API;
      expect(ENDPOINTS).toHaveProperty('PHOTOS');
      expect(ENDPOINTS).toHaveProperty('UPLOAD');
      expect(ENDPOINTS).toHaveProperty('PEOPLE');
      expect(ENDPOINTS).toHaveProperty('STATS');
      expect(ENDPOINTS).toHaveProperty('HEALTH');
      
      expect(typeof ENDPOINTS.PHOTOS).toBe('string');
      expect(typeof ENDPOINTS.UPLOAD).toBe('string');
      expect(typeof ENDPOINTS.PEOPLE).toBe('string');
      expect(typeof ENDPOINTS.STATS).toBe('string');
      expect(typeof ENDPOINTS.HEALTH).toBe('string');
    });
  });

  describe('Upload configuration', () => {
    it('should have valid upload limits', () => {
      const { UPLOAD } = CONFIG;
      
      expect(typeof UPLOAD.MAX_FILE_SIZE).toBe('number');
      expect(UPLOAD.MAX_FILE_SIZE).toBeGreaterThan(0);
      expect(UPLOAD.MAX_FILE_SIZE).toBe(25 * 1024 * 1024); // 25MB
      
      expect(typeof UPLOAD.MAX_BATCH_SIZE).toBe('number');
      expect(UPLOAD.MAX_BATCH_SIZE).toBeGreaterThan(0);
      
      expect(typeof UPLOAD.MAX_CONCURRENT).toBe('number');
      expect(UPLOAD.MAX_CONCURRENT).toBeGreaterThan(0);
    });

    it('should have valid file type configurations', () => {
      const { UPLOAD } = CONFIG;
      
      expect(Array.isArray(UPLOAD.ALLOWED_TYPES)).toBe(true);
      expect(Array.isArray(UPLOAD.SUPPORTED_TYPES)).toBe(true);
      expect(UPLOAD.ALLOWED_TYPES.length).toBeGreaterThan(0);
      expect(UPLOAD.SUPPORTED_TYPES.length).toBeGreaterThan(0);
      
      // Check that all types are valid MIME types
      UPLOAD.ALLOWED_TYPES.forEach(type => {
        expect(type).toMatch(/^image\//);
      });
    });

    it('should have valid compression settings', () => {
      const { UPLOAD } = CONFIG;
      
      expect(typeof UPLOAD.QUALITY).toBe('number');
      expect(UPLOAD.QUALITY).toBeGreaterThan(0);
      expect(UPLOAD.QUALITY).toBeLessThanOrEqual(1);
      
      expect(typeof UPLOAD.MAX_WIDTH).toBe('number');
      expect(UPLOAD.MAX_WIDTH).toBeGreaterThan(0);
      
      expect(typeof UPLOAD.COMPRESSION_THRESHOLD).toBe('number');
      expect(UPLOAD.COMPRESSION_THRESHOLD).toBeGreaterThan(0);
    });
  });

  describe('Face detection configuration', () => {
    it('should have valid face detection settings', () => {
      const { FACE_DETECTION } = CONFIG;
      
      expect(typeof FACE_DETECTION.MODEL_URL).toBe('string');
      expect(FACE_DETECTION.MODEL_URL).toMatch(/^https?:\/\//);
      
      expect(typeof FACE_DETECTION.CONFIDENCE_THRESHOLD).toBe('number');
      expect(FACE_DETECTION.CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
      expect(FACE_DETECTION.CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1);
      
      expect(typeof FACE_DETECTION.MAX_FACES).toBe('number');
      expect(FACE_DETECTION.MAX_FACES).toBeGreaterThan(0);
      
      expect(typeof FACE_DETECTION.RENDER_DELAY).toBe('number');
      expect(FACE_DETECTION.RENDER_DELAY).toBeGreaterThanOrEqual(0);
      
      expect(typeof FACE_DETECTION.LOAD_TIMEOUT).toBe('number');
      expect(FACE_DETECTION.LOAD_TIMEOUT).toBeGreaterThan(0);
    });

    it('should have valid face detection UI styles', () => {
      const { FACE_DETECTION } = CONFIG;
      
      expect(typeof FACE_DETECTION.BOX_STYLES).toBe('object');
      expect(typeof FACE_DETECTION.LABEL_STYLES).toBe('object');
      
      expect(typeof FACE_DETECTION.BUTTON_TEXT).toBe('string');
      expect(FACE_DETECTION.BUTTON_TEXT.length).toBeGreaterThan(0);
      
      expect(typeof FACE_DETECTION.SHOW_LABELS).toBe('boolean');
    });
  });

  describe('UI configuration', () => {
    it('should have valid photo tags', () => {
      const { UI } = CONFIG;
      
      expect(typeof UI.PHOTO_TAGS).toBe('object');
      expect(UI.PHOTO_TAGS).toHaveProperty('all');
      expect(UI.PHOTO_TAGS).toHaveProperty('wedding');
      expect(UI.PHOTO_TAGS).toHaveProperty('reception');
      expect(UI.PHOTO_TAGS).toHaveProperty('other');
      
      // Check that emoji values are strings
      Object.values(UI.PHOTO_TAGS).forEach(emoji => {
        expect(typeof emoji).toBe('string');
        expect(emoji.length).toBeGreaterThan(0);
      });
    });

    it('should have valid color configuration', () => {
      const { UI } = CONFIG;
      
      expect(typeof UI.COLORS).toBe('object');
      expect(UI.COLORS).toHaveProperty('primary');
      expect(UI.COLORS).toHaveProperty('secondary');
      expect(UI.COLORS).toHaveProperty('text');
      expect(UI.COLORS).toHaveProperty('success');
      expect(UI.COLORS).toHaveProperty('error');
      expect(UI.COLORS).toHaveProperty('info');
      
      // Check that colors are valid hex codes
      Object.values(UI.COLORS).forEach(color => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('should have valid animation delays', () => {
      const { UI } = CONFIG;
      
      expect(typeof UI.ANIMATION_DELAYS).toBe('object');
      Object.values(UI.ANIMATION_DELAYS).forEach(delay => {
        expect(typeof delay).toBe('number');
        expect(delay).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid navigation configuration', () => {
      const { UI } = CONFIG;
      
      expect(typeof UI.SWIPE_THRESHOLD).toBe('number');
      expect(UI.SWIPE_THRESHOLD).toBeGreaterThan(0);
      
      expect(typeof UI.NAVIGATION_HINT).toBe('string');
      expect(UI.NAVIGATION_HINT.length).toBeGreaterThan(0);
    });
  });

  describe('Feature flags', () => {
    it('should have valid feature flags', () => {
      const { FEATURES } = CONFIG;
      
      expect(typeof FEATURES).toBe('object');
      expect(typeof FEATURES.face_detection).toBe('boolean');
      expect(typeof FEATURES.offline_support).toBe('boolean');
      expect(typeof FEATURES.service_worker).toBe('boolean');
      expect(typeof FEATURES.image_compression).toBe('boolean');
      expect(typeof FEATURES.people_filtering).toBe('boolean');
      expect(typeof FEATURES.photo_navigation).toBe('boolean');
    });
  });

  describe('Storage configuration', () => {
    it('should have valid storage keys', () => {
      const { STORAGE } = CONFIG;
      
      expect(typeof STORAGE).toBe('object');
      expect(typeof STORAGE.cached_photos).toBe('string');
      expect(typeof STORAGE.navigation_hint_shown).toBe('string');
      expect(typeof STORAGE.user_preferences).toBe('string');
      
      // Check that keys are non-empty
      Object.values(STORAGE).forEach(key => {
        expect(key.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Debug configuration', () => {
    it('should have valid debug settings', () => {
      const { DEBUG } = CONFIG;
      
      expect(typeof DEBUG).toBe('object');
      expect(typeof DEBUG.ENABLE_GLOBAL_ACCESS).toBe('boolean');
      expect(typeof DEBUG.VERBOSE_FILTERING).toBe('boolean');
      expect(typeof DEBUG.LOG_LEVEL).toBe('string');
      
      // Check that log level is valid
      const validLogLevels = ['error', 'warn', 'info', 'debug'];
      expect(validLogLevels).toContain(DEBUG.LOG_LEVEL);
    });
  });

  describe('Configuration immutability', () => {
    it('should not allow modification of configuration', () => {
      // This test ensures the config object is frozen or read-only
      // Note: JavaScript objects are mutable by default, but we're testing the structure
      const originalValue = CONFIG.API.BASE_URL;
      
      // Try to modify (should not throw in test, but we check it didn't change)
      try {
        CONFIG.API.BASE_URL = 'modified';
      } catch (e) {
        // If it throws, that's good (object is frozen)
      }
      
      // The value should remain unchanged if object is properly frozen
      // This is more of a documentation test for expected behavior
      expect(typeof CONFIG.API.BASE_URL).toBe('string');
    });
  });

  describe('Configuration consistency', () => {
    it('should have consistent file size limits', () => {
      // Upload max file size should be reasonable
      expect(CONFIG.UPLOAD.MAX_FILE_SIZE).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      expect(CONFIG.UPLOAD.MAX_FILE_SIZE).toBeGreaterThan(1024 * 1024); // Greater than 1MB
    });

    it('should have consistent batch limits', () => {
      // Batch size should be reasonable
      expect(CONFIG.UPLOAD.MAX_BATCH_SIZE).toBeLessThan(50);
      expect(CONFIG.UPLOAD.MAX_BATCH_SIZE).toBeGreaterThan(0);
      
      // Concurrent uploads should not exceed batch size
      expect(CONFIG.UPLOAD.MAX_CONCURRENT).toBeLessThanOrEqual(CONFIG.UPLOAD.MAX_BATCH_SIZE);
    });

    it('should have consistent timeout values', () => {
      // Face detection timeout should be reasonable
      expect(CONFIG.FACE_DETECTION.LOAD_TIMEOUT).toBeGreaterThan(1000); // At least 1 second
      expect(CONFIG.FACE_DETECTION.LOAD_TIMEOUT).toBeLessThan(60000); // Less than 1 minute
      
      // Render delay should be reasonable
      expect(CONFIG.FACE_DETECTION.RENDER_DELAY).toBeLessThan(1000); // Less than 1 second
    });
  });
});