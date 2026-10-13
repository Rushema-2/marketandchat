const express = require("express");

const authMiddleware =
    require("../middleware/authMiddleware");

const {
    followUser,
    unfollowUser,
    getFollowStatus,
    getFollowersCount
} = require("../controllers/followController");

const router =
    express.Router();


// ========================================
// FOLLOW / UNFOLLOW
// ========================================

router.post(
    "/:userId",
    authMiddleware,
    followUser
);

router.delete(
    "/:userId",
    authMiddleware,
    unfollowUser
);


// ========================================
// FOLLOW STATUS
// ========================================

router.get(
    "/:userId/status",
    authMiddleware,
    getFollowStatus
);


// ========================================
// PUBLIC FOLLOWERS COUNT
// ========================================

router.get(
    "/:userId/count",
    getFollowersCount
);


module.exports = router;
