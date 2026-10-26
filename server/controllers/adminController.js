const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");

const getOverview = async (req, res) => {
    try {
        const [
            totalUsers,
            totalAdmins,
            totalProducts,
            activeProducts,
            soldProducts,
            hiddenProducts,
            totalOrders,
            pendingOrders,
            completedOrders,
            totalReviews,
            ratingSummary
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "admin" }),
            Product.countDocuments(),
            Product.countDocuments({ status: "active" }),
            Product.countDocuments({ status: "sold" }),
            Product.countDocuments({ status: "hidden" }),
            Order.countDocuments(),
            Order.countDocuments({ status: "pending" }),
            Order.countDocuments({ status: "completed" }),
            Review.countDocuments(),
            Review.aggregate([
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" }
                    }
                }
            ])
        ]);

        return res.status(200).json({
            users: {
                total: totalUsers,
                admins: totalAdmins
            },
            products: {
                total: totalProducts,
                active: activeProducts,
                sold: soldProducts,
                hidden: hiddenProducts
            },
            orders: {
                total: totalOrders,
                pending: pendingOrders,
                completed: completedOrders
            },
            reviews: {
                total: totalReviews,
                averageRating: ratingSummary.length
                    ? Number(ratingSummary[0].averageRating.toFixed(2))
                    : 0
            }
        });
    } catch (error) {
        console.error("Admin overview error:", error.message);
        return res.status(500).json({
            message: "Unable to load admin overview"
        });
    }
};

const getUsers = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
        );

        const [users, total] = await Promise.all([
            User.find()
                .select("firstName lastName email phone role createdAt lastSeen")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            User.countDocuments()
        ]);

        return res.status(200).json({
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Admin users error:", error.message);
        return res.status(500).json({
            message: "Unable to load users"
        });
    }
};

const getProducts = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
        );

        const [products, total] = await Promise.all([
            Product.find()
                .populate("seller", "firstName lastName email")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Product.countDocuments()
        ]);

        return res.status(200).json({
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Admin products error:", error.message);
        return res.status(500).json({
            message: "Unable to load products"
        });
    }
};

const getOrders = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
        );

        const [orders, total] = await Promise.all([
            Order.find()
                .populate("buyer", "firstName lastName email")
                .populate("seller", "firstName lastName email")
                .populate("product", "title price currency")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Order.countDocuments()
        ]);

        return res.status(200).json({
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Admin orders error:", error.message);
        return res.status(500).json({
            message: "Unable to load orders"
        });
    }
};

const getReviews = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
        );

        const [reviews, total] = await Promise.all([
            Review.find()
                .populate("buyer", "firstName lastName")
                .populate("product", "title")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Review.countDocuments()
        ]);

        return res.status(200).json({
            reviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Admin reviews error:", error.message);
        return res.status(500).json({
            message: "Unable to load reviews"
        });
    }
};

module.exports = {
    getOverview,
    getUsers,
    getProducts,
    getOrders,
    getReviews
};
