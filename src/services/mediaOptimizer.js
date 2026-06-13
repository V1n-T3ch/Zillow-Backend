const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
}

const processedDir = path.join(__dirname, '../../uploads/processed');
if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
}

function createOutputBase(inputPath) {
    const base = path.basename(inputPath, path.extname(inputPath));
    return `${Date.now()}_${base}`;
}

function ffprobeAsync(inputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (error, data) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(data);
        });
    });
}

function transcodeVideo(inputPath, outputPath, hasAudio) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg(inputPath)
            .videoCodec('libx264')
            .outputOptions([
                '-movflags +faststart',
                '-preset veryfast',
                '-crf 24',
                '-maxrate 2500k',
                '-bufsize 5000k',
                '-pix_fmt yuv420p'
            ])
            .videoFilters("scale='min(1280,iw)':-2")
            .on('end', () => resolve(outputPath))
            .on('error', reject);

        if (hasAudio) {
            command.audioCodec('aac').audioBitrate('128k');
        } else {
            command.noAudio();
        }

        command.save(outputPath);
    });
}

function generatePoster(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .inputOptions(['-ss 2'])
            .frames(1)
            .outputOptions(['-q:v 2'])
            .on('end', () => resolve(outputPath))
            .on('error', reject)
            .save(outputPath);
    });
}

async function optimizeImage(file) {
    const outputBase = createOutputBase(file.path);
    const outputPath = path.join(processedDir, `${outputBase}.webp`);

    const pipeline = sharp(file.path).rotate();
    const metadata = await pipeline.metadata();

    await pipeline
        .resize({
            width: 1600,
            withoutEnlargement: true,
            fit: 'inside'
        })
        .webp({ quality: 80, effort: 4 })
        .toFile(outputPath);

    const optimizedStats = fs.statSync(outputPath);

    return {
        type: 'image',
        optimizedPath: outputPath,
        optimizedMime: 'image/webp',
        optimizedExt: 'webp',
        metadata: {
            width: metadata.width || null,
            height: metadata.height || null,
            originalSize: file.size,
            optimizedSize: optimizedStats.size
        }
    };
}

async function optimizeVideo(file) {
    const outputBase = createOutputBase(file.path);
    const optimizedVideoPath = path.join(processedDir, `${outputBase}.mp4`);
    const posterPath = path.join(processedDir, `${outputBase}-poster.jpg`);

    const probe = await ffprobeAsync(file.path);
    const hasAudio = probe.streams.some(stream => stream.codec_type === 'audio');

    await transcodeVideo(file.path, optimizedVideoPath, hasAudio);
    let generatedPosterPath = null;

    try {
        await generatePoster(optimizedVideoPath, posterPath);
        generatedPosterPath = posterPath;
    } catch (posterError) {
        console.warn('Poster generation failed, continuing without poster:', posterError.message);
    }

    const [optimizedProbe, videoStats, posterStats] = await Promise.all([
        ffprobeAsync(optimizedVideoPath),
        fs.promises.stat(optimizedVideoPath),
        generatedPosterPath ? fs.promises.stat(generatedPosterPath) : Promise.resolve(null)
    ]);

    const videoStream = optimizedProbe.streams.find(stream => stream.codec_type === 'video');
    const format = optimizedProbe.format || {};

    return {
        type: 'video',
        optimizedPath: optimizedVideoPath,
        optimizedMime: 'video/mp4',
        optimizedExt: 'mp4',
        posterPath: generatedPosterPath,
        posterMime: 'image/jpeg',
        posterExt: 'jpg',
        metadata: {
            hasAudio,
            width: videoStream?.width || null,
            height: videoStream?.height || null,
            duration: format.duration ? Number(format.duration) : null,
            bitrate: format.bit_rate ? Number(format.bit_rate) : null,
            originalSize: file.size,
            optimizedSize: videoStats.size,
            posterSize: posterStats?.size || 0
        }
    };
}

async function optimizeMedia(file) {
    if (!file?.mimetype) {
        throw new Error('Invalid file payload for optimization');
    }

    if (file.mimetype.startsWith('image/')) {
        return optimizeImage(file);
    }

    if (file.mimetype.startsWith('video/')) {
        return optimizeVideo(file);
    }

    throw new Error(`Unsupported media type: ${file.mimetype}`);
}

module.exports = {
    optimizeMedia
};
