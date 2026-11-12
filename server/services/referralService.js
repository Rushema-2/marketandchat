const Order = require("../models/Order");
const User = require("../models/User");
const ReferralReward = require("../models/ReferralReward");

const REFERRAL_REWARD_AMOUNT = 1000;

const awardReferralRewardForDeliveredOrder = async (order) => {
    if (!order || order.status !== "delivered") {
        return null;
    }

    const isPaid =
        order.paymentStatus === "successful" ||
        order.directPaymentStatus === "confirmed";

    if (!isPaid) {
        return null;
    }

    const referredUser = await User.findById(order.buyer)
        .select("referredBy");

    if (
        !referredUser ||
        !referredUser.referredBy ||
        String(referredUser.referredBy) === String(referredUser._id)
    ) {
        return null;
    }

    // Only the referred member's earliest successfully paid order qualifies.
    // It must be the exact order currently being confirmed as delivered.
    const firstPaidOrder = await Order.findOne({
        buyer: referredUser._id,
        $or: [
            { paymentStatus: "successful" },
            { directPaymentStatus: "confirmed" }
        ]
    })
        .sort({ createdAt: 1, _id: 1 })
        .select("_id");

    if (
        !firstPaidOrder ||
        String(firstPaidOrder._id) !== String(order._id)
    ) {
        return null;
    }

    try {
        return await ReferralReward.create({
            inviter: referredUser.referredBy,
            referredUser: referredUser._id,
            qualifyingOrder: order._id,
            amount: REFERRAL_REWARD_AMOUNT,
            currency: "RWF"
        });
    } catch (error) {
        // A unique referredUser record prevents a second reward.
        if (error.code === 11000) {
            return ReferralReward.findOne({
                referredUser: referredUser._id
            });
        }

        throw error;
    }
};

module.exports = {
    REFERRAL_REWARD_AMOUNT,
    awardReferralRewardForDeliveredOrder
};
