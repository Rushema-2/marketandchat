const Product = require("../models/Product");
const User = require("../models/User");
const Notification = require("../models/Notification");

// ========================================
// CREATE PRODUCT
// ========================================

const createProduct = async (req, res) => {
    try {
        const {
            title,
            description,
            price,
            currency,
            category,
            images,
            video,
            location,
            condition,
            stock
        } = req.body;

        if (
            !title ||
            !description ||
            price === undefined ||
            !category
        ) {
            return res.status(400).json({
                message:
                    "title, description, price and category are required"
            });
        }

        const uploadedImages = (req.files?.images || []).map(
    (file) => `/uploads/images/${file.filename}`
);

const uploadedVideo = req.files?.video?.[0];

const productImages = [
    ...uploadedImages,
    ...(Array.isArray(images) ? images : [])
];

const productVideo = uploadedVideo
    ? `/uploads/videos/${uploadedVideo.filename}`
    : (video || null);

const product = await Product.create({
    seller: req.user.userId,
    title,
    description,
    price,
    currency: currency || "RWF",
    category,
    images: productImages,
    video: productVideo,
    location: location || "",
    condition: condition || "new",
    stock: stock === undefined ? 1 : stock
});

        const populatedProduct =
            await Product.findById(product._id)
                .populate(
                    "seller",
                    "firstName lastName email phone"
                );

        return res.status(201).json({
            message: "Product created successfully",
            product: populatedProduct
        });

    } catch (error) {
        console.error("Create product error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ========================================
// GET ALL PRODUCTS
// ========================================

const getProducts = async (req, res) => {
    try {
        const {
            search,
            category,
            page = 1,
            limit = 20
        } = req.query;

       const now = new Date();

const filter = {
    status: "active"
};
        if (category) {
            filter.category = category;
        }

        if (search) {
            filter.$text = {
                $search: search
            };
        }

        filter.$or = [
    {
        isPromoted: true,
        promotionEnd: {
            $gt: now
        }
    },
    {
        isPromoted: {
            $ne: true
        }
    }
];

        const skip =
            (Number(page) - 1) * Number(limit);

        const products =
    await Product.find(filter)
        .populate(
            "seller",
            "firstName lastName email phone"
        )
        .sort({
            isPromoted: -1,
            createdAt: -1
        })
        .skip(skip)
        .limit(Number(limit));

        const total =
            await Product.countDocuments(filter);

        return res.json({
            products,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(
                    total / Number(limit)
                )
            }
        });

    } catch (error) {
        console.error("Get products error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ========================================
// GET SINGLE PRODUCT
// ========================================

const getProduct = async (req, res) => {
    try {
        const product =
            await Product.findOne({
                _id: req.params.id,
                status: {
                    $ne: "hidden"
                }
            }).populate(
                "seller",
                "firstName lastName email phone"
            );

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        product.views += 1;
        await product.save();

        // Notify seller when another user views the product
        const viewerId = req.user?.userId;

        console.log(
            "PRODUCT VIEW DEBUG:",
            {
                viewerId: viewerId || null,
                sellerId: product.seller?._id || null
            }
        );

        if (
            viewerId &&
            String(product.seller._id) !==
            String(viewerId)
        ) {
            try {
                await Notification.create({
                    recipient: product.seller._id,
                    sender: viewerId,
                    type: "product_view",
                    message:
                        `Someone viewed your product: ${product.title}`,
                    relatedId: product._id
                });

                console.log(
                    "PRODUCT VIEW NOTIFICATION CREATED"
                );

            } catch (notificationError) {
                console.error(
                    "PRODUCT VIEW NOTIFICATION ERROR:",
                    notificationError
                );
            }
        }

        return res.json({
            product
        });

    } catch (error) {
        console.error("Get product error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ========================================
// GET MY PRODUCTS
// ========================================

const getMyProducts = async (req, res) => {
    try {
        const products =
            await Product.find({
                seller: req.user.userId
            }).sort({
                createdAt: -1
            });

        return res.json({
            products
        });

    } catch (error) {
        console.error("Get my products error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// ========================================
// GET SELLER PRODUCTS - PUBLIC PORTFOLIO
// ========================================

const getSellerProducts = async (req, res) => {
    try {

        const seller =
            await User.findById(
                req.params.sellerId
            ).select(
                "firstName lastName email phone"
            );

        if (!seller) {
            return res.status(404).json({
                message: "Seller not found"
            });
        }

        const products =
            await Product.find({
                seller: req.params.sellerId,
                status: "active"
            })
            .sort({
                createdAt: -1
            });

        return res.json({
            seller,
            products
        });

    } catch (error) {

        console.error(
            "Get seller products error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ========================================
// UPDATE PRODUCT
// ========================================

const updateProduct = async (req, res) => {
    try {
        const product =
            await Product.findOne({
                _id: req.params.id,
                seller: req.user.userId
            });

        if (!product) {
            return res.status(404).json({
                message:
                    "Product not found or you are not the owner"
            });
        }

        const allowedFields = [
            "title",
            "description",
            "price",
            "currency",
            "category",
            "images",
            "video",
            "location",
            "condition",
            "stock",
            "status"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                product[field] = req.body[field];
            }
        });

        const uploadedImages = (req.files?.images || []).map(
    (file) => `/uploads/images/${file.filename}`
);

if (uploadedImages.length > 0) {
    product.images = [
        ...(Array.isArray(product.images) ? product.images : []),
        ...uploadedImages
    ];
}

const uploadedVideo = req.files?.video?.[0];

if (uploadedVideo) {
    product.video = `/uploads/videos/${uploadedVideo.filename}`;
}

        await product.save();

        const updatedProduct =
            await Product.findById(product._id)
                .populate(
                    "seller",
                    "firstName lastName email phone"
                );

        return res.json({
            message: "Product updated successfully",
            product: updatedProduct
        });

    } catch (error) {
        console.error("Update product error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};



// ========================================
// DELETE PRODUCT
// ========================================

const deleteProduct = async (req, res) => {
    try {
        const product =
            await Product.findOneAndDelete({
                _id: req.params.id,
                seller: req.user.userId
            });

        if (!product) {
            return res.status(404).json({
                message:
                    "Product not found or you are not the owner"
            });
        }

        return res.json({
            message: "Product deleted successfully"
        });

    } catch (error) {
        console.error("Delete product error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    getMyProducts,
    getSellerProducts,
    updateProduct,
    deleteProduct
};