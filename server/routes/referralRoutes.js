const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getMyReferrals } = require("../controllers/referralController");

const router = express.Router();

router.get("/me", authMiddleware, getMyReferrals);

module.exports = router;
