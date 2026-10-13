const express = require("express");

const {
    createOrder,
    payOrder,
    checkOrderPayment,
    getMyOrders,
    getMySales,
    getSalesSummary,
    updateOrderStatus,
    confirmOrderDelivered
} = require("../controllers/orderController");

const authMiddleware =
    require("../middleware/authMiddleware");

const router = express.Router();

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
