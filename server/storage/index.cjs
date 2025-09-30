/**
 * Storage Factory
 * Creates appropriate storage adapter based on configuration
 */

const GCSStorage = require('./gcs-storage.cjs');
const fs = require('fs').promises;
const path = require('path');

class LocalStorage {
    constructor(config) {
        this.uploadsDir = config.uploadsDir;
        this.baseUrl = config.baseUrl;
        this.accessToken = config.accessToken;
        
        console.log(`💾 Local Storage initialized: ${this.uploadsDir}`);
    }
    
    async saveFile(fileBuffer, filename, metadata = {}) {
        try {
            const filePath = path.join(this.uploadsDir, filename);
            
            // Ensure directory exists
            try {
                await fs.access(this.uploadsDir);
            } catch {
                await fs.mkdir(this.uploadsDir, { recursive: true });
            }
            
            // Save file
            await fs.writeFile(filePath, fileBuffer);
            
            console.log(`✅ File saved locally: ${filename}`);
            
            // Return URL with token
            return `${this.baseUrl}/uploads/${filename}?token=${this.accessToken}`;
            
        } catch (error) {
            console.error('Error saving file locally:', error);
            throw new Error(`Failed to save file locally: ${error.message}`);
        }
    }
    
    async deleteFile(filename) {
        try {
            const filePath = path.join(this.uploadsDir, filename);
            await fs.unlink(filePath);
            
            console.log(`🗑️  File deleted locally: ${filename}`);
            return true;
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`File not found locally: ${filename}`);
                return false;
            }
            
            console.error('Error deleting file locally:', error);
            throw new Error(`Failed to delete file locally: ${error.message}`);
        }
    }
    
    async fileExists(filename) {
        try {
            const filePath = path.join(this.uploadsDir, filename);
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    async listFiles(prefix = '') {
        try {
            const files = await fs.readdir(this.uploadsDir);
            return prefix ? files.filter(f => f.startsWith(prefix)) : files;
        } catch (error) {
            console.error('Error listing files locally:', error);
            return [];
        }
    }
    
    async deleteAllFiles() {
        try {
            const files = await this.listFiles();
            
            console.log(`⚠️  Deleting ${files.length} files locally...`);
            
            let deleted = 0;
            let failed = 0;
            
            for (const file of files) {
                try {
                    await this.deleteFile(file);
                    deleted++;
                } catch (error) {
                    console.error(`Failed to delete ${file}:`, error.message);
                    failed++;
                }
            }
            
            console.log(`✅ Deleted ${deleted} files, ${failed} failures`);
            
            return { deleted, failed, total: files.length };
            
        } catch (error) {
            console.error('Error deleting all files locally:', error);
            throw new Error(`Failed to delete all files locally: ${error.message}`);
        }
    }
    
    async getStats() {
        try {
            const files = await this.listFiles();
            
            let totalSize = 0;
            for (const file of files) {
                const filePath = path.join(this.uploadsDir, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
            }
            
            return {
                fileCount: files.length,
                totalSize: totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                location: this.uploadsDir
            };
            
        } catch (error) {
            console.error('Error getting local storage stats:', error);
            return { fileCount: 0, totalSize: 0, error: error.message };
        }
    }
}

/**
 * Create storage adapter based on configuration
 */
function createStorage(config) {
    const storageType = config.type || process.env.STORAGE_TYPE || 'local';
    
    console.log(`🔧 Initializing ${storageType.toUpperCase()} storage...`);
    
    if (storageType === 'gcs') {
        // GCS Storage
        const gcsConfig = {
            bucketName: config.gcs?.bucketName || process.env.GCS_BUCKET_NAME,
            projectId: config.gcs?.projectId || process.env.GCS_PROJECT_ID
        };
        
        // Handle credentials (keyfile or base64 encoded)
        if (config.gcs?.keyFilename || process.env.GCS_KEYFILE) {
            gcsConfig.keyFilename = config.gcs?.keyFilename || process.env.GCS_KEYFILE;
        } else if (process.env.GCS_SERVICE_ACCOUNT_KEY_BASE64) {
            // Decode base64 credentials (for Railway)
            const credentialsJson = Buffer.from(process.env.GCS_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8');
            gcsConfig.credentials = JSON.parse(credentialsJson);
        }
        
        if (!gcsConfig.bucketName) {
            throw new Error('GCS bucket name is required. Set GCS_BUCKET_NAME environment variable.');
        }
        
        return new GCSStorage(gcsConfig);
        
    } else {
        // Local Storage
        const localConfig = {
            uploadsDir: config.local?.uploadsDir || 
                        (process.env.NODE_ENV === 'production' ? '/app/data/uploads' : path.join(__dirname, '../../uploads')),
            baseUrl: config.local?.baseUrl || process.env.BASE_URL || 'https://group-images-production.up.railway.app',
            accessToken: config.local?.accessToken || process.env.ACCESS_TOKEN || 'default-token'
        };
        
        return new LocalStorage(localConfig);
    }
}

module.exports = {
    createStorage,
    LocalStorage,
    GCSStorage
};