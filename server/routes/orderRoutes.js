const express = require("express");

const {
    createOrder,
    payOrder,
    checkOrderPayment,
    getMyOrders,
    getMySales,
    getSalesSummary,
    updateOrderStatus,
    confirmOrderDelivered,
    getDirectPaymentDetails,
    submitDirectPayment,
    confirmDirectPayment,
    rejectDirectPayment
} = require("../controllers/orderController");

const authMiddleware =
    require("../middleware/authMiddleware");

const router = express.Router();

router.get(
    "/:orderId/direct-payment-details",
    authMiddleware,
    getDirectPaymentDetails
);

router.patch(
    "/:orderId/direct-payment/submit",
    authMiddleware,
    submitDirectPayment
);

router.patch(
    "/:orderId/direct-payment/confirm",
    authMiddleware,
    confirmDirectPayment
);

router.patch(
    "/:orderId/direct-payment/reject",
    authMiddleware,
    rejectDirectPayment
);

router.get(
    "/my-orders",
    authMiddleware,
    getMyOrders
);

router.get(
    "/my-sales",
    authMiddleware,
    getMySales
);

router.post(
    "/",
    authMiddleware,
    createOrder
);

router.patch(
    "/:orderId/status",
    authMiddleware,
    updateOrderStatus
);

router.patch(
    "/:orderId/confirm-delivery",
    authMiddleware,
    confirmOrderDelivered
);

router.post(
    "/:orderId/pay",
    authMiddleware,
    payOrder
);

router.get(
    "/sales-summary",
    authMiddleware,
    getSalesSummary
);

router.get(
    "/:orderId/payment-status",
    authMiddleware,
    checkOrderPayment
);

module.exports = router;
