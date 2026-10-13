const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    createMessage,
    getMessages
} = require("../controllers/messageController");


router.post(
    "/",
    authMiddleware,
    createMessage
);


router.get(
    "/:conversationId",
    authMiddleware,
    getMessages
);



module.exports = router;
