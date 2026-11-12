const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
    getOverview,
    getAnalytics,
    getPerformance,
    getUsers,
    updateSellerVerification,
    getProducts,
    getOrders,
    getReviews,
    getServices,
    getVideos,
    updateProductStatus,
    updateServiceStatus,
    updateVideoStatus,
    updateReviewStatus
} = require("../controllers/adminController");

const router = express.Router();

// All admin endpoints require a valid login and admin role.
router.use(authMiddleware, adminMiddleware);

router.get("/overview", getOverview);
router.get("/analytics", getAnalytics);
router.get("/performance", getPerformance);
router.get("/users", getUsers);
router.patch("/users/:id/verification", updateSellerVerification);
router.get("/products", getProducts);
router.get("/orders", getOrders);
router.get("/reviews", getReviews);
router.get("/services", getServices);
router.get("/videos", getVideos);
router.patch("/products/:id/status", updateProductStatus);
router.patch("/services/:id/status", updateServiceStatus);
router.patch("/videos/:id/status", updateVideoStatus);
router.patch("/reviews/:id/status", updateReviewStatus);

module.exports = router;
