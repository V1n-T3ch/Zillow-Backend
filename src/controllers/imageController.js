const { uploadFile } = require('../services/b2Service');

exports.uploadImage = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        const fileUrl = await uploadFile(req.file);
        res.json({ status: 'success', data: { fileUrl } });
    } catch (err) {
        next(err);
    }
};