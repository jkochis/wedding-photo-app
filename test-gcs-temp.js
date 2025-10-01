const {Storage} = require('@google-cloud/storage');
const keyFile = process.argv[2];
const bucketName = process.argv[3];

const storage = new Storage({ keyFilename: keyFile });
const bucket = storage.bucket(bucketName);

async function test() {
    try {
        const [exists] = await bucket.exists();
        if (exists) {
            console.log('✅ GCS connection successful!');
            const [files] = await bucket.getFiles();
            console.log(`📁 Files in bucket: ${files.length}`);
            process.exit(0);
        } else {
            console.log('❌ Bucket not found');
            process.exit(1);
        }
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

test();
