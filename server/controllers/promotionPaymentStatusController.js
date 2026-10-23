const Promotion = require("../models/Promotion");
const Product = require("../models/Product");
const { getPaymentStatus } =
    require("../services/momoPaymentStatusService");

const checkPromotionPaymentStatus = async (req, res) => {
    try {
        const { promotionId } = req.params;

        if (!promotionId) {
            return res.status(400).json({
                message: "Promotion ID is required"
            });
        }

        const promotion = await Promotion.findById(
            promotionId
        );

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
                    "You can only check your own promotion payment"
            });
        }

        if (!promotion.transactionId) {
            return res.status(400).json({
                message:
                    "No MTN payment reference found"
            });
        }

        const momoStatus = await getPaymentStatus(
            promotion.transactionId
        );

        const momoPaymentStatus =
            momoStatus.status;

        // Sandbox results must never mutate real promotion records.
        if (
            String(process.env.MOMO_ENV || "").toLowerCase() === "sandbox" &&
            ["SUCCESSFUL", "FAILED"].includes(momoPaymentStatus)
        ) {
            return res.status(409).json({
                message:
                    "Sandbox payment status is simulated. The promotion was not changed.",
                payment: {
                    promotionId: promotion._id,
                    status: promotion.status,
                    momoStatus: momoPaymentStatus,
                    paymentMode: "sandbox"
                }
            });
        }

        if (momoPaymentStatus === "SUCCESSFUL") {
            // Do not restart an already activated promotion.
            if (promotion.status === "active" &&
                promotion.startDate &&
                promotion.endDate) {
                return res.status(200).json({
                    message: "Promotion is already active",
                    payment: {
                        promotionId: promotion._id,
                        status: promotion.status,
                        momoStatus: momoPaymentStatus,
                        promotionStart: promotion.startDate,
                        promotionEnd: promotion.endDate,
                        promotionPackage: promotion.package
                    }
                });
            }

            // Only a pending promotion can be activated by this payment.
            if (promotion.status !== "pending") {
                return res.status(409).json({
                    message: "Promotion is not pending and cannot be activated",
                    payment: {
                        promotionId: promotion._id,
                        status: promotion.status,
                        momoStatus: momoPaymentStatus
                    }
                });
            }

            const durationDays = {
                "1_day": 1,
                "7_days": 7,
                "30_days": 30
            }[promotion.package];

            if (!durationDays) {
                return res.status(500).json({
                    message: "Invalid promotion package"
                });
            }

            const now = new Date();
            const endDate = new Date(now);
            endDate.setDate(endDate.getDate() + durationDays);

            promotion.status = "active";
            promotion.startDate = now;
            promotion.endDate = endDate;

            await promotion.save();

            await Product.findByIdAndUpdate(
                promotion.product,
                {
                    isPromoted: true,
                    promotionStart: now,
                    promotionEnd: endDate,
                    promotionPackage: promotion.package
                }
            );

            return res.status(200).json({
                message: "Payment successful and promotion activated",
                payment: {
                    promotionId: promotion._id,
                    status: promotion.status,
                    momoStatus: momoPaymentStatus,
                    promotionStart: now,
                    promotionEnd: endDate,
                    promotionPackage: promotion.package
                }
            });
        }

        if (
            momoPaymentStatus ===
            "FAILED"
        ) {
            promotion.status = "failed";

            await promotion.save();

            return res.status(200).json({
                message: "Payment failed",
                payment: {
                    promotionId: promotion._id,
                    status: promotion.status,
                    momoStatus: momoPaymentStatus,
                    reason: momoStatus.reason || null
                }
            });
        }

        return res.status(200).json({
            message: "Payment is still pending",
            payment: {
                promotionId: promotion._id,
                status: promotion.status,
                momoStatus: momoPaymentStatus
            }
        });

    } catch (error) {
        console.error(
            "Promotion payment status error:",
            error.response?.data ||
                error.message ||
                error
        );

        return res.status(502).json({
            message:
                "Unable to check MTN MoMo payment status"
        });
    }
};

module.exports = {
    checkPromotionPaymentStatus
};
