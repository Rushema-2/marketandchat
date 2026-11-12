const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        firstName: {
            type: String,
            required: true,
            trim: true
        },

        lastName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

     paymentSettings: {

         mtnMomoNumber: { type: String, default: "" },

         airtelMoneyNumber: { type: String, default: "" },

         updatedAt: { type: Date, default: null }

     },


     password: {
    type: String,
    required: true
},

resetPasswordToken: {
    type: String,
    default: null
},

resetPasswordExpires: {
    type: Date,
    default: null
},

lastSeen: {
    type: Date,
    default: null
},

isVerifiedSeller: {
    type: Boolean,
    default: false
},

sellerVerifiedAt: {
    type: Date,
    default: null
},

sellerVerifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
},

referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
},

referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true
},

acquisitionSource: { type: String, default: null, maxlength: 100 },
acquisitionMedium: { type: String, default: null, maxlength: 100 },
acquisitionCampaign: { type: String, default: null, maxlength: 100 },
acquisitionContent: { type: String, default: null, maxlength: 100 },
acquisitionTerm: { type: String, default: null, maxlength: 100 },
acquisitionCapturedAt: { type: Date, default: null }

    },
    {
        timestamps: true
    }
);


userSchema.pre("validate", function () {
    if (!this.referralCode) {
        this.referralCode = crypto.randomBytes(5).toString("hex").toUpperCase();
    }
});

const User = mongoose.model("User", userSchema);

module.exports = User;
