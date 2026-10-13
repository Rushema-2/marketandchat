const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
    {
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

        package: {
            type: String,
            enum: ["1_day", "7_days", "30_days"],
            required: true
        },

        amount: {
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

        status: {
            type: String,
           enum: [
    "pending",
    "paid",
    "active",
    "expired",
    "cancelled",
    "failed"
],
            default: "pending",
            index: true
        },

        paymentProvider: {
            type: String,
            default: null
        },

        transactionId: {
            type: String,
            default: null,
            index: true
        },

        startDate: {
            type: Date,
            default: null
        },

        endDate: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

promotionSchema.index({
    product: 1,
    status: 1
});

const Promotion =
    mongoose.model("Promotion", promotionSchema);

module.exports = Promotion;
