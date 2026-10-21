const mongoose = require("mongoose");
const Favorite = require("../models/Favorite");
const Product = require("../models/Product");

async function getFavorites(req, res) {
  try {
    const favorites = await Favorite.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "product",
        match: { status: "active" },
        populate: {
          path: "seller",
          select: "firstName lastName email phone",
        },
      });

    return res.json({
      favorites: favorites
        .filter((favorite) => favorite.product)
        .map((favorite) => ({
          _id: favorite._id,
          createdAt: favorite.createdAt,
          product: favorite.product,
        })),
    });
  } catch (error) {
    console.error("Get favorites error:", error);
    return res.status(500).json({ message: "Could not load favorites." });
  }
}

async function addFavorite(req, res) {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const product = await Product.findOne({
      _id: productId,
      status: "active",
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found or unavailable.",
      });
    }

    await Favorite.updateOne(
      { user: req.user.userId, product: productId },
      { $setOnInsert: { user: req.user.userId, product: productId } },
      { upsert: true }
    );

    return res.json({
      message: "Product added to favorites.",
      productId,
      isFavorite: true,
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    return res.status(500).json({
      message: "Could not add product to favorites.",
    });
  }
}

async function removeFavorite(req, res) {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    await Favorite.deleteOne({
      user: req.user.userId,
      product: productId,
    });

    return res.json({
      message: "Product removed from favorites.",
      productId,
      isFavorite: false,
    });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return res.status(500).json({
      message: "Could not remove product from favorites.",
    });
  }
}

module.exports = { getFavorites, addFavorite, removeFavorite };
