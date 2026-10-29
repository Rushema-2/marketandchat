const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const {
    getSellerReviews,
    saveSellerReview
} = require("../controllers/sellerReviewController");

const router = express.Router();

router.get("/seller/:sellerId", optionalAuthMiddleware, getSellerReviews);
router.post("/seller/:sellerId", authMiddleware, saveSellerReview);

module.exports = router;
