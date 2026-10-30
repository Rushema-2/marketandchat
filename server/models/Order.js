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

        directPaymentProvider: {
            type: String,
            enum: ["mtn_momo", "airtel_money", null],
            default: null
        },

        directPaymentReference: {
            type: String,
            trim: true,
            default: null
        },

        directPaymentStatus: {
            type: String,
            enum: [
                "not_started",
                "submitted",
                "confirming",
                "confirmed",
                "rejected"
            ],
            default: "not_started",
            index: true
        },

        directPaymentSubmittedAt: {
            type: Date,
            default: null
        },

        directPaymentConfirmedAt: {
            type: Date,
            default: null
        },

        directPaymentRejectedAt: {
            type: Date,
            default: null
        },

        directPaymentRejectionReason: {
            type: String,
            trim: true,
            default: ""
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
