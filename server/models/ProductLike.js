const mongoose = require("mongoose");

const productLikeSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },

        user: {
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

productLikeSchema.index(
    {
        product: 1,
        user: 1
    },
    {
        unique: true
    }
);

const ProductLike =
    mongoose.model(
        "ProductLike",
        productLikeSchema
    );

module.exports = ProductLike;
