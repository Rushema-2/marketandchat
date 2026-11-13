const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { videoUpload } = require("../middleware/uploadMiddleware");
const {
    createVideoUploadSignature,
    finalizeVideoUpload
} = require("../controllers/videoUploadController");

const {
    getVideos,
    getMyVideos,
    getVideoById,
    createVideo,
    updateVideo,
    downloadVideo,
    deleteVideo
} = require("../controllers/videoController");

const router = express.Router();

// Public video feed
router.get("/", getVideos);

// Owner's videos - must come before /:id
router.get("/mine", authMiddleware, getMyVideos);

// Signed, chunked Cloudinary uploads
router.post("/upload/sign", authMiddleware, createVideoUploadSignature);
router.post("/upload/finalize", authMiddleware, finalizeVideoUpload);

// Download permission is checked by the controller
router.get("/:id/download", downloadVideo);

// Public video details
router.get("/:id", getVideoById);

// Upload and management require login
router.post(
    "/",
    authMiddleware,
    videoUpload.single("video"),
    createVideo
);

router.put("/:id", authMiddleware, updateVideo);
router.delete("/:id", authMiddleware, deleteVideo);

module.exports = router;
