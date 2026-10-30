const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        seller: {
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
            required: true,
            trim: true,
            maxlength: 5000
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        currency: {
            type: String,
            default: "RWF",
            trim: true,
            uppercase: true
        },

        category: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        images: {
            type: [String],
            default: []
        },

        video: {
            type: String,
            default: null
        },

        location: {
            type: String,
            trim: true,
            default: ""
        },

        condition: {
            type: String,
            enum: ["new", "used", "refurbished"],
            default: "new"
        },

        stock: {
            type: Number,
            default: 1,
            min: 0
        },

        // Order IDs already deducted from stock through direct payment.
        // This makes seller confirmation safe to retry.
        stockDeductionOrderIds: {
            type: [{
                type: mongoose.Schema.Types.ObjectId
            }],
            default: []
        },

        status: {
            type: String,
            enum: ["active", "sold", "hidden"],
            default: "active",
            index: true
        },

        isPromoted: {
            type: Boolean,
            default: false,
            index: true
        },

        promotionStart: {
            type: Date,
            default: null
        },

        promotionEnd: {
            type: Date,
            default: null
        },

        promotionPackage: {
            type: String,
            enum: ["1_day", "7_days", "30_days", null],
            default: null
        },

        views: {
            type: Number,
            default: 0
        },

        likes: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

productSchema.index({
    title: "text",
    description: "text",
    category: "text"
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
