const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

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

  return JSON.parse(jsonText);
};

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
  const details = (scannedProduct.detailsCandidates || []).map((item) => item.value).filter(Boolean);
  const names = (scannedProduct.nameCandidates || []).map((item) => item.value).filter(Boolean);

  const prompt = {
    barcode: scannedProduct.barcode,
    productNames: names,
    brand: scannedProduct.brand,
    manufacturer: scannedProduct.manufacturer,
    category: scannedProduct.category,
    details,
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
      input: [
        {
          role: 'system',
          content: [
            'You research Lebanese ecommerce prices for admin catalog verification.',
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

module.exports = {
  researchLebanesePrices,
  testOpenAIConnection,
};
