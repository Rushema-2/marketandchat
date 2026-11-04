const mongoose = require("mongoose");
const Video = require("../models/Video");

const allowedCategories = [
    "movies",
    "education",
    "music",
    "entertainment",
    "documentary",
    "sports",
    "news",
    "other"
];

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/videos
const getVideos = async (req, res) => {
    try {
        const {
            category,
            search,
            page = 1,
            limit = 12
        } = req.query;

        const filter = { status: "active" };

        if (category && allowedCategories.includes(category)) {
            filter.category = category;
        }

        if (search) {
            const searchRegex = {
                $regex: escapeRegex(String(search)),
                $options: "i"
            };

            filter.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { category: searchRegex }
            ];
        }

        const currentPage = Math.max(1, Number(page) || 1);
        const pageLimit = Math.min(50, Math.max(1, Number(limit) || 12));

        const [videos, total] = await Promise.all([
            Video.find(filter)
                .populate("owner", "firstName lastName")
                .sort({ createdAt: -1 })
                .skip((currentPage - 1) * pageLimit)
                .limit(pageLimit),

            Video.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            videos,
            pagination: {
                total,
                page: currentPage,
                limit: pageLimit,
                totalPages: Math.ceil(total / pageLimit)
            }
        });
    } catch (error) {
        console.error("Get videos error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get videos"
        });
    }
};

// GET /api/videos/mine
const getMyVideos = async (req, res) => {
    try {
        const { page = 1, limit = 12 } = req.query;

        const currentPage = Math.max(1, Number(page) || 1);
        const pageLimit = Math.min(50, Math.max(1, Number(limit) || 12));

        const filter = { owner: req.user.userId };

        const [videos, total] = await Promise.all([
            Video.find(filter)
                .populate("owner", "firstName lastName")
                .sort({ createdAt: -1 })
                .skip((currentPage - 1) * pageLimit)
                .limit(pageLimit),

            Video.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            videos,
            pagination: {
                total,
                page: currentPage,
                limit: pageLimit,
                totalPages: Math.ceil(total / pageLimit)
            }
        });
    } catch (error) {
        console.error("Get my videos error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get your videos"
        });
    }
};

// GET /api/videos/:id
const getVideoById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID"
            });
        }

        const video = await Video.findOneAndUpdate(
            {
                _id: req.params.id,
                status: "active"
            },
            {
                $inc: { views: 1 }
            },
            {
                new: true
            }
        ).populate("owner", "firstName lastName");

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            });
        }

        return res.status(200).json({
            success: true,
            video
        });
    } catch (error) {
        console.error("Get video details error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get video details"
        });
    }
};

// POST /api/videos
const createVideo = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            thumbnailUrl,
            allowDownload
        } = req.body;

        if (!title?.trim() || !category) {
            return res.status(400).json({
                success: false,
                message: "Video title and category are required"
            });
        }

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video category"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a video to upload"
            });
        }

        if (!req.file.mimetype?.startsWith("video/")) {
            return res.status(400).json({
                success: false,
                message: "Only video files are allowed"
            });
        }

        const video = await Video.create({
            owner: req.user.userId,
            title: title.trim(),
            description: description || "",
            category,
            videoUrl: req.file.path,
            thumbnailUrl: thumbnailUrl || "",
            allowDownload:
                allowDownload === true || allowDownload === "true"
        });

        await video.populate("owner", "firstName lastName");

        return res.status(201).json({
            success: true,
            message: "Video uploaded successfully",
            video
        });
    } catch (error) {
        console.error("Create video error:", error);
        return res.status(400).json({
            success: false,
            message: "Failed to upload video",
            error: error.message
        });
    }
};

// PUT /api/videos/:id
const updateVideo = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID"
            });
        }

        const video = await Video.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found or you are not its owner"
            });
        }

        const { title, description, category, thumbnailUrl, allowDownload, status } =
            req.body;

        if (title !== undefined) {
            if (!String(title).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Video title cannot be empty"
                });
            }
            video.title = String(title).trim();
        }

        if (description !== undefined) {
            video.description = description;
        }

        if (category !== undefined) {
            if (!allowedCategories.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid video category"
                });
            }
            video.category = category;
        }

        if (thumbnailUrl !== undefined) {
            video.thumbnailUrl = thumbnailUrl;
        }

        if (allowDownload !== undefined) {
            video.allowDownload =
                allowDownload === true || allowDownload === "true";
        }

        if (status !== undefined) {
            if (!["active", "hidden"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid video status"
                });
            }
            video.status = status;
        }

        await video.save();
        await video.populate("owner", "firstName lastName");

        return res.status(200).json({
            success: true,
            message: "Video updated successfully",
            video
        });
    } catch (error) {
        console.error("Update video error:", error);
        return res.status(400).json({
            success: false,
            message: "Failed to update video",
            error: error.message
        });
    }
};

// GET /api/videos/:id/download
const downloadVideo = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID"
            });
        }

        const video = await Video.findOne({
            _id: req.params.id,
            status: "active"
        });

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found"
            });
        }

        if (!video.allowDownload) {
            return res.status(403).json({
                success: false,
                message: "The owner has not allowed downloads for this video"
            });
        }

        const cloudinaryUrl = video.videoUrl;

        if (
            !cloudinaryUrl ||
            !cloudinaryUrl.startsWith("https://res.cloudinary.com/") ||
            !cloudinaryUrl.includes("/video/upload/")
        ) {
            return res.status(500).json({
                success: false,
                message: "Video download is currently unavailable"
            });
        }

        const downloadUrl = cloudinaryUrl.replace(
            "/video/upload/",
            "/video/upload/fl_attachment/"
        );

        return res.redirect(downloadUrl);
    } catch (error) {
        console.error("Download video error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to download video"
        });
    }
};

// DELETE /api/videos/:id
const deleteVideo = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video ID"
            });
        }

        const video = await Video.findOneAndDelete({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!video) {
            return res.status(404).json({
                success: false,
                message: "Video not found or you are not its owner"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Video deleted successfully"
        });
    } catch (error) {
        console.error("Delete video error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete video"
        });
    }
};

module.exports = {
    getVideos,
    getMyVideos,
    getVideoById,
    createVideo,
    updateVideo,
    downloadVideo,
    deleteVideo
};
