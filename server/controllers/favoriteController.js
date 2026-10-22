const mongoose = require("mongoose");
const Favorite = require("../models/Favorite");
const Product = require("../models/Product");
const Review = require("../models/Review");

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

    const validFavorites = favorites.filter((favorite) => favorite.product);
    const productIds = validFavorites.map((favorite) => favorite.product._id);

    const summaries = productIds.length
      ? await Review.aggregate([
          { $match: { product: { $in: productIds } } },
          {
            $group: {
              _id: "$product",
              averageRating: { $avg: "$rating" },
              reviewCount: { $sum: 1 },
            },
          },
        ])
      : [];

    const summaryByProduct = new Map(
      summaries.map((item) => [
        String(item._id),
        {
          averageRating: Math.round(item.averageRating * 10) / 10,
          reviewCount: item.reviewCount,
        },
      ])
    );

    return res.json({
      favorites: validFavorites.map((favorite) => {
        const product = favorite.product;
        const summary = summaryByProduct.get(String(product._id));

        return {
          _id: favorite._id,
          createdAt: favorite.createdAt,
          product: {
            ...product.toObject(),
            averageRating: summary?.averageRating ?? 0,
            reviewCount: summary?.reviewCount ?? 0,
          },
        };
      }),
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
