const mongoose = require('mongoose');

const candidateSchema = mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      default: 'manual',
    },
    confidence: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const imageCandidateSchema = mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      default: 'manual',
    },
    confidence: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const sourceSchema = mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const marketPriceSchema = mongoose.Schema(
  {
    sellerName: {
      type: String,
      default: '',
    },
    listingTitle: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    priceLbp: {
      type: Number,
      default: null,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    matchConfidence: {
      type: Number,
      default: 0.5,
    },
    matchNotes: {
      type: String,
      default: '',
    },
    observedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const scannedProductSchema = mongoose.Schema(
  {
    barcode: {
      type: String,
      required: true,
      index: true,
    },
    scanStatus: {
      type: String,
      enum: ['scanned', 'researched', 'imported', 'rejected'],
      default: 'scanned',
      index: true,
    },
    nameCandidates: {
      type: [candidateSchema],
      default: [],
    },
    descriptionCandidates: {
      type: [candidateSchema],
      default: [],
    },
    detailsCandidates: {
      type: [candidateSchema],
      default: [],
    },
    imageCandidates: {
      type: [imageCandidateSchema],
      default: [],
    },
    brand: {
      type: String,
      default: '',
    },
    manufacturer: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: '',
    },
    supplierSources: {
      type: [sourceSchema],
      default: [],
    },
    marketPriceResults: {
      type: [marketPriceSchema],
      default: [],
    },
    aiResearchSummary: {
      type: String,
      default: '',
    },
    officialVerificationSummary: {
      type: String,
      default: '',
    },
    officialVerifiedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    importedProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    importedAt: {
      type: Date,
      default: null,
    },
    importedFields: {
      type: [String],
      default: [],
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ScannedProduct = mongoose.model('ScannedProduct', scannedProductSchema);

module.exports = ScannedProduct;
