const jwt = require("jsonwebtoken");

const optionalAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            return next();
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = {
            userId: decoded.userId
        };

        next();

    } catch (error) {
        // Public request can continue even if no valid token exists
        next();
    }
};

module.exports = optionalAuthMiddleware;
