const asyncHandler = require('express-async-handler');
const ScannedProduct = require('../models/ScannedProduct');
const Product = require('../models/Product');
const { decryptSecret } = require('../utils/aiSettingsCrypto');
const { getSettingsDocumentWithSecret } = require('./settingsController');
const { researchLebanesePrices } = require('../services/aiMarketResearchService');
const { lookupBarcode } = require('../services/barcodeLookupService');

const normalizeBarcode = (value) => String(value || '').replace(/\D/g, '').trim();

const normalizeCandidateArray = (items = [], source = 'manual') => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { value: item.trim(), source };
      }

      return {
        value: String(item.value || '').trim(),
        source: String(item.source || source),
        confidence: item.confidence ?? null,
      };
    })
    .filter((item) => item.value);
};

const normalizeImageArray = (items = [], source = 'manual') => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { url: item.trim(), source };
      }

      return {
        url: String(item.url || '').trim(),
        source: String(item.source || source),
        confidence: item.confidence ?? null,
      };
    })
    .filter((item) => item.url);
};

const getBestValue = (items = []) => items.find((item) => item.value)?.value || '';
const getBestImage = (items = []) => items.find((item) => item.url)?.url || '';

const getSelectedFields = (fields) => {
  if (Array.isArray(fields)) {
    return fields;
  }

  return Object.entries(fields || {})
    .filter(([, selected]) => Boolean(selected))
    .map(([field]) => field);
};

const uniqueStrings = (items = []) => [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];

const mergeCandidates = (existing = [], incoming = [], key = 'value') => {
  const seen = new Set();

  return [...existing, ...incoming].filter((item) => {
    const value = String(item?.[key] || '').trim().toLowerCase();

    if (!value || seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
};

const hasLookupData = (scannedProduct) =>
  Boolean(
    scannedProduct.nameCandidates?.length ||
    scannedProduct.descriptionCandidates?.length ||
    scannedProduct.detailsCandidates?.length ||
    scannedProduct.imageCandidates?.length ||
    scannedProduct.brand ||
    scannedProduct.supplierSources?.length
  );

const applyLookupToScannedProduct = (scannedProduct, lookup) => {
  if (!lookup?.found) {
    return false;
  }

  scannedProduct.nameCandidates = mergeCandidates(scannedProduct.nameCandidates, lookup.nameCandidates);
  scannedProduct.descriptionCandidates = mergeCandidates(scannedProduct.descriptionCandidates, lookup.descriptionCandidates);
  scannedProduct.detailsCandidates = mergeCandidates(scannedProduct.detailsCandidates, lookup.detailsCandidates);
  scannedProduct.imageCandidates = mergeCandidates(scannedProduct.imageCandidates, lookup.imageCandidates, 'url');
  scannedProduct.supplierSources = mergeCandidates(scannedProduct.supplierSources, lookup.supplierSources, 'url');
  scannedProduct.brand = scannedProduct.brand || lookup.brand || '';
  scannedProduct.manufacturer = scannedProduct.manufacturer || lookup.manufacturer || '';
  scannedProduct.category = scannedProduct.category || lookup.category || '';

  return true;
};

const buildImportValues = (scannedProduct, values = {}) => ({
  name: values.name ?? getBestValue(scannedProduct.nameCandidates),
  description: values.description ?? getBestValue(scannedProduct.descriptionCandidates),
  details: Array.isArray(values.details)
    ? values.details
    : (scannedProduct.detailsCandidates || []).map((item) => item.value).filter(Boolean),
  image: values.image ?? getBestImage(scannedProduct.imageCandidates),
  images: Array.isArray(values.images)
    ? values.images
    : (scannedProduct.imageCandidates || []).map((item) => item.url).filter(Boolean),
  category: values.category ?? scannedProduct.category ?? 'home',
  price: values.price,
  priceLbp: values.priceLbp,
  stock: values.stock,
  barcode: values.barcode ?? scannedProduct.barcode,
  brand: values.brand ?? scannedProduct.brand,
  manufacturer: values.manufacturer ?? scannedProduct.manufacturer,
});

const applySelectedFields = ({ product, selectedFields, values, mode }) => {
  const selected = new Set(selectedFields);

  if (selected.has('name')) product.name = values.name;
  if (selected.has('description')) product.description = values.description;
  if (selected.has('category')) product.category = values.category;
  if (selected.has('price')) product.price = Number(values.price);
  if (selected.has('priceLbp')) {
    product.priceLbp = values.priceLbp === '' || values.priceLbp === null || values.priceLbp === undefined
      ? null
      : Number(values.priceLbp);
  }
  if (selected.has('stock')) product.stock = Number(values.stock);
  if (selected.has('image')) product.image = values.image;
  if (selected.has('images')) product.images = uniqueStrings([...(product.images || []), ...(values.images || [])]);
  if (selected.has('details')) product.details = uniqueStrings([...(product.details || []), ...(values.details || [])]);
  if (selected.has('metadata')) {
    product.barcode = values.barcode || product.barcode;
    product.brand = values.brand || product.brand;
    product.manufacturer = values.manufacturer || product.manufacturer;
  }

  if (mode === 'create') {
    product.image = product.image || values.image || values.images?.[0] || '';
    product.images = uniqueStrings(product.images || values.images || []);
    product.details = uniqueStrings(product.details || values.details || []);
  }

  product.verificationSource = 'admin-product-scanner-ai';
  product.verifiedAt = new Date();
};

const validateProductForSave = (product, res) => {
  const missing = [];

  if (!product.name) missing.push('name');
  if (!product.description) missing.push('description');
  if (!product.image) missing.push('main image');
  if (!product.category) missing.push('category');
  if (!Number.isFinite(Number(product.price))) missing.push('USD price');
  if (!Number.isFinite(Number(product.stock))) missing.push('stock');

  if (missing.length > 0) {
    res.status(400);
    throw new Error(`Import is missing required product fields: ${missing.join(', ')}`);
  }
};

// @desc    Create or reuse a scanned product staging record
// @route   POST /api/admin/scanned-products/scan
// @access  Private/Admin
const scanProduct = asyncHandler(async (req, res) => {
  const barcode = normalizeBarcode(req.body.barcode);

  if (!barcode) {
    res.status(400);
    throw new Error('Barcode is required');
  }

  const duplicate = await ScannedProduct.findOne({
    barcode,
    scanStatus: { $in: ['scanned', 'researched'] },
  }).sort({ createdAt: -1 });

  if (duplicate) {
    if (!hasLookupData(duplicate)) {
      const lookup = await lookupBarcode(barcode).catch(() => ({ found: false }));
      const enriched = applyLookupToScannedProduct(duplicate, lookup);

      if (enriched) {
        duplicate.updatedBy = req.user._id;
        await duplicate.save();
      }
    }

    res.json({ scannedProduct: duplicate, duplicate: true });
    return;
  }

  const lookup = await lookupBarcode(barcode).catch(() => ({ found: false }));

  const scannedProduct = await ScannedProduct.create({
    barcode,
    nameCandidates: mergeCandidates(normalizeCandidateArray(req.body.nameCandidates, 'scan'), lookup.nameCandidates),
    descriptionCandidates: mergeCandidates(normalizeCandidateArray(req.body.descriptionCandidates, 'scan'), lookup.descriptionCandidates),
    detailsCandidates: mergeCandidates(normalizeCandidateArray(req.body.detailsCandidates, 'scan'), lookup.detailsCandidates),
    imageCandidates: mergeCandidates(normalizeImageArray(req.body.imageCandidates, 'scan'), lookup.imageCandidates, 'url'),
    brand: req.body.brand || lookup.brand || '',
    manufacturer: req.body.manufacturer || lookup.manufacturer || '',
    category: req.body.category || lookup.category || '',
    supplierSources: mergeCandidates(Array.isArray(req.body.supplierSources) ? req.body.supplierSources : [], lookup.supplierSources, 'url'),
    notes: req.body.notes || (lookup.found ? 'Barcode product details were found automatically.' : 'No product details were found automatically for this barcode.'),
    createdBy: req.user._id,
  });

  res.status(201).json({ scannedProduct, duplicate: false, lookupFound: lookup.found });
});

// @desc    List scanned products
// @route   GET /api/admin/scanned-products
// @access  Private/Admin
const getScannedProducts = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.pageSize) || 20;
  const page = Number(req.query.pageNumber) || 1;
  const filter = {};

  if (req.query.status && req.query.status !== 'all') {
    filter.scanStatus = req.query.status;
  }

  if (req.query.keyword) {
    filter.$or = [
      { barcode: { $regex: req.query.keyword, $options: 'i' } },
      { 'nameCandidates.value': { $regex: req.query.keyword, $options: 'i' } },
      { brand: { $regex: req.query.keyword, $options: 'i' } },
    ];
  }

  const count = await ScannedProduct.countDocuments(filter);
  const scannedProducts = await ScannedProduct.find(filter)
    .populate('importedProductId', 'name image price priceLbp')
    .sort({ updatedAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ scannedProducts, page, pages: Math.ceil(count / pageSize), count });
});

// @desc    Get scanned product
// @route   GET /api/admin/scanned-products/:id
// @access  Private/Admin
const getScannedProductById = asyncHandler(async (req, res) => {
  const scannedProduct = await ScannedProduct.findById(req.params.id).populate('importedProductId', 'name image price priceLbp');

  if (!scannedProduct) {
    res.status(404);
    throw new Error('Scanned product not found');
  }

  res.json(scannedProduct);
});

// @desc    Update scanned product staging data
// @route   PUT /api/admin/scanned-products/:id
// @access  Private/Admin
const updateScannedProduct = asyncHandler(async (req, res) => {
  const scannedProduct = await ScannedProduct.findById(req.params.id);

  if (!scannedProduct) {
    res.status(404);
    throw new Error('Scanned product not found');
  }

  scannedProduct.nameCandidates = normalizeCandidateArray(req.body.nameCandidates, 'manual');
  scannedProduct.descriptionCandidates = normalizeCandidateArray(req.body.descriptionCandidates, 'manual');
  scannedProduct.detailsCandidates = normalizeCandidateArray(req.body.detailsCandidates, 'manual');
  scannedProduct.imageCandidates = normalizeImageArray(req.body.imageCandidates, 'manual');
  scannedProduct.brand = req.body.brand || '';
  scannedProduct.manufacturer = req.body.manufacturer || '';
  scannedProduct.category = req.body.category || '';
  scannedProduct.notes = req.body.notes || '';
  scannedProduct.updatedBy = req.user._id;

  const updatedScannedProduct = await scannedProduct.save();
  res.json(updatedScannedProduct);
});

// @desc    Research Lebanese prices with AI
// @route   POST /api/admin/scanned-products/:id/research-ai-prices
// @access  Private/Admin
const researchAiPrices = asyncHandler(async (req, res) => {
  const scannedProduct = await ScannedProduct.findById(req.params.id);

  if (!scannedProduct) {
    res.status(404);
    throw new Error('Scanned product not found');
  }

  const settings = await getSettingsDocumentWithSecret();

  if (!settings.ai?.enabled) {
    res.status(400);
    throw new Error('AI integration is disabled in Settings');
  }

  if (!settings.ai?.apiKeyEncrypted) {
    res.status(400);
    throw new Error('AI API key is not configured in Settings');
  }

  const apiKey = decryptSecret(settings.ai.apiKeyEncrypted);
  const research = await researchLebanesePrices({
    apiKey,
    aiSettings: settings.ai,
    scannedProduct,
  });

  scannedProduct.marketPriceResults = research.marketPriceResults;
  scannedProduct.aiResearchSummary = research.summary;
  scannedProduct.scanStatus = 'researched';
  scannedProduct.updatedBy = req.user._id;

  const updatedScannedProduct = await scannedProduct.save();
  res.json(updatedScannedProduct);
});

// @desc    Import staged scanned product into live products
// @route   POST /api/admin/scanned-products/:id/import
// @access  Private/Admin
const importScannedProduct = asyncHandler(async (req, res) => {
  const scannedProduct = await ScannedProduct.findById(req.params.id);

  if (!scannedProduct) {
    res.status(404);
    throw new Error('Scanned product not found');
  }

  const mode = req.body.mode === 'update' ? 'update' : 'create';
  const selectedFields = getSelectedFields(req.body.fields);
  const values = buildImportValues(scannedProduct, req.body.values || {});

  if (selectedFields.length === 0) {
    res.status(400);
    throw new Error('Select at least one field to import');
  }

  let product;

  if (mode === 'update') {
    if (!req.body.productId) {
      res.status(400);
      throw new Error('Select an existing product to update');
    }

    product = await Product.findById(req.body.productId);

    if (!product) {
      res.status(404);
      throw new Error('Existing product not found');
    }
  } else {
    product = new Product({
      name: '',
      description: '',
      image: '',
      images: [],
      category: '',
      price: 0,
      priceLbp: null,
      stock: 0,
      isNew: true,
      details: [],
    });
  }

  applySelectedFields({ product, selectedFields, values, mode });
  validateProductForSave(product, res);

  const savedProduct = await product.save();

  scannedProduct.importedProductId = savedProduct._id;
  scannedProduct.importedAt = new Date();
  scannedProduct.importedFields = selectedFields;
  scannedProduct.scanStatus = 'imported';
  scannedProduct.updatedBy = req.user._id;
  await scannedProduct.save();

  res.json({ scannedProduct, product: savedProduct });
});

// @desc    Reject scanned product staging record
// @route   POST /api/admin/scanned-products/:id/reject
// @access  Private/Admin
const rejectScannedProduct = asyncHandler(async (req, res) => {
  const scannedProduct = await ScannedProduct.findById(req.params.id);

  if (!scannedProduct) {
    res.status(404);
    throw new Error('Scanned product not found');
  }

  scannedProduct.scanStatus = 'rejected';
  scannedProduct.rejectedAt = new Date();
  scannedProduct.updatedBy = req.user._id;
  scannedProduct.notes = req.body.notes !== undefined ? req.body.notes : scannedProduct.notes;

  const updatedScannedProduct = await scannedProduct.save();
  res.json(updatedScannedProduct);
});

module.exports = {
  scanProduct,
  getScannedProducts,
  getScannedProductById,
  updateScannedProduct,
  researchAiPrices,
  importScannedProduct,
  rejectScannedProduct,
};
