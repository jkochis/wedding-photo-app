/**
 * Tests for ApiClient module
 */

// Mock dependencies first before any imports
const mockUtils = {
  getUrlParam: jest.fn().mockReturnValue('mock-token'),
  wait: jest.fn().mockResolvedValue()
};

const mockConfig = {
  API: {
    BASE_URL: 'http://localhost:3000',
    ENDPOINTS: {
      PHOTOS: '/api/photos',
      UPLOAD: '/api/upload',
      PEOPLE: '/api/photos/:id/people',
      STATS: '/api/stats',
      HEALTH: '/health'
    }
  }
};

const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

const mockErrorHandler = {
  handleApiError: jest.fn().mockReturnValue('Mock error message'),
  handleUploadError: jest.fn().mockReturnValue('Mock upload error')
};

// Set up mocks before module imports
jest.doMock('../../public/js/config.js', () => ({ CONFIG: mockConfig }));
jest.doMock('../../public/js/logger.js', () => ({
  log: mockLogger,
  errorHandler: mockErrorHandler
}));
jest.doMock('../../public/js/utils.js', () => ({ default: mockUtils }));

// Now import the module
import { ApiClient } from '../../public/js/api-client.js';

// Mock fetch globally
global.fetch = jest.fn();
global.window = {
  location: {
    origin: 'http://localhost:3000'
  }
};

describe('ApiClient Module', () => {
  let apiClient;
  let mockFetch;

  beforeEach(() => {
    apiClient = new ApiClient();
    mockFetch = global.fetch;
    mockFetch.mockClear();
    
    // Mock FormData
    global.FormData = jest.fn(() => ({
      append: jest.fn()
    }));
    
    // Mock URL constructor
    global.URL = jest.fn().mockImplementation((url, base) => ({
      toString: () => base ? `${base}${url}` : url,
      searchParams: {
        append: jest.fn()
      }
    }));
  });

  describe('Constructor', () => {
    it('should initialize with correct default values', () => {
      expect(apiClient.baseURL).toBe('http://localhost:3000');
      expect(apiClient.accessToken).toBe('mock-token');
      expect(apiClient.isInitialized).toBe(false);
      expect(apiClient.defaultHeaders).toEqual({
        'Content-Type': 'application/json'
      });
    });

    it('should initialize with options passed to constructor', () => {
      const customClient = new ApiClient({
        baseURL: 'https://custom.example.com',
        accessToken: 'custom-token'
      });

      expect(customClient.baseURL).toBe('https://custom.example.com');
      expect(customClient.accessToken).toBe('custom-token');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid health check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' })
      });

      await apiClient.initialize();

      expect(apiClient.isInitialized).toBe(true);
    });

    it('should still initialize if health check fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Health check failed'));

      await apiClient.initialize();

      expect(apiClient.isInitialized).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return correct status information', () => {
      const status = apiClient.getStatus();

      expect(status).toEqual({
        initialized: false,
        hasToken: true,
        baseURL: 'http://localhost:3000'
      });
    });
  });

  describe('setAccessToken', () => {
    it('should update access token', () => {
      apiClient.setAccessToken('new-token');
      expect(apiClient.accessToken).toBe('new-token');
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    describe('get', () => {
      it('should make GET request with correct parameters', async () => {
        await apiClient.get('/api/photos', { limit: 10 });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'x-access-token': 'mock-token'
            })
          })
        );
      });
    });

    describe('post', () => {
      it('should make POST request with JSON body', async () => {
        const body = { test: 'data' };
        await apiClient.post('/api/photos', body);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'x-access-token': 'mock-token'
            }),
            body: JSON.stringify(body)
          })
        );
      });

      it('should handle FormData body correctly', async () => {
        const formData = new FormData();
        await apiClient.post('/api/upload', formData);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'x-access-token': 'mock-token'
              // Content-Type should be removed for FormData
            }),
            body: formData
          })
        );

        // Content-Type should not be present for FormData
        const callArgs = mockFetch.mock.calls[0][1];
        expect(callArgs.headers['Content-Type']).toBeUndefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('{"error": "Not found"}')
      };

      mockFetch.mockResolvedValueOnce(errorResponse);

      await expect(apiClient.get('/api/photos')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/api/photos')).rejects.toThrow();
    });
  });

  describe('Photo API Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    it('should call getPhotos correctly', async () => {
      await apiClient.getPhotos();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/photos'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should call uploadPhoto correctly', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await apiClient.uploadPhoto(mockFile, 'wedding');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/upload'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
    });
  });

  describe('Batch Operations', () => {
    it('should upload multiple photos successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, id: 'photo1' })
      });

      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
      ];

      const result = await apiClient.uploadPhotos(files);

      expect(result.totalFiles).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('retryOperation', () => {
    it('should retry failed operations', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce('Success on third attempt');

      const result = await apiClient.retryOperation(operation, 3, 10);

      expect(operation).toHaveBeenCalledTimes(3);
      expect(result).toBe('Success on third attempt');
    });

    it('should throw error after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(apiClient.retryOperation(operation, 2, 10)).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});