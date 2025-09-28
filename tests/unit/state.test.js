/**
 * Tests for State Management Module
 */

import { StateManager } from '../../public/js/state.js';

let state;

describe('State Module', () => {
  beforeEach(() => {
    // Create fresh StateManager instance for each test
    state = new StateManager();
  });

  describe('Constructor', () => {
    it('should initialize with default state', () => {
      expect(state.state.photos).toEqual([]);
      expect(state.state.currentFilter).toBe('all');
      expect(state.state.modalOpen).toBe(false);
      expect(state.state.uploadInProgress).toBe(false);
      expect(state.listeners).toBeDefined();
      expect(state.history).toEqual([]);
    });

    it('should initialize event system', () => {
      expect(state.listeners).toBeInstanceOf(Map);
      expect(state.subscribe).toBeDefined();
      expect(state.notify).toBeDefined();
    });
  });

  describe('get', () => {
    it('should get simple values', () => {
      state.set('modalOpen', true);
      
      expect(state.get('modalOpen')).toBe(true);
    });

    it('should return undefined for non-existent keys', () => {
      expect(state.get('nonExistentKey')).toBeUndefined();
    });

    it('should handle falsy values correctly', () => {
      state.set('modalOpen', false);
      state.set('currentPhotoIndex', 0);
      state.set('selectedPerson', '');
      
      expect(state.get('modalOpen')).toBe(false);
      expect(state.get('currentPhotoIndex')).toBe(0);
      expect(state.get('selectedPerson')).toBe('');
    });

    it('should return full state when no key provided', () => {
      const fullState = state.get();
      expect(fullState).toHaveProperty('photos');
      expect(fullState).toHaveProperty('currentFilter');
      expect(fullState).toHaveProperty('modalOpen');
      // Should be a copy, not the original
      expect(fullState).not.toBe(state.state);
    });
  });

  describe('set', () => {
    it('should set single value', () => {
      state.set('testKey', 'testValue');
      
      expect(state.get('testKey')).toBe('testValue');
      expect(state.history.length).toBeGreaterThan(0);
    });

    it('should update existing values', () => {
      state.set('photos', []);
      state.set('photos', [{ id: 1 }]);
      
      expect(state.get('photos')).toEqual([{ id: 1 }]);
      expect(state.history.length).toBe(2);
    });

    it('should handle array values', () => {
      const arr = [1, 2, 3];
      state.set('photos', arr);
      
      expect(state.get('photos')).toEqual(arr);
    });

    it('should emit change event', () => {
      const callback = jest.fn();
      state.subscribe('testKey', callback);
      
      state.set('testKey', 'newValue');
      
      expect(callback).toHaveBeenCalledWith('newValue', undefined);
    });

    it('should include old value in change event', () => {
      const callback = jest.fn();
      state.set('testKey', 'oldValue');
      state.subscribe('testKey', callback);
      
      state.set('testKey', 'newValue');
      
      expect(callback).toHaveBeenCalledWith('newValue', 'oldValue');
    });

    it('should maintain history with timestamps', () => {
      state.set('testKey', 'value1');
      state.set('testKey', 'value2');
      
      expect(state.history.length).toBe(2);
      expect(state.history[0]).toHaveProperty('timestamp');
      expect(state.history[0]).toHaveProperty('key', 'testKey');
      expect(state.history[0]).toHaveProperty('oldValue', undefined);
      expect(state.history[0]).toHaveProperty('newValue', 'value1');
    });
  });

  describe('update', () => {
    it('should update multiple properties at once', () => {
      const updates = {
        currentFilter: 'wedding',
        modalOpen: true,
        currentPhotoIndex: 5
      };
      
      state.update(updates);
      
      expect(state.get('currentFilter')).toBe('wedding');
      expect(state.get('modalOpen')).toBe(true);
      expect(state.get('currentPhotoIndex')).toBe(5);
    });

    it('should trigger notifications for each updated property', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      state.subscribe('currentFilter', callback1);
      state.subscribe('modalOpen', callback2);
      
      state.update({
        currentFilter: 'reception',
        modalOpen: true
      });
      
      expect(callback1).toHaveBeenCalledWith('reception', 'all');
      expect(callback2).toHaveBeenCalledWith(true, false);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to state changes', () => {
      const callback = jest.fn();
      const unsubscribe = state.subscribe('currentFilter', callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      state.set('currentFilter', 'wedding');
      expect(callback).toHaveBeenCalledWith('wedding', 'all');
    });

    it('should call callback for matching key changes', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      state.subscribe('currentFilter', callback1);
      state.subscribe('modalOpen', callback2);
      
      state.set('currentFilter', 'reception');
      
      expect(callback1).toHaveBeenCalledWith('reception', 'all');
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should not call callback for non-matching key changes', () => {
      const callback = jest.fn();
      
      state.subscribe('modalOpen', callback);
      state.set('currentFilter', 'reception');
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should subscribe to wildcard changes', () => {
      const callback = jest.fn();
      
      state.subscribe('*', callback);
      state.set('modalOpen', true);
      
      expect(callback).toHaveBeenCalledWith('modalOpen', true, false);
    });

    it('should handle errors in callbacks gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const goodCallback = jest.fn();
      
      // Mock console.error to suppress error output
      const originalError = console.error;
      console.error = jest.fn();
      
      state.subscribe('testKey', errorCallback);
      state.subscribe('testKey', goodCallback);
      
      state.set('testKey', 'value');
      
      expect(errorCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
      
      // Restore console.error
      console.error = originalError;
    });
  });

  describe('unsubscribe', () => {
    it('should remove event listener', () => {
      const callback = jest.fn();
      const unsubscribe = state.subscribe('modalOpen', callback);
      
      state.set('modalOpen', true);
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      state.set('modalOpen', false);
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('reset', () => {
    it('should reset state to initial values', () => {
      // Modify some state values
      state.set('currentFilter', 'reception');
      state.set('modalOpen', true);
      state.set('currentPhotoIndex', 5);
      
      // Reset to initial state
      state.reset();
      
      expect(state.get('currentFilter')).toBe('all');
      expect(state.get('modalOpen')).toBe(false);
      expect(state.get('currentPhotoIndex')).toBe(0);
      expect(state.get('photos')).toEqual([]);
    });
  });

  describe('history management', () => {
    it('should maintain state change history', () => {
      state.set('currentFilter', 'wedding');
      state.set('modalOpen', true);
      
      const history = state.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('key');
      expect(history[0]).toHaveProperty('oldValue');
      expect(history[0]).toHaveProperty('newValue');
    });

    it('should limit history size to 100 entries', () => {
      // Clear existing history
      state.clearHistory();
      
      // Add many state changes
      for (let i = 0; i < 150; i++) {
        state.set('testKey', i);
      }
      
      // History should be limited to 100 entries
      expect(state.history.length).toBeLessThanOrEqual(100);
    });

    it('should return limited history with getHistory', () => {
      // Clear existing history
      state.clearHistory();
      
      // Add some state changes
      for (let i = 0; i < 20; i++) {
        state.set('testKey', i);
      }
      
      const recentHistory = state.getHistory(5);
      expect(recentHistory.length).toBe(5);
      
      // Should return the most recent entries
      expect(recentHistory[recentHistory.length - 1].newValue).toBe(19);
    });

    it('should clear history', () => {
      state.set('testKey', 'value');
      expect(state.history.length).toBeGreaterThan(0);
      
      state.clearHistory();
      expect(state.history.length).toBe(0);
    });
  });

  describe('persistence', () => {
    let mockLocalStorage;
    
    beforeEach(() => {
      // Mock localStorage
      mockLocalStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      };
      global.localStorage = mockLocalStorage;
    });

    it('should save persistent state', () => {
      // Set properties that are actually saved by savePersistentState
      state.state.navigationHintShown = true;
      state.state.selectedTag = 'reception';
      
      state.savePersistentState();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'weddingPhotoAppState',
        expect.stringContaining('navigationHintShown')
      );
    });

    it('should load persistent state', () => {
      const mockData = JSON.stringify({
        navigationHintShown: true,
        selectedTag: 'reception'
      });
      
      mockLocalStorage.getItem.mockReturnValue(mockData);
      
      state.loadPersistentState();
      
      expect(state.get('navigationHintShown')).toBe(true);
      expect(state.get('selectedTag')).toBe('reception');
    });

    it('should handle localStorage errors gracefully', () => {
      const originalWarn = console.warn;
      console.warn = jest.fn();
      
      // Set state properties so save will be attempted
      state.state.navigationHintShown = true;
      
      // Mock localStorage to throw an error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      state.savePersistentState();
      
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to save state to localStorage:',
        expect.any(Error)
      );
      
      console.warn = originalWarn;
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      const originalWarn = console.warn;
      console.warn = jest.fn();
      
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      
      state.loadPersistentState();
      
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load state from localStorage:',
        expect.any(Error)
      );
      
      console.warn = originalWarn;
    });
  });

  describe('state properties', () => {
    it('should have all required default state properties', () => {
      expect(state.state).toHaveProperty('photos');
      expect(state.state).toHaveProperty('filteredPhotos');
      expect(state.state).toHaveProperty('currentPhotoIndex');
      expect(state.state).toHaveProperty('currentFilter');
      expect(state.state).toHaveProperty('selectedTag');
      expect(state.state).toHaveProperty('selectedPerson');
      expect(state.state).toHaveProperty('modalOpen');
      expect(state.state).toHaveProperty('uploadInProgress');
      expect(state.state).toHaveProperty('faceDetectionInProgress');
      expect(state.state).toHaveProperty('touchStartX');
      expect(state.state).toHaveProperty('touchEndX');
      expect(state.state).toHaveProperty('faceApiLoaded');
      expect(state.state).toHaveProperty('navigationHintShown');
    });

    it('should have correct initial values', () => {
      expect(state.state.photos).toEqual([]);
      expect(state.state.filteredPhotos).toEqual([]);
      expect(state.state.currentPhotoIndex).toBe(0);
      expect(state.state.currentFilter).toBe('all');
      expect(state.state.selectedTag).toBe('wedding');
      expect(state.state.selectedPerson).toBe('');
      expect(state.state.modalOpen).toBe(false);
      expect(state.state.uploadInProgress).toBe(false);
      expect(state.state.faceDetectionInProgress).toBe(false);
      expect(state.state.touchStartX).toBe(0);
      expect(state.state.touchEndX).toBe(0);
      expect(state.state.faceApiLoaded).toBe(false);
      expect(state.state.navigationHintShown).toBe(false);
    });
  });
});