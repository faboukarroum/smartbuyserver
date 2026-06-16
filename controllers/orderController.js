const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const crypto = require('crypto');

const FULFILLMENT_STATUSES = ['ready_for_pickup', 'picked_up', 'delivered'];

// @desc    Create new order
// @route   POST /api/orders
// @access  Public, optionally authenticated
const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    guestCustomer = {},
    clientOrderToken,
  } = req.body;
  const normalizedClientOrderToken =
    typeof clientOrderToken === 'string' && clientOrderToken.trim()
      ? clientOrderToken.trim().slice(0, 120)
      : undefined;

  if (normalizedClientOrderToken) {
    const existingOrder = await Order.findOne({ clientOrderToken: normalizedClientOrderToken }).select('+receiptToken');

    if (existingOrder) {
      return res.json({
        ...existingOrder.toObject(),
        receiptToken: existingOrder.receiptToken,
      });
    }
  }

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  if (!shippingAddress?.fullName || !shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.deliveryNote) {
    res.status(400);
    throw new Error('Delivery information is required');
  }

  if (!guestCustomer.phone) {
    res.status(400);
    throw new Error('Phone number is required');
  }

  const canonicalItems = [];
  const reservedItems = [];

  for (const item of orderItems) {
    const productId = item.product || item._id || item.id;
    const qty = Number(item.qty || item.quantity || 0);

    if (!productId || !Number.isInteger(qty) || qty < 1) {
      res.status(400);
      throw new Error('Invalid order item');
    }

    const product = await Product.findById(productId);

    if (!product) {
      res.status(404);
      throw new Error('One or more products were not found');
    }

    if (product.stock < qty) {
      res.status(400);
      throw new Error(`Only ${product.stock} left for ${product.name}`);
    }

    const reservation = await Product.updateOne(
      { _id: product._id, stock: { $gte: qty } },
      { $inc: { stock: -qty } }
    );

    if (reservation.modifiedCount !== 1) {
      for (const reservedItem of reservedItems) {
        await Product.updateOne(
          { _id: reservedItem.product },
          { $inc: { stock: reservedItem.qty } }
        );
      }

      const latestProduct = await Product.findById(product._id);
      const availableStock = latestProduct?.stock ?? 0;

      res.status(400);
      throw new Error(`Only ${availableStock} left for ${product.name}`);
    }

    reservedItems.push({
      product: product._id,
      qty,
    });

    canonicalItems.push({
      name: product.name,
      qty,
      image: product.image,
      price: product.price,
      product: product._id,
    });
  }

  const itemsPrice = canonicalItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shippingPrice = 0;
  const totalPrice = itemsPrice + shippingPrice;
  const receiptToken = crypto.randomBytes(24).toString('hex');

  const order = new Order({
    orderItems: canonicalItems,
    user: req.user?._id,
    guestCustomer: {
      fullName: guestCustomer.fullName || shippingAddress.fullName,
      phone: guestCustomer.phone,
      email: guestCustomer.email || '',
    },
    shippingAddress,
    paymentMethod: paymentMethod || 'Cash on Delivery',
    itemsPrice,
    shippingPrice,
    totalPrice,
    receiptToken,
    clientOrderToken: normalizedClientOrderToken,
  });

  let createdOrder;

  try {
    createdOrder = await order.save();
  } catch (error) {
    for (const reservedItem of reservedItems) {
      await Product.updateOne(
        { _id: reservedItem.product },
        { $inc: { stock: reservedItem.qty } }
      );
    }

    if (error?.code === 11000 && normalizedClientOrderToken) {
      const existingOrder = await Order.findOne({ clientOrderToken: normalizedClientOrderToken }).select('+receiptToken');

      if (existingOrder) {
        return res.json({
          ...existingOrder.toObject(),
          receiptToken: existingOrder.receiptToken,
        });
      }
    }

    throw error;
  }

  res.status(201).json({
    ...createdOrder.toObject(),
    receiptToken,
  });
});

// @desc    Get order receipt using receipt token
// @route   GET /api/orders/:id/receipt/:receiptToken
// @access  Public
const getOrderReceipt = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    receiptToken: req.params.receiptToken,
  }).populate('user', 'name email');

  if (order) {
    res.json(order);
  } else {
    res.status(404);
    throw new Error('Receipt not found');
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (order) {
    const orderUserId = order.user?._id?.toString() || order.user?.toString();
    const requesterId = req.user?._id?.toString();
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin && (!orderUserId || orderUserId !== requesterId)) {
      res.status(403);
      throw new Error('Not authorized to view this order');
    }

    res.json(order);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.fulfillmentStatus = 'delivered';
    order.fulfillmentStatusUpdatedAt = Date.now();
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order fulfillment status
// @route   PUT /api/orders/:id/fulfillment-status
// @access  Private/Admin
const updateOrderFulfillmentStatus = asyncHandler(async (req, res) => {
  const { fulfillmentStatus } = req.body;

  if (!FULFILLMENT_STATUSES.includes(fulfillmentStatus)) {
    res.status(400);
    throw new Error('Invalid fulfillment status');
  }

  const order = await Order.findById(req.params.id);

  if (order) {
    order.fulfillmentStatus = fulfillmentStatus;
    order.fulfillmentStatusUpdatedAt = Date.now();

    if (fulfillmentStatus === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = order.deliveredAt || Date.now();
    } else {
      order.isDelivered = false;
      order.deliveredAt = undefined;
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'id name email');
  res.json(orders);
});

module.exports = {
  addOrderItems,
  getOrderReceipt,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  updateOrderFulfillmentStatus,
  getMyOrders,
  getOrders,
};
