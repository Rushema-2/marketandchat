const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const {
    getProductReviews,
    saveProductReview
} = require("../controllers/reviewController");

const router = express.Router();

router.get("/product/:productId", optionalAuthMiddleware, getProductReviews);
router.post("/product/:productId", authMiddleware, saveProductReview);

module.exports = router;
