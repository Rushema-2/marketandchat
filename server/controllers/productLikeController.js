const mongoose = require("mongoose");

const Notification = require("../models/Notification");
const Product =
    require("../models/Product");

const ProductLike =
    require("../models/ProductLike");

// LIKE PRODUCT
const likeProduct = async (req, res) => {
    try {
        const productId =
            req.params.productId;

        const userId =
            req.user.userId;

        if (
            !mongoose.Types.ObjectId.isValid(
                productId
            )
        ) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const product =
            await Product.findById(
                productId
            );

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        const existingLike =
            await ProductLike.findOne({
                product: productId,
                user: userId
            });

        if (existingLike) {
            return res.status(409).json({
                message: "Product already liked",
                liked: true,
                likes: product.likes
            });
        }

        await ProductLike.create({
            product: productId,
            user: userId
        });

        product.likes =
            (product.likes || 0) + 1;

        await product.save();

        if (
            String(product.seller) !==
            String(userId)
        ) {
            await Notification.create({
                recipient: product.seller,
                sender: userId,
                type: "product_like",
                message:
                    `Someone liked your product: ${product.title}`,
                relatedId: product._id
            });
        }

        return res.status(201).json({
            message: "Product liked successfully",
            liked: true,
            likes: product.likes
        });

    } catch (error) {
        console.error(
            "Like product error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// GET LIKE STATUS
const getLikeStatus = async (req, res) => {
    try {
        const productId =
            req.params.productId;

        const userId =
            req.user.userId;

        if (
            !mongoose.Types.ObjectId.isValid(
                productId
            )
        ) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const product =
            await Product.findById(
                productId
            ).select("_id likes");

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        const like =
            await ProductLike.findOne({
                product: productId,
                user: userId
            });

        return res.json({
            liked: !!like,
            likes: product.likes || 0
        });

    } catch (error) {
        console.error(
            "Get like status error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// UNLIKE PRODUCT
const unlikeProduct = async (req, res) => {
    try {
        const productId =
            req.params.productId;

        const userId =
            req.user.userId;

        if (
            !mongoose.Types.ObjectId.isValid(
                productId
            )
        ) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const product =
            await Product.findById(
                productId
            );

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        const result =
            await ProductLike.deleteOne({
                product: productId,
                user: userId
            });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Product is not liked"
            });
        }

        product.likes =
            Math.max(
                0,
                (product.likes || 0) - 1
            );

        await product.save();

        return res.json({
            message: "Product unliked successfully",
            liked: false,
            likes: product.likes
        });

    } catch (error) {
        console.error(
            "Unlike product error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    likeProduct,
    unlikeProduct,
    getLikeStatus
};
