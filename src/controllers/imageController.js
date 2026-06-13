const fs = require('fs');
const { uploadFile, uploadLocalFile } = require('../services/b2Service');
const { optimizeMedia } = require('../services/mediaOptimizer');

exports.uploadImage = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

        let optimizationResult;
        try {
            optimizationResult = await optimizeMedia(req.file);
        } catch (optimizeError) {
            console.warn('Optimization failed, falling back to direct upload:', optimizeError.message);
            const fallbackUrl = await uploadFile(req.file);
            res.json({
                status: 'success',
                data: {
                    fileUrl: fallbackUrl,
                    optimized: false,
                    reason: optimizeError.message
                }
            });
            return;
        }

        if (optimizationResult.type === 'image') {
            const fileUrl = await uploadLocalFile({
                localPath: optimizationResult.optimizedPath,
                originalName: req.file.originalname,
                mimeType: optimizationResult.optimizedMime,
                prefix: 'images',
                info: {
                    width: String(optimizationResult.metadata.width || ''),
                    height: String(optimizationResult.metadata.height || ''),
                    originalSize: String(optimizationResult.metadata.originalSize || ''),
                    optimizedSize: String(optimizationResult.metadata.optimizedSize || '')
                }
            });

            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            if (fs.existsSync(optimizationResult.optimizedPath)) {
                fs.unlinkSync(optimizationResult.optimizedPath);
            }

            res.json({
                status: 'success',
                data: {
                    fileUrl,
                    optimized: true,
                    mediaType: 'image',
                    metadata: optimizationResult.metadata
                }
            });
            return;
        }

        let videoUrl = null;
        let posterUrl = null;

        try {
            videoUrl = await uploadLocalFile({
                localPath: optimizationResult.optimizedPath,
                originalName: req.file.originalname,
                mimeType: optimizationResult.optimizedMime,
                prefix: 'videos',
                info: {
                    width: String(optimizationResult.metadata.width || ''),
                    height: String(optimizationResult.metadata.height || ''),
                    duration: String(optimizationResult.metadata.duration || ''),
                    bitrate: String(optimizationResult.metadata.bitrate || ''),
                    hasAudio: String(optimizationResult.metadata.hasAudio || false),
                    originalSize: String(optimizationResult.metadata.originalSize || ''),
                    optimizedSize: String(optimizationResult.metadata.optimizedSize || '')
                }
            });
        } catch (videoUploadError) {
            console.warn('Optimized video upload failed, falling back to original video:', videoUploadError.message);
            videoUrl = await uploadFile(req.file);
        }

        if (optimizationResult.posterPath) {
            try {
                posterUrl = await uploadLocalFile({
                    localPath: optimizationResult.posterPath,
                    originalName: `${req.file.originalname}-poster.jpg`,
                    mimeType: optimizationResult.posterMime,
                    prefix: 'posters',
                    info: {
                        parentType: 'video-poster'
                    }
                });
            } catch (posterUploadError) {
                console.warn('Poster upload failed, continuing without poster:', posterUploadError.message);
            }
        }

        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        if (fs.existsSync(optimizationResult.optimizedPath)) {
            fs.unlinkSync(optimizationResult.optimizedPath);
        }
        if (optimizationResult.posterPath && fs.existsSync(optimizationResult.posterPath)) {
            fs.unlinkSync(optimizationResult.posterPath);
        }

        res.json({
            status: 'success',
            data: {
                fileUrl: videoUrl,
                posterUrl,
                optimized: true,
                mediaType: 'video',
                metadata: optimizationResult.metadata
            }
        });
    } catch (err) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        next(err);
    }
};