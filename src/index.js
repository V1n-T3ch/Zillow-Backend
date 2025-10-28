const express = require('express');
const cors = require('cors');
const imageRoutes = require('./routes/imageRoutes');

const app = express();

// Increase payload limits for large video uploads
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use('/api/images', imageRoutes);

app.use((err, req, res, next) => {
    console.error('Error details:', err);
    
    // Handle multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                status: 'error', 
                message: 'File too large. Maximum size is 100MB.' 
            });
        }
    }
    
    res.status(500).json({ 
        status: 'error', 
        message: err.message || 'Internal server error'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`B2 image server running on port ${PORT}`);
});