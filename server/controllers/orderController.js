const Order = require("../models/Order");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");
const { requestToPay } = require("../services/momoService");
const {
    getPaymentStatus
} = require("../services/momoPaymentStatusService");

const COMMISSION_RATE = 5;

const createOrder = async (req, res) => {
    try {
        const buyerId = req.user.userId;

        const {
            productId,
            quantity
        } = req.body;

        if (!productId || !quantity) {
            return res.status(400).json({
                message: "Product and quantity are required"
            });
        }

        const requestedQuantity = Number(quantity);

        if (
            !Number.isInteger(requestedQuantity) ||
            requestedQuantity < 1
        ) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (product.status !== "active") {
            return res.status(400).json({
                message: "Product is not available"
            });
        }

        if (String(product.seller) === String(buyerId)) {
            return res.status(400).json({
                message: "You cannot buy your own product"
            });
        }

        if (product.stock < requestedQuantity) {
            return res.status(400).json({
                message: "Not enough stock available"
            });
        }

        const unitPrice = product.price;

        const totalAmount =
            unitPrice * requestedQuantity;

        const commissionAmount =
            Math.round(
                totalAmount * COMMISSION_RATE / 100
            );

        const sellerAmount =
            totalAmount - commissionAmount;

        const order = await Order.create({
            buyer: buyerId,
            seller: product.seller,
            product: product._id,
            quantity: requestedQuantity,
            unitPrice,
            totalAmount,
            currency: product.currency || "RWF",
            commissionRate: COMMISSION_RATE,
            commissionAmount,
            sellerAmount,
            status: "pending"
        });

        return res.status(201).json({
            message: "Order created successfully",
            order
        });

    } catch (error) {
        console.error(
            "Create order error:",
            error
        );

        return res.status(500).json({
            message: "Failed to create order"
        });
    }
};

const payOrder = async (req, res) => {
    try {
        const buyerId = req.user.userId;
        const { orderId } = req.params;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (String(order.buyer) !== String(buyerId)) {
            return res.status(403).json({
                message: "You are not allowed to pay for this order"
            });
        }

        if (order.status !== "pending") {
            return res.status(400).json({
                message: "Order is not pending"
            });
        }

        if (order.paymentStatus === "successful") {
            return res.status(400).json({
                message: "Order has already been paid"
            });
        }

        if (order.paymentReference && order.paymentStatus === "pending") {
            return res.status(200).json({
                message: "A payment request already exists for this order",
                orderId: order._id,
                paymentReference: order.paymentReference,
                paymentStatus: order.paymentStatus,
                paymentProvider: order.paymentProvider,
                alreadyInitiated: true
            });
        }

        const product = await Product.findById(order.product);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (product.status !== "active") {
            return res.status(400).json({
                message: "Product is no longer available"
            });
        }

        if (product.stock < order.quantity) {
            return res.status(400).json({
                message: "Not enough stock available"
            });
        }

        const buyer = await User.findById(buyerId);

        if (!buyer || !buyer.phone) {
            return res.status(400).json({
                message: "Buyer phone number is required for payment"
            });
        }

        const payment = await requestToPay({
            amount: order.totalAmount,
            currency: order.currency || "RWF",
            externalId: order._id,
            payerPhone: buyer.phone
        });

        order.paymentProvider = "mtn_momo";
        order.paymentReference = payment.referenceId;
        order.paymentStatus = "pending";

        await order.save();

        return res.status(200).json({
            message: "Payment request sent successfully",
            orderId: order._id,
            paymentReference: payment.referenceId,
            paymentStatus: order.paymentStatus,
            paymentProvider: order.paymentProvider
        });

    } catch (error) {
        console.error(
            "Pay order error:",
            error
        );

        return res.status(500).json({
            message: "Failed to initiate payment"
        });
    }
};

const checkOrderPayment = async (req, res) => {
    try {
        const buyerId = req.user.userId;
        const { orderId } = req.params;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (String(order.buyer) !== String(buyerId)) {
            return res.status(403).json({
                message: "You are not allowed to check this order"
            });
        }

        if (String(process.env.MOMO_ENV || "").toLowerCase() === "sandbox") {
            return res.status(409).json({
                message: "Sandbox payment cannot confirm a real purchase. No real payment has been verified.",
                paymentStatus: "sandbox",
                orderStatus: order.status
            });
        }

        if (!order.paymentReference) {
            return res.status(400).json({
                message: "Payment has not been initiated"
            });
        }

        if (order.paymentStatus === "successful") {
            return res.status(200).json({
                message: "Payment already confirmed",
                paymentStatus: "successful",
                orderStatus: order.status
            });
        }

        const momoStatus = await getPaymentStatus(
            order.paymentReference
        );

        const momoResult =
            String(momoStatus.status || "").toUpperCase();

        if (momoResult === "SUCCESSFUL") {
            const updatedProduct =
                await Product.findOneAndUpdate(
                    {
                        _id: order.product,
                        status: "active",
                        stock: {
                            $gte: order.quantity
                        }
                    },
                    {
                        $inc: {
                            stock: -order.quantity
                        }
                    },
                    {
                        new: true
                    }
                );

            if (!updatedProduct) {
                return res.status(409).json({
                    message:
                        "Payment was successful but stock is no longer available"
                });
            }

            order.paymentStatus = "successful";
            order.status = "paid";

            await order.save();

            if (updatedProduct.stock === 0) {
                updatedProduct.status = "sold";
                await updatedProduct.save();
            }

            return res.status(200).json({
                message: "Payment confirmed successfully",
                paymentStatus: "successful",
                orderStatus: "paid",
                remainingStock: updatedProduct.stock
            });
        }

        if (
            momoResult === "FAILED" ||
            momoResult === "REJECTED"
        ) {
            order.paymentStatus = "failed";

            await order.save();

            return res.status(200).json({
                message: "Payment failed",
                paymentStatus: "failed",
                orderStatus: order.status
            });
        }

        return res.status(200).json({
            message: "Payment is still pending",
            paymentStatus: "pending",
            momoStatus: momoStatus.status || "PENDING"
        });

    } catch (error) {
        console.error(
            "Check order payment error:",
            error
        );

        return res.status(500).json({
            message: "Failed to check payment status"
        });
    }
};


// GET SELLER PAYMENT DETAILS FOR THIS BUYER ORDER
const getDirectPaymentDetails = async (req, res) => {
    try {
        const buyerId = req.user.userId;
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (String(order.buyer) !== String(buyerId)) {
            return res.status(403).json({
                message: "You are not allowed to view these payment details"
            });
        }

        if (order.status !== "pending") {
            return res.status(400).json({
                message: "Direct payment is only available for pending orders"
            });
        }

        if (
            order.directPaymentStatus === "confirmed" ||
            order.directPaymentStatus === "confirming"
        ) {
            return res.status(409).json({
                message: "This order payment is already being processed or confirmed"
            });
        }

        const seller = await User.findById(order.seller)
            .select("firstName lastName paymentSettings");

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        const settings = seller.paymentSettings || {};
        const paymentMethods = [];

        if (settings.mtnMomoNumber) {
            paymentMethods.push({
                provider: "mtn_momo",
                label: "MTN MoMo",
                number: settings.mtnMomoNumber
            });
        }

        if (settings.airtelMoneyNumber) {
            paymentMethods.push({
                provider: "airtel_money",
                label: "Airtel Money",
                number: settings.airtelMoneyNumber
            });
        }

        return res.status(200).json({
            orderId: order._id,
            amount: order.totalAmount,
            currency: order.currency || "RWF",
            seller: {
                name: [seller.firstName, seller.lastName]
                    .filter(Boolean)
                    .join(" ")
            },
            paymentMethods,
            directPaymentStatus: order.directPaymentStatus || "not_started"
        });
    } catch (error) {
        console.error("Get direct payment details error:", error);
        return res.status(500).json({
            message: "Failed to load seller payment details"
        });
    }
};


// BUYER SUBMITS DIRECT PAYMENT REFERENCE
const submitDirectPayment = async (req, res) => {
    try {
        const buyerId = req.user.userId;
        const { orderId } = req.params;
        const provider = String(req.body.provider || "").trim();
        const reference = String(req.body.reference || "").trim();

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        if (!["mtn_momo", "airtel_money"].includes(provider)) {
            return res.status(400).json({
                message: "Choose MTN MoMo or Airtel Money"
            });
        }

        if (reference.length < 4 || reference.length > 80) {
            return res.status(400).json({
                message: "Transaction reference must contain 4 to 80 characters"
            });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (String(order.buyer) !== String(buyerId)) {
            return res.status(403).json({
                message: "You are not allowed to submit payment for this order"
            });
        }

        if (order.status !== "pending") {
            return res.status(400).json({
                message: "This order is no longer pending"
            });
        }

        if (
            order.directPaymentStatus === "confirmed" ||
            order.directPaymentStatus === "confirming"
        ) {
            return res.status(409).json({
                message: "Payment is already being processed or confirmed"
            });
        }

        const seller = await User.findById(order.seller)
            .select("paymentSettings");

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        const settings = seller.paymentSettings || {};
        const selectedNumber = provider === "mtn_momo"
            ? settings.mtnMomoNumber
            : settings.airtelMoneyNumber;

        if (!selectedNumber) {
            return res.status(400).json({
                message: "Seller has not configured this payment method"
            });
        }

        // Conditional update prevents simultaneous submissions from overwriting
        // a payment that has already entered confirmation.
        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: orderId,
                buyer: buyerId,
                status: "pending",
                directPaymentStatus: {
                    $in: ["not_started", "rejected"]
                }
            },
            {
                $set: {
                    directPaymentProvider: provider,
                    directPaymentReference: reference,
                    directPaymentStatus: "submitted",
                    directPaymentSubmittedAt: new Date(),
                    directPaymentConfirmedAt: null,
                    directPaymentRejectedAt: null,
                    directPaymentRejectionReason: ""
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedOrder) {
            return res.status(409).json({
                message: "Order changed while submitting payment. Please refresh and try again."
            });
        }

        return res.status(200).json({
            message: "Payment reference submitted. The seller must verify receipt.",
            orderId: updatedOrder._id,
            directPaymentProvider: updatedOrder.directPaymentProvider,
            directPaymentStatus: updatedOrder.directPaymentStatus,
            directPaymentReference: updatedOrder.directPaymentReference
        });
    } catch (error) {
        console.error("Submit direct payment error:", error);
        return res.status(500).json({
            message: "Failed to submit payment reference"
        });
    }
};


// SELLER CONFIRMS A BUYER'S DIRECT WALLET PAYMENT
const confirmDirectPayment = async (req, res) => {
    try {
        const sellerId = req.user.userId;
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        let order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (String(order.seller) !== String(sellerId)) {
            return res.status(403).json({
                message: "Only this product's seller can confirm payment"
            });
        }

        if (order.directPaymentStatus === "confirmed") {
            return res.status(200).json({
                message: "Payment was already confirmed",
                order
            });
        }

        if (order.status !== "pending") {
            return res.status(409).json({
                message: "This order is no longer pending"
            });
        }

        if (
            !order.directPaymentProvider ||
            !order.directPaymentReference ||
            !["submitted", "confirming"].includes(order.directPaymentStatus)
        ) {
            return res.status(409).json({
                message: "There is no submitted direct payment to confirm"
            });
        }

        // Check whether a previous attempt already deducted this order.
        let alreadyDeducted = await Product.exists({
            _id: order.product,
            stockDeductionOrderIds: order._id
        });

        // Only one request can claim a new submission.
        if (!alreadyDeducted && order.directPaymentStatus === "submitted") {
            const claimed = await Order.findOneAndUpdate(
                {
                    _id: orderId,
                    seller: sellerId,
                    status: "pending",
                    directPaymentStatus: "submitted"
                },
                {
                    $set: { directPaymentStatus: "confirming" }
                },
                { new: true }
            );

            if (!claimed) {
                return res.status(409).json({
                    message: "Another request is processing this payment. Refresh and try again."
                });
            }

            order = claimed;
        }

        // Seller must verify the actual wallet receipt before this operation.
        // The Product update is atomic: only one request can deduct this order.
        if (!alreadyDeducted) {
            const product = await Product.findOneAndUpdate(
                {
                    _id: order.product,
                    status: "active",
                    stock: { $gte: order.quantity },
                    stockDeductionOrderIds: { $ne: order._id }
                },
                {
                    $inc: { stock: -order.quantity },
                    $addToSet: { stockDeductionOrderIds: order._id }
                },
                { new: true }
            );

            if (!product) {
                // Another concurrent request may already have deducted stock.
                alreadyDeducted = Boolean(await Product.exists({
                    _id: order.product,
                    stockDeductionOrderIds: order._id
                }));

                if (!alreadyDeducted) {
                    await Order.updateOne(
                        {
                            _id: order._id,
                            directPaymentStatus: "confirming"
                        },
                        {
                            $set: { directPaymentStatus: "submitted" }
                        }
                    );

                    return res.status(409).json({
                        message: "Insufficient stock or product unavailable. Payment was not confirmed."
                    });
                }
            } else if (product.stock === 0) {
                await Product.updateOne(
                    { _id: product._id, stock: 0 },
                    { $set: { status: "sold" } }
                );
            }
        }

        // Finalize. A retry after a crash sees the recorded deduction above
        // and reaches this step without decrementing stock a second time.
        const confirmedOrder = await Order.findOneAndUpdate(
            {
                _id: order._id,
                seller: sellerId,
                status: "pending",
                directPaymentStatus: "confirming"
            },
            {
                $set: {
                    directPaymentStatus: "confirmed",
                    directPaymentConfirmedAt: new Date(),
                    directPaymentRejectedAt: null,
                    directPaymentRejectionReason: "",
                    status: "paid"
                }
            },
            { new: true }
        );

        if (!confirmedOrder) {
            // A concurrent request may have completed confirmation first.
            const latestOrder = await Order.findById(order._id);

            if (
                latestOrder &&
                String(latestOrder.seller) === String(sellerId) &&
                latestOrder.directPaymentStatus === "confirmed"
            ) {
                return res.status(200).json({
                    message: "Payment was already confirmed",
                    order: latestOrder
                });
            }

            return res.status(409).json({
                message: "Stock deduction is recorded. Refresh the order to check its confirmation status."
            });
        }

        return res.status(200).json({
            message: "Direct payment confirmed and stock updated",
            order: confirmedOrder
        });
    } catch (error) {
        console.error("Confirm direct payment error:", error);
        return res.status(500).json({
            message: "Failed to confirm direct payment. Refresh and retry if needed."
        });
    }
};


// SELLER REJECTS A BUYER'S DIRECT PAYMENT SUBMISSION
const rejectDirectPayment = async (req, res) => {
    try {
        const sellerId = req.user.userId;
        const { orderId } = req.params;
        const reason = String(req.body.reason || "").trim();

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        if (reason.length < 3 || reason.length > 300) {
            return res.status(400).json({
                message: "Rejection reason must contain 3 to 300 characters"
            });
        }

        const order = await Order.findOneAndUpdate(
            {
                _id: orderId,
                seller: sellerId,
                status: "pending",
                directPaymentStatus: "submitted"
            },
            {
                $set: {
                    directPaymentStatus: "rejected",
                    directPaymentRejectedAt: new Date(),
                    directPaymentRejectionReason: reason
                }
            },
            { new: true, runValidators: true }
        );

        if (!order) {
            const existing = await Order.findById(orderId);

            if (!existing) {
                return res.status(404).json({ message: "Order not found" });
            }

            if (String(existing.seller) !== String(sellerId)) {
                return res.status(403).json({
                    message: "Only this product's seller can reject payment"
                });
            }

            return res.status(409).json({
                message: "Only a submitted payment can be rejected"
            });
        }

        return res.status(200).json({
            message: "Payment submission rejected",
            order
        });
    } catch (error) {
        console.error("Reject direct payment error:", error);
        return res.status(500).json({
            message: "Failed to reject direct payment"
        });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const buyerId = req.user.userId;

        const orders = await Order.find({
            buyer: buyerId
        })
        .populate(
            "product",
            "title price currency images status"
        )
        .populate(
            "seller",
            "firstName lastName"
        )
        .sort({
            createdAt: -1
        });

        return res.status(200).json({
            orders
        });

    } catch (error) {
        console.error(
            "Get my orders error:",
            error
        );

        return res.status(500).json({
            message: "Failed to load orders"
        });
    }
};

const getMySales = async (req, res) => {
    try {
        const sellerId = req.user.userId;

        const orders = await Order.find({
            seller: sellerId
        })
        .populate(
            "product",
            "title price currency images status"
        )
        .populate(
            "buyer",
            "firstName lastName"
        )
        .sort({
            createdAt: -1
        });

        return res.status(200).json({
            orders
        });

    } catch (error) {
        console.error(
            "Get my sales error:",
            error
        );

        return res.status(500).json({
            message: "Failed to load sales"
        });
    }
};

const getSalesSummary = async (req, res) => {
    try {
        const sellerId = req.user.userId;

        const summary = await Order.aggregate([
            {
                $match: {
                    seller: new mongoose.Types.ObjectId(sellerId),
                    status: {
                        $in: ["paid", "completed"]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: {
                        $sum: "$totalAmount"
                    },
                    totalCommission: {
                        $sum: "$commissionAmount"
                    },
                    totalEarnings: {
                        $sum: "$sellerAmount"
                    },
                    totalOrders: {
                        $sum: 1
                    }
                }
            }
        ]);

        const result = summary[0] || {
            totalSales: 0,
            totalCommission: 0,
            totalEarnings: 0,
            totalOrders: 0
        };

        return res.status(200).json({
            summary: {
                totalSales: result.totalSales,
                totalCommission: result.totalCommission,
                totalEarnings: result.totalEarnings,
                totalOrders: result.totalOrders
            }
        });

    } catch (error) {
        console.error(
            "Get sales summary error:",
            error
        );

        return res.status(500).json({
            message: "Failed to load sales summary"
        });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        if (String(process.env.MOMO_ENV || "").toLowerCase() === "sandbox") {
            return res.status(409).json({
                message: "Sandbox mode: real order fulfillment is disabled.",
                paymentMode: "sandbox"
            });
        }

        const sellerId = req.user.userId;
        const { orderId } = req.params;
        const { status } = req.body;

        const allowedStatuses = [
            "processing",
            "shipped",
            "completed"
        ];

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message:
                    "Invalid status. Use processing, shipped, or completed."
            });
        }

        const order = await Order.findOne({
            _id: orderId,
            seller: sellerId
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (status === "processing") {
            if (order.status !== "paid") {
                return res.status(400).json({
                    message:
                        "Only paid orders can be moved to processing."
                });
            }
        }

        if (status === "shipped") {
            if (order.status !== "processing") {
                return res.status(400).json({
                    message:
                        "Only processing orders can be marked as shipped."
                });
            }
        }

        if (status === "completed") {
            if (order.status !== "processing") {
                return res.status(400).json({
                    message:
                        "Only processing orders can be completed."
                });
            }
        }

        order.status = status;

        await order.save();

        return res.status(200).json({
            message: "Order status updated successfully",
            order
        });

    } catch (error) {
        console.error(
            "Update order status error:",
            error
        );

        return res.status(500).json({
            message: "Failed to update order status"
        });
    }
};

const confirmOrderDelivered = async (req, res) => {
    try {
        if (String(process.env.MOMO_ENV || "").toLowerCase() === "sandbox") {
            return res.status(409).json({
                message: "Sandbox mode: real order fulfillment is disabled.",
                paymentMode: "sandbox"
            });
        }

        const buyerId = req.user.userId;
        const { orderId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        const order = await Order.findOne({
            _id: orderId,
            buyer: buyerId
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const isDirectPaymentConfirmed =
            order.directPaymentStatus === "confirmed";

        if (
            order.paymentStatus !== "successful" &&
            !isDirectPaymentConfirmed
        ) {
            return res.status(400).json({
                message: "Order must be paid before delivery confirmation."
            });
        }

        if (order.status !== "shipped") {
            return res.status(400).json({
                message: "Only shipped orders can be marked as delivered."
            });
        }

        order.status = "delivered";
        await order.save();

        return res.status(200).json({
            message: "Delivery confirmed successfully",
            order
        });
    } catch (error) {
        console.error("Confirm delivery error:", error);

        return res.status(500).json({
            message: "Failed to confirm delivery"
        });
    }
};

module.exports = {
    createOrder,
    payOrder,
    checkOrderPayment,
    getMyOrders,
    getMySales,
    getSalesSummary,
    updateOrderStatus,
    confirmOrderDelivered,
    getDirectPaymentDetails,
    submitDirectPayment,
    confirmDirectPayment,
    rejectDirectPayment
};