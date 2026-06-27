const express = require('express');
const router = express.Router();
const {
  getSettings,
  getAdminSettings,
  updateSettings,
  updateAdminSettings,
  testAiSettings,
} = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/admin').get(protect, admin, getAdminSettings).put(protect, admin, updateAdminSettings);
router.route('/admin/test-ai').post(protect, admin, testAiSettings);
router.route('/').get(getSettings).put(protect, admin, updateSettings);

module.exports = router;
