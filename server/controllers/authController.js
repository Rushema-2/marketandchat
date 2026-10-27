const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registerUser = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            password
        } = req.body;

        if (!firstName || !lastName || !email || !phone || !password) {
            return res.status(400).json({
                message: "Please fill all fields"
            });
        }

        const existingEmail = await User.findOne({ email });

        if (existingEmail) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        const existingPhone = await User.findOne({ phone });

        if (existingPhone) {
            return res.status(400).json({
                message: "Phone number already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            firstName,
            lastName,
            email,
            phone,
            password: hashedPassword
        });

        res.status(201).json({
            message: "Account created successfully",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role || "user"
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                userId: user._id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role || "user"
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


const googleLogin = async (req, res) => {
    try {
        const { credential, phone } = req.body || {};

        if (!credential) {
            return res.status(400).json({
                message: "Google credential is required"
            });
        }

        if (!process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET) {
            console.error("Google login configuration is missing");
            return res.status(500).json({
                message: "Google sign-in is not configured on the server"
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.sub || !payload.email ||
            payload.email_verified !== true) {
            return res.status(401).json({
                message: "Google account email must be verified"
            });
        }

        const email = payload.email.trim().toLowerCase();
        let user = await User.findOne({ email });

        if (!user) {
            if (!phone || !String(phone).trim()) {
                return res.status(200).json({
                    phoneRequired: true,
                    email,
                    firstName: payload.given_name || "",
                    lastName: payload.family_name || "",
                    message: "Enter your phone number to create your account"
                });
            }

            const cleanPhone = String(phone).trim();
            const existingPhone = await User.findOne({ phone: cleanPhone });

            if (existingPhone) {
                return res.status(409).json({
                    message: "Phone number already exists. Sign in to your existing account."
                });
            }

            const randomPassword = require("crypto").randomBytes(32).toString("hex");
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            const displayName = String(payload.name || "").trim().split(/\s+/);
            const firstName = String(payload.given_name || displayName[0] || "User").trim();
            const lastName = String(
                payload.family_name ||
                displayName.slice(1).join(" ") ||
                "Account"
            ).trim();

            user = await User.create({
                firstName,
                lastName,
                email,
                phone: cleanPhone,
                password: hashedPassword
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Google login successful",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role || "user"
            }
        });
    } catch (error) {
        console.error("Google login error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with these details already exists"
            });
        }

        return res.status(401).json({
            message: "Google sign-in could not be verified. Please try again."
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    googleLogin
};

