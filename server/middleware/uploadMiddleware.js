const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, "../.env"),
    override: true
});

const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const isVideo = file.mimetype.startsWith("video/");

        return {
            folder: isVideo ? "rwhatsapp/videos" : "rwhatsapp/images",
            resource_type: isVideo ? "video" : "image",
            public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
            allowed_formats: isVideo
                ? ["mp4", "mov", "webm", "avi"]
                : ["jpg", "jpeg", "png", "webp", "gif"]
        };
    }
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("video/")
    ) {
        return cb(null, true);
    }

    return cb(new Error("Only image and video files are allowed"), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024
    }
});

module.exports = upload;
