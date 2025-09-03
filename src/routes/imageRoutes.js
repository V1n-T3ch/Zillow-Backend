const express = require('express');
const router = express.Router();
const fileUpload = require('../middleware/fileUpload');
const imageController = require('../controllers/imageController');

router.post('/upload', fileUpload.single('image'), imageController.uploadImage);

module.exports = router;