const Promotion = require("../models/Promotion");
const Product = require("../models/Product");
const promotionPlans =
    require("../config/promotionPlans");

const createPromotion = async (req, res) => {
    try {
        const {
            productId,
            package: packageName
        } = req.body;

        if (!productId || !packageName) {
            return res.status(400).json({
                message:
                    "Product ID and promotion package are required"
            });
        }

        const plan =
            promotionPlans[packageName];

        if (!plan) {
            return res.status(400).json({
                message:
                    "Invalid promotion package"
            });
        }

        const product =
            await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (
            String(product.seller) !==
            String(req.user.userId)
        ) {
            return res.status(403).json({
                message:
                    "You can only promote your own product"
            });
        }

        if (product.status !== "active") {
            return res.status(400).json({
                message:
                    "Only active products can be promoted"
            });
        }

        const existingPromotion =
            await Promotion.findOne({
                product: product._id,
                status: {
                    $in: [
                        "pending",
                        "active"
                    ]
                }
            });

        if (existingPromotion) {
            return res.status(400).json({
                message:
                    "This product already has an active or pending promotion"
            });
        }

        const promotion =
            await Promotion.create({
                seller: req.user.userId,
                product: product._id,
                package: packageName,
                amount: plan.amount,
                currency: plan.currency,
                status: "pending"
            });

        return res.status(201).json({
            message:
                "Promotion request created",
            promotion: {
                id: promotion._id,
                product: promotion.product,
                package: promotion.package,
                amount: promotion.amount,
                currency: promotion.currency,
                status: promotion.status
            }
        });

    } catch (error) {
        console.error(
            "Create promotion error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    createPromotion
};
