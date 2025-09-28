/**
 * Tests for Logger and ErrorHandler modules
 */

import { Logger, ErrorHandler } from '../../public/js/logger.js';

describe('Logger Module', () => {
  let logger;

  beforeEach(() => {
    logger = new Logger();
    // Mock console methods to avoid cluttering test output
    global.console = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(logger.logs).toEqual([]);
      expect(logger.maxLogs).toBe(1000);
      expect(logger.logLevel).toBe('info');
    });

    it('should have correct log levels', () => {
      expect(Logger.LEVELS).toEqual({
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
      });
    });
  });

  describe('setLevel', () => {
    it('should set log level', () => {
      logger.setLevel('debug');
      expect(logger.logLevel).toBe('debug');

      logger.setLevel('error');
      expect(logger.logLevel).toBe('error');
    });
  });

  describe('_addLog', () => {
    it('should add log entry', () => {
      const logEntry = logger._addLog('info', 'Test message', { key: 'value' });

      expect(logger.logs).toHaveLength(1);
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('level', 'info');
      expect(logEntry).toHaveProperty('message', 'Test message');
      expect(logEntry).toHaveProperty('data', { key: 'value' });
      expect(logEntry).toHaveProperty('stack');
    });

    it('should limit logs to maxLogs', () => {
      logger.maxLogs = 3;

      logger._addLog('info', 'Message 1');
      logger._addLog('info', 'Message 2');
      logger._addLog('info', 'Message 3');
      logger._addLog('info', 'Message 4');

      expect(logger.logs).toHaveLength(3);
      expect(logger.logs[0].message).toBe('Message 2');
      expect(logger.logs[2].message).toBe('Message 4');
    });

    it('should call console methods appropriately', () => {
      logger._addLog('info', 'Info message');
      expect(console.log).toHaveBeenCalledWith('[INFO] Info message');

      logger._addLog('error', 'Error message');
      expect(console.error).toHaveBeenCalledWith('[ERROR] Error message');

      logger._addLog('warn', 'Warning message');
      expect(console.warn).toHaveBeenCalledWith('[WARN] Warning message');

      logger._addLog('debug', 'Debug message');
      expect(console.debug).toHaveBeenCalledWith('[DEBUG] Debug message');
    });

    it('should include data in console output', () => {
      const data = { key: 'value' };
      logger._addLog('info', 'Message with data', data);
      expect(console.log).toHaveBeenCalledWith('[INFO] Message with data', data);
    });
  });

  describe('Log level filtering', () => {
    it('should respect log level for debug', () => {
      logger.setLevel('debug');
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(logger.logs).toHaveLength(4);
    });

    it('should respect log level for info', () => {
      logger.setLevel('info');
      
      logger.debug('Debug message'); // Should be filtered out
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(logger.logs).toHaveLength(3);
      expect(logger.logs.find(log => log.level === 'debug')).toBeUndefined();
    });

    it('should respect log level for warn', () => {
      logger.setLevel('warn');
      
      logger.debug('Debug message'); // Should be filtered out
      logger.info('Info message'); // Should be filtered out
      logger.warn('Warn message');
      logger.error('Error message');

      expect(logger.logs).toHaveLength(2);
      expect(logger.logs.find(log => log.level === 'debug')).toBeUndefined();
      expect(logger.logs.find(log => log.level === 'info')).toBeUndefined();
    });

    it('should respect log level for error', () => {
      logger.setLevel('error');
      
      logger.debug('Debug message'); // Should be filtered out
      logger.info('Info message'); // Should be filtered out
      logger.warn('Warn message'); // Should be filtered out
      logger.error('Error message');

      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].level).toBe('error');
    });
  });

  describe('Convenience methods', () => {
    beforeEach(() => {
      logger.setLevel('debug'); // Allow all levels
    });

    it('should have debug method', () => {
      const result = logger.debug('Debug message', { data: 'test' });
      
      expect(result).toHaveProperty('level', 'debug');
      expect(result).toHaveProperty('message', 'Debug message');
      expect(result).toHaveProperty('data', { data: 'test' });
    });

    it('should have info method', () => {
      const result = logger.info('Info message', { data: 'test' });
      
      expect(result).toHaveProperty('level', 'info');
      expect(result).toHaveProperty('message', 'Info message');
    });

    it('should have warn method', () => {
      const result = logger.warn('Warning message', { data: 'test' });
      
      expect(result).toHaveProperty('level', 'warn');
      expect(result).toHaveProperty('message', 'Warning message');
    });

    it('should have error method', () => {
      const result = logger.error('Error message', { data: 'test' });
      
      expect(result).toHaveProperty('level', 'error');
      expect(result).toHaveProperty('message', 'Error message');
    });
  });

  describe('getLogs', () => {
    beforeEach(() => {
      logger.setLevel('debug');
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
    });

    it('should return recent logs', () => {
      const logs = logger.getLogs();
      expect(logs).toHaveLength(4);
    });

    it('should return limited logs', () => {
      const logs = logger.getLogs(2);
      expect(logs).toHaveLength(2);
      // Should return the most recent logs
      expect(logs[0].level).toBe('warn');
      expect(logs[1].level).toBe('error');
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', () => {
      logger.info('Test message');
      expect(logger.logs).toHaveLength(1);
      
      logger.clearLogs();
      expect(logger.logs).toHaveLength(0);
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON string', () => {
      logger.info('Test message');
      const exported = logger.exportLogs();
      
      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toHaveProperty('message', 'Test message');
    });
  });
});

describe('ErrorHandler Module', () => {
  let errorHandler;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };
    
    // Mock window and addEventListener
    global.window = {
      addEventListener: jest.fn()
    };

    errorHandler = new ErrorHandler(mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with logger', () => {
      expect(errorHandler.logger).toBe(mockLogger);
    });

    it('should setup global error handling', () => {
      expect(global.window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(global.window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });
  });

  describe('handleApiError', () => {
    it('should handle server errors', () => {
      const error = new Error('Server error');
      error.status = 500;
      error.statusText = 'Internal Server Error';

      const result = errorHandler.handleApiError(error, 'GET /api/photos');

      expect(result).toBe('Server error. Please try again later.');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'API Error (GET /api/photos)',
        expect.objectContaining({
          context: 'GET /api/photos',
          status: 500,
          statusText: 'Internal Server Error'
        })
      );
    });

    it('should handle not found errors', () => {
      const error = new Error('Not found');
      error.status = 404;
      
      const result = errorHandler.handleApiError(error);
      
      expect(result).toBe('Resource not found.');
    });

    it('should handle authentication errors', () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      
      const result = errorHandler.handleApiError(error);
      
      expect(result).toBe('Access denied. Please check your permissions.');
    });

    it('should handle forbidden errors', () => {
      const error = new Error('Forbidden');
      error.status = 403;
      
      const result = errorHandler.handleApiError(error);
      
      expect(result).toBe('Access denied. Please check your permissions.');
    });

    it('should handle bad request errors', () => {
      const error = new Error('Bad request');
      error.status = 400;
      
      const result = errorHandler.handleApiError(error);
      
      expect(result).toBe('Invalid request. Please check your input.');
    });

    it('should handle network errors', () => {
      const error = new Error('Network error');
      // No status property for network errors
      
      const result = errorHandler.handleApiError(error);
      
      expect(result).toBe('Network error. Please check your connection.');
    });
  });

  describe('handleUploadError', () => {
    it('should handle invalid file type', () => {
      const error = new Error('Invalid file type');
      const file = { type: 'text/plain', name: 'document.txt' };
      
      // Mock CONFIG for this test
      const originalConfig = global.CONFIG;
      global.CONFIG = {
        UPLOAD: {
          SUPPORTED_TYPES: ['image/jpeg', 'image/png'],
          MAX_FILE_SIZE: 25 * 1024 * 1024
        }
      };
      
      const result = errorHandler.handleUploadError(error, file);
      
      expect(result).toBe('Upload failed. Please select a valid image file.');
      expect(mockLogger.error).toHaveBeenCalled();
      
      global.CONFIG = originalConfig;
    });

    it('should handle file too large', () => {
      const error = new Error('File too large');
      const file = { 
        type: 'image/jpeg', 
        name: 'large-image.jpg',
        size: 30 * 1024 * 1024 // 30MB
      };
      
      const originalConfig = global.CONFIG;
      global.CONFIG = {
        UPLOAD: {
          SUPPORTED_TYPES: ['image/jpeg', 'image/png'],
          MAX_FILE_SIZE: 25 * 1024 * 1024 // 25MB limit
        }
      };
      
      const result = errorHandler.handleUploadError(error, file);
      
      expect(result).toBe('Upload failed. File is too large. Maximum size is 25MB.');
      
      global.CONFIG = originalConfig;
    });

    it('should handle network errors during upload', () => {
      const error = new Error('network timeout');
      const file = { 
        type: 'image/jpeg', 
        name: 'photo.jpg',
        size: 1024 * 1024 // 1MB
      };
      
      const originalConfig = global.CONFIG;
      global.CONFIG = {
        UPLOAD: {
          SUPPORTED_TYPES: ['image/jpeg', 'image/png'],
          MAX_FILE_SIZE: 25 * 1024 * 1024
        }
      };
      
      const result = errorHandler.handleUploadError(error, file);
      
      expect(result).toBe('Upload failed. Please check your internet connection.');
      
      global.CONFIG = originalConfig;
    });

    it('should handle generic upload errors', () => {
      const error = new Error('Generic error');
      const file = { 
        type: 'image/jpeg', 
        name: 'photo.jpg',
        size: 1024 * 1024
      };
      
      const originalConfig = global.CONFIG;
      global.CONFIG = {
        UPLOAD: {
          SUPPORTED_TYPES: ['image/jpeg', 'image/png'],
          MAX_FILE_SIZE: 25 * 1024 * 1024
        }
      };
      
      const result = errorHandler.handleUploadError(error, file);
      
      expect(result).toBe('Upload failed. Please try again.');
      
      global.CONFIG = originalConfig;
    });
  });

  describe('handleFaceDetectionError', () => {
    it('should handle model loading errors', () => {
      const error = new Error('Face detection model failed to load');
      
      const result = errorHandler.handleFaceDetectionError(error);
      
      expect(result).toBe('Face detection models failed to load. Please refresh the page.');
      expect(mockLogger.error).toHaveBeenCalledWith('Face detection error', error);
    });

    it('should handle canvas processing errors', () => {
      const error = new Error('canvas processing failed');
      
      const result = errorHandler.handleFaceDetectionError(error);
      
      expect(result).toBe('Image processing failed. Please try a different image.');
    });

    it('should handle generic face detection errors', () => {
      const error = new Error('Unknown face detection error');
      
      const result = errorHandler.handleFaceDetectionError(error);
      
      expect(result).toBe('Face detection failed. Please try again.');
    });
  });

  describe('tryExecute', () => {
    it('should execute function successfully', async () => {
      const testFn = jest.fn().mockResolvedValue('success');
      
      const result = await errorHandler.tryExecute(testFn, 'test context');
      
      expect(result).toBe('success');
      expect(testFn).toHaveBeenCalled();
    });

    it('should handle function errors', async () => {
      const testFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await errorHandler.tryExecute(testFn, 'test context', 'fallback');
      
      expect(result).toBe('fallback');
      expect(mockLogger.error).toHaveBeenCalledWith('Error in test context', expect.any(Error));
    });
  });

  describe('wrapAsync', () => {
    it('should wrap function and execute successfully', async () => {
      const testFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = errorHandler.wrapAsync(testFn, 'test context');
      
      const result = await wrappedFn('arg1', 'arg2');
      
      expect(result).toBe('success');
      expect(testFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should wrap function and handle errors', async () => {
      const testError = new Error('Test error');
      const testFn = jest.fn().mockRejectedValue(testError);
      const wrappedFn = errorHandler.wrapAsync(testFn, 'test context');
      
      await expect(wrappedFn()).rejects.toThrow('Test error');
      expect(mockLogger.error).toHaveBeenCalledWith('Async error in test context', testError);
    });
  });

  describe('global error handling', () => {
    it('should handle uncaught errors', () => {
      // Simulate the error event handler being called
      const errorEvent = {
        message: 'Uncaught error',
        filename: 'test.js',
        lineno: 42,
        colno: 10,
        error: new Error('Test error')
      };

      // Get the error handler that was registered
      const errorHandlerCall = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      );
      
      expect(errorHandlerCall).toBeDefined();
      const errorHandlerFn = errorHandlerCall[1];

      errorHandlerFn(errorEvent);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Uncaught error',
        expect.objectContaining({
          message: 'Uncaught error',
          filename: 'test.js',
          lineno: 42,
          colno: 10,
          error: expect.any(Error)
        })
      );
    });

    it('should handle unhandled promise rejections', () => {
      const rejectionEvent = {
        reason: 'Promise rejection reason',
        promise: Promise.resolve()
      };

      // Get the rejection handler that was registered
      const rejectionHandlerCall = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'unhandledrejection'
      );
      
      expect(rejectionHandlerCall).toBeDefined();
      const rejectionHandlerFn = rejectionHandlerCall[1];

      rejectionHandlerFn(rejectionEvent);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unhandled promise rejection',
        expect.objectContaining({
          reason: 'Promise rejection reason',
          promise: expect.any(Promise)
        })
      );
    });
  });
});