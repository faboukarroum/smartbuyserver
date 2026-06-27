const LOOKUP_TIMEOUT_MS = 8000;

const sources = [
  {
    name: 'Open Food Facts',
    baseUrl: 'https://world.openfoodfacts.org',
  },
  {
    name: 'Open Products Facts',
    baseUrl: 'https://world.openproductsfacts.org',
  },
  {
    name: 'Open Beauty Facts',
    baseUrl: 'https://world.openbeautyfacts.org',
  },
];

const compact = (items = []) => items.map((item) => String(item || '').trim()).filter(Boolean);

const uniqueByValue = (items = [], key = 'value') => {
  const seen = new Set();

  return items.filter((item) => {
    const value = String(item?.[key] || '').trim().toLowerCase();

    if (!value || seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
};

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FiKilShiAdmin/1.0 (admin@fikilshi.com)',
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const isFoundResponse = (data) => {
  if (!data) {
    return false;
  }

  return data.status === 'success' || data.status === 1 || data.result?.id;
};

const getProduct = (data) => data?.product || data?.result?.product || null;

const makeCandidate = (value, source, confidence = 0.8) => ({
  value,
  source,
  confidence,
});

const makeImageCandidate = (url, source, confidence = 0.8) => ({
  url,
  source,
  confidence,
});

const toDetails = (product, sourceName) => compact([
  product.quantity ? `Quantity: ${product.quantity}` : '',
  product.packaging ? `Packaging: ${product.packaging}` : '',
  product.categories ? `Categories: ${product.categories}` : '',
  product.labels ? `Labels: ${product.labels}` : '',
  product.countries ? `Countries: ${product.countries}` : '',
  product.ingredients_text ? `Ingredients: ${product.ingredients_text}` : '',
  product.materials ? `Materials: ${product.materials}` : '',
])
  .map((value) => makeCandidate(value, sourceName, 0.75));

const normalizeProduct = ({ barcode, source, product }) => {
  const productUrl = `${source.baseUrl}/product/${barcode}`;
  const names = uniqueByValue(compact([
    product.product_name,
    product.product_name_en,
    product.generic_name,
    product.generic_name_en,
    product.abbreviated_product_name,
  ]).map((value) => makeCandidate(value, source.name, 0.85)));

  const descriptions = uniqueByValue(compact([
    product.generic_name,
    product.generic_name_en,
    product.product_name && product.brands ? `${product.product_name} by ${product.brands}` : '',
  ]).map((value) => makeCandidate(value, source.name, 0.7)));

  const images = uniqueByValue(compact([
    product.image_front_url,
    product.image_url,
    product.image_small_url,
  ]).map((url) => makeImageCandidate(url, source.name, 0.8)), 'url');

  return {
    nameCandidates: names,
    descriptionCandidates: descriptions,
    detailsCandidates: toDetails(product, source.name),
    imageCandidates: images,
    brand: product.brands || '',
    manufacturer: product.manufacturing_places || product.producer || '',
    category: product.categories ? 'home' : '',
    supplierSources: [
      {
        name: source.name,
        url: productUrl,
        notes: 'Barcode lookup match',
      },
    ],
  };
};

const mergeLookupResults = (results = []) => ({
  nameCandidates: uniqueByValue(results.flatMap((result) => result.nameCandidates || [])),
  descriptionCandidates: uniqueByValue(results.flatMap((result) => result.descriptionCandidates || [])),
  detailsCandidates: uniqueByValue(results.flatMap((result) => result.detailsCandidates || [])),
  imageCandidates: uniqueByValue(results.flatMap((result) => result.imageCandidates || []), 'url'),
  brand: results.find((result) => result.brand)?.brand || '',
  manufacturer: results.find((result) => result.manufacturer)?.manufacturer || '',
  category: results.find((result) => result.category)?.category || '',
  supplierSources: results.flatMap((result) => result.supplierSources || []),
});

const lookupBarcode = async (barcode) => {
  const lookups = await Promise.allSettled(
    sources.map(async (source) => {
      const url = `${source.baseUrl}/api/v3/product/${encodeURIComponent(barcode)}.json`;
      const data = await fetchJson(url);

      if (!isFoundResponse(data)) {
        return null;
      }

      const product = getProduct(data);

      if (!product) {
        return null;
      }

      return normalizeProduct({ barcode, source, product });
    })
  );

  const results = lookups
    .filter((lookup) => lookup.status === 'fulfilled' && lookup.value)
    .map((lookup) => lookup.value);

  return {
    found: results.length > 0,
    ...mergeLookupResults(results),
  };
};

module.exports = {
  lookupBarcode,
};
