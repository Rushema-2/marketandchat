const Promotion = require("../models/Promotion");
const User = require("../models/User");
const { requestToPay } = require("../services/momoService");

const initiatePromotionPayment = async (req, res) => {
    try {
        const { promotionId } = req.params;

        if (!promotionId) {
            return res.status(400).json({
                message: "Promotion ID is required"
            });
        }

        const promotion = await Promotion.findById(promotionId);

        if (!promotion) {
            return res.status(404).json({
                message: "Promotion not found"
            });
        }

        if (
            String(promotion.seller) !==
            String(req.user.userId)
        ) {
            return res.status(403).json({
                message:
                    "You can only pay for your own promotion"
            });
        }

        if (promotion.status !== "pending") {
            return res.status(400).json({
                message:
                    "Only pending promotions can be paid"
            });
        }

        const user = await User.findById(req.user.userId)
            .select("phone");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (!user.phone) {
            return res.status(400).json({
                message:
                    "A phone number is required for payment"
            });
        }

        const externalId =
            `promotion_${promotion._id}`;

        try {
            const momoResult = await requestToPay({
                amount: promotion.amount,
                currency: promotion.currency,
                externalId,
                payerPhone: user.phone,
                payerMessage:
                    `Rwhatsapp promotion ${promotion.package}`,
                payeeNote:
                    `Rwhatsapp promotion ${promotion.package}`
            });

            promotion.paymentProvider = "mtn_momo";
            promotion.transactionId =
                momoResult.referenceId;

            await promotion.save();

            return res.status(202).json({
                message:
                    "Payment request sent to MTN MoMo",
                payment: {
                    promotionId: promotion._id,
                    amount: promotion.amount,
                    currency: promotion.currency,
                    payerPhone: user.phone,
                    paymentProvider: "mtn_momo",
                    referenceId:
                        momoResult.referenceId,
                    status: promotion.status
                }
            });

        } catch (momoError) {
            console.error(
    "MTN MoMo payment error:",
    momoError.response?.status,
    momoError.response?.data
);

            return res.status(502).json({
                message:
                    "MTN MoMo payment request failed",
                payment: {
                    promotionId: promotion._id,
                    amount: promotion.amount,
                    currency: promotion.currency,
                    paymentProvider: "mtn_momo",
                    status: promotion.status
                }
            });
        }

    } catch (error) {
        console.error(
            "Initiate promotion payment error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    initiatePromotionPayment
};
