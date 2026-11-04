const mongoose = require("mongoose");
const Service = require("../models/Service");

const allowedTypes = ["job", "service", "professional"];

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/services
const getServices = async (req, res) => {
    try {
        const {
            type,
            category,
            location,
            search,
            page = 1,
            limit = 12
        } = req.query;

        const filter = { status: "active" };

        if (type && allowedTypes.includes(type)) {
            filter.type = type;
        }

        if (category) {
            filter.category = {
                $regex: escapeRegex(String(category)),
                $options: "i"
            };
        }

        if (location) {
            filter.location = {
                $regex: escapeRegex(String(location)),
                $options: "i"
            };
        }

        if (search) {
            const searchRegex = {
                $regex: escapeRegex(String(search)),
                $options: "i"
            };

            filter.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { category: searchRegex },
                { location: searchRegex },
                { skills: searchRegex }
            ];
        }

        const currentPage = Math.max(1, Number(page) || 1);
        const pageLimit = Math.min(50, Math.max(1, Number(limit) || 12));

        const [services, total] = await Promise.all([
            Service.find(filter)
                .populate("owner", "firstName lastName phone")
                .sort({ createdAt: -1 })
                .skip((currentPage - 1) * pageLimit)
                .limit(pageLimit),

            Service.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            services,
            pagination: {
                total,
                page: currentPage,
                limit: pageLimit,
                totalPages: Math.ceil(total / pageLimit)
            }
        });
    } catch (error) {
        console.error("Get services error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get services",
            error: error.message
        });
    }
};

// GET /api/services/mine
const getMyServices = async (req, res) => {
    try {
        const { page = 1, limit = 12 } = req.query;
        const currentPage = Math.max(1, Number(page) || 1);
        const pageLimit = Math.min(50, Math.max(1, Number(limit) || 12));
        const filter = { owner: req.user.userId };

        const [services, total] = await Promise.all([
            Service.find(filter)
                .populate("owner", "firstName lastName phone")
                .sort({ createdAt: -1 })
                .skip((currentPage - 1) * pageLimit)
                .limit(pageLimit),
            Service.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            services,
            pagination: {
                total,
                page: currentPage,
                limit: pageLimit,
                totalPages: Math.ceil(total / pageLimit)
            }
        });
    } catch (error) {
        console.error("Get my services error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get your services",
            error: error.message
        });
    }
};

// GET /api/services/:id
const getServiceById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID"
            });
        }

        const service = await Service.findOne({
            _id: req.params.id,
            status: "active"
        }).populate("owner", "firstName lastName phone");

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        return res.status(200).json({
            success: true,
            service
        });
    } catch (error) {
        console.error("Get service details error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get service details",
            error: error.message
        });
    }
};

// POST /api/services
const createService = async (req, res) => {
    try {
        const {
            type,
            title,
            description,
            category,
            location,
            phone,
            price,
            salary,
            experience,
            skills,
            images
        } = req.body;

        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Type must be job, service or professional"
            });
        }

        if (
            !title?.trim() ||
            !description?.trim() ||
            !category?.trim() ||
            !location?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Title, description, category and location are required"
            });
        }

        const service = await Service.create({
            owner: req.user.userId,
            type,
            title,
            description,
            category,
            location,
            phone,
            price: price === "" || price == null ? null : Number(price),
            salary: salary === "" || salary == null ? null : Number(salary),
            experience,
            skills: Array.isArray(skills) ? skills : [],
            images: Array.isArray(images) ? images : []
        });

        await service.populate("owner", "firstName lastName phone");

        return res.status(201).json({
            success: true,
            message: "Service listing created successfully",
            service
        });
    } catch (error) {
        console.error("Create service error:", error);
        return res.status(400).json({
            success: false,
            message: "Failed to create service listing",
            error: error.message
        });
    }
};

// PUT /api/services/:id
const updateService = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID"
            });
        }

        const service = await Service.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found or you are not its owner"
            });
        }

        const allowedFields = [
            "type",
            "title",
            "description",
            "category",
            "location",
            "phone",
            "price",
            "salary",
            "experience",
            "skills",
            "images",
            "status"
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                service[field] = req.body[field];
            }
        }

        await service.save();
        await service.populate("owner", "firstName lastName phone");

        return res.status(200).json({
            success: true,
            message: "Service listing updated successfully",
            service
        });
    } catch (error) {
        console.error("Update service error:", error);
        return res.status(400).json({
            success: false,
            message: "Failed to update service listing",
            error: error.message
        });
    }
};

// POST /api/services/:id/images
const uploadServiceImages = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID"
            });
        }

        const service = await Service.findOne({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found or you are not its owner"
            });
        }

        const uploadedImages = (req.files || []).map((file) => file.path);

        if (uploadedImages.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one image"
            });
        }

        const existingImages = Array.isArray(service.images)
            ? service.images
            : [];

        if (existingImages.length + uploadedImages.length > 6) {
            return res.status(400).json({
                success: false,
                message: "A service listing can have a maximum of 6 images"
            });
        }

        service.images = [...existingImages, ...uploadedImages];
        await service.save();
        await service.populate("owner", "firstName lastName phone");

        return res.status(200).json({
            success: true,
            message: "Service images uploaded successfully",
            service
        });
    } catch (error) {
        console.error("Upload service images error:", error);
        return res.status(400).json({
            success: false,
            message: "Failed to upload service images",
            error: error.message
        });
    }
};

// DELETE /api/services/:id
const deleteService = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID"
            });
        }

        const service = await Service.findOneAndDelete({
            _id: req.params.id,
            owner: req.user.userId
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found or you are not its owner"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service listing deleted successfully"
        });
    } catch (error) {
        console.error("Delete service error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete service listing",
            error: error.message
        });
    }
};

module.exports = {
    getServices,
    getMyServices,
    getServiceById,
    createService,
    updateService,
    uploadServiceImages,
    deleteService
};
