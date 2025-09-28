/**
 * Wedding Photo App - Theme Manager
 * Handles dark/light mode switching and theme persistence
 */

export class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.storageKey = 'wedding-photo-theme';
        this.toggleButton = null;
        
        this.init();
    }
    
    /**
     * Initialize theme manager
     */
    init() {
        // Load saved theme or detect system preference
        this.loadTheme();
        
        // Create theme toggle button
        this.createToggleButton();
        
        // Listen for system theme changes
        this.listenForSystemThemeChanges();
    }
    
    /**
     * Load theme from storage or system preference
     */
    loadTheme() {
        // Check for saved theme
        const savedTheme = localStorage.getItem(this.storageKey);
        
        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.currentTheme = 'dark';
            }
        }
        
        this.applyTheme();
    }
    
    /**
     * Apply theme to document
     */
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        
        // Update toggle button icon
        if (this.toggleButton) {
            this.toggleButton.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
            this.toggleButton.title = `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`;
        }
    }
    
    /**
     * Create theme toggle button
     */
    createToggleButton() {
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'theme-toggle';
        this.toggleButton.setAttribute('aria-label', 'Toggle theme');
        this.toggleButton.addEventListener('click', () => this.toggleTheme());
        
        // Insert at beginning of app
        const app = document.getElementById('app');
        if (app) {
            app.insertBefore(this.toggleButton, app.firstChild);
        } else {
            document.body.appendChild(this.toggleButton);
        }
        
        this.applyTheme(); // Update button icon
    }
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        
        // Save to localStorage
        localStorage.setItem(this.storageKey, this.currentTheme);
        
        // Apply theme
        this.applyTheme();
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: this.currentTheme }
        }));
        
        // Add transition effect
        this.addTransitionEffect();
    }
    
    /**
     * Add smooth transition effect when switching themes
     */
    addTransitionEffect() {
        const transition = document.createElement('div');
        transition.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${this.currentTheme === 'dark' ? '#1a1a1a' : '#f8f4f0'};
            z-index: 9999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(transition);
        
        // Trigger animation
        requestAnimationFrame(() => {
            transition.style.opacity = '0.5';
            
            setTimeout(() => {
                transition.style.opacity = '0';
                
                setTimeout(() => {
                    document.body.removeChild(transition);
                }, 300);
            }, 150);
        });
    }
    
    /**
     * Listen for system theme changes
     */
    listenForSystemThemeChanges() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                const hasManualPreference = localStorage.getItem(this.storageKey);
                
                if (!hasManualPreference) {
                    this.currentTheme = e.matches ? 'dark' : 'light';
                    this.applyTheme();
                }
            });
        }
    }
    
    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    /**
     * Set theme programmatically
     */
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.currentTheme = theme;
            localStorage.setItem(this.storageKey, this.currentTheme);
            this.applyTheme();
        }
    }
    
    /**
     * Reset to system preference
     */
    resetToSystemPreference() {
        localStorage.removeItem(this.storageKey);
        
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.currentTheme = 'dark';
        } else {
            this.currentTheme = 'light';
        }
        
        this.applyTheme();
    }
}

// Create singleton instance
export const themeManager = new ThemeManager();
export default themeManager;