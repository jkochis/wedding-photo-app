# Development Workflow

## TypeScript Development

This project has been fully migrated to TypeScript for better type safety and development experience.

### Project Structure

```
public/js/           # TypeScript source files (.ts)
├── api-client.ts    # API communication layer
├── config.ts        # Configuration management
├── face-detection.ts # Face detection and tagging
├── filter-manager.ts # Photo filtering logic
├── logger.ts        # Logging system
├── main.ts          # Main application entry point
├── modal-manager.ts # Photo viewer modal
├── photo-manager.ts # Photo data management
├── skeleton-loader.ts # Loading placeholders
├── state.ts         # State management
├── theme-manager.ts # Dark/light mode switching
├── upload-manager.ts # File upload handling
└── utils.ts         # Utility functions

dist/public/js/      # Compiled JavaScript output
public/js/           # Runtime JavaScript files (copied from dist)
```

### Development Commands

#### Building TypeScript
```bash
# Build all TypeScript files to JavaScript
npm run build

# Build with file watching (rebuilds on changes)
npm run build:watch

# Type checking only (no output)
npm run type-check
```

#### Development Workflow
1. **Edit TypeScript files** in `public/js/*.ts`
2. **Build the frontend** when ready to test:
   ```bash
   npm run build
   ```
3. **Start the server**:
   ```bash
   npm start
   ```

#### Automatic Development Workflow
For development with automatic rebuilding:
```bash
# Terminal 1: Watch and rebuild TypeScript
npm run build:watch

# Terminal 2: Start the server
npm start
```

### Key TypeScript Features

- **Strict type checking** enabled
- **DOM types** included for browser APIs
- **ES2022 target** with modern JavaScript features
- **Source maps** for debugging
- **Module system** using ES modules

### Build Process

The TypeScript compiler:
1. Compiles `.ts` files to `.js` in the `dist/` directory
2. Copies the compiled JS files to `public/js/` for the web server
3. Generates source maps for debugging

### Type Safety

All modules now have:
- ✅ Proper type definitions for parameters and return values
- ✅ Interface definitions for complex objects
- ✅ Union types for restricted values (e.g., `'light' | 'dark'`)
- ✅ Generic types where applicable
- ✅ Strict null checks and optional chaining

### IDE Support

With TypeScript, you get:
- **Autocomplete** for all functions and properties
- **Type checking** as you code
- **Refactoring support** with confidence
- **Go to definition** across the codebase
- **Error highlighting** before runtime

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Production Build

For production deployment:
```bash
# Build frontend
npm run build

# The compiled JavaScript will be available in public/js/
# Ready to serve with any web server
```