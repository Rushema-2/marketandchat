const express = require("express");

const {
    initiatePromotionPayment
} = require("../controllers/promotionPaymentController");

const {
    checkPromotionPaymentStatus
} =
    require("../controllers/promotionPaymentStatusController");

const authMiddleware =
    require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/:promotionId/pay",
    authMiddleware,
    initiatePromotionPayment
);

router.get(
    "/:promotionId/payment-status",
    authMiddleware,
    checkPromotionPaymentStatus
);

module.exports = router;
