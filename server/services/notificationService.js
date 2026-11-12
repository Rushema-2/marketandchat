const Notification = require("../models/Notification");

let io = null;
let onlineUsers = null;

const configureNotificationDelivery = (socketServer, connectedUsers) => {
    io = socketServer;
    onlineUsers = connectedUsers;
};

const createAndSendNotification = async (notificationData) => {
    try {
        const notification = await Notification.create(notificationData);

        const populatedNotification = await Notification
            .findById(notification._id)
            .populate("sender", "firstName lastName email");

        const recipientSockets = onlineUsers?.get(
            String(notificationData.recipient)
        );

        if (io && recipientSockets) {
            for (const socketId of recipientSockets) {
                io.to(socketId).emit(
                    "newNotification",
                    populatedNotification
                );
            }
        }

        return populatedNotification;
    } catch (error) {
        console.error("Notification delivery error:", error);
        return null;
    }
};

module.exports = {
    configureNotificationDelivery,
    createAndSendNotification
};
