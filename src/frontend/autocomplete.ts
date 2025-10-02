/**
 * Wedding Photo App - Autocomplete Component
 * Provides autocomplete functionality for name inputs with existing suggestions
 */

import { log } from './logger.js';

interface AutocompleteOptions {
    placeholder?: string;
    minLength?: number;
    maxSuggestions?: number;
    caseSensitive?: boolean;
    allowNew?: boolean;
    onSelect?: (value: string) => void;
    onCancel?: () => void;
    getPersonPhotoCount?: (personName: string) => number;
}

interface AutocompleteResult {
    value: string | null;
    isNew: boolean;
}

export class AutocompleteInput {
    private container: HTMLElement | null;
    private input: HTMLInputElement | null;
    private suggestionsList: HTMLElement | null;
    private isOpen: boolean;
    private currentFocus: number;
    private suggestions: string[];
    private filteredSuggestions: string[];
    private options: AutocompleteOptions;

    constructor(suggestions: string[] = [], options: AutocompleteOptions = {}) {
        this.container = null;
        this.input = null;
        this.suggestionsList = null;
        this.isOpen = false;
        this.currentFocus = -1;
        this.suggestions = suggestions;
        this.filteredSuggestions = [];
        this.options = {
            placeholder: 'Enter name...',
            minLength: 1,
            maxSuggestions: 8,
            caseSensitive: false,
            allowNew: true,
            ...options
        };
    }

    /**
     * Create and show the autocomplete input
     */
    public show(): Promise<AutocompleteResult> {
        return new Promise((resolve, reject) => {
            try {
                this.createAutocompleteUI();

                // Setup event handlers
                this.setupEventHandlers(resolve, reject);

                // Show the UI
                this.showUI();

                // Focus on input
                if (this.input) {
                    this.input.focus();
                }

            } catch (error) {
                log.error('Failed to show autocomplete', error);
                reject(error);
            }
        });
    }

    /**
     * Create the autocomplete UI elements
     */
    private createAutocompleteUI(): void {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'autocomplete-modal';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1004;
            animation: fadeIn 0.2s ease;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'autocomplete-content';
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            max-width: 400px;
            width: 90%;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.2s ease;
        `;

        // Create title
        const title = document.createElement('h3');
        title.textContent = 'Who is this person?';
        title.style.cssText = `
            margin: 0 0 1rem 0;
            font-size: 1.2rem;
            color: #333;
            text-align: center;
        `;

        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'autocomplete-input-container';
        inputContainer.style.cssText = `
            position: relative;
            margin-bottom: 1rem;
        `;

        // Create input
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'autocomplete-input';
        this.input.placeholder = this.options.placeholder || 'Enter name...';
        this.input.style.cssText = `
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.2s ease;
            box-sizing: border-box;
        `;

        // Create suggestions list
        this.suggestionsList = document.createElement('ul');
        this.suggestionsList.className = 'autocomplete-suggestions';
        this.suggestionsList.style.cssText = `
            list-style: none;
            margin: 0;
            padding: 0;
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 8px 8px;
            background: white;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            z-index: 1005;
            display: none;
        `;

        // Create buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 0.5rem;
            justify-content: flex-end;
            margin-top: 1rem;
        `;

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'autocomplete-cancel';
        cancelButton.style.cssText = `
            padding: 0.5rem 1rem;
            border: 1px solid #ddd;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            color: #666;
        `;

        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'Add Person';
        confirmButton.className = 'autocomplete-confirm';
        confirmButton.style.cssText = `
            padding: 0.5rem 1rem;
            border: none;
            background: #e8b4a0;
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
        `;

        // Assemble UI
        inputContainer.appendChild(this.input);
        inputContainer.appendChild(this.suggestionsList);

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);

        modalContent.appendChild(title);
        modalContent.appendChild(inputContainer);
        modalContent.appendChild(buttonContainer);

        this.container.appendChild(modalContent);

        // Add CSS animations
        this.addStyleSheet();
    }

    /**
     * Add CSS animations and styles
     */
    private addStyleSheet(): void {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .autocomplete-input:focus {
                border-color: #e8b4a0 !important;
                box-shadow: 0 0 0 3px rgba(232, 180, 160, 0.1);
            }

            .autocomplete-suggestions li {
                padding: 0.75rem;
                cursor: pointer;
                border-bottom: 1px solid #f0f0f0;
                transition: background-color 0.1s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .autocomplete-suggestions li:hover,
            .autocomplete-suggestions li.focused {
                background-color: #f8f9fa;
            }

            .autocomplete-suggestions li:last-child {
                border-bottom: none;
            }

            .autocomplete-suggestions .suggestion-icon {
                font-size: 0.9rem;
                color: #666;
            }

            .autocomplete-suggestions .suggestion-text {
                flex: 1;
            }

            .autocomplete-suggestions .suggestion-count {
                font-size: 0.8rem;
                color: #999;
                background: #f0f0f0;
                padding: 0.2rem 0.4rem;
                border-radius: 12px;
            }

            .autocomplete-confirm:hover {
                background: #d9a28f !important;
            }

            .autocomplete-cancel:hover {
                background: #f5f5f5 !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(resolve: (result: AutocompleteResult) => void, reject: (error: Error) => void): void {
        if (!this.input || !this.container) return;

        // Input events
        this.input.addEventListener('input', () => {
            this.handleInput();
        });

        this.input.addEventListener('keydown', (e: KeyboardEvent) => {
            this.handleKeyDown(e, resolve, reject);
        });

        // Click outside to cancel
        this.container.addEventListener('click', (e: MouseEvent) => {
            if (e.target === this.container) {
                this.cancel(resolve);
            }
        });

        // Button events
        const cancelButton = this.container.querySelector('.autocomplete-cancel');
        const confirmButton = this.container.querySelector('.autocomplete-confirm');

        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.cancel(resolve);
            });
        }

        if (confirmButton) {
            confirmButton.addEventListener('click', () => {
                this.confirm(resolve);
            });
        }

        // Escape key - store the handler so we can remove it later
        const escapeHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && this.container) {
                this.cancel(resolve);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    /**
     * Handle input changes and filter suggestions
     */
    private handleInput(): void {
        if (!this.input || !this.suggestionsList) return;

        const query = this.input.value.trim();

        if (query.length < (this.options.minLength || 1)) {
            this.hideSuggestions();
            return;
        }

        this.filterSuggestions(query);
        this.renderSuggestions();
        this.showSuggestions();
    }

    /**
     * Filter suggestions based on input
     */
    private filterSuggestions(query: string): void {
        const searchQuery = this.options.caseSensitive ? query : query.toLowerCase();

        this.filteredSuggestions = this.suggestions.filter(suggestion => {
            const suggestionText = this.options.caseSensitive ? suggestion : suggestion.toLowerCase();
            return suggestionText.includes(searchQuery);
        });

        // Sort by relevance (starts with query first)
        this.filteredSuggestions.sort((a, b) => {
            const aText = this.options.caseSensitive ? a : a.toLowerCase();
            const bText = this.options.caseSensitive ? b : b.toLowerCase();

            const aStarts = aText.startsWith(searchQuery);
            const bStarts = bText.startsWith(searchQuery);

            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            return a.localeCompare(b);
        });

        // Limit results
        if (this.options.maxSuggestions) {
            this.filteredSuggestions = this.filteredSuggestions.slice(0, this.options.maxSuggestions);
        }
    }

    /**
     * Render suggestions list
     */
    private renderSuggestions(): void {
        if (!this.suggestionsList) return;

        this.suggestionsList.innerHTML = '';
        this.currentFocus = -1;

        this.filteredSuggestions.forEach((suggestion, index) => {
            const li = document.createElement('li');
            li.dataset.index = index.toString();
            li.dataset.value = suggestion;

            // Count how many photos this person appears in
            const photoCount = this.getPersonPhotoCount(suggestion);

            li.innerHTML = `
                <span class="suggestion-icon">👤</span>
                <span class="suggestion-text">${suggestion}</span>
                ${photoCount > 0 ? `<span class="suggestion-count">${photoCount} photo${photoCount !== 1 ? 's' : ''}</span>` : ''}
            `;

            li.addEventListener('click', () => {
                this.selectSuggestion(suggestion);
            });

            if (this.suggestionsList) {
                this.suggestionsList.appendChild(li);
            }
        });
    }

    /**
     * Get count of photos for a person
     */
    private getPersonPhotoCount(personName: string): number {
        if (this.options.getPersonPhotoCount) {
            return this.options.getPersonPhotoCount(personName);
        }
        return 0;
    }

    /**
     * Show suggestions list
     */
    private showSuggestions(): void {
        if (!this.suggestionsList) return;

        if (this.filteredSuggestions.length > 0) {
            this.suggestionsList.style.display = 'block';
            this.isOpen = true;
        } else {
            this.hideSuggestions();
        }
    }

    /**
     * Hide suggestions list
     */
    private hideSuggestions(): void {
        if (!this.suggestionsList) return;

        this.suggestionsList.style.display = 'none';
        this.isOpen = false;
        this.currentFocus = -1;
    }

    /**
     * Handle keyboard navigation
     */
    private handleKeyDown(e: KeyboardEvent, resolve: (result: AutocompleteResult) => void, reject: (error: Error) => void): void {
        if (!this.isOpen) {
            if (e.key === 'Enter') {
                this.confirm(resolve);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.moveFocus(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.moveFocus(-1);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.currentFocus >= 0) {
                    this.selectSuggestion(this.filteredSuggestions[this.currentFocus]);
                } else {
                    this.confirm(resolve);
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.hideSuggestions();
                break;
        }
    }

    /**
     * Move focus in suggestions list
     */
    private moveFocus(direction: number): void {
        if (!this.suggestionsList) return;

        const items = this.suggestionsList.querySelectorAll('li');

        // Remove current focus
        if (this.currentFocus >= 0 && items[this.currentFocus]) {
            items[this.currentFocus].classList.remove('focused');
        }

        // Calculate new focus
        this.currentFocus += direction;

        if (this.currentFocus >= items.length) {
            this.currentFocus = 0;
        } else if (this.currentFocus < 0) {
            this.currentFocus = items.length - 1;
        }

        // Apply new focus
        if (items[this.currentFocus]) {
            items[this.currentFocus].classList.add('focused');
            items[this.currentFocus].scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Select a suggestion
     */
    private selectSuggestion(value: string): void {
        if (!this.input) return;

        this.input.value = value;
        this.hideSuggestions();

        if (this.options.onSelect) {
            this.options.onSelect(value);
        }
    }

    /**
     * Confirm the current input
     */
    private confirm(resolve: (result: AutocompleteResult) => void): void {
        if (!this.input) return;

        const value = this.input.value.trim();

        if (!value) {
            this.cancel(resolve);
            return;
        }

        const isNew = !this.suggestions.includes(value);

        this.cleanup();
        resolve({ value, isNew });
    }

    /**
     * Cancel the input
     */
    private cancel(resolve: (result: AutocompleteResult) => void): void {
        this.cleanup();
        resolve({ value: null, isNew: false });
    }

    /**
     * Show the autocomplete UI
     */
    private showUI(): void {
        if (this.container) {
            document.body.appendChild(this.container);
        }
    }

    /**
     * Clean up and remove UI
     */
    private cleanup(): void {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        if (this.options.onCancel) {
            this.options.onCancel();
        }
    }

    /**
     * Update suggestions list
     */
    public updateSuggestions(newSuggestions: string[]): void {
        this.suggestions = newSuggestions;

        // Re-filter and render if input is active
        if (this.input && this.input.value.trim()) {
            this.handleInput();
        }
    }
}

export default AutocompleteInput;