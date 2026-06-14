const asyncHandler = require('express-async-handler');
const AppSettings = require('../models/AppSettings');

const DEFAULT_SETTINGS = {
  key: 'global',
  usdToLbpRate: 89500,
};

const getSettingsDocument = () =>
  AppSettings.findOneAndUpdate(
    { key: DEFAULT_SETTINGS.key },
    { $setOnInsert: DEFAULT_SETTINGS },
    { new: true, upsert: true }
  );

// @desc    Get public app settings
// @route   GET /api/settings
// @access  Public
const getSettings = asyncHandler(async (_req, res) => {
  const settings = await getSettingsDocument();
  res.json({
    usdToLbpRate: settings.usdToLbpRate,
  });
});

// @desc    Update app settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
  const usdToLbpRate = Number(req.body.usdToLbpRate);

  if (!Number.isFinite(usdToLbpRate) || usdToLbpRate <= 0) {
    res.status(400);
    throw new Error('USD to LBP rate must be greater than 0');
  }

  const settings = await getSettingsDocument();
  settings.usdToLbpRate = usdToLbpRate;

  const updatedSettings = await settings.save();
  res.json({
    usdToLbpRate: updatedSettings.usdToLbpRate,
  });
});

module.exports = {
  getSettings,
  updateSettings,
};
