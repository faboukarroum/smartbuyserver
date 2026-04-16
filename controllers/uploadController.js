const asyncHandler = require('express-async-handler');

const uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file uploaded');
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

  res.status(201).json({
    message: 'Image uploaded successfully',
    imageUrl,
  });
});

module.exports = {
  uploadProductImage,
};
