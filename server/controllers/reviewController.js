const mongoose = require("mongoose");
const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");

const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID." });
        }

        const productExists = await Product.exists({
            _id: productId,
            status: { $ne: "hidden" }
        });

        if (!productExists) {
            return res.status(404).json({ message: "Product not found." });
        }

        const reviews = await Review.find({ product: productId })
            .populate("buyer", "firstName lastName")
            .sort({ createdAt: -1 })
            .lean();

        const total = reviews.length;
        const averageRating = total
            ? Math.round(
                (reviews.reduce((sum, review) => sum + review.rating, 0) / total) * 10
              ) / 10
            : 0;

        let myReview = null;
        let eligibleOrders = [];

        if (req.user?.userId && mongoose.isValidObjectId(req.user.userId)) {
            myReview = reviews.find(
                review => String(review.buyer?._id || review.buyer) === String(req.user.userId)
            ) || null;

            // Only paid orders whose delivery was explicitly confirmed qualify.
            if (!myReview) {
                eligibleOrders = await Order.find({
                    buyer: req.user.userId,
                    product: productId,
                    paymentStatus: "successful",
                    status: "delivered"
                })
                    .select("_id createdAt")
                    .sort({ createdAt: -1 })
                    .lean();
            }
        }

        return res.json({
            reviews,
            averageRating,
            reviewCount: total,
            myReview,
            eligibleOrders,
            canReview: eligibleOrders.length > 0 || Boolean(myReview)
        });
    } catch (error) {
        console.error("Get product reviews error:", error);
        return res.status(500).json({ message: "Could not load product reviews." });
    }
};

const saveProductReview = async (req, res) => {
    try {
        const { productId } = req.params;
        const buyerId = req.user?.userId;
        const rating = Number(req.body.rating);
        const comment = typeof req.body.comment === "string"
            ? req.body.comment.trim()
            : "";
        const orderId = req.body.orderId;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({ message: "Invalid product ID." });
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Choose a rating from 1 to 5 stars." });
        }

        if (comment.length > 1500) {
            return res.status(400).json({ message: "Review must be 1500 characters or fewer." });
        }

        const productExists = await Product.exists({
            _id: productId,
            status: { $ne: "hidden" }
        });

        if (!productExists) {
            return res.status(404).json({ message: "Product not found." });
        }

        let review = await Review.findOne({
            product: productId,
            buyer: buyerId
        });

        if (!review) {
            if (!mongoose.isValidObjectId(orderId)) {
                return res.status(403).json({
                    message: "A delivered, successfully paid order is required to review this product."
                });
            }

            const eligibleOrder = await Order.findOne({
                _id: orderId,
                buyer: buyerId,
                product: productId,
                paymentStatus: "successful",
                status: "delivered"
            }).select("_id");

            if (!eligibleOrder) {
                return res.status(403).json({
                    message: "Only buyers with a successfully paid and delivered order can review this product."
                });
            }

            review = new Review({
                product: productId,
                buyer: buyerId,
                order: eligibleOrder._id,
                rating,
                comment
            });
        } else {
            // Existing reviewers can edit their own review.
            review.rating = rating;
            review.comment = comment;
        }

        await review.save();
        await review.populate("buyer", "firstName lastName");

        return res.status(200).json({
            message: "Review saved successfully.",
            review
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You have already reviewed this product. Refresh and edit your existing review."
            });
        }

        console.error("Save product review error:", error);
        return res.status(500).json({ message: "Could not save your review." });
    }
};

module.exports = {
    getProductReviews,
    saveProductReview
};
