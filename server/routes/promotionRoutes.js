const express = require("express");

const {
    createPromotion
} = require("../controllers/promotionController");

const authMiddleware =
    require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    createPromotion
);

module.exports = router;
