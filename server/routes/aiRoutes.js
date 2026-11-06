const express = require("express");
const router = express.Router();
const { chatWithNR } = require("../controllers/aiController");

router.post("/chat", chatWithNR);

module.exports = router;
