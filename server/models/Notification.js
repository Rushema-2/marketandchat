const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        type: {
            type: String,
            enum: [
                "follow",
                "message",
                "product_like",
                "product_view"
            ],
            required: true
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },

        read: {
            type: Boolean,
            default: false,
            index: true
        },

        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        }
    },
    {
        timestamps: true
    }
);

notificationSchema.index({
    recipient: 1,
    createdAt: -1
});

const Notification =
    mongoose.model(
        "Notification",
        notificationSchema
    );

module.exports = Notification;
