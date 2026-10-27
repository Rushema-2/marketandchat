const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    googleLogin
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/google", googleLogin);

router.get("/me", authMiddleware, (req, res) => {
    res.status(200).json({
        message: "Authenticated successfully",
        userId: req.user.userId
    });
});

module.exports = router;

