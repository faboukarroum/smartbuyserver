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
    ai: {
      enabled: {
        type: Boolean,
        default: false,
      },
      provider: {
        type: String,
        default: 'openai',
      },
      model: {
        type: String,
        default: 'gpt-4.1-mini',
      },
      searchMode: {
        type: String,
        enum: ['quick', 'deep'],
        default: 'quick',
      },
      defaultMarket: {
        type: String,
        default: 'Lebanon',
      },
      languages: {
        type: String,
        enum: ['english', 'arabic', 'both'],
        default: 'both',
      },
      preferredDomains: {
        type: [String],
        default: [],
      },
      blockedDomains: {
        type: [String],
        default: [],
      },
      maxResultsPerProduct: {
        type: Number,
        default: 8,
        min: 1,
        max: 20,
      },
      saveSourceLinks: {
        type: Boolean,
        default: true,
      },
      apiKeyEncrypted: {
        type: String,
        default: '',
        select: false,
      },
      apiKeyLast4: {
        type: String,
        default: '',
      },
      apiKeyConfiguredAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

const AppSettings = mongoose.model('AppSettings', appSettingsSchema);

module.exports = AppSettings;
