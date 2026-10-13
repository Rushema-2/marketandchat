const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        buyer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },

        totalAmount: {
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

        commissionRate: {
            type: Number,
            default: 5,
            min: 0,
            max: 100
        },

        commissionAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        sellerAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        paymentProvider: {
            type: String,
            enum: ["mtn_momo", null],
            default: null
        },

        paymentReference: {
            type: String,
            default: null,
            index: true
        },

        paymentStatus: {
            type: String,
            enum: [
                "pending",
                "successful",
                "failed"
            ],
            default: "pending"
        },

        status: {
            type: String,
            enum: [
                "pending",
                "paid",
                "processing",
                "shipped",
                "delivered",
                "completed",
                "cancelled",
                "refunded"
            ],
            default: "pending",
            index: true
        }
    },
    {
        timestamps: true
    }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
