const express = require('express');
const router = express.Router();
const {
  scanProduct,
  getScannedProducts,
  getScannedProductById,
  updateScannedProduct,
  researchAiPrices,
  importScannedProduct,
  rejectScannedProduct,
} = require('../controllers/scannedProductController');
const { protect, admin } = require('../middleware/authMiddleware');

router.use(protect, admin);

router.route('/').get(getScannedProducts);
router.route('/scan').post(scanProduct);
router.route('/:id').get(getScannedProductById).put(updateScannedProduct);
router.route('/:id/research-ai-prices').post(researchAiPrices);
router.route('/:id/import').post(importScannedProduct);
router.route('/:id/reject').post(rejectScannedProduct);

module.exports = router;
