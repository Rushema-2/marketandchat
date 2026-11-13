const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const Video = require("../models/Video");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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

const allowedFormats = ["mp4", "mov", "webm", "avi"];

const DEFAULT_MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const CHUNK_SIZE = 20 * 1024 * 1024;

const getMaxVideoBytes = () => {
    const configured = Number(process.env.NEXUS_TV_MAX_VIDEO_BYTES);

    return Number.isSafeInteger(configured) && configured > 0
        ? configured
        : DEFAULT_MAX_VIDEO_BYTES;
};

const hasCloudinaryCredentials = () =>
    Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

// POST /api/videos/upload/sign
const createVideoUploadSignature = async (req, res) => {
    try {
        if (!hasCloudinaryCredentials()) {
            return res.status(503).json({
                success: false,
                message: "Video uploads are temporarily unavailable."
            });
        }

        const userId = String(req.user.userId);

        const timestamp = Math.floor(Date.now() / 1000);
        const publicId = `rwhatsapp/videos/${userId}/${crypto.randomUUID()}`;

        const signatureParams = {
            public_id: publicId,
            timestamp
        };

        const signature = cloudinary.utils.api_sign_request(
            signatureParams,
            process.env.CLOUDINARY_API_SECRET
        );

        return res.status(200).json({
            success: true,
            upload: {
                cloudName: process.env.CLOUDINARY_CLOUD_NAME,
                apiKey: process.env.CLOUDINARY_API_KEY,
                timestamp,
                publicId,
                signature,
                uploadId: crypto.randomUUID(),
                chunkSize: CHUNK_SIZE,
                maxVideoBytes: getMaxVideoBytes()
            }
        });
    } catch (error) {
        console.error("Create video upload signature error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not prepare the video upload."
        });
    }
};

// POST /api/videos/upload/finalize
const finalizeVideoUpload = async (req, res) => {
    try {
        const {
            publicId,
            expectedBytes,
            title,
            description,
            category,
            thumbnailUrl,
            allowDownload
        } = req.body;

        if (
            !Number.isSafeInteger(expectedBytes) ||
            expectedBytes <= 0 ||
            expectedBytes > getMaxVideoBytes()
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid original video file size is required."
            });
        }

        const userId = String(req.user.userId);
        const expectedPrefix = `rwhatsapp/videos/${userId}/`;

        if (
            typeof publicId !== "string" ||
            !publicId.startsWith(expectedPrefix) ||
            !/^[a-f0-9-]{36}$/.test(publicId.slice(expectedPrefix.length))
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid video upload reference."
            });
        }

        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 150 ||
            typeof category !== "string" ||
            !allowedCategories.includes(category)
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid video title and category are required."
            });
        }

        if (
            description !== undefined &&
            (typeof description !== "string" || description.length > 5000)
        ) {
            return res.status(400).json({
                success: false,
                message: "Video description must not exceed 5000 characters."
            });
        }

        if (
            thumbnailUrl &&
            (
                typeof thumbnailUrl !== "string" ||
                !/^https:\/\//i.test(thumbnailUrl)
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid video thumbnail URL."
            });
        }

        if (!hasCloudinaryCredentials()) {
            return res.status(503).json({
                success: false,
                message: "Video verification is temporarily unavailable."
            });
        }

        const resource = await cloudinary.api.resource(publicId, {
            resource_type: "video"
        });

        if (
            resource.public_id !== publicId ||
            resource.resource_type !== "video" ||
            !resource.secure_url ||
            Number(resource.bytes) !== expectedBytes
        ) {
            return res.status(400).json({
                success: false,
                message: "The uploaded video could not be verified."
            });
        }

        if (!allowedFormats.includes(String(resource.format).toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: "Only MP4, MOV, WEBM and AVI videos are supported."
            });
        }

        if (
            !Number.isSafeInteger(Number(resource.bytes)) ||
            Number(resource.bytes) <= 0 ||
            Number(resource.bytes) > getMaxVideoBytes()
        ) {
            return res.status(413).json({
                success: false,
                message: "This video exceeds the configured upload size limit."
            });
        }

        // Make finalization safe to retry without creating duplicate records.
        const existingVideo = await Video.findOne({
            owner: userId,
            videoUrl: resource.secure_url
        }).populate("owner", "firstName lastName");

        if (existingVideo) {
            return res.status(200).json({
                success: true,
                message: "This video has already been published.",
                video: existingVideo
            });
        }

        const video = await Video.create({
            owner: userId,
            title: title.trim(),
            description: description || "",
            category,
            videoUrl: resource.secure_url,
            thumbnailUrl: thumbnailUrl || "",
            allowDownload:
                allowDownload === true || allowDownload === "true"
        });

        await video.populate("owner", "firstName lastName");

        return res.status(201).json({
            success: true,
            message: "Video uploaded successfully.",
            video
        });
    } catch (error) {
        if (error.http_code === 404 || error.error?.http_code === 404) {
            return res.status(404).json({
                success: false,
                message: "The uploaded video was not found in Cloudinary."
            });
        }

        console.error("Finalize video upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not verify and publish the uploaded video."
        });
    }
};

module.exports = {
    createVideoUploadSignature,
    finalizeVideoUpload
};
