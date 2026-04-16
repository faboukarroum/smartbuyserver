const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadProductImage } = require('../controllers/uploadController');

router.post('/product-image', protect, admin, upload.single('image'), uploadProductImage);

module.exports = router;
