const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');

// @desc    Fetch all products with pagination and filtering
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.pageSize) || 20;
  const page = Number(req.query.pageNumber) || 1;

  const keyword = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: 'i',
        },
      }
    : {};

  const category = req.query.category && req.query.category !== 'All'
    ? {
        category: {
          $regex: req.query.category,
          $options: 'i',
        },
      }
    : {};

  const sortOption = {};
  if (req.query.sortBy === 'price-low') {
    sortOption.price = 1;
  } else if (req.query.sortBy === 'price-high') {
    sortOption.price = -1;
  } else {
    sortOption.createdAt = -1; // Default to newest
  }

  const count = await Product.countDocuments({ ...keyword, ...category });
  const products = await Product.find({ ...keyword, ...category })
    .sort(sortOption)
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({ products, page, pages: Math.ceil(count / pageSize), count });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    await product.deleteOne();
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    price,
    priceLbp,
    description,
    image,
    images = [],
    category,
    stock,
    isNew,
    details,
  } = req.body;

  const galleryImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const coverImage = image || galleryImages[0] || '';

  const product = new Product({
    name,
    price,
    priceLbp: priceLbp === '' || priceLbp === null || priceLbp === undefined ? null : Number(priceLbp),
    user: req.user._id,
    image: coverImage,
    images: galleryImages,
    category,
    stock,
    description,
    isNew,
    details,
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const {
    name,
    price,
    priceLbp,
    description,
    image,
    images,
    category,
    stock,
    isNew,
    details,
  } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    const galleryImages = Array.isArray(images) ? images.filter(Boolean) : product.images;
    const coverImage = image || galleryImages[0] || product.image;

    product.name = name !== undefined ? name : product.name;
    product.price = price !== undefined ? price : product.price;
    product.priceLbp = priceLbp !== undefined
      ? (priceLbp === '' || priceLbp === null ? null : Number(priceLbp))
      : product.priceLbp;
    product.description = description !== undefined ? description : product.description;
    product.image = coverImage;
    product.images = galleryImages;
    product.category = category !== undefined ? category : product.category;
    product.stock = stock !== undefined ? stock : product.stock;
    product.isNew = isNew !== undefined ? isNew : product.isNew;
    product.details = details !== undefined ? details : product.details;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

module.exports = {
  getProducts,
  getProductById,
  deleteProduct,
  createProduct,
  updateProduct,
};
