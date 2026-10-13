const mongoose = require("mongoose");

const Follow =
    require("../models/Follow");

    const Notification =
    require("../models/Notification");

const User =
    require("../models/User");


// ========================================
// FOLLOW SELLER
// ========================================

const followUser = async (req, res) => {

    try {

        const followerId =
            req.user.userId;

        const followingId =
            req.params.userId;

        if (
            String(followerId) ===
            String(followingId)
        ) {
            return res.status(400).json({
                message:
                    "You cannot follow yourself"
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(
                followingId
            )
        ) {
            return res.status(400).json({
                message:
                    "Invalid user ID"
            });
        }

        const user =
            await User.findById(
                followingId
            );

        if (!user) {
            return res.status(404).json({
                message:
                    "User not found"
            });
        }

        const existingFollow =
            await Follow.findOne({
                follower: followerId,
                following: followingId
            });

        if (existingFollow) {
            return res.status(409).json({
                message:
                    "Already following this user"
            });
        }

        await Follow.create({
            follower: followerId,
            following: followingId
        });

        await Notification.create({
    recipient: followingId,
    sender: followerId,
    type: "follow",
    message: "Someone started following you",
    relatedId: followerId
});

        const followersCount =
            await Follow.countDocuments({
                following: followingId
            });

        return res.status(201).json({
            message:
                "User followed successfully",
            following: true,
            followersCount
        });

    } catch (error) {

        console.error(
            "Follow user error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error"
        });
    }
};


// ========================================
// UNFOLLOW SELLER
// ========================================

const unfollowUser = async (req, res) => {

    try {

        const followerId =
            req.user.userId;

        const followingId =
            req.params.userId;

        const result =
            await Follow.deleteOne({
                follower: followerId,
                following: followingId
            });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message:
                    "You are not following this user"
            });
        }

        const followersCount =
            await Follow.countDocuments({
                following: followingId
            });

        return res.json({
            message:
                "User unfollowed successfully",
            following: false,
            followersCount
        });

    } catch (error) {

        console.error(
            "Unfollow user error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error"
        });
    }
};


// ========================================
// FOLLOW STATUS
// ========================================

const getFollowStatus = async (req, res) => {

    try {

        const followerId =
            req.user.userId;

        const followingId =
            req.params.userId;

        const follow =
            await Follow.findOne({
                follower: followerId,
                following: followingId
            });

        const followersCount =
            await Follow.countDocuments({
                following: followingId
            });

        return res.json({
            following: !!follow,
            followersCount
        });

    } catch (error) {

        console.error(
            "Get follow status error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error"
        });
    }
};


// ========================================
// FOLLOWERS COUNT - PUBLIC
// ========================================

const getFollowersCount = async (req, res) => {

    try {

        const userId =
            req.params.userId;

        if (
            !mongoose.Types.ObjectId.isValid(
                userId
            )
        ) {
            return res.status(400).json({
                message:
                    "Invalid user ID"
            });
        }

        const user =
            await User.findById(
                userId
            ).select("_id");

        if (!user) {
            return res.status(404).json({
                message:
                    "User not found"
            });
        }

        const followersCount =
            await Follow.countDocuments({
                following: userId
            });

        return res.json({
            followersCount
        });

    } catch (error) {

        console.error(
            "Get followers count error:",
            error
        );

        return res.status(500).json({
            message:
                "Server error"
        });
    }
};


module.exports = {
    followUser,
    unfollowUser,
    getFollowStatus,
    getFollowersCount
};
