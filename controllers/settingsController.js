const asyncHandler = require('express-async-handler');
const AppSettings = require('../models/AppSettings');
const { encryptSecret, decryptSecret } = require('../utils/aiSettingsCrypto');
const { testOpenAIConnection } = require('../services/aiMarketResearchService');

const DEFAULT_SETTINGS = {
  key: 'global',
  usdToLbpRate: 89500,
  ai: {
    enabled: false,
    provider: 'openai',
    model: 'gpt-4.1-mini',
    searchMode: 'quick',
    defaultMarket: 'Lebanon',
    languages: 'both',
    preferredDomains: [],
    blockedDomains: [],
    maxResultsPerProduct: 8,
    saveSourceLinks: true,
    apiKeyEncrypted: '',
    apiKeyLast4: '',
    apiKeyConfiguredAt: null,
  },
};

const getSettingsDocument = () =>
  AppSettings.findOneAndUpdate(
    { key: DEFAULT_SETTINGS.key },
    { $setOnInsert: DEFAULT_SETTINGS },
    { new: true, upsert: true }
  );

const getSettingsDocumentWithSecret = () =>
  AppSettings.findOneAndUpdate(
    { key: DEFAULT_SETTINGS.key },
    { $setOnInsert: DEFAULT_SETTINGS },
    { new: true, upsert: true }
  ).select('+ai.apiKeyEncrypted');

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split('\n').map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const serializeAdminSettings = (settings) => ({
  usdToLbpRate: settings.usdToLbpRate,
  ai: {
    enabled: Boolean(settings.ai?.enabled),
    provider: settings.ai?.provider || 'openai',
    model: settings.ai?.model || 'gpt-4.1-mini',
    searchMode: settings.ai?.searchMode || 'quick',
    defaultMarket: settings.ai?.defaultMarket || 'Lebanon',
    languages: settings.ai?.languages || 'both',
    preferredDomains: settings.ai?.preferredDomains || [],
    blockedDomains: settings.ai?.blockedDomains || [],
    maxResultsPerProduct: settings.ai?.maxResultsPerProduct || 8,
    saveSourceLinks: settings.ai?.saveSourceLinks !== false,
    apiKeyConfigured: Boolean(settings.ai?.apiKeyEncrypted),
    apiKeyLast4: settings.ai?.apiKeyLast4 || '',
    apiKeyConfiguredAt: settings.ai?.apiKeyConfiguredAt || null,
  },
});

// @desc    Get public app settings
// @route   GET /api/settings
// @access  Public
const getSettings = asyncHandler(async (_req, res) => {
  const settings = await getSettingsDocument();
  res.json({
    usdToLbpRate: settings.usdToLbpRate,
  });
});

// @desc    Get admin app settings
// @route   GET /api/settings/admin
// @access  Private/Admin
const getAdminSettings = asyncHandler(async (_req, res) => {
  const settings = await getSettingsDocumentWithSecret();
  res.json(serializeAdminSettings(settings));
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

// @desc    Update admin app settings
// @route   PUT /api/settings/admin
// @access  Private/Admin
const updateAdminSettings = asyncHandler(async (req, res) => {
  const settings = await getSettingsDocumentWithSecret();

  if (req.body.usdToLbpRate !== undefined) {
    const usdToLbpRate = Number(req.body.usdToLbpRate);

    if (!Number.isFinite(usdToLbpRate) || usdToLbpRate <= 0) {
      res.status(400);
      throw new Error('USD to LBP rate must be greater than 0');
    }

    settings.usdToLbpRate = usdToLbpRate;
  }

  if (req.body.ai) {
    const incomingAi = req.body.ai;
    const nextAi = {
      ...settings.ai?.toObject?.(),
      ...incomingAi,
    };

    nextAi.provider = 'openai';
    nextAi.searchMode = ['quick', 'deep'].includes(incomingAi.searchMode) ? incomingAi.searchMode : settings.ai?.searchMode || 'quick';
    nextAi.languages = ['english', 'arabic', 'both'].includes(incomingAi.languages) ? incomingAi.languages : settings.ai?.languages || 'both';
    nextAi.preferredDomains = normalizeList(incomingAi.preferredDomains);
    nextAi.blockedDomains = normalizeList(incomingAi.blockedDomains);
    nextAi.maxResultsPerProduct = Math.max(1, Math.min(20, Number(incomingAi.maxResultsPerProduct) || 8));
    nextAi.saveSourceLinks = incomingAi.saveSourceLinks !== false;
    nextAi.enabled = Boolean(incomingAi.enabled);
    nextAi.model = String(incomingAi.model || settings.ai?.model || 'gpt-4.1-mini').trim();
    nextAi.defaultMarket = String(incomingAi.defaultMarket || settings.ai?.defaultMarket || 'Lebanon').trim();

    if (incomingAi.clearApiKey) {
      nextAi.apiKeyEncrypted = '';
      nextAi.apiKeyLast4 = '';
      nextAi.apiKeyConfiguredAt = null;
    }

    if (incomingAi.apiKey) {
      const apiKey = String(incomingAi.apiKey).trim();
      nextAi.apiKeyEncrypted = encryptSecret(apiKey);
      nextAi.apiKeyLast4 = apiKey.slice(-4);
      nextAi.apiKeyConfiguredAt = new Date();
    }

    settings.ai = nextAi;
  }

  const updatedSettings = await settings.save();
  res.json(serializeAdminSettings(updatedSettings));
});

// @desc    Test configured AI integration
// @route   POST /api/settings/admin/test-ai
// @access  Private/Admin
const testAiSettings = asyncHandler(async (_req, res) => {
  const settings = await getSettingsDocumentWithSecret();

  if (!settings.ai?.enabled) {
    res.status(400);
    throw new Error('AI integration is disabled');
  }

  if (!settings.ai?.apiKeyEncrypted) {
    res.status(400);
    throw new Error('AI API key is not configured');
  }

  const apiKey = decryptSecret(settings.ai.apiKeyEncrypted);
  const result = await testOpenAIConnection({
    apiKey,
    model: settings.ai.model || 'gpt-4.1-mini',
  });

  res.json(result);
});

module.exports = {
  getSettings,
  getAdminSettings,
  updateSettings,
  updateAdminSettings,
  testAiSettings,
  getSettingsDocumentWithSecret,
  serializeAdminSettings,
};
