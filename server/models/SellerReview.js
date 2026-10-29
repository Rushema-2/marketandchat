const mongoose = require("mongoose");

const sellerReviewSchema = new mongoose.Schema(
    {
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            validate: {
                validator: Number.isInteger,
                message: "Rating must be a whole number from 1 to 5."
            }
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 1500,
            default: ""
        }
    },
    { timestamps: true }
);

sellerReviewSchema.index({ seller: 1, buyer: 1 }, { unique: true });
sellerReviewSchema.index({ seller: 1, createdAt: -1 });

module.exports = mongoose.model("SellerReview", sellerReviewSchema);
