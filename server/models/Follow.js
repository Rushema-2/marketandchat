const mongoose = require("mongoose");

const followSchema = new mongoose.Schema(
    {
        follower: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        following: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Umuntu ntashobora gukurikira seller umwe inshuro nyinshi.
followSchema.index(
    {
        follower: 1,
        following: 1
    },
    {
        unique: true
    }
);


const Follow =
    mongoose.model(
        "Follow",
        followSchema
    );

module.exports = Follow;
