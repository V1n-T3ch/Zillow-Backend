const B2 = require('backblaze-b2');
const fs = require('fs');
const b2Config = require('../config/b2Config');

// Add logging to debug environment variables
console.log('B2 Config loaded:', {
    keyIdExists: !!b2Config.keyId,
    appKeyExists: !!b2Config.appKey,
    bucketIdExists: !!b2Config.bucketId,
    bucketNameExists: !!b2Config.bucketName,
    downloadUrlExists: !!b2Config.downloadUrl
});

const b2 = new B2({
    applicationKeyId: b2Config.keyId,
    applicationKey: b2Config.appKey,
});

async function uploadFile(file) {
    try {
        console.log(`Starting upload for file: ${file.originalname}, size: ${file.size} bytes, type: ${file.mimetype}`);
        
        console.log('Authorizing with B2...');
        await b2.authorize();
        console.log('Authorization successful');
        
        const fileName = `${Date.now()}_${file.originalname}`;
        
        // Check if file exists and get its size
        const fileStats = fs.statSync(file.path);
        console.log(`File size on disk: ${fileStats.size} bytes`);
        
        const fileData = fs.readFileSync(file.path);
        console.log(`File data read successfully, size: ${fileData.length} bytes`);

        console.log('Getting upload URL...');
        const uploadUrlResponse = await b2.getUploadUrl({ bucketId: b2Config.bucketId });
        const { uploadUrl, authorizationToken } = uploadUrlResponse.data;

        console.log('Uploading file to B2...');
        const uploadResponse = await b2.uploadFile({
            uploadUrl,
            uploadAuthToken: authorizationToken,
            fileName,
            data: fileData,
            mime: file.mimetype,
        });

        console.log('Upload response:', uploadResponse.data);

        // Clean up temp file
        fs.unlinkSync(file.path);
        
        const fileUrl = `${b2Config.downloadUrl}/${b2Config.bucketName}/${fileName}`;
        console.log('File uploaded successfully:', fileUrl);
        return fileUrl;
    } catch (error) {
        console.error('B2 upload error details:', {
            message: error.message,
            status: error.status,
            response: error.response?.data,
            stack: error.stack
        });
        
        // Clean up temp file even on error
        if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        
        throw new Error(`Upload failed: ${error.message}`);
    }
}

module.exports = { uploadFile };