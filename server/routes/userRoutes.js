const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const router = express.Router();

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const transporter = require("../config/mailer");


// SEARCH USERS
router.get(
    "/search",
    authMiddleware,
    async (req, res) => {

        try {

            const q =
                req.query.q?.trim();

            if (!q) {
                return res.json([]);
            }


            const users =
                await User.find({

                    _id: {
                        $ne: req.user.userId
                    },

                    $or: [

                        {
                            firstName: {
                                $regex: q,
                                $options: "i"
                            }
                        },

                        {
                            lastName: {
                                $regex: q,
                                $options: "i"
                            }
                        },

                        {
                            email: {
                                $regex: q,
                                $options: "i"
                            }
                        },

                        {
                            phone: {
                                $regex: q,
                                $options: "i"
                            }
                        }

                    ]

                })
                .select(
                    "firstName lastName email phone"
                )
                .limit(20);


            res.json(users);


        } catch (error) {

            console.error(
                "Search users error:",
                error
            );

            res.status(500).json({
                message: "Search error"
            });

        }

    }
);


// PRIVATE SELLER PAYMENT SETTINGS
function normalizeRwandaPaymentNumber(value) {
    if (value === undefined || value === null || value === "") {
        return "";
    }

    if (typeof value !== "string") {
        return null;
    }

    const cleaned = value.trim().replace(/[\s()-]/g, "");

    if (/^07\d{8}$/.test(cleaned)) {
        return "+25" + cleaned;
    }

    if (/^2507\d{8}$/.test(cleaned)) {
        return "+" + cleaned;
    }

    if (/^\+2507\d{8}$/.test(cleaned)) {
        return cleaned;
    }

    return null;
}

// GET MY PAYMENT SETTINGS
router.get(
    "/payment-settings",
    authMiddleware,
    async (req, res) => {
        try {
            const user = await User.findById(req.user.userId)
                .select("paymentSettings");

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            return res.status(200).json({
                success: true,
                paymentSettings: {
                    mtnMomoNumber:
                        user.paymentSettings?.mtnMomoNumber || "",
                    airtelMoneyNumber:
                        user.paymentSettings?.airtelMoneyNumber || ""
                }
            });
        } catch (error) {
            console.error("Get payment settings error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to get payment settings"
            });
        }
    }
);

// SAVE MY PAYMENT SETTINGS
router.put(
    "/payment-settings",
    authMiddleware,
    async (req, res) => {
        try {
            const mtnMomoNumber =
                normalizeRwandaPaymentNumber(req.body.mtnMomoNumber);

            const airtelMoneyNumber =
                normalizeRwandaPaymentNumber(req.body.airtelMoneyNumber);

            if (mtnMomoNumber === null || airtelMoneyNumber === null) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Enter valid Rwanda numbers: 07XXXXXXXX or +2507XXXXXXXX"
                });
            }

            const user = await User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            user.paymentSettings = {
                mtnMomoNumber,
                airtelMoneyNumber,
                updatedAt: new Date()
            };

            await user.save();

            return res.status(200).json({
                success: true,
                message: "Payment settings saved successfully",
                paymentSettings: {
                    mtnMomoNumber,
                    airtelMoneyNumber
                }
            });
        } catch (error) {
            console.error("Save payment settings error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to save payment settings"
            });
        }
    }
);

// GET CURRENT USER PROFILE
router.get(
    "/profile",
    authMiddleware,
    async (req, res) => {
        try {
            const user = await User.findById(
                req.user.userId
            ).select(
                "firstName lastName email phone"
            );

            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            res.status(200).json({
                user
            });

        } catch (error) {
            console.error(
                "Get profile error:",
                error
            );

            res.status(500).json({
                message: "Server error"
            });
        }
    }
);

// UPDATE CURRENT USER PROFILE
router.put(
    "/profile",
    authMiddleware,
    async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                email,
                phone
            } = req.body;

            if (!firstName || !lastName || !email || !phone) {
                return res.status(400).json({
                    message: "All fields are required"
                });
            }

            const normalizedEmail =
                email.trim().toLowerCase();

            const normalizedPhone =
                phone.trim();

            const existingEmail =
                await User.findOne({
                    email: normalizedEmail,
                    _id: {
                        $ne: req.user.userId
                    }
                });

            if (existingEmail) {
                return res.status(400).json({
                    message: "Email already exists"
                });
            }

            const existingPhone =
                await User.findOne({
                    phone: normalizedPhone,
                    _id: {
                        $ne: req.user.userId
                    }
                });

            if (existingPhone) {
                return res.status(400).json({
                    message: "Phone number already exists"
                });
            }

            const user =
                await User.findByIdAndUpdate(
                    req.user.userId,
                    {
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        email: normalizedEmail,
                        phone: normalizedPhone
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                ).select(
                    "firstName lastName email phone"
                );

            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            res.status(200).json({
                message: "Profile updated successfully",
                user
            });

        } catch (error) {
            console.error(
                "Update profile error:",
                error
            );

            res.status(500).json({
                message: "Server error"
            });
        }
    }
);

router.put(
    "/password",
    authMiddleware,
    async (req, res) => {
        try {
            const {
                currentPassword,
                newPassword,
                confirmPassword
            } = req.body;

            if (
                !currentPassword ||
                !newPassword ||
                !confirmPassword
            ) {
                return res.status(400).json({
                    message: "All password fields are required"
                });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    message: "New passwords do not match"
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    message: "New password must be at least 6 characters"
                });
            }

            const user = await User.findById(
                req.user.userId
            );

            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            const passwordMatch =
                await bcrypt.compare(
                    currentPassword,
                    user.password
                );

            if (!passwordMatch) {
                return res.status(400).json({
                    message: "Current password is incorrect"
                });
            }

            user.password =
                await bcrypt.hash(
                    newPassword,
                    10
                );

            await user.save();

            res.status(200).json({
                message: "Password changed successfully"
            });

        } catch (error) {
            console.error(
                "Change password error:",
                error
            );

            res.status(500).json({
                message: "Server error"
            });
        }
    }
);

router.post(
    "/forgot-password",
    async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    message: "Email is required"
                });
            }

            const normalizedEmail =
                email.trim().toLowerCase();

            const user = await User.findOne({
                email: normalizedEmail
            });

            if (user) {
                const resetToken =
                    crypto.randomBytes(32).toString("hex");

                user.resetPasswordToken = resetToken;

                user.resetPasswordExpires =
                    new Date(Date.now() + 15 * 60 * 1000);

                await user.save();

                const resetLink =
                    `http://localhost:3000/reset-password.html?token=${resetToken}`;

                await transporter.sendMail({
                    from: process.env.MAIL_USER,
                    to: user.email,
                    subject: "RwhatsApp Password Reset",
                    text:
                        `You requested a password reset for your RwhatsApp account.\n\n` +
                        `Use this link to reset your password:\n\n` +
                        `${resetLink}\n\n` +
                        `This link expires in 15 minutes.\n\n` +
                        `If you did not request this, you can ignore this email.`,

                    html: `
                        <h2>RwhatsApp Password Reset</h2>

                        <p>
                            You requested a password reset for your
                            RwhatsApp account.
                        </p>

                        <p>
                            Click the button below to create a new password.
                        </p>

                        <p>
                            <a
                                href="${resetLink}"
                                style="
                                    display:inline-block;
                                    padding:12px 20px;
                                    background:#008069;
                                    color:white;
                                    text-decoration:none;
                                    border-radius:6px;
                                "
                            >
                                Reset Password
                            </a>
                        </p>

                        <p>
                            This link expires in 15 minutes.
                        </p>

                        <p>
                            If you did not request this password reset,
                            you can ignore this email.
                        </p>
                    `
                });

                console.log(
                    "Password reset email sent to:",
                    user.email
                );
            }

            return res.status(200).json({
                message:
                    "If the account exists, a reset link has been sent."
            });

        } catch (error) {
            console.error(
                "Forgot password error:",
                error
            );

            return res.status(500).json({
                message: "Server error"
            });
        }
    }
);

router.post(
    "/reset-password",
    async (req, res) => {
        try {
            const {
                token,
                newPassword,
                confirmPassword
            } = req.body;

            if (
                !token ||
                !newPassword ||
                !confirmPassword
            ) {
                return res.status(400).json({
                    message: "All fields are required"
                });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    message: "Passwords do not match"
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    message:
                        "Password must be at least 6 characters"
                });
            }

            const user = await User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: {
                    $gt: new Date()
                }
            });

            if (!user) {
                return res.status(400).json({
                    message:
                        "Invalid or expired reset link"
                });
            }

            const hashedPassword =
                await bcrypt.hash(newPassword, 10);

            user.password = hashedPassword;

            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;

            await user.save();

            return res.status(200).json({
                message:
                    "Password reset successfully"
            });

        } catch (error) {
            console.error(
                "Reset password error:",
                error
            );

            return res.status(500).json({
                message: "Server error"
            });
        }
    }
);
module.exports = router;
