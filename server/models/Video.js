const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        description: {
            type: String,
            trim: true,
            maxlength: 5000,
            default: ""
        },

        category: {
            type: String,
            required: true,
            enum: [
                "movies",
                "education",
                "music",
                "entertainment",
                "documentary",
                "sports",
                "news",
                "other"
            ],
            index: true
        },

        videoUrl: {
            type: String,
            required: true
        },

        thumbnailUrl: {
            type: String,
            default: ""
        },

        allowDownload: {
            type: Boolean,
            default: false
        },

        status: {
            type: String,
            enum: ["active", "hidden"],
            default: "active",
            index: true
        },

        views: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

videoSchema.index({ status: 1, category: 1, createdAt: -1 });
videoSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Video", videoSchema);
