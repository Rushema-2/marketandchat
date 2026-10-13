const express = require("express");

const authMiddleware =
    require("../middleware/authMiddleware");

const {
    likeProduct,
    unlikeProduct,
    getLikeStatus
} = require("../controllers/productLikeController");

const router =
    express.Router();

router.get(
    "/:productId/status",
    authMiddleware,
    getLikeStatus
);

router.post(
    "/:productId",
    authMiddleware,
    likeProduct
);

router.delete(
    "/:productId",
    authMiddleware,
    unlikeProduct
);

module.exports = router;
