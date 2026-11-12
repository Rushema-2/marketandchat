const Product = require("../models/Product");
const Service = require("../models/Service");
const Order = require("../models/Order");

const requestLimits = new Map();

function allowRequest(ip) {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    const maxRequests = 10;

    const recent = (requestLimits.get(ip) || [])
        .filter(time => now - time < windowMs);

    if (recent.length >= maxRequests) {
        requestLimits.set(ip, recent);
        return false;
    }

    recent.push(now);
    requestLimits.set(ip, recent);
    return true;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSearchTerms(message) {
    const stopWords = new Set([
        "nabona", "nte", "nshaka", "ndashaka", "ndabona",
        "how", "what", "where", "find", "show", "please",
        "the", "and", "for", "with", "ibi", "iki", "kuri"
    ]);

    return [
        ...new Set(
            (message.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])
                .filter(word => !stopWords.has(word))
        )
    ].slice(0, 5);
}

async function findMarketplaceData(message) {
    const terms = getSearchTerms(message);

    const productIntent =
        /\b(product|products|ibicuruzwa|inkweto|shoes|phone|telephone|imyenda|clothes|computer|laptop|buy|kugura|igiciro|price)\b/i.test(message);

    const serviceIntent =
        /\b(job|jobs|akazi|akazi|serivisi|service|services|professional|umwuga|akazi)\b/i.test(message);

    const searchConditions = terms.map(term => {
        const regex = new RegExp(escapeRegex(term), "i");

        return {
            $or: [
                { title: regex },
                { description: regex },
                { category: regex },
                { location: regex }
            ]
        };
    });

    const data = {
        products: [],
        services: []
    };

    if (terms.length && productIntent) {
        data.products = await Product.find({
            status: "active",
            stock: { $gt: 0 },
            $or: searchConditions
        })
            .select("title description price currency category location condition stock")
            .limit(5)
            .lean();
    }

    if (terms.length && serviceIntent) {
        data.services = await Service.find({
            status: "active",
            $or: searchConditions
        })
            .select("title description type category location price currency salary experience skills")
            .limit(5)
            .lean();
    }

    return data;
}


function getRequestedLocation(message) {
    const match = message.match(
        /\b(?:in|near|around|within)\s+([a-z][a-z\s'-]{1,45}?)(?=[?.!,;]|$|\s+(?:for|with|that|which)\b)/i
    );

    return match ? match[1].trim() : "";
}

async function getLocationMarketplaceReply(message) {
    const location = getRequestedLocation(message);
    if (!location) return null;

    const productIntent =
        /\b(product|products|ibicuruzwa|shoes|phone|telephone|clothes|computer|laptop|buy|price)\b/i.test(message);

    const serviceIntent =
        /\b(job|jobs|akazi|serivisi|service|services|professional)\b/i.test(message);

    if (!productIntent && !serviceIntent) return null;

    const locationRegex = new RegExp(escapeRegex(location), "i");
    const sections = [];

    if (productIntent) {
        const products = await Product.find({
            status: "active",
            stock: { $gt: 0 },
            location: locationRegex
        })
            .select("title price currency category location stock")
            .limit(5)
            .lean();

        if (products.length) {
            sections.push(
                `Products available in ${location}:`,
                ...products.map((product, index) =>
                    `${index + 1}. ${product.title} — ${Number(product.price).toLocaleString("en-US")} ${product.currency || "RWF"} | Category: ${product.category} | Location: ${product.location} | Stock: ${product.stock}`
                )
            );
        } else {
            const totalElsewhere = await Product.countDocuments({
                status: "active",
                stock: { $gt: 0 }
            });

            sections.push(
                `No active, in-stock products were found in ${location}.`,
                totalElsewhere
                    ? `There are ${totalElsewhere} active, in-stock products in other marketplace locations.`
                    : "There are currently no active, in-stock products in the marketplace."
            );
        }
    }

    if (serviceIntent) {
        const services = await Service.find({
            status: "active",
            location: locationRegex
        })
            .select("title type category location price currency salary")
            .limit(5)
            .lean();

        if (services.length) {
            sections.push(
                `Services and jobs available in ${location}:`,
                ...services.map((service, index) => {
                    const amount = service.salary != null
                        ? `Salary: ${Number(service.salary).toLocaleString("en-US")} ${service.currency || "RWF"}`
                        : service.price != null
                            ? `Price: ${Number(service.price).toLocaleString("en-US")} ${service.currency || "RWF"}`
                            : "Price or salary not specified";

                    return `${index + 1}. ${service.title} | Type: ${service.type} | Category: ${service.category} | Location: ${service.location} | ${amount}`;
                })
            );
        } else {
            sections.push(`No active services or jobs were found in ${location}.`);
        }
    }

    return sections.join("\n");
}


function getProductDiscoveryReply(message) {
    const asksHowToFind =
        /\b(how|where|ways?|steps?)\b/i.test(message) &&
        /\b(find|search|browse|look|filter|discover)\b/i.test(message);

    const mentionsProducts =
        /\b(products?|items?|goods)\b/i.test(message);

    if (!asksHowToFind || !mentionsProducts) return null;

    return [
        "To find products on NR Nexus:",
        "1. Open the Marketplace page.",
        "2. Use the search box to search by product name, description, category or location.",
        "3. Use the Category dropdown to narrow your results.",
        "",
        "Available categories:",
        "Electronics, Vehicles, Property, Fashion, Home & Living, and Other.",
        "",
        "The Marketplace currently provides search and category selection. A price filter or price-sorting option is not confirmed."
    ].join("\n");
}


function getAppFeatureReply(message) {
    const text = message.toLowerCase();

    // Contacting a seller
    if (
        /\b(contact|message|chat|talk to|speak to)\b/.test(text) &&
        /\b(seller|vendor)\b/.test(text)
    ) {
        return [
            "To contact a seller on NR Nexus:",
            "1. Open the product you are interested in.",
            "2. Select Contact Seller.",
            "3. Sign in if you are not already signed in.",
            "4. NR Nexus will open or create the conversation and take you to Messages.",
            "",
            "You cannot start a conversation with yourself as the seller."
        ].join("\n");
    }

    // Favorites
    if (
        /\b(favorites?|favourites?)\b/.test(text) ||
        /\b(save|add|remove)\b.*\b(product|item)\b/.test(text) ||
        /\bheart\b.*\b(product|marketplace)\b/.test(text)
    ) {
        return [
            "To save a product to Favorites:",
            "1. Open the Marketplace.",
            "2. Find the product you want to save.",
            "3. Click the heart (♡) button on its product card.",
            "",
            "Sign in is required to save favorites. To view saved products, open Favorites in the navigation. You can remove a saved product by clicking its heart button again."
        ].join("\n");
    }

    // My Orders
    if (
        /\b(my orders|view orders|see orders|track orders|track my order|order status|purchase history)\b/.test(text)
    ) {
        return [
            "To view your purchases:",
            "1. Open the My orders section from the NR Nexus navigation.",
            "2. Your orders will appear on the My Orders page.",
            "3. Open the relevant order to review its available details and status.",
            "",
            "You can also use the My Orders page to see whether you have any orders yet."
        ].join("\n");
    }

    // Services and job listings
    if (
        /\b(services?|jobs?|job opportunities|professionals?|service providers)\b/.test(text) &&
        /\b(find|search|browse|look|where|how|view|discover|access)\b/.test(text)
    ) {
        return [
            "To find services and job opportunities on NR Nexus:",
            "1. Open Services from the navigation.",
            "2. Choose All listings, Find a job, Find services, or Professionals.",
            "3. Use the search field to search listings.",
            "4. Narrow results using the location and category filters.",
            "",
            "The My listings tab is available for your own listings."
        ].join("\n");
    }

    // NEXUS TV
    if (
        /\b(nexus tv|videos?|watch a video|watch videos|upload a video)\b/.test(text) &&
        /\b(find|search|browse|watch|view|open|upload|how|where|explore|access)\b/.test(text)
    ) {
        return [
            "To watch videos on NEXUS TV:",
            "1. Open NEXUS TV from NR Nexus.",
            "2. Select Explore to browse available videos.",
            "3. Use Search videos or the category buttons to find content.",
            "4. Select a video card or its title to open and watch it.",
            "",
            "Select My videos to view your own videos. Use Upload a video to open the upload form."
        ].join("\n");
    }

    return null;
}





function getPaymentHelpReply(message) {
    const text = message.toLowerCase();

    // Refund questions: do not promise an unsupported refund feature.
    if (/\b(refund|money back|return my money)\b/.test(text)) {
        return [
            "I cannot confirm that NR Nexus currently provides an automated refund feature.",
            "For a payment or refund concern, contact the seller through the product's Contact Seller option or Messages.",
            "Keep your transaction information safe and never share your wallet PIN or password."
        ].join("\n");
    }

    // MTN MoMo sandbox is separate from direct seller payments.
    if (/\b(sandbox|test payment|testing payment)\b/.test(text)) {
        return [
            "NR Nexus has a separate MTN MoMo sandbox payment option for testing.",
            "A sandbox payment request being submitted does not mean that real money was received or that the order payment was completed.",
            "Direct seller payments through MTN MoMo or Airtel Money follow a separate process."
        ].join("\n");
    }

    // Seller payment settings.
    if (
        /\b(seller|my store|my shop|receive payments|payment settings)\b/.test(text) &&
        /\b(set|add|configure|change|update|receive|setup|enable|number|details|payment)\b/.test(text)
    ) {
        return [
            "Sellers can configure the mobile money numbers buyers use to pay them:",
            "1. Open Seller Dashboard.",
            "2. Find the payment settings section.",
            "3. Add your MTN MoMo number, Airtel Money number, or both.",
            "4. Save your payment settings.",
            "",
            "Only configure numbers that belong to you and that you can verify."
        ].join("\n");
    }

    // Explain direct payment statuses.
    if (
        /\b(payment status|payment pending|submitted payment|confirming payment|confirmed payment|rejected payment|payment rejected|payment confirmed)\b/.test(text)
    ) {
        return [
            "Here is what the direct payment statuses mean:",
            "- Not started: no direct payment reference has been submitted.",
            "- Submitted: the buyer has submitted a transaction reference. The seller still needs to verify receipt.",
            "- Confirming: the seller's confirmation process is in progress.",
            "- Confirmed: the seller confirmed receipt of the payment.",
            "- Rejected: the seller rejected the submitted payment. Check the rejection reason in My Orders.",
            "",
            "A submitted reference alone does not prove that money was received."
        ].join("\n");
    }

    // Seller confirmation and rejection.
    if (
        /\b(confirm|verify|reject|approve)\b/.test(text) &&
        /\b(payment|momo|transaction|money)\b/.test(text)
    ) {
        return [
            "For direct seller payments, the seller must review the submitted payment in Seller Dashboard.",
            "The seller should confirm only after checking that the money has actually arrived in their wallet.",
            "The seller can reject a submitted payment and provide a reason.",
            "NR AI cannot confirm or reject payments for you."
        ].join("\n");
    }

    // Buyer payment instructions.
    if (
        /\b(pay|payment|payments|momo|mobile money|mtn money|airtel money|transaction reference)\b/.test(text)
    ) {
        return [
            "NR Nexus supports direct seller payments using MTN MoMo and Airtel Money when the seller has configured those payment methods.",
            "To pay for a product:",
            "1. Open the product and review its available seller payment methods, or open an eligible pending order in My Orders.",
            "2. Choose a payment method configured by the seller.",
            "3. Pay using your mobile money application.",
            "4. Submit the transaction reference in NR Nexus.",
            "5. Wait for the seller to verify receipt and confirm the payment.",
            "",
            "Submitting a reference does not automatically confirm payment. You can review the available payment status in My Orders."
        ].join("\n");
    }

    return null;
}


function classifyNRIntent(message) {
    const text = message.toLowerCase();

    if (
        /\b(my orders|my purchase history|order status|track my order|show me my orders|view my orders)\b/.test(text)
    ) {
        return "orders";
    }

    if (
        /\b(payment|payments|pay|paid|momo|mobile money|mtn money|airtel money|refund|transaction)\b/.test(text)
    ) {
        return "payments";
    }

    if (
        /\b(contact|message|chat|talk to|speak to)\b/.test(text) &&
        /\b(seller|vendor)\b/.test(text)
    ) {
        return "communication";
    }

    if (
        /\b(nexus tv|videos?|watch a video|watch videos|upload a video)\b/.test(text)
    ) {
        return "nexus_tv";
    }

    if (
        /\b(job|jobs|service|services|professional|professionals|service provider)\b/.test(text)
    ) {
        return "services";
    }

    if (
        /\b(product|products|item|items|goods|buy|purchase|shopping|marketplace|price|prices|stock)\b/.test(text)
    ) {
        return "shopping";
    }

    if (
        /\b(favorites?|favourites?|account|profile|login|log in|register|password|sign in|sign up)\b/.test(text)
    ) {
        return "account_help";
    }

    return "general";
}


async function routeNRCapability(message, userId, intent) {
    switch (intent) {
        case "orders": {
            const reply = await getMyOrdersReply(message, userId);
            return reply || getAppFeatureReply(message);
        }

        case "shopping":
            return (
                await getLocationMarketplaceReply(message)
            ) || getProductDiscoveryReply(message);

        case "services":
            return (
                await getLocationMarketplaceReply(message)
            ) || getAppFeatureReply(message);

        case "communication":
        case "account_help":
        case "nexus_tv":
            return getAppFeatureReply(message);

        case "payments":
            return getPaymentHelpReply(message);

        case "general":
        default:
            return null;
    }
}

async function getMyOrdersReply(message, userId) {
    const text = message.toLowerCase();

    // Keep ordinary navigation questions on the existing help path.
    const asksWhereToView =
        /\b(where|how)\b.*\b(view|find|open|access)\b.*\bmy orders?\b/i.test(text);

    if (asksWhereToView) return null;

    const mentionsOwnOrders =
        /\bmy orders?\b|\bmy purchase history\b|\bmy order status\b|\btrack my order\b/i.test(text);

    if (!mentionsOwnOrders) return null;

    if (!userId) {
        return [
            "Please sign in to your NR Nexus account first.",
            "After signing in, ask me again and I can show you a summary of your own recent orders.",
            "You can also open My Orders to view your purchases."
        ].join("\n");
    }

    const orders = await Order.find({
        buyer: userId
    })
        .select(
            "product quantity totalAmount currency paymentStatus directPaymentStatus status createdAt"
        )
        .populate("product", "title")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    if (!orders.length) {
        return "I could not find any orders linked to your account yet. You can browse the Marketplace to find products.";
    }

    const lines = [
        "Here are your five most recent orders, or fewer if you have not placed five:",
        ""
    ];

    orders.forEach((order, index) => {
        const productName = order.product?.title || "Product details unavailable";
        const orderDate = order.createdAt
            ? new Date(order.createdAt).toLocaleDateString("en-GB")
            : "Date unavailable";

        let paymentLabel = "Payment status unavailable";

        if (order.directPaymentStatus === "confirmed") {
            paymentLabel = "Confirmed by seller (direct payment)";
        } else if (order.paymentStatus === "successful") {
            paymentLabel = "Paid";
        } else if (order.directPaymentStatus === "submitted") {
            paymentLabel = "Submitted for seller confirmation";
        } else if (order.directPaymentStatus === "rejected") {
            paymentLabel = "Direct payment rejected";
        } else if (order.paymentStatus) {
            paymentLabel = order.paymentStatus.replace(/_/g, " ");
        }

        const amount = Number(order.totalAmount || 0).toLocaleString("en-US");
        const currency = order.currency || "RWF";
        const orderStatus = (order.status || "unknown").replace(/_/g, " ");

        lines.push(
            `${index + 1}. ${productName}`,
            `   Date: ${orderDate}`,
            `   Order status: ${orderStatus}`,
            `   Payment: ${paymentLabel}`,
            `   Quantity: ${order.quantity}`,
            `   Total: ${amount} ${currency}`,
            ""
        );
    });

    lines.push("For full order details, open My Orders in NR Nexus.");

    return lines.join("\n");
}

exports.chatWithNR = async (req, res) => {
    try {
        const ip = req.ip || "unknown";

        const message = typeof req.body.message === "string"
            ? req.body.message.trim()
            : "";

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Please enter your question."
            });
        }

        if (message.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Your message is too long. Please keep it under 1,000 characters."
            });
        }

        const intent = classifyNRIntent(message);

        const capabilityReply = await routeNRCapability(
            message,
            req.user?.userId,
            intent
        );

        if (capabilityReply) {
            return res.json({
                success: true,
                reply: capabilityReply
            });
        }

        // Apply the request limit only to questions that need Ollama.
        // Verified app-help answers are handled above without using this limit.
        if (!allowRequest(ip)) {
            return res.status(429).json({
                success: false,
                message: "You have sent too many AI requests. Please try again in a few minutes."
            });
        }

        const ollamaModel = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";
        const ollamaBaseUrl = (
            process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"
        ).replace(/\/$/, "");

        const marketplaceData = await findMarketplaceData(message);

        const history = Array.isArray(req.body.history)
            ? req.body.history
                .filter(item =>
                    item &&
                    ["user", "assistant"].includes(item.role) &&
                    typeof item.content === "string"
                )
                .slice(-8)
                .map(item => ({
                    role: item.role,
                    content: item.content.slice(0, 1000)
                }))
            : [];

        const instructions = `
You are NR AI, the official customer assistant of RWh​​atsApp.

LANGUAGE AND COMMUNICATION:
- ALWAYS respond in English only, regardless of the language used by the customer.
- Never respond in Kinyarwanda or any other language.
- Be friendly, respectful, concise and practical.
- Use simple language that is easy for customers to understand.
- Give step-by-step instructions when explaining how to use the app.

ACCURACY — MOST IMPORTANT:
- Give truthful answers based on the actual information provided in this conversation and the supplied marketplace data.
- Never invent app features, buttons, tabs, settings, filters, payment methods or capabilities.
- Never claim that a feature exists unless it is explicitly confirmed in the available information.
- If you are unsure whether a feature is available, clearly say that you cannot confirm its availability.
- Do not pretend to have opened the customer's account, viewed their screen or performed an action for them.
- Never claim that an action has succeeded unless the system explicitly confirms it.

MARKETPLACE:
- Use the supplied marketplace data when answering questions about available products or services.
- Recommend only matching listings present in the supplied data.
- Never invent product names, sellers, prices, stock, locations, salaries or availability.
- Always use the price and currency supplied by the database.
- If no matching results are supplied, explain that no matching listing was found and ask what the customer is looking for.
- Do not describe search filters or sorting options unless their availability is explicitly confirmed.

ORDERS AND PAYMENTS:
- Explain that customers can use My Orders to view their orders.
- Do not claim that live order tracking, delivery tracking or tracking information is available.
- Do not claim that an order has been placed, confirmed, paid, shipped or delivered unless the system explicitly provides that status.
- Do not claim that a payment succeeded without confirmation.
- For a signed-in customer, use authenticated order capability results when they are provided to answer questions about that customer's own recent orders and statuses. Never reveal another user's orders.
- If authenticated order information is not provided, direct the customer to My Orders. Never claim live delivery tracking is available.

APP FEATURES:
- You may explain Marketplace browsing, contacting sellers through Messages, Favorites, Seller Stores, My Orders and My Products.
- Explain only the functionality that is explicitly known.
- Services and jobs: use supplied listings when available. Do not invent available services or jobs.
- Videos and NEXUS TV: answer only with confirmed information. If you do not know how a feature works, say so instead of guessing.
- Never invent navigation steps, page names or buttons.

PRIVACY AND SECURITY:
- Never reveal private buyer or seller information.
- Never provide private phone numbers, email addresses, passwords, account details, private addresses or order information.
- Do not guess where a person lives or disclose their precise location.
- If a customer wants to contact a seller, explain that they can use the app's messaging feature.
- Never request passwords, API keys, verification codes or payment secrets.

GENERAL QUESTIONS:
- You may answer general questions that are unrelated to RWh​​atsApp.
- Clearly distinguish general knowledge from information verified in the app.
- If you do not know an answer, admit that you do not know rather than inventing one.

LIVE MARKETPLACE DATA:
${JSON.stringify(marketplaceData)}
`;

        const input = [
            ...history,
            { role: "user", content: message }
        ];

        const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: ollamaModel,
                messages: [
                    { role: "system", content: instructions },
                    ...input
                ],
                stream: false,
                keep_alive: "5m",
                options: {
                    num_predict: 250
                }
            }),
            signal: AbortSignal.timeout(180000)
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(
                "NR AI Ollama error:",
                response.status,
                result.error || "unknown"
            );

            return res.status(502).json({
                success: false,
                message: "NR AI is temporarily unavailable. Please try again."
            });
        }

        const reply = result.message?.content?.trim();

        if (!reply) {
            return res.status(502).json({
                success: false,
                message: "NR AI could not generate a response. Please try again."
            });
        }

        return res.json({
            success: true,
            reply
        });

    } catch (error) {
        console.error("NR AI server error:", error.message);

        return res.status(500).json({
            success: false,
            message: "An error occurred. Please try again later."
        });
    }
};
