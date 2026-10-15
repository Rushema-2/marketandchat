const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/",
    authMiddleware,
    upload.array("files", 10),
    (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    message: "No files uploaded"
                });
            }

            const files = req.files.map((file) => {
                const folder = file.mimetype.startsWith("image/")
                    ? "images"
                    : "videos";

                return {
                    originalName: file.originalname,
                    filename: file.filename,
                    mimetype: file.mimetype,
                    size: file.size,
                    url: `/uploads/${folder}/${file.filename}`
                };
            });

            return res.status(201).json({
                message: "Files uploaded successfully",
                files
            });

        } catch (error) {
            console.error("Upload error:", error);

            return res.status(500).json({
                message: "Upload failed"
            });
        }
    }
);

module.exports = router;
