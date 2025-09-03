const express = require('express');
const cors = require('cors');
const imageRoutes = require('./routes/imageRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/images', imageRoutes);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`B2 image server running on port ${PORT}`);
});