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
        console.log('Authorizing with B2...');
        await b2.authorize();
        console.log('Authorization successful');
        
        const fileName = `${Date.now()}_${file.originalname}`;
        const fileData = fs.readFileSync(file.path);

        console.log('Getting upload URL...');
        const uploadUrlResponse = await b2.getUploadUrl({ bucketId: b2Config.bucketId });
        const { uploadUrl, authorizationToken } = uploadUrlResponse.data;

        console.log('Uploading file to B2...');
        await b2.uploadFile({
            uploadUrl,
            uploadAuthToken: authorizationToken,
            fileName,
            data: fileData,
            mime: file.mimetype,
        });

        fs.unlinkSync(file.path);
        
        const fileUrl = `${b2Config.downloadUrl}/${b2Config.bucketName}/${fileName}`;
        console.log('File uploaded successfully:', fileUrl);
        return fileUrl;
    } catch (error) {
        console.error('B2 upload error:', error.message);
        throw error;
    }
}

module.exports = { uploadFile };