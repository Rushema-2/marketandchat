const mongoose = require("mongoose");
const SellerReview = require("../models/SellerReview");
const Order = require("../models/Order");
const User = require("../models/User");

const getSellerReviews = async (req, res) => {
    try {
        const { sellerId } = req.params;

        if (!mongoose.isValidObjectId(sellerId)) {
            return res.status(400).json({ message: "Invalid seller ID." });
        }

        const sellerExists = await User.exists({ _id: sellerId });
        if (!sellerExists) {
            return res.status(404).json({ message: "Seller not found." });
        }

        const reviews = await SellerReview.find({ seller: sellerId })
            .populate("buyer", "firstName lastName")
            .sort({ createdAt: -1 })
            .lean();

        const reviewCount = reviews.length;
        const averageRating = reviewCount
            ? Math.round(
                reviews.reduce((sum, review) => sum + review.rating, 0) /
                reviewCount * 10
              ) / 10
            : 0;

        const buyerId = req.user?.userId;
        const myReview = buyerId
            ? reviews.find(review =>
                String(review.buyer?._id || review.buyer) === String(buyerId)
              ) || null
            : null;

        let eligibleOrders = [];
        if (buyerId && !myReview && String(buyerId) !== String(sellerId)) {
            eligibleOrders = await Order.find({
                buyer: buyerId,
                seller: sellerId,
                paymentStatus: "successful",
                status: { $in: ["delivered", "completed"] }
            })
                .select("_id createdAt")
                .sort({ createdAt: -1 })
                .lean();
        }

        return res.json({
            reviews,
            averageRating,
            reviewCount,
            myReview,
            eligibleOrders,
            canReview: Boolean(myReview || eligibleOrders.length)
        });
    } catch (error) {
        console.error("Get seller reviews error:", error);
        return res.status(500).json({
            message: "Could not load seller reviews."
        });
    }
};

const saveSellerReview = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const buyerId = req.user?.userId;
        const rating = Number(req.body.rating);
        const comment = typeof req.body.comment === "string"
            ? req.body.comment.trim()
            : "";
        const orderId = req.body.orderId;

        if (!mongoose.isValidObjectId(sellerId)) {
            return res.status(400).json({ message: "Invalid seller ID." });
        }

        if (String(buyerId) === String(sellerId)) {
            return res.status(403).json({
                message: "You cannot review your own seller account."
            });
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                message: "Choose a rating from 1 to 5 stars."
            });
        }

        if (comment.length > 1500) {
            return res.status(400).json({
                message: "Review must be 1500 characters or fewer."
            });
        }

        const sellerExists = await User.exists({ _id: sellerId });
        if (!sellerExists) {
            return res.status(404).json({ message: "Seller not found." });
        }

        let review = await SellerReview.findOne({
            seller: sellerId,
            buyer: buyerId
        });

        if (!review) {
            if (!mongoose.isValidObjectId(orderId)) {
                return res.status(403).json({
                    message: "A successfully paid and delivered order from this seller is required."
                });
            }

            const eligibleOrder = await Order.findOne({
                _id: orderId,
                buyer: buyerId,
                seller: sellerId,
                paymentStatus: "successful",
                status: { $in: ["delivered", "completed"] }
            }).select("_id");

            if (!eligibleOrder) {
                return res.status(403).json({
                    message: "Only buyers with a successfully paid and delivered order from this seller can review them."
                });
            }

            review = new SellerReview({
                seller: sellerId,
                buyer: buyerId,
                order: eligibleOrder._id,
                rating,
                comment
            });
        } else {
            review.rating = rating;
            review.comment = comment;
        }

        await review.save();
        await review.populate("buyer", "firstName lastName");

        return res.json({
            message: "Seller review saved successfully.",
            review
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You have already reviewed this seller. Refresh and edit your existing review."
            });
        }

        console.error("Save seller review error:", error);
        return res.status(500).json({
            message: "Could not save seller review."
        });
    }
};

module.exports = { getSellerReviews, saveSellerReview };
