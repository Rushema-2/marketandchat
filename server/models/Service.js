const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: ["job", "service", "professional"],
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },

        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 3000
        },

        category: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 60,
            index: true
        },

        location: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
            index: true
        },

        phone: {
            type: String,
            trim: true,
            default: ""
        },

        price: {
            type: Number,
            min: 0,
            default: null
        },

        currency: {
            type: String,
            default: "RWF",
            trim: true
        },

        salary: {
            type: Number,
            min: 0,
            default: null
        },

        experience: {
            type: String,
            trim: true,
            maxlength: 100,
            default: ""
        },

        skills: {
            type: [String],
            default: []
        },

        images: {
            type: [String],
            default: []
        },

        status: {
            type: String,
            enum: ["active", "closed", "hidden"],
            default: "active",
            index: true
        }
    },
    {
        timestamps: true
    }
);

serviceSchema.index({ type: 1, status: 1, createdAt: -1 });
serviceSchema.index({ category: 1, location: 1, status: 1 });

module.exports = mongoose.model("Service", serviceSchema);
