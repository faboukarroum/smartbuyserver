const asyncHandler = require('express-async-handler');
const { put } = require('@vercel/blob');

const buildBlobPath = (file) => {
  const originalName = file.originalname || 'product-image';
  const extension = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')).toLowerCase() : '';
  const safeName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'product-image';
  const folder = process.env.BLOB_UPLOAD_FOLDER || 'fikilshi/products';

  return `${folder.replace(/^\/+|\/+$/g, '')}/${Date.now()}-${safeName}${extension}`;
};

const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('No image file uploaded');
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(500);
    throw new Error('Vercel Blob is not configured');
  }

  const blob = await put(buildBlobPath(req.file), req.file.buffer, {
    access: 'public',
    contentType: req.file.mimetype,
  });

  res.status(201).json({
    message: 'Image uploaded successfully',
    imageUrl: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
  });
});

module.exports = {
  uploadProductImage,
};
