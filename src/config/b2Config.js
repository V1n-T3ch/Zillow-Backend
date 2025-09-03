require('dotenv').config();

module.exports = {
    keyId: process.env.B2_KEY_ID,
    appKey: process.env.B2_APP_KEY,
    bucketId: process.env.B2_BUCKET_ID,
    bucketName: process.env.B2_BUCKET_NAME,
    downloadUrl: process.env.B2_DOWNLOAD_URL // e.g. https://f000.backblazeb2.com
};