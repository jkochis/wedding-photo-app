/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

import { jest } from '@jest/globals';

// Mock global objects that might not exist in test environment
global.fetch = jest.fn();
global.FormData = jest.fn(() => ({
  append: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock URL constructor
global.URL = jest.fn().mockImplementation((url, base) => {
  const fullUrl = base ? `${base}${url}` : url;
  const searchParams = {
    append: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    set: jest.fn(),
    delete: jest.fn()
  };
  
  return {
    href: fullUrl,
    origin: base || 'http://localhost:3000',
    pathname: url,
    search: '',
    searchParams: searchParams,
    toString: () => fullUrl
  };
});

// Mock URLSearchParams
global.URLSearchParams = jest.fn().mockImplementation((params) => {
  const parseParams = (paramString) => {
    const result = {};
    if (paramString) {
      const searchParams = paramString.startsWith('?') ? paramString.slice(1) : paramString;
      searchParams.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) result[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }
    return result;
  };
  
  const parsedParams = typeof params === 'string' ? parseParams(params) : (params || {});
  
  return {
    append: jest.fn(),
    delete: jest.fn(),
    get: jest.fn((key) => parsedParams[key] || null),
    getAll: jest.fn((key) => parsedParams[key] ? [parsedParams[key]] : []),
    has: jest.fn((key) => key in parsedParams),
    set: jest.fn((key, value) => { parsedParams[key] = value; }),
    sort: jest.fn(),
    toString: jest.fn(() => Object.entries(parsedParams).map(([k, v]) => `${k}=${v}`).join('&')),
    entries: jest.fn(() => Object.entries(parsedParams)),
    keys: jest.fn(() => Object.keys(parsedParams)),
    values: jest.fn(() => Object.values(parsedParams))
  };
});

// Mock console methods to avoid test output pollution
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock DOM methods that might not exist
// Location mocking is done per-test to avoid conflicts

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    userAgent: 'jest-test-environment'
  },
  writable: true,
  configurable: true
});

// Create DOM elements commonly used in tests
beforeEach(() => {
  // Clear DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Add commonly used DOM elements
  const elements = [
    { id: 'uploadArea', tag: 'div' },
    { id: 'fileInput', tag: 'input' },
    { id: 'photoGrid', tag: 'div' },
    { id: 'emptyState', tag: 'div' },
    { id: 'photoModal', tag: 'div' },
    { id: 'modalImage', tag: 'img' },
    { id: 'closeModal', tag: 'span' },
    { id: 'prevPhoto', tag: 'button' },
    { id: 'nextPhoto', tag: 'button' },
    { id: 'detectFacesBtn', tag: 'button' },
    { id: 'peopleFilter', tag: 'select' },
    { id: 'uploadProgress', tag: 'div' },
    { id: 'progressText', tag: 'p' },
    { id: 'progressFill', tag: 'div' },
    { id: 'modalTag', tag: 'div' },
    { id: 'modalDate', tag: 'div' },
    { id: 'peopleTags', tag: 'div' },
    { id: 'photoCounter', tag: 'div' }
  ];
  
  elements.forEach(({ id, tag }) => {
    const element = document.createElement(tag);
    element.id = id;
    if (tag === 'input') {
      element.type = 'file';
      element.multiple = true;
    }
    document.body.appendChild(element);
  });
  
  // Add filter buttons
  const filterButtons = ['all', 'wedding', 'reception', 'other'];
  filterButtons.forEach(filter => {
    const button = document.createElement('button');
    button.className = 'filter-btn';
    button.dataset.filter = filter;
    if (filter === 'all') button.classList.add('active');
    document.body.appendChild(button);
  });
  
  // Add tag buttons
  const tagButtons = ['wedding', 'reception', 'other'];
  tagButtons.forEach(tag => {
    const button = document.createElement('button');
    button.className = 'tag-btn';
    button.dataset.tag = tag;
    if (tag === 'wedding') button.classList.add('active');
    document.body.appendChild(button);
  });
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  
  // Reset localStorage and sessionStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});

// Global test utilities
global.testUtils = {
  // Create a mock photo object
  createMockPhoto: (overrides = {}) => ({
    id: 'test-photo-1',
    filename: 'test-photo.jpg',
    originalName: 'test-photo.jpg',
    url: '/uploads/test-photo.jpg?token=test-token',
    tag: 'wedding',
    size: 1024000,
    uploadedAt: '2025-01-01T00:00:00.000Z',
    mimetype: 'image/jpeg',
    people: [],
    faces: [],
    ...overrides
  }),
  
  // Create multiple mock photos
  createMockPhotos: (count = 3) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-photo-${i + 1}`,
      filename: `test-photo-${i + 1}.jpg`,
      originalName: `test-photo-${i + 1}.jpg`,
      url: `/uploads/test-photo-${i + 1}.jpg?token=test-token`,
      tag: ['wedding', 'reception', 'other'][i % 3],
      size: 1024000 + i * 100000,
      uploadedAt: new Date(2025, 0, i + 1).toISOString(),
      mimetype: 'image/jpeg',
      people: i === 0 ? ['John'] : i === 1 ? ['Jane'] : [],
      faces: []
    }));
  },
  
  // Create a mock file
  createMockFile: (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
    const file = new File([''], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  },
  
  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock DOM event
  mockEvent: (type = 'click', target = {}, eventInit = {}) => ({
    type,
    target,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...eventInit
  })
};