const axios = require("axios");

const MOMO_BASE_URL =
    process.env.MOMO_BASE_URL ||
    "https://sandbox.momodeveloper.mtn.com";

async function getAccessToken() {
    const credentials = Buffer.from(
        `${process.env.MOMO_API_USER}:${process.env.MOMO_API_KEY}`
    ).toString("base64");

    const response = await axios.post(
        `${MOMO_BASE_URL}/collection/token/`,
        null,
        {
            headers: {
                Authorization: `Basic ${credentials}`,
                "Ocp-Apim-Subscription-Key":
                    process.env.MOMO_SUBSCRIPTION_KEY,
                "Content-Length": "0"
            }
        }
    );

    return response.data.access_token;
}

async function getPaymentStatus(referenceId) {
    if (!referenceId) {
        throw new Error("MTN reference ID is required");
    }

    const accessToken = await getAccessToken();

    const response = await axios.get(
        `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-Target-Environment": "sandbox",
                "Ocp-Apim-Subscription-Key":
                    process.env.MOMO_SUBSCRIPTION_KEY
            }
        }
    );

    return response.data;
}

module.exports = {
    getPaymentStatus
};
