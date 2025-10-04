/**
 * Wedding Photo App - Notification Manager
 * Handles browser notifications and in-app notification display
 */

import { log } from './logger.js';
import { state } from './state.js';
import { CONFIG } from './config.js';
import type { Photo } from '../types/index';

interface NotificationOptions {
    title: string;
    body?: string;
    icon?: string;
    tag?: string;
    duration?: number;
    type?: 'info' | 'success' | 'warning' | 'error';
    onClick?: () => void;
}

interface InAppNotification extends NotificationOptions {
    id: string;
    timestamp: number;
    dismissed: boolean;
}

export class NotificationManager {
    private static readonly STORAGE_KEY = 'wedding-app-notifications-enabled';
    private static readonly MAX_IN_APP_NOTIFICATIONS = 5;

    private permissionGranted: boolean;
    private notificationsEnabled: boolean;
    private inAppNotifications: InAppNotification[];
    private notificationContainer: HTMLElement | null;
    private initialized: boolean;

    constructor() {
        this.permissionGranted = false;
        this.notificationsEnabled = false;
        this.inAppNotifications = [];
        this.notificationContainer = null;
        this.initialized = false;
    }

    /**
     * Initialize notification manager
     */
    async init(): Promise<void> {
        if (this.initialized) {
            log.debug('Notification Manager already initialized, skipping');
            return;
        }

        log.info('Initializing Notification Manager');

        // Check if notifications are supported
        if (!('Notification' in window)) {
            log.warn('Browser notifications not supported');
            this.notificationsEnabled = false;
        } else {
            // Load user preference
            this.loadNotificationPreference();

            // Check current permission status
            this.checkPermissionStatus();
        }

        // Create in-app notification container
        this.createNotificationContainer();

        // Setup notification toggle button
        this.setupNotificationToggle();

        // Subscribe to photo uploads for notifications
        this.setupPhotoUploadSubscription();

        // Show permission prompt if needed
        this.maybeShowPermissionPrompt();

        this.initialized = true;
        log.info('Notification Manager initialized');
    }

    /**
     * Request notification permission from user
     */
    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            log.warn('Browser notifications not supported');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permissionGranted = permission === 'granted';

            if (this.permissionGranted) {
                this.notificationsEnabled = true;
                this.saveNotificationPreference();
                log.info('Notification permission granted');
            } else {
                log.info('Notification permission denied');
            }

            return this.permissionGranted;
        } catch (error) {
            log.error('Failed to request notification permission', error);
            return false;
        }
    }

    /**
     * Check current notification permission status
     */
    private checkPermissionStatus(): void {
        if ('Notification' in window) {
            this.permissionGranted = Notification.permission === 'granted';

            if (this.permissionGranted && this.notificationsEnabled) {
                log.debug('Notifications are enabled and permission granted');
            } else if (Notification.permission === 'denied') {
                this.notificationsEnabled = false;
                log.debug('Notification permission denied by user');
            }
        }
    }

    /**
     * Show a notification (browser + in-app)
     */
    async showNotification(options: NotificationOptions): Promise<void> {
        // Always show in-app notification
        this.showInAppNotification(options);

        // Show browser notification if enabled and permitted
        if (this.canShowBrowserNotifications()) {
            this.showBrowserNotification(options);
        }
    }

    /**
     * Show browser notification
     */
    private showBrowserNotification(options: NotificationOptions): void {
        try {
            const notification = new Notification(options.title, {
                body: options.body || '',
                icon: options.icon || '/favicon.ico',
                tag: options.tag || 'wedding-photo-app',
                requireInteraction: false,
                silent: false
            });

            // Handle click
            if (options.onClick) {
                notification.onclick = () => {
                    options.onClick!();
                    notification.close();
                    window.focus(); // Bring app to focus
                };
            }

            // Auto-close after duration
            const duration = options.duration || 5000;
            setTimeout(() => {
                notification.close();
            }, duration);

            log.debug('Browser notification shown', { title: options.title });
        } catch (error) {
            log.error('Failed to show browser notification', error);
        }
    }

    /**
     * Show in-app notification
     */
    private showInAppNotification(options: NotificationOptions): void {
        const notification: InAppNotification = {
            id: this.generateNotificationId(),
            timestamp: Date.now(),
            dismissed: false,
            ...options
        };

        // Add to notifications array
        this.inAppNotifications.unshift(notification);

        // Limit number of notifications
        if (this.inAppNotifications.length > NotificationManager.MAX_IN_APP_NOTIFICATIONS) {
            this.inAppNotifications = this.inAppNotifications.slice(0, NotificationManager.MAX_IN_APP_NOTIFICATIONS);
        }

        // Create and show notification element
        this.renderInAppNotification(notification);

        // Auto-dismiss after duration
        const duration = options.duration || 5000;
        setTimeout(() => {
            this.dismissInAppNotification(notification.id);
        }, duration);

        log.debug('In-app notification shown', { id: notification.id, title: notification.title });
    }

    /**
     * Create notification container in DOM
     */
    private createNotificationContainer(): void {
        if (this.notificationContainer) {
            return;
        }

        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notificationContainer';
        this.notificationContainer.className = 'notification-container';

        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 1000;
            max-width: 350px;
            pointer-events: none;
        `;

        document.body.appendChild(this.notificationContainer);
    }

    /**
     * Render an in-app notification
     */
    private renderInAppNotification(notification: InAppNotification): void {
        if (!this.notificationContainer) {
            return;
        }

        const element = document.createElement('div');
        element.id = `notification-${notification.id}`;
        element.className = `notification notification-${notification.type || 'info'}`;
        element.style.cssText = `
            background: ${this.getNotificationColor(notification.type || 'info')};
            color: white;
            padding: 1rem;
            margin-bottom: 0.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease, opacity 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            max-width: 100%;
            word-wrap: break-word;
        `;

        // Create content
        const title = document.createElement('div');
        title.style.cssText = 'font-weight: bold; margin-bottom: 0.25rem;';
        title.textContent = notification.title;

        const body = document.createElement('div');
        body.style.cssText = 'font-size: 0.9rem; opacity: 0.9;';
        body.textContent = notification.body || '';

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: none;
            border: none;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            opacity: 0.7;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        element.appendChild(title);
        if (notification.body) {
            element.appendChild(body);
        }
        element.appendChild(closeBtn);

        // Event handlers
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.dismissInAppNotification(notification.id);
        });

        if (notification.onClick) {
            element.addEventListener('click', () => {
                notification.onClick!();
                this.dismissInAppNotification(notification.id);
            });
        }

        // Add to container
        this.notificationContainer.appendChild(element);

        // Animate in
        setTimeout(() => {
            element.style.transform = 'translateX(0)';
        }, 50);
    }

    /**
     * Dismiss an in-app notification
     */
    private dismissInAppNotification(notificationId: string): void {
        const element = document.getElementById(`notification-${notificationId}`);
        if (element) {
            element.style.transform = 'translateX(100%)';
            element.style.opacity = '0';

            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }

        // Mark as dismissed
        const notification = this.inAppNotifications.find(n => n.id === notificationId);
        if (notification) {
            notification.dismissed = true;
        }
    }

    /**
     * Get notification color based on type
     */
    private getNotificationColor(type: string): string {
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#f44336'
        };
        return colors[type as keyof typeof colors] || colors.info;
    }

    /**
     * Setup subscription to photo uploads
     */
    private setupPhotoUploadSubscription(): void {
        // Listen for photo additions to state
        state.subscribe('photos', (photos: Photo[], previousPhotos: Photo[]) => {
            const currentCount = photos?.length || 0;
            const previousCount = previousPhotos?.length || 0;

            // If photos increased, someone uploaded a new photo
            if (currentCount > previousCount) {
                const newPhotosCount = currentCount - previousCount;

                if (newPhotosCount === 1) {
                    this.showNotification({
                        title: '📸 New Photo Uploaded!',
                        body: 'A new wedding photo has been shared',
                        type: 'success',
                        icon: '/favicon.ico',
                        onClick: () => {
                            // Scroll to top to show newest photos
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    });
                } else {
                    this.showNotification({
                        title: `📸 ${newPhotosCount} New Photos Uploaded!`,
                        body: 'New wedding photos have been shared',
                        type: 'success',
                        icon: '/favicon.ico',
                        onClick: () => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    });
                }
            }
        });
    }

    /**
     * Show notification for specific photo upload
     */
    notifyPhotoUploaded(photo: Photo, photographer?: string): void {
        const photographerText = photographer ? ` by ${photographer}` : '';

        this.showNotification({
            title: '📸 New Photo Added!',
            body: `A new ${photo.tag} photo has been uploaded${photographerText}`,
            type: 'success',
            tag: 'photo-upload',
            onClick: () => {
                // Could open the photo in modal or scroll to it
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    /**
     * Check if browser notifications can be shown
     */
    private canShowBrowserNotifications(): boolean {
        return 'Notification' in window &&
               this.permissionGranted &&
               this.notificationsEnabled;
    }

    /**
     * Load notification preference from localStorage
     */
    private loadNotificationPreference(): void {
        try {
            const stored = localStorage.getItem(NotificationManager.STORAGE_KEY);
            this.notificationsEnabled = stored !== null ? JSON.parse(stored) : true; // Default to enabled
        } catch (error) {
            log.warn('Failed to load notification preference', error);
            this.notificationsEnabled = true;
        }
    }

    /**
     * Save notification preference to localStorage
     */
    private saveNotificationPreference(): void {
        try {
            localStorage.setItem(NotificationManager.STORAGE_KEY, JSON.stringify(this.notificationsEnabled));
        } catch (error) {
            log.warn('Failed to save notification preference', error);
        }
    }

    /**
     * Generate unique notification ID
     */
    private generateNotificationId(): string {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Enable notifications
     */
    async enableNotifications(): Promise<boolean> {
        if (!('Notification' in window)) {
            return false;
        }

        if (!this.permissionGranted) {
            const granted = await this.requestPermission();
            if (!granted) {
                return false;
            }
        }

        this.notificationsEnabled = true;
        this.saveNotificationPreference();

        log.info('Notifications enabled');
        return true;
    }

    /**
     * Disable notifications
     */
    disableNotifications(): void {
        this.notificationsEnabled = false;
        this.saveNotificationPreference();
        log.info('Notifications disabled');
    }

    /**
     * Get current notification status
     */
    getStatus() {
        return {
            supported: 'Notification' in window,
            permissionGranted: this.permissionGranted,
            enabled: this.notificationsEnabled,
            permission: 'Notification' in window ? Notification.permission : 'unsupported',
            inAppNotifications: this.inAppNotifications.length
        };
    }

    /**
     * Clear all in-app notifications
     */
    clearAllNotifications(): void {
        this.inAppNotifications.forEach(notification => {
            this.dismissInAppNotification(notification.id);
        });

        this.inAppNotifications = [];
        log.debug('All notifications cleared');
    }

    /**
     * Setup notification toggle button in header
     */
    private setupNotificationToggle(): void {
        const toggleButton = document.getElementById('notificationToggle');
        if (!toggleButton) {
            log.warn('Notification toggle button not found');
            return;
        }

        // Update button appearance based on status
        this.updateToggleButtonAppearance(toggleButton);

        // Handle clicks
        toggleButton.addEventListener('click', async () => {
            if (!this.notificationsEnabled) {
                const granted = await this.enableNotifications();
                if (granted) {
                    this.showNotification({
                        title: '🔔 Notifications Enabled!',
                        body: "You'll now receive notifications when new photos are uploaded",
                        type: 'success',
                        duration: 3000
                    });
                }
            } else {
                this.disableNotifications();
                this.showNotification({
                    title: '🔕 Notifications Disabled',
                    body: 'You will no longer receive photo upload notifications',
                    type: 'info',
                    duration: 3000
                });
            }

            this.updateToggleButtonAppearance(toggleButton);
        });

        log.debug('Notification toggle button setup complete');
    }

    /**
     * Update toggle button appearance based on notification status
     */
    private updateToggleButtonAppearance(button: HTMLElement): void {
        const status = this.getStatus();

        // Remove all status classes
        button.classList.remove('disabled', 'blocked');

        if (!status.supported) {
            button.textContent = '🚫';
            button.title = 'Notifications not supported in this browser';
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
        } else if (status.permission === 'denied') {
            button.textContent = '🔕';
            button.title = 'Notifications blocked - check browser settings';
            button.classList.add('blocked');
        } else if (!status.enabled) {
            button.textContent = '🔔';
            button.title = 'Click to enable notifications';
            button.classList.add('disabled');
        } else {
            button.textContent = '🔔';
            button.title = 'Notifications enabled - click to disable';
        }
    }

    /**
     * Show permission prompt if appropriate
     */
    private maybeShowPermissionPrompt(): void {
        // Don't show if notifications aren't supported
        if (!('Notification' in window)) {
            return;
        }

        // Don't show if already granted or denied
        if (Notification.permission !== 'default') {
            return;
        }

        // Don't show if user has previously disabled
        if (!this.notificationsEnabled) {
            return;
        }

        // Show a friendly prompt
        setTimeout(() => {
            this.showPermissionPrompt();
        }, 2000); // Wait 2 seconds after app load
    }

    /**
     * Show a friendly permission prompt
     */
    private showPermissionPrompt(): void {
        const promptElement = document.createElement('div');
        promptElement.className = 'notification notification-permission-prompt';
        promptElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1001;
            pointer-events: auto;
            max-width: 400px;
            width: 90%;
        `;

        promptElement.innerHTML = `
            <div class="notification-title">
                🔔 Stay Updated!
            </div>
            <div class="notification-body">
                Get notified when friends and family upload new wedding photos
            </div>
            <div class="notification-permission-buttons">
                <button class="notification-permission-button secondary" id="declineNotifications">
                    Not now
                </button>
                <button class="notification-permission-button primary" id="enableNotifications">
                    Enable notifications
                </button>
            </div>
        `;

        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            backdrop-filter: blur(2px);
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(promptElement);

        // Handle buttons
        const enableBtn = promptElement.querySelector('#enableNotifications');
        const declineBtn = promptElement.querySelector('#declineNotifications');

        enableBtn?.addEventListener('click', async () => {
            const granted = await this.requestPermission();
            this.removePermissionPrompt(backdrop, promptElement);

            if (granted) {
                this.showNotification({
                    title: '🎉 Notifications Enabled!',
                    body: "You'll be notified when new photos are shared",
                    type: 'success'
                });
            }
        });

        declineBtn?.addEventListener('click', () => {
            this.disableNotifications();
            this.removePermissionPrompt(backdrop, promptElement);
        });

        // Remove on backdrop click
        backdrop.addEventListener('click', () => {
            this.removePermissionPrompt(backdrop, promptElement);
        });
    }

    /**
     * Remove permission prompt from DOM
     */
    private removePermissionPrompt(backdrop: HTMLElement, prompt: HTMLElement): void {
        backdrop.style.opacity = '0';
        prompt.style.transform = 'translate(-50%, -50%) scale(0.9)';
        prompt.style.opacity = '0';

        setTimeout(() => {
            if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
            if (prompt.parentNode) prompt.parentNode.removeChild(prompt);
        }, 300);
    }

    /**
     * Test notification functionality
     */
    testNotification(): void {
        this.showNotification({
            title: '🧪 Test Notification',
            body: 'Notifications are working correctly!',
            type: 'info',
            duration: 3000
        });
    }
}

// Create and export singleton instance
export const notificationManager = new NotificationManager();
export default notificationManager;