const multer = require("multer");
const path = require("path");
const fs = require("fs");

const imagesDir = path.join(__dirname, "../../client/uploads/images");
const videosDir = path.join(__dirname, "../../client/uploads/videos");

fs.mkdirSync(imagesDir, { recursive: true });
fs.mkdirSync(videosDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, imagesDir);
        } else if (file.mimetype.startsWith("video/")) {
            cb(null, videosDir);
        } else {
            cb(new Error("Only image and video files are allowed"));
        }
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);

        const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("video/")
    ) {
        cb(null, true);
    } else {
        cb(new Error("Only image and video files are allowed"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024
    }
});

module.exports = upload;
