const mongoose = require('mongoose');

const appSettingsSchema = mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
    },
    usdToLbpRate: {
      type: Number,
      required: true,
      default: 89500,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const AppSettings = mongoose.model('AppSettings', appSettingsSchema);

module.exports = AppSettings;
