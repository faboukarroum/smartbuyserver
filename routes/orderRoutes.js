const express = require('express');
const router = express.Router();
const {
  addOrderItems,
  getOrderReceipt,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  updateOrderFulfillmentStatus,
  getMyOrders,
  getOrders,
} = require('../controllers/orderController');
const { protect, optionalProtect, admin } = require('../middleware/authMiddleware');

router.route('/').post(optionalProtect, addOrderItems).get(protect, admin, getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id/receipt/:receiptToken').get(getOrderReceipt);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/pay').put(protect, admin, updateOrderToPaid);
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);
router.route('/:id/fulfillment-status').put(protect, admin, updateOrderFulfillmentStatus);

module.exports = router;
