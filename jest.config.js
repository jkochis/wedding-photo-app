export default {
  // Use jsdom environment for browser-like testing
  testEnvironment: 'jsdom',
  
  // Test files patterns  
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/simple.test.js'
  ],
  
  // Disable setup file for now
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'dist/public/js/**/*.js',
    'src/frontend/**/*.ts',
    '!dist/public/js/**/*.test.js',
    '!src/**/*.test.ts',
    '!**/node_modules/**',
    '!dist/public/js/types/**'
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  // coverageThreshold: {
  //   global: {
  //     branches: 50,
  //     functions: 50,
  //     lines: 50,
  //     statements: 50
  //   }
  // },
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};