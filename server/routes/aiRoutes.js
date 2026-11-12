const express = require("express");
const router = express.Router();
const aiOptionalAuthMiddleware = require("../middleware/aiOptionalAuthMiddleware");
const { chatWithNR } = require("../controllers/aiController");

router.post("/chat", aiOptionalAuthMiddleware, chatWithNR);

module.exports = router;
