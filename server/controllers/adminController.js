const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Service = require("../models/Service");
const Video = require("../models/Video");

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
            ratingSummary,
            totalServices,
            activeServices,
            closedServices,
            hiddenServices,
            totalVideos,
            activeVideos,
            hiddenVideos
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
            ]),
            Service.countDocuments(),
            Service.countDocuments({ status: "active" }),
            Service.countDocuments({ status: "closed" }),
            Service.countDocuments({ status: "hidden" }),
            Video.countDocuments(),
            Video.countDocuments({ status: "active" }),
            Video.countDocuments({ status: "hidden" })
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
            },
            services: {
                total: totalServices,
                active: activeServices,
                closed: closedServices,
                hidden: hiddenServices
            },
            videos: {
                total: totalVideos,
                active: activeVideos,
                hidden: hiddenVideos
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

const getServices = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

        const [services, total] = await Promise.all([
            Service.find()
                .populate("owner", "firstName lastName email phone")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Service.countDocuments()
        ]);

        return res.status(200).json({
            services,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Admin services error:", error.message);
        return res.status(500).json({ message: "Unable to load services" });
    }
};

const getVideos = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));

        const [videos, total] = await Promise.all([
            Video.find()
                .populate("owner", "firstName lastName email")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Video.countDocuments()
        ]);

        return res.status(200).json({
            videos,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Admin videos error:", error.message);
        return res.status(500).json({ message: "Unable to load videos" });
    }
};


const updateStatus = async (req, res, Model, allowedStatuses, label) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!require("mongoose").Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid item ID" });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid ${label} status`,
                allowedStatuses
            });
        }

        const item = await Model.findByIdAndUpdate(
            id,
            { $set: { status } },
            { new: true, runValidators: true }
        );

        if (!item) {
            return res.status(404).json({ message: `${label} not found` });
        }

        return res.status(200).json({
            message: `${label} status updated successfully`,
            item
        });
    } catch (error) {
        console.error(`Admin ${label} status update error:`, error.message);
        return res.status(500).json({
            message: `Unable to update ${label} status`
        });
    }
};

const updateProductStatus = (req, res) =>
    updateStatus(req, res, Product, ["active", "hidden"], "Product");

const updateServiceStatus = (req, res) =>
    updateStatus(req, res, Service, ["active", "closed", "hidden"], "Service");

const updateVideoStatus = (req, res) =>
    updateStatus(req, res, Video, ["active", "hidden"], "Video");

module.exports = {
    getOverview,
    getUsers,
    getProducts,
    getOrders,
    getReviews,
    getServices,
    getVideos,
    updateProductStatus,
    updateServiceStatus,
    updateVideoStatus
};
