const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Service = require("../models/Service");
const Video = require("../models/Video");

const getPerformance = async (req, res) => {
    try {
        const snapshot = require("../services/performanceMonitoringService")
            .getPerformanceSnapshot();

        const databaseState = require("mongoose").connection.readyState;
        const databaseStatuses = {
            0: "disconnected",
            1: "connected",
            2: "connecting",
            3: "disconnecting"
        };

        return res.status(200).json({
            server: {
                status: "running",
                ...snapshot
            },
            database: {
                status: databaseStatuses[databaseState] || "unknown",
                connected: databaseState === 1
            }
        });
    } catch (error) {
        console.error("Admin performance monitoring error:", error.message);
        return res.status(500).json({
            message: "Unable to load performance monitoring"
        });
    }
};

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
                    $match: {
                        $or: [
                            { status: "active" },
                            { status: { $exists: false } }
                        ]
                    }
                },
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


const getAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() - 29);

        const paidMatch = {
            $or: [
                { paymentStatus: "successful" },
                { directPaymentStatus: "confirmed" }
            ]
        };

        const [
            userDaily,
            orderDaily,
            paidDaily,
            salesByCurrency,
            productCategories,
            topViewedProducts,
            serviceTypes,
            videoActivity,
            acquisitionRegistrations,
            acquisitionSales
        ] = await Promise.all([
            User.aggregate([
                { $match: { createdAt: { $gte: start } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt",
                                timezone: "UTC"
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: start } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt",
                                timezone: "UTC"
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: start }, ...paidMatch } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt",
                                timezone: "UTC"
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: start }, ...paidMatch } },
                {
                    $group: {
                        _id: { $ifNull: ["$currency", "RWF"] },
                        orderCount: { $sum: 1 },
                        salesValue: { $sum: "$totalAmount" },
                        platformCommission: { $sum: "$commissionAmount" }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Product.aggregate([
                { $match: { status: "active" } },
                {
                    $group: {
                        _id: { $ifNull: ["$category", "Other"] },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 8 }
            ]),
            Product.find({ status: "active" })
                .select("title category views likes")
                .sort({ views: -1, createdAt: -1 })
                .limit(8)
                .lean(),
            Service.aggregate([
                { $match: { createdAt: { $gte: start } } },
                {
                    $group: {
                        _id: "$type",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),
            Video.aggregate([
                { $match: { createdAt: { $gte: start } } },
                {
                    $group: {
                        _id: null,
                        uploaded: { $sum: 1 },
                        recordedViews: { $sum: { $ifNull: ["$views", 0] } }
                    }
                }
            ]),
            User.aggregate([
                {
                    $match: {
                        createdAt: { $gte: start },
                        acquisitionSource: { $nin: [null, ""] }
                    }
                },
                {
                    $group: {
                        _id: {
                            source: "$acquisitionSource",
                            medium: "$acquisitionMedium",
                            campaign: "$acquisitionCampaign"
                        },
                        registrations: { $sum: 1 }
                    }
                },
                { $sort: { registrations: -1 } },
                { $limit: 20 }
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: start }, ...paidMatch } },
                {
                    $lookup: {
                        from: User.collection.name,
                        localField: "buyer",
                        foreignField: "_id",
                        as: "buyerInfo"
                    }
                },
                { $unwind: "$buyerInfo" },
                {
                    $match: {
                        "buyerInfo.acquisitionSource": { $nin: [null, ""] }
                    }
                },
                {
                    $group: {
                        _id: {
                            source: "$buyerInfo.acquisitionSource",
                            medium: "$buyerInfo.acquisitionMedium",
                            campaign: "$buyerInfo.acquisitionCampaign",
                            currency: { $ifNull: ["$currency", "RWF"] }
                        },
                        paidOrders: { $sum: 1 },
                        paidBuyers: { $addToSet: "$buyer" },
                        salesValue: { $sum: "$totalAmount" },
                        platformCommission: { $sum: "$commissionAmount" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        source: "$_id.source",
                        medium: "$_id.medium",
                        campaign: "$_id.campaign",
                        currency: "$_id.currency",
                        paidOrders: 1,
                        paidBuyers: { $size: "$paidBuyers" },
                        salesValue: 1,
                        platformCommission: 1
                    }
                },
                { $sort: { paidOrders: -1 } },
                { $limit: 20 }
            ])
        ]);

        const daily = new Map();

        for (let offset = 0; offset < 30; offset += 1) {
            const date = new Date(start);
            date.setUTCDate(start.getUTCDate() + offset);
            const key = date.toISOString().slice(0, 10);
            daily.set(key, {
                date: key,
                users: 0,
                orders: 0,
                paidOrders: 0
            });
        }

        for (const item of userDaily) {
            if (daily.has(item._id)) daily.get(item._id).users = item.count;
        }

        for (const item of orderDaily) {
            if (daily.has(item._id)) daily.get(item._id).orders = item.count;
        }

        for (const item of paidDaily) {
            if (daily.has(item._id)) daily.get(item._id).paidOrders = item.count;
        }

        return res.status(200).json({
            period: {
                start: start.toISOString(),
                end: now.toISOString(),
                days: 30
            },
            daily: Array.from(daily.values()),
            paidSales: salesByCurrency.map(item => ({
                currency: item._id,
                orders: item.orderCount,
                salesValue: item.salesValue,
                platformCommission: item.platformCommission
            })),
            acquisition: {
                registrations: acquisitionRegistrations.map(item => ({
                    source: item._id.source,
                    medium: item._id.medium,
                    campaign: item._id.campaign,
                    registrations: item.registrations
                })),
                paidSales: acquisitionSales
            },
            productCategories: productCategories.map(item => ({
                category: item._id,
                products: item.count
            })),
            topViewedProducts: topViewedProducts.map(item => ({
                id: item._id,
                title: item.title,
                category: item.category,
                views: Number(item.views || 0),
                likes: Array.isArray(item.likes) ? item.likes.length : 0
            })),
            services: {
                created: serviceTypes.reduce((sum, item) => sum + item.count, 0),
                byType: serviceTypes.map(item => ({
                    type: item._id || "other",
                    count: item.count
                }))
            },
            videos: {
                uploaded: videoActivity[0]?.uploaded || 0,
                recordedViews: videoActivity[0]?.recordedViews || 0
            }
        });
    } catch (error) {
        console.error("Admin analytics error:", error.message);
        return res.status(500).json({
            message: "Unable to load admin analytics"
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
                .select("firstName lastName email phone role createdAt lastSeen isVerifiedSeller sellerVerifiedAt")
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

const updateSellerVerification = async (req, res) => {
    try {
        const { id } = req.params;
        const { isVerifiedSeller } = req.body;

        if (!require("mongoose").Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        if (typeof isVerifiedSeller !== "boolean") {
            return res.status(400).json({
                message: "isVerifiedSeller must be true or false"
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role === "admin") {
            return res.status(400).json({
                message: "Admin accounts cannot receive seller verification"
            });
        }

        user.isVerifiedSeller = isVerifiedSeller;
        user.sellerVerifiedAt = isVerifiedSeller ? new Date() : null;
        user.sellerVerifiedBy = isVerifiedSeller ? req.user.userId : null;

        await user.save();

        return res.status(200).json({
            message: isVerifiedSeller
                ? "Seller verified successfully"
                : "Seller verification revoked successfully",
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                isVerifiedSeller: user.isVerifiedSeller,
                sellerVerifiedAt: user.sellerVerifiedAt
            }
        });
    } catch (error) {
        console.error("Admin seller verification error:", error.message);
        return res.status(500).json({
            message: "Unable to update seller verification"
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

        const normalizedReviews = reviews.map(review => ({
            ...review,
            status: review.status || "active"
        }));

        return res.status(200).json({
            reviews: normalizedReviews,
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

const updateReviewStatus = (req, res) =>
    updateStatus(req, res, Review, ["active", "hidden"], "Review");

module.exports = {
    getPerformance,
    getAnalytics,
    getOverview,
    getUsers,
    updateSellerVerification,
    getProducts,
    getOrders,
    getReviews,
    getServices,
    getVideos,
    updateProductStatus,
    updateServiceStatus,
    updateVideoStatus,
    updateReviewStatus
};
