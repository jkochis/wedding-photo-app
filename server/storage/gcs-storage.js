/**
 * Google Cloud Storage Adapter
 * Handles photo uploads and retrieval from GCS
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');

class GCSStorage {
    constructor(config) {
        this.bucketName = config.bucketName;
        
        // Initialize GCS client with credentials
        const storageConfig = {};
        
        if (config.keyFilename) {
            // Local development: use key file
            storageConfig.keyFilename = config.keyFilename;
        } else if (config.credentials) {
            // Production: use base64 decoded credentials
            storageConfig.credentials = config.credentials;
        }
        
        if (config.projectId) {
            storageConfig.projectId = config.projectId;
        }
        
        this.storage = new Storage(storageConfig);
        this.bucket = this.storage.bucket(this.bucketName);
        
        console.log(`📦 GCS Storage initialized with bucket: ${this.bucketName}`);
    }
    
    /**
     * Save a file to GCS
     * @param {Buffer} fileBuffer - File data
     * @param {string} filename - Desired filename
     * @param {object} metadata - File metadata
     * @returns {Promise<string>} - Public URL or signed URL
     */
    async saveFile(fileBuffer, filename, metadata = {}) {
        try {
            const file = this.bucket.file(filename);
            
            await file.save(fileBuffer, {
                metadata: {
                    contentType: metadata.mimetype || 'image/jpeg',
                    metadata: {
                        originalName: metadata.originalName,
                        uploadedAt: new Date().toISOString(),
                        ...metadata
                    }
                },
                public: false // Keep files private, use signed URLs
            });
            
            console.log(`✅ File saved to GCS: ${filename}`);
            
            // Generate signed URL (valid for 7 days)
            const signedUrl = await this.getSignedUrl(filename, 7 * 24 * 60); // 7 days in minutes
            
            return signedUrl;
            
        } catch (error) {
            console.error('Error saving file to GCS:', error);
            throw new Error(`Failed to save file to GCS: ${error.message}`);
        }
    }
    
    /**
     * Get a signed URL for a file
     * @param {string} filename - Filename in bucket
     * @param {number} expiresInMinutes - URL expiration time
     * @returns {Promise<string>} - Signed URL
     */
    async getSignedUrl(filename, expiresInMinutes = 60) {
        try {
            const file = this.bucket.file(filename);
            
            const [url] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + expiresInMinutes * 60 * 1000
            });
            
            return url;
            
        } catch (error) {
            console.error('Error generating signed URL:', error);
            throw new Error(`Failed to generate signed URL: ${error.message}`);
        }
    }
    
    /**
     * Delete a file from GCS
     * @param {string} filename - Filename to delete
     * @returns {Promise<boolean>} - Success status
     */
    async deleteFile(filename) {
        try {
            const file = this.bucket.file(filename);
            await file.delete();
            
            console.log(`🗑️  File deleted from GCS: ${filename}`);
            return true;
            
        } catch (error) {
            if (error.code === 404) {
                console.warn(`File not found in GCS: ${filename}`);
                return false;
            }
            
            console.error('Error deleting file from GCS:', error);
            throw new Error(`Failed to delete file from GCS: ${error.message}`);
        }
    }
    
    /**
     * Check if a file exists in GCS
     * @param {string} filename - Filename to check
     * @returns {Promise<boolean>} - Exists status
     */
    async fileExists(filename) {
        try {
            const file = this.bucket.file(filename);
            const [exists] = await file.exists();
            return exists;
            
        } catch (error) {
            console.error('Error checking file existence:', error);
            return false;
        }
    }
    
    /**
     * List all files in bucket
     * @param {string} prefix - Optional prefix filter
     * @returns {Promise<Array>} - List of filenames
     */
    async listFiles(prefix = '') {
        try {
            const [files] = await this.bucket.getFiles({ prefix });
            return files.map(file => file.name);
            
        } catch (error) {
            console.error('Error listing files:', error);
            throw new Error(`Failed to list files: ${error.message}`);
        }
    }
    
    /**
     * Delete all files in bucket (use with caution!)
     * @returns {Promise<object>} - Deletion stats
     */
    async deleteAllFiles() {
        try {
            const [files] = await this.bucket.getFiles();
            
            console.log(`⚠️  Deleting ${files.length} files from GCS...`);
            
            let deleted = 0;
            let failed = 0;
            
            for (const file of files) {
                try {
                    await file.delete();
                    deleted++;
                } catch (error) {
                    console.error(`Failed to delete ${file.name}:`, error.message);
                    failed++;
                }
            }
            
            console.log(`✅ Deleted ${deleted} files, ${failed} failures`);
            
            return { deleted, failed, total: files.length };
            
        } catch (error) {
            console.error('Error deleting all files:', error);
            throw new Error(`Failed to delete all files: ${error.message}`);
        }
    }
    
    /**
     * Get bucket statistics
     * @returns {Promise<object>} - Bucket stats
     */
    async getStats() {
        try {
            const [files] = await this.bucket.getFiles();
            
            let totalSize = 0;
            for (const file of files) {
                const [metadata] = await file.getMetadata();
                totalSize += parseInt(metadata.size, 10);
            }
            
            return {
                fileCount: files.length,
                totalSize: totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                bucketName: this.bucketName
            };
            
        } catch (error) {
            console.error('Error getting bucket stats:', error);
            return { fileCount: 0, totalSize: 0, error: error.message };
        }
    }
}

module.exports = GCSStorage;