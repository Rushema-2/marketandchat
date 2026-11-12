const User = require("../models/User");
const ReferralReward = require("../models/ReferralReward");
const { REFERRAL_REWARD_AMOUNT } = require("../services/referralService");

const getMyReferrals = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User account not found"
            });
        }

        // Older accounts receive a code the first time they open Referrals.
        if (!user.referralCode) {
            await user.save();
        }

        const rewards = await ReferralReward.find({
            inviter: user._id,
            status: "earned"
        })
            .populate("referredUser", "firstName lastName email")
            .populate("qualifyingOrder", "totalAmount currency createdAt")
            .sort({ createdAt: -1 })
            .lean();

        const totalEarned = rewards.reduce(
            (total, reward) => total + Number(reward.amount || 0),
            0
        );

        return res.status(200).json({
            referralCode: user.referralCode,
            rewardPerReferral: REFERRAL_REWARD_AMOUNT,
            currency: "RWF",
            totalEarned,
            successfulReferrals: rewards.length,
            rewards
        });
    } catch (error) {
        console.error("Get referrals error:", error);

        return res.status(500).json({
            message: "Could not load your referral information"
        });
    }
};

module.exports = {
    getMyReferrals
};
