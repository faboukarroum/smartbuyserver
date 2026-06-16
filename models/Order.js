const mongoose = require('mongoose');

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    guestCustomer: {
      fullName: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: 'Product',
        },
      },
    ],
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      deliveryNote: { type: String, required: true },
      fullName: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    receiptToken: {
      type: String,
      required: true,
      select: false,
    },
    clientOrderToken: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    fulfillmentStatus: {
      type: String,
      required: true,
      enum: ['ready_for_pickup', 'picked_up', 'delivered'],
      default: 'ready_for_pickup',
    },
    fulfillmentStatusUpdatedAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
