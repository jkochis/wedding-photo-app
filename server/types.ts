/**
 * Server-side TypeScript interfaces
 */

export interface StorageInfo {
    provider: string;
    bucket: string;
    project: string;
    hasCredentials: boolean;
    configured: boolean;
}

export interface StorageStatus extends StorageInfo {
    connected: boolean;
    mode: 'cloud' | 'local';
}

export interface CloudError extends Error {
    message: string;
    code?: string;
    details?: string;
}