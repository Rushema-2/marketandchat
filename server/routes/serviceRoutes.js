const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const imageUpload = upload.imageUpload;

const {
    getServices,
    getMyServices,
    getServiceById,
    createService,
    updateService,
    uploadServiceImages,
    deleteService
} = require("../controllers/serviceController");

const router = express.Router();

// Public routes
router.get("/", getServices);

// Protected route: must come before /:id
router.get("/mine", authMiddleware, getMyServices);

// Public service details
router.get("/:id", getServiceById);

// Protected management routes
router.post("/", authMiddleware, createService);
router.post("/:id/images", authMiddleware, imageUpload.array("images", 6), uploadServiceImages);
router.put("/:id", authMiddleware, updateService);
router.delete("/:id", authMiddleware, deleteService);

module.exports = router;
