# CSS Development Guide

This guide explains how to work with the modular CSS architecture in this wedding photo app.

## Architecture Overview

The CSS is organized into a modular, scalable architecture with clear separation of concerns:

```
public/css/
├── base/           # Foundation styles
├── utilities/      # Utility classes
├── layout/         # Layout components
├── components/     # UI components
└── main.css        # Entry point
```

## Quick Start

### Development Commands

```bash
# List all CSS files with sizes
npm run css:list

# Analyze CSS for potential issues
npm run css:analyze

# Create a new component (adds template to components/)
npm run css:component button

# Create a new utility file (adds template to utilities/)
npm run css:utility animations
```

### Direct Script Usage

```bash
# If you prefer using the script directly
node scripts/css-utils.js list
node scripts/css-utils.js analyze
node scripts/css-utils.js component sidebar
node scripts/css-utils.js utility transforms
```

## Working with the Architecture

### 1. Design Tokens (base/tokens.css)

All design values are centralized as CSS custom properties:

```css
/* Colors */
:root {
  --color-primary: #e8b4a0;
  --color-secondary: #d4a574;
  --color-accent: #c9a96e;
}

/* Spacing */
:root {
  --spacing-xs: 0.25rem;    /* 4px */
  --spacing-sm: 0.5rem;     /* 8px */
  --spacing-md: 1rem;       /* 16px */
}
```

**When to modify:** Adding new colors, spacing values, typography scales, or other design tokens.

### 2. Base Styles

#### Reset (base/reset.css)
Modern CSS reset with sensible defaults.
**When to modify:** Rarely - only for global browser compatibility fixes.

#### Typography (base/typography.css)
Base typography styles and utility classes.
**When to modify:** Adding new text styles or font weights.

### 3. Utilities

Atomic utility classes for common styling patterns:

#### Spacing (utilities/spacing.css)
```css
.m-4 { margin: var(--spacing-md); }
.p-2 { padding: var(--spacing-sm); }
.ml-auto { margin-left: auto; }
```

#### Layout (utilities/layout.css)
```css
.flex { display: flex; }
.grid { display: grid; }
.justify-center { justify-content: center; }
```

#### Visual (utilities/visual.css)
```css
.bg-primary { background-color: var(--color-primary); }
.shadow-md { box-shadow: var(--shadow-md); }
.rounded-lg { border-radius: var(--radius-lg); }
```

**When to add utilities:** For styles you use repeatedly across components.

### 4. Components

Self-contained UI component styles following BEM methodology:

```css
/* Block */
.upload-area {
  /* Base component styles */
}

/* Element */
.upload-area__icon {
  /* Child element styles */
}

/* Modifier */
.upload-area--dragover {
  /* State/variant styles */
}
```

#### Creating New Components

```bash
npm run css:component sidebar
```

This creates `components/sidebar.css` with a template:

```css
/**
 * Sidebar Component
 * Component description goes here
 */

.sidebar {
  /* Base component styles */
}

.sidebar__element {
  /* Element styles */
}

.sidebar--modifier {
  /* Modifier styles */
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .sidebar {
    /* Mobile styles */
  }
}
```

**Remember to:** Add the import to `main.css` in the components section.

### 5. Layout Components

Large layout containers and grid systems:

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}
```

## Development Workflow

### 1. Planning New Styles

Before writing CSS, determine where it belongs:

- **Design token?** → `base/tokens.css`
- **Reusable utility?** → `utilities/`  
- **Component-specific?** → `components/`
- **Layout structure?** → `layout/`

### 2. Creating Components

```bash
# Create the component file
npm run css:component photo-card

# Edit the generated file
# Add import to main.css
# Test in browser
```

### 3. Managing Utilities

```bash
# Create utility file
npm run css:utility animations

# Add utilities for common patterns
# Import in main.css
```

### 4. Regular Maintenance

```bash
# Check file sizes and potential issues
npm run css:analyze

# Review architecture
npm run css:list
```

## Best Practices

### 1. Naming Conventions

- **Components:** Use BEM (Block__Element--Modifier)
- **Utilities:** Use descriptive names (`text-center`, `bg-primary`)
- **Custom properties:** Use semantic names (`--color-primary`, not `--red`)

### 2. Organization

- Keep components focused and single-purpose
- Use utilities for common patterns
- Avoid deep nesting (max 3 levels)
- Group related styles together

### 3. Responsive Design

- Mobile-first approach using min-width media queries
- Use design tokens for breakpoints
- Consider touch targets on mobile

### 4. Performance

- Keep files focused and small (ideally under 5KB per file)
- Use CSS custom properties for theming
- Minimize use of `!important`

## Current Architecture Status

Based on the latest analysis:

- **13 CSS files** totaling **42.6KB** (average 3.3KB per file)
- **70 design tokens** in the tokens file
- **Issues identified:**
  - Some `!important` declarations in tokens.css
  - Modal component is 5.7KB (consider splitting)
  - Spacing utilities file is 5.0KB (acceptable for utilities)

## Migration Notes

The app has been migrated from a monolithic CSS file to this modular architecture. The old styles are preserved in the new structure with improved organization and maintainability.

### Key Benefits

1. **Maintainability:** Clear separation of concerns
2. **Scalability:** Easy to add new components/utilities  
3. **Consistency:** Centralized design tokens
4. **Performance:** Selective loading possibilities
5. **Development:** Built-in tooling for management

## Troubleshooting

### CSS Not Loading
Check that `main.css` imports are in the correct order and all files exist.

### Styles Not Applying
1. Check CSS specificity
2. Verify class names match
3. Check for typos in custom properties
4. Use browser dev tools to debug

### Build Issues
The CSS architecture is static - no build process required. Files are served directly by Express.

## Next Steps

Consider these future enhancements:

1. **CSS preprocessing** with PostCSS for advanced features
2. **Build process** for minification and concatenation
3. **Critical CSS** extraction for performance
4. **CSS-in-JS** migration for dynamic styling
5. **Design system** documentation with living examples