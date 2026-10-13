const mongoose = require("mongoose");

const Notification =
    require("../models/Notification");

const getNotifications = async (req, res) => {
    try {
        const notifications =
            await Notification.find({
                recipient: req.user.userId
            })
                .populate(
                    "sender",
                    "firstName lastName email"
                )
                .sort({
                    createdAt: -1
                })
                .limit(50);

        return res.json({
            notifications
        });
    } catch (error) {
        console.error(
            "Get notifications error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const unreadCount =
            await Notification.countDocuments({
                recipient: req.user.userId,
                read: false
            });

        return res.json({
            unreadCount
        });
    } catch (error) {
        console.error(
            "Get unread notifications error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const markAsRead = async (req, res) => {
    try {
        const notificationId =
            req.params.id;

        if (
            !mongoose.Types.ObjectId.isValid(
                notificationId
            )
        ) {
            return res.status(400).json({
                message: "Invalid notification ID"
            });
        }

        const notification =
            await Notification.findOneAndUpdate(
                {
                    _id: notificationId,
                    recipient: req.user.userId
                },
                {
                    read: true
                },
                {
                    new: true
                }
            );

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        return res.json({
            message: "Notification marked as read",
            notification
        });
    } catch (error) {
        console.error(
            "Mark notification read error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            {
                recipient: req.user.userId,
                read: false
            },
            {
                read: true
            }
        );

        return res.json({
            message:
                "All notifications marked as read"
        });
    } catch (error) {
        console.error(
            "Mark all notifications read error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
