const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const priceResultSchema = {
  type: 'object',
  properties: {
    sellerName: { type: 'string' },
    listingTitle: { type: 'string' },
    url: { type: 'string' },
    price: { type: 'number' },
    currency: { type: 'string' },
    priceLbp: { type: ['number', 'null'] },
    imageUrl: { type: 'string' },
    matchConfidence: { type: 'number' },
    matchNotes: { type: 'string' },
    observedAt: { type: 'string' },
  },
  required: [
    'sellerName',
    'listingTitle',
    'url',
    'price',
    'currency',
    'priceLbp',
    'imageUrl',
    'matchConfidence',
    'matchNotes',
    'observedAt',
  ],
  additionalProperties: false,
};

const sourceSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['name', 'url', 'notes'],
  additionalProperties: false,
};

const officialImageSchema = {
  type: 'object',
  properties: {
    url: { type: 'string' },
    source: { type: 'string' },
    confidence: { type: 'number' },
  },
  required: ['url', 'source', 'confidence'],
  additionalProperties: false,
};

const marketResearchFormat = {
  type: 'json_schema',
  name: 'lebanese_market_price_research',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      marketPriceResults: {
        type: 'array',
        items: priceResultSchema,
      },
    },
    required: ['summary', 'marketPriceResults'],
    additionalProperties: false,
  },
};

const officialVerificationFormat = {
  type: 'json_schema',
  name: 'official_supplier_verification',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      verifiedName: { type: 'string' },
      verifiedDescription: { type: 'string' },
      verifiedDetails: {
        type: 'array',
        items: { type: 'string' },
      },
      highResImages: {
        type: 'array',
        items: officialImageSchema,
      },
      brand: { type: 'string' },
      manufacturer: { type: 'string' },
      officialSources: {
        type: 'array',
        items: sourceSchema,
      },
    },
    required: [
      'summary',
      'verifiedName',
      'verifiedDescription',
      'verifiedDetails',
      'highResImages',
      'brand',
      'manufacturer',
      'officialSources',
    ],
    additionalProperties: false,
  },
};

const extractResponseText = (data) => {
  if (typeof data?.output_text === 'string') {
    return data.output_text;
  }

  if (!Array.isArray(data?.output)) {
    return '';
  }

  return data.output
    .flatMap((item) => item.content || [])
    .map((content) => content.text || content.output_text || '')
    .filter(Boolean)
    .join('\n');
};

const parseJsonText = (text) => {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const jsonText = firstBrace >= 0 && lastBrace >= firstBrace
    ? cleaned.slice(firstBrace, lastBrace + 1)
    : cleaned;

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    const preview = cleaned.slice(0, 80).replace(/\s+/g, ' ');
    throw new Error(`AI response was not valid JSON${preview ? `: ${preview}` : ''}`);
  }
};

const compactString = (value) => String(value || '').trim();

const normalizePromptCandidates = (items = [], valueKey = 'value') => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      value: compactString(item?.[valueKey]),
      source: compactString(item?.source),
      confidence: item?.confidence ?? null,
    }))
    .filter((item) => item.value);
};

const normalizePromptSources = (items = []) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      name: compactString(item?.name),
      url: compactString(item?.url),
      notes: compactString(item?.notes),
    }))
    .filter((item) => item.url || item.name || item.notes);
};

const buildScannedProductContext = (scannedProduct) => ({
  barcode: compactString(scannedProduct.barcode),
  brand: compactString(scannedProduct.brand),
  manufacturer: compactString(scannedProduct.manufacturer),
  category: compactString(scannedProduct.category),
  notes: compactString(scannedProduct.notes),
  officialVerificationSummary: compactString(scannedProduct.officialVerificationSummary),
  nameCandidates: normalizePromptCandidates(scannedProduct.nameCandidates),
  descriptionCandidates: normalizePromptCandidates(scannedProduct.descriptionCandidates),
  detailCandidates: normalizePromptCandidates(scannedProduct.detailsCandidates),
  imageCandidates: normalizePromptCandidates(scannedProduct.imageCandidates, 'url'),
  lookupAndSupplierSources: normalizePromptSources(scannedProduct.supplierSources),
});

const normalizeConfidence = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0.5;
  }

  if (number > 1) {
    return Math.max(0, Math.min(1, number / 100));
  }

  return Math.max(0, Math.min(1, number));
};

const normalizePriceResults = (results = [], maxResults = 8) => {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((result) => {
      const price = Number(result.price);
      const url = String(result.url || '').trim();

      if (!url || !Number.isFinite(price)) {
        return null;
      }

      const priceLbp = Number(result.priceLbp);

      return {
        sellerName: String(result.sellerName || result.seller || '').trim(),
        listingTitle: String(result.listingTitle || result.title || '').trim(),
        url,
        price,
        currency: String(result.currency || 'USD').trim().toUpperCase(),
        priceLbp: Number.isFinite(priceLbp) ? priceLbp : null,
        imageUrl: String(result.imageUrl || '').trim(),
        matchConfidence: normalizeConfidence(result.matchConfidence),
        matchNotes: String(result.matchNotes || result.notes || '').trim(),
        observedAt: result.observedAt ? new Date(result.observedAt) : new Date(),
      };
    })
    .filter(Boolean)
    .slice(0, maxResults);
};

const normalizeTextCandidates = (items = [], source = 'Official supplier', confidence = 0.9) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { value: item.trim(), source, confidence };
      }

      return {
        value: String(item.value || item.text || '').trim(),
        source: String(item.source || source).trim(),
        confidence: normalizeConfidence(item.confidence ?? confidence),
      };
    })
    .filter((item) => item.value);
};

const normalizeImageCandidates = (items = [], source = 'Official supplier') => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { url: item.trim(), source, confidence: 0.9 };
      }

      return {
        url: String(item.url || item.imageUrl || '').trim(),
        source: String(item.source || source).trim(),
        confidence: normalizeConfidence(item.confidence ?? 0.9),
      };
    })
    .filter((item) => item.url && /^https?:\/\//i.test(item.url));
};

const normalizeSources = (items = [], fallbackName = 'Official supplier') => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      name: String(item.name || fallbackName).trim(),
      url: String(item.url || '').trim(),
      notes: String(item.notes || 'Official supplier verification').trim(),
    }))
    .filter((item) => item.url && /^https?:\/\//i.test(item.url));
};

const callOpenAI = async ({ apiKey, body }) => {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || 'OpenAI request failed');
  }

  return data;
};

const testOpenAIConnection = async ({ apiKey, model }) => {
  const data = await callOpenAI({
    apiKey,
    body: {
      model,
      input: 'Return only this JSON object: {"ok":true}',
      max_output_tokens: 80,
    },
  });

  const text = extractResponseText(data);

  return {
    ok: true,
    message: text || 'AI connection succeeded.',
  };
};

const researchLebanesePrices = async ({ apiKey, aiSettings, scannedProduct }) => {
  const maxResults = Number(aiSettings.maxResultsPerProduct) || 8;
  const productContext = buildScannedProductContext(scannedProduct);

  const prompt = {
    product: productContext,
    market: aiSettings.defaultMarket || 'Lebanon',
    languages: aiSettings.languages || 'both',
    preferredDomains: aiSettings.preferredDomains || [],
    blockedDomains: aiSettings.blockedDomains || [],
    maxResults,
  };

  const data = await callOpenAI({
    apiKey,
    body: {
      model: aiSettings.model || 'gpt-4.1-mini',
      tools: [{ type: 'web_search', external_web_access: true }],
      tool_choice: 'required',
      text: { format: marketResearchFormat },
      input: [
        {
          role: 'system',
          content: [
            'You research Lebanese ecommerce prices for admin catalog verification.',
            'Use all product context from the barcode lookup and official verification, including candidate names, descriptions, specs, images, source URLs, brand, manufacturer, category, and notes.',
            'Treat lookup sources such as Open Food Facts, Open Products Facts, and Open Beauty Facts as product-identification clues, then search seller listings for the best matching product.',
            'Return only valid JSON with keys summary and marketPriceResults.',
            'marketPriceResults must be an array of objects with sellerName, listingTitle, url, price, currency, priceLbp, imageUrl, matchConfidence, matchNotes, observedAt.',
            'Only include results with a real source URL and numeric price.',
            'Use lower matchConfidence for similar products or uncertain matches.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Find current Lebanese market prices for this scanned product. Data: ${JSON.stringify(prompt)}`,
        },
      ],
    },
  });

  const text = extractResponseText(data);
  const parsed = parseJsonText(text);
  const marketPriceResults = normalizePriceResults(parsed.marketPriceResults, maxResults);

  if (marketPriceResults.length === 0) {
    throw new Error('No Lebanese price results with source links and numeric prices were found');
  }

  return {
    summary: String(parsed.summary || 'AI research completed.').trim(),
    marketPriceResults,
  };
};

const verifyOfficialSupplierDetails = async ({ apiKey, aiSettings, scannedProduct }) => {
  const productContext = buildScannedProductContext(scannedProduct);

  const prompt = {
    product: productContext,
    languages: aiSettings.languages || 'both',
    preferredDomains: aiSettings.preferredDomains || [],
    blockedDomains: aiSettings.blockedDomains || [],
  };

  const data = await callOpenAI({
    apiKey,
    body: {
      model: aiSettings.model || 'gpt-4.1-mini',
      tools: [{ type: 'web_search', external_web_access: true }],
      tool_choice: 'required',
      text: { format: officialVerificationFormat },
      input: [
        {
          role: 'system',
          content: [
            'You verify product catalog data only against official supplier, official brand, official manufacturer, or official distributor pages.',
            'Use every clue in the product context from the initial barcode lookup, including candidate names, descriptions, specs, images, source URLs, source names, confidence, brand, manufacturer, category, and notes.',
            'If the barcode lookup identified only a generic or partial product name, combine that name with the barcode, package details, country, ingredient/material/category clues, and any source-page data to find the likely official product.',
            'Do not use marketplace listings, reseller pages, social media posts, review blogs, or generic barcode databases as official verification sources.',
            'Generic barcode databases and lookup sources are clues only; do not return them as officialSources unless the source is also an official brand, manufacturer, supplier, or distributor page.',
            'Prefer official product pages, official spec sheets, official media kits, and official image CDN URLs.',
            'Return only valid JSON with keys summary, verifiedName, verifiedDescription, verifiedDetails, highResImages, brand, manufacturer, officialSources.',
            'verifiedDetails must be an array of concise product specifications.',
            'highResImages must contain direct http/https image URLs when possible and should prefer high-resolution official images.',
            'officialSources must be an array of objects with name, url, notes.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `Verify these scanned product details against official supplier sources and find official high-resolution product images. Data: ${JSON.stringify(prompt)}`,
        },
      ],
    },
  });

  const text = extractResponseText(data);
  const parsed = parseJsonText(text);
  const nameCandidates = normalizeTextCandidates([parsed.verifiedName].filter(Boolean), 'Official supplier', 0.95);
  const descriptionCandidates = normalizeTextCandidates([parsed.verifiedDescription].filter(Boolean), 'Official supplier', 0.9);
  const detailsCandidates = normalizeTextCandidates(parsed.verifiedDetails, 'Official supplier', 0.9);
  const imageCandidates = normalizeImageCandidates(parsed.highResImages, 'Official supplier');
  const supplierSources = normalizeSources(parsed.officialSources, parsed.brand || parsed.manufacturer || 'Official supplier');

  if (
    nameCandidates.length === 0 &&
    descriptionCandidates.length === 0 &&
    detailsCandidates.length === 0 &&
    imageCandidates.length === 0 &&
    supplierSources.length === 0
  ) {
    throw new Error('No official supplier details or high-resolution images were found');
  }

  return {
    summary: String(parsed.summary || 'Official supplier verification completed.').trim(),
    nameCandidates,
    descriptionCandidates,
    detailsCandidates,
    imageCandidates,
    supplierSources,
    brand: String(parsed.brand || '').trim(),
    manufacturer: String(parsed.manufacturer || '').trim(),
  };
};

module.exports = {
  researchLebanesePrices,
  testOpenAIConnection,
  verifyOfficialSupplierDetails,
};
