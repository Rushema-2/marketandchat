const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
    getOverview,
    getUsers,
    getProducts,
    getOrders,
    getReviews
} = require("../controllers/adminController");

const router = express.Router();

// All admin endpoints require a valid login and admin role.
router.use(authMiddleware, adminMiddleware);

router.get("/overview", getOverview);
router.get("/users", getUsers);
router.get("/products", getProducts);
router.get("/orders", getOrders);
router.get("/reviews", getReviews);

module.exports = router;
