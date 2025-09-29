import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs/promises';
import type { StorageInfo } from './types.js';

/**
 * Google Cloud Storage service for wedding photo uploads
 */
export class CloudStorageService {
    private storage: Storage;
    private bucketName: string;
    private bucket: any;

    constructor() {
        this.bucketName = process.env.GCS_BUCKET_NAME || 'wedding-photos-bucket';
        
        // Initialize Google Cloud Storage
        this.storage = new Storage({
            projectId: process.env.GOOGLE_CLOUD_PROJECT,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        });
        
        this.bucket = this.storage.bucket(this.bucketName);
    }

    /**
     * Upload a file to Google Cloud Storage
     */
    async uploadPhoto(localFilePath: string, fileName: string): Promise<string> {
        try {
            const destination = `photos/${fileName}`;
            
            // Upload file to GCS
            await this.bucket.upload(localFilePath, {
                destination,
                metadata: {
                    metadata: {
                        uploadedAt: new Date().toISOString(),
                        contentType: 'image/*',
                    },
                },
                public: true, // Make the file publicly accessible
            });

            // Get the public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${destination}`;
            
            console.log(`✅ Photo uploaded to GCS: ${fileName}`);
            return publicUrl;
            
        } catch (error) {
            console.error('❌ Error uploading to GCS:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to upload photo: ${errorMessage}`);
        }
    }

    /**
     * Delete a photo from Google Cloud Storage
     */
    async deletePhoto(fileName: string): Promise<void> {
        try {
            const filePath = `photos/${fileName}`;
            await this.bucket.file(filePath).delete();
            console.log(`🗑️  Photo deleted from GCS: ${fileName}`);
        } catch (error) {
            console.error('❌ Error deleting from GCS:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to delete photo: ${errorMessage}`);
        }
    }

    /**
     * Get a signed URL for secure photo access
     */
    async getSignedUrl(fileName: string, expiresIn: number = 3600): Promise<string> {
        try {
            const filePath = `photos/${fileName}`;
            const file = this.bucket.file(filePath);
            
            const [signedUrl] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + expiresIn * 1000, // Convert to milliseconds
            });
            
            return signedUrl;
        } catch (error) {
            console.error('❌ Error generating signed URL:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to generate signed URL: ${errorMessage}`);
        }
    }

    /**
     * Check if the bucket exists and is accessible
     */
    async checkConnection(): Promise<boolean> {
        try {
            const [exists] = await this.bucket.exists();
            if (!exists) {
                console.warn(`⚠️  GCS bucket '${this.bucketName}' does not exist`);
                return false;
            }
            
            // Try to list files to verify permissions
            await this.bucket.getFiles({ maxResults: 1 });
            console.log(`✅ GCS connection verified for bucket: ${this.bucketName}`);
            return true;
        } catch (error) {
            console.error('❌ GCS connection failed:', error);
            return false;
        }
    }

    /**
     * Create the bucket if it doesn't exist (for development)
     */
    async createBucketIfNotExists(): Promise<void> {
        try {
            const [exists] = await this.bucket.exists();
            if (!exists) {
                console.log(`🏗️  Creating GCS bucket: ${this.bucketName}`);
                await this.storage.createBucket(this.bucketName, {
                    location: 'US',
                    storageClass: 'STANDARD',
                    iamConfiguration: {
                        publicAccessPrevention: 'inherited',
                        uniformBucketLevelAccess: { enabled: false },
                    },
                });
                console.log(`✅ GCS bucket created: ${this.bucketName}`);
            }
        } catch (error) {
            console.error('❌ Error creating GCS bucket:', error);
            throw error;
        }
    }

    /**
     * Fallback to local storage if GCS is not available
     */
    async uploadToLocal(localFilePath: string, fileName: string): Promise<string> {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const targetPath = path.join(uploadsDir, fileName);
        
        try {
            // Ensure uploads directory exists
            await fs.mkdir(uploadsDir, { recursive: true });
            
            // Copy file to uploads directory
            await fs.copyFile(localFilePath, targetPath);
            
            console.log(`📁 Photo stored locally: ${fileName}`);
            return `/uploads/${fileName}`;
        } catch (error) {
            console.error('❌ Error storing locally:', error);
            throw error;
        }
    }

    /**
     * Get storage status and configuration
     */
    getStorageInfo(): StorageInfo {
        return {
            provider: 'Google Cloud Storage',
            bucket: this.bucketName,
            project: process.env.GOOGLE_CLOUD_PROJECT || 'not-configured',
            hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
            configured: !!(process.env.GCS_BUCKET_NAME && process.env.GOOGLE_CLOUD_PROJECT),
        };
    }
}

// Export singleton instance
export const storageService = new CloudStorageService();
export default storageService;