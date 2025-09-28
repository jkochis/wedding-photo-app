# Wedding Photo App - CSS Architecture

This directory contains the modular CSS architecture for the Wedding Photo App, organized following modern CSS best practices and maintainability principles.

## 📁 Directory Structure

```
css/
├── README.md           # This documentation
├── main.css           # Main stylesheet that imports all modules
│
├── base/              # Foundation styles
│   ├── tokens.css     # Design tokens and CSS custom properties
│   ├── reset.css      # Modern CSS reset and normalization
│   └── typography.css # Typography styles and text utilities
│
├── layout/            # Layout and structural styles
│   └── container.css  # Container and grid systems
│
├── utilities/         # Utility classes
│   ├── spacing.css    # Margin and padding utilities
│   ├── layout.css     # Flexbox, grid, and positioning utilities
│   └── visual.css     # Shadows, borders, colors, and visual effects
│
└── components/        # Component-specific styles
    ├── header.css     # Header and theme toggle
    ├── upload.css     # File upload interface
    ├── filter.css     # Photo filtering controls
    ├── gallery.css    # Photo grid and gallery
    └── modal.css      # Photo modal and viewer
```

## 🏗️ Architecture Principles

### 1. **Modular Design**
- Each file has a single responsibility
- Components are self-contained and reusable
- Clear separation between base, utilities, and components

### 2. **Scalable Structure**
- Easy to add new components or utilities
- Predictable file organization
- Minimal interdependencies between modules

### 3. **Design Token System**
- Centralized design values in `base/tokens.css`
- Consistent spacing, colors, typography, and effects
- Easy theme customization and dark mode support

### 4. **Performance Optimized**
- Logical import order prevents CSS cascade issues
- Utility-first approach reduces code duplication
- Efficient selector usage

## 🎨 Design Token Categories

### Colors
- Primary colors: `--color-primary`, `--color-secondary`, `--color-accent`
- Text colors: `--color-text`, `--color-text-secondary`, `--color-text-muted`
- Background colors: `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-card`
- Status colors: `--color-success`, `--color-error`, `--color-warning`, `--color-info`

### Spacing
- Scale: `--space-xs` through `--space-4xl`
- Consistent 8px base unit system
- Responsive spacing considerations

### Typography
- Font family: `--font-family`
- Font sizes: `--font-size-xs` through `--font-size-5xl`
- Font weights: `--font-weight-normal` through `--font-weight-bold`
- Line heights: `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed`

### Effects
- Shadows: `--shadow-sm` through `--shadow-xl`
- Border radius: `--radius-sm` through `--radius-full`
- Transitions: `--transition-fast`, `--transition-normal`, `--transition-slow`

## 🔧 Usage Guidelines

### Adding New Components
1. Create a new CSS file in `components/`
2. Use existing design tokens for consistency
3. Add responsive breakpoints as needed
4. Import the new file in `main.css`

### Using Utility Classes
- Prefer utility classes for common patterns (spacing, layout, colors)
- Use semantic component classes for complex styling
- Combine utilities with components when appropriate

### Dark Mode Support
- Colors automatically adapt based on `data-theme="dark"` attribute
- Use CSS custom properties for themeable values
- Test both light and dark themes

### Responsive Design
- Mobile-first approach with min-width media queries
- Use consistent breakpoints defined in tokens
- Consider touch interactions for mobile devices

## 🧪 Development Workflow

### Making Changes
1. Identify the appropriate module for your changes
2. Use existing design tokens when possible
3. Add new tokens to `base/tokens.css` if needed
4. Test across different screen sizes and themes

### Adding New Features
1. Check if existing utilities can solve the problem
2. Create component-specific styles when needed
3. Document any new patterns or tokens
4. Consider accessibility implications

### Performance Considerations
- CSS imports are resolved at build time
- Unused styles should be removed during optimization
- Keep specificity low for easier maintenance

## 📱 Responsive Breakpoints

```css
/* Mobile First Approach */
/* Base styles apply to mobile (320px+) */

@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

## 🎯 Component API

Each component follows a consistent API pattern:

### Component Structure
```css
.component-name {
  /* Base styles */
}

.component-name__element {
  /* Element styles */
}

.component-name--modifier {
  /* Modifier styles */
}

.component-name.state {
  /* State styles (hover, active, etc.) */
}
```

### Component States
- `.active` - Active/selected state
- `.disabled` - Disabled state
- `.loading` - Loading state
- `.error` - Error state
- `.show`/`.hidden` - Visibility states

## 🔄 Migration Guide

### From Old CSS Structure
The previous monolithic CSS files have been replaced with this modular system:

- `styles.css` → Distributed across base/, utilities/, and components/
- `styles-enhanced.css` → Organized into the new modular structure

### Benefits of New Structure
- **Maintainability**: Easier to find and modify specific styles
- **Scalability**: Simple to add new components or features
- **Performance**: Better caching and loading optimization
- **Collaboration**: Multiple developers can work on different modules
- **Debugging**: Easier to trace styles to their source files

## 🚀 Future Enhancements

- CSS custom media queries for breakpoint management
- CSS-in-JS integration possibilities
- Build-time optimization and purging
- Component documentation automation
- Design system integration

---

For questions or contributions to the CSS architecture, please refer to the main project documentation.