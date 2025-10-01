# Development Workflow

## TypeScript Development

This project has been fully migrated to TypeScript for better type safety and development experience.

### Project Structure

```
src/
├── frontend/        # Frontend TypeScript source files
│   ├── api-client.ts    # API communication layer
│   ├── config.ts        # Configuration management
│   ├── face-detection.ts # Face detection and tagging
│   ├── filter-manager.ts # Photo filtering logic
│   ├── logger.ts        # Logging system
│   ├── main.ts          # Main application entry point
│   ├── modal-manager.ts # Photo viewer modal
│   ├── photo-manager.ts # Photo data management
│   ├── skeleton-loader.ts # Loading placeholders
│   ├── state.ts         # State management
│   ├── theme-manager.ts # Dark/light mode switching
│   ├── upload-manager.ts # File upload handling
│   └── utils.ts         # Utility functions
└── types/           # Shared TypeScript interfaces
    └── index.ts     # Common types and interfaces

dist/
├── frontend/        # Compiled frontend JavaScript
└── types/           # Compiled shared types

server/              # Backend server files
├── index.ts         # TypeScript server
├── index.cjs        # CommonJS production server
├── storage.ts       # Google Cloud Storage service
└── types.ts         # Server-specific types

public/              # Static web assets
├── css/             # Stylesheets
├── index.html       # Main HTML file
└── manifest.json    # PWA manifest
```

### Development Commands

#### Building TypeScript
```bash
# Build frontend TypeScript to JavaScript
npm run build:frontend

# Build everything (frontend + server)
npm run build

# Build with file watching (rebuilds on changes)
npm run build:watch

# Type checking only (no output)
npm run type-check
npm run type-check:frontend

# Clean build artifacts
npm run clean:dist
```

#### Development Workflow
1. **Edit TypeScript files** in `src/frontend/*.ts`
2. **Build the frontend** when ready to test:
   ```bash
   npm run build:frontend
   ```
3. **Start the server** (auto-builds frontend):
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