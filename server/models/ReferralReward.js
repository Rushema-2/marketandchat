const mongoose = require("mongoose");

const referralRewardSchema = new mongoose.Schema(
    {
        inviter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        referredUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },
        qualifyingOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            unique: true
        },
        amount: {
            type: Number,
            required: true,
            default: 1000,
            min: 0
        },
        currency: {
            type: String,
            required: true,
            default: "RWF",
            uppercase: true,
            trim: true
        },
        status: {
            type: String,
            enum: ["earned", "reversed"],
            default: "earned",
            index: true
        }
    },
    {
        timestamps: true
    }
);

referralRewardSchema.index({ inviter: 1, createdAt: -1 });

module.exports = mongoose.model("ReferralReward", referralRewardSchema);
