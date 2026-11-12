const jwt = require("jsonwebtoken");

const aiOptionalAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Guests may still use public NR AI capabilities.
    if (!authHeader) {
        return next();
    }

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Invalid authentication token."
        });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Invalid authentication token."
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired authentication token."
            });
        }

        req.user = {
            userId: String(decoded.userId)
        };

        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token."
        });
    }
};

module.exports = aiOptionalAuthMiddleware;
