const express = require("express");
const upload = require("../middleware/uploadMiddleware");

const productMediaUpload = upload.fields([
    { name: "images", maxCount: 6 },
    { name: "video", maxCount: 1 }
]);

const {
    createProduct,
    getProducts,
    getProduct,
    getMyProducts,
    getSellerProducts,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

const authMiddleware =
    require("../middleware/authMiddleware");

const optionalAuthMiddleware =
    require("../middleware/optionalAuthMiddleware");

const router = express.Router();

// ========================================
// PUBLIC MARKETPLACE
// ========================================

router.get("/", getProducts);

// IMPORTANT:
// This must come BEFORE /:id
router.get(
    "/seller/me/products",
    authMiddleware,
    getMyProducts
);

// PUBLIC SELLER PORTFOLIO
// Must come BEFORE /:id
router.get(
    "/seller/:sellerId",
    getSellerProducts
);

router.get(
    "/:id",
    optionalAuthMiddleware,
    getProduct
);

// ========================================
// AUTHENTICATED SELLER
// ========================================

router.post("/", authMiddleware, productMediaUpload, createProduct);
router.put("/:id", authMiddleware, productMediaUpload, updateProduct);

router.delete(
    "/:id",
    authMiddleware,
    deleteProduct
);

module.exports = router;
