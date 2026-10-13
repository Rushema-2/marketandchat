"use strict";

const ordersMessage = document.getElementById("ordersMessage");
const ordersContainer = document.getElementById("ordersContainer");

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatPrice(amount, currency = "RWF") {
    const number = Number(amount);

    return `${Number.isFinite(number) ? number.toLocaleString() : "0"} ${escapeHtml(currency)}`;
}

function formatDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function statusClass(status) {
    return String(status || "pending")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
}

function renderOrderTimeline(status) {
    const steps = [
        { status: "paid", label: "Paid" },
        { status: "processing", label: "Processing" },
        { status: "shipped", label: "Shipped" },
        { status: "delivered", label: "Delivered" }
    ];

    const currentStatus = status === "completed" ? "delivered" : status;
    const currentIndex = steps.findIndex(step => step.status === currentStatus);

    return `
        <div class="order-tracking" aria-label="Order tracking">
            <h3>Delivery progress</h3>
            <ol class="order-tracking-steps">
                ${steps.map((step, index) => {
                    const complete = currentIndex >= 0 && index < currentIndex;
                    const current = currentIndex === index;

                    return `
                        <li class="tracking-step${complete ? " is-complete" : ""}${current ? " is-current" : ""}">
                            <span class="tracking-step-marker">${complete ? "✓" : index + 1}</span>
                            <span class="tracking-step-label">${step.label}</span>
                        </li>
                    `;
                }).join("")}
            </ol>
        </div>
    `;
}

function renderOrder(order) {
    const product = order.product || {};
    const seller = order.seller || {};
    const currency = order.currency || product.currency || "RWF";

    const productTitle = product.title || "Product unavailable";
    const sellerName =
        `${seller.firstName || ""} ${seller.lastName || ""}`.trim()
        || "Seller unavailable";

    const imageUrl = Array.isArray(product.images)
        ? product.images.find(image => typeof image === "string" && image.trim())
        : null;

    const productImage = imageUrl
        ? `<img class="order-product-image"
                src="${escapeHtml(imageUrl)}"
                alt="${escapeHtml(productTitle)}"
                loading="lazy">`
        : `<div class="order-product-image" role="img"
                aria-label="No product image"></div>`;

    const paymentStatus = order.paymentStatus || "pending";
    const orderStatus = order.status || "pending";

    return `
        <article class="order-card">
            <div class="order-card-header">
                <div>
                    <h2>${escapeHtml(productTitle)}</h2>
                    <div class="order-date">
                        Ordered: ${escapeHtml(formatDate(order.createdAt))}
                    </div>
                    <div class="order-id">
                        Order ID: ${escapeHtml(order._id || "Unavailable")}
                    </div>
                </div>
            </div>

            <div class="order-product">
                ${productImage}

                <div class="order-product-details">
                    <h3>${escapeHtml(productTitle)}</h3>
                    <p>Unit price: <strong>${formatPrice(order.unitPrice ?? product.price ?? 0, currency)}</strong></p>
                    <p>Quantity: <strong>${Number(order.quantity || 0)}</strong></p>
                    <p>Seller: <strong>${escapeHtml(sellerName)}</strong></p>
                </div>
            </div>

            <div class="order-financials">
                <div class="order-financial-item">
                    <span>Order total</span>
                    <strong>${formatPrice(order.totalAmount || 0, currency)}</strong>
                </div>

                <div class="order-financial-item">
                    <span>Payment method</span>
                    <strong>${escapeHtml(order.paymentProvider === "mtn_momo" ? "MTN MoMo" : "Not specified")}</strong>
                </div>
            </div>

            ${renderOrderTimeline(orderStatus)}

            ${orderStatus === "shipped" && paymentStatus === "successful" ? `
                <div class="order-delivery-confirmation">
                    <p>Your order has been shipped. Confirm when you have received it.</p>
                    <button
                        type="button"
                        class="confirm-delivery-button"
                        data-order-id="${escapeHtml(order._id)}"
                    >
                        Confirm Delivery
                    </button>
                </div>
            ` : ""}

            <div class="order-statuses">
                <span class="status-badge status-${statusClass(paymentStatus)}">
                    Payment: ${escapeHtml(paymentStatus)}
                </span>

                <span class="status-badge status-${statusClass(orderStatus)}">
                    Order: ${escapeHtml(orderStatus)}
                </span>
            </div>

            <div class="order-seller">
                Keep your order details for reference if you need help with your purchase.
            </div>
        </article>
    `;
}

async function loadMyOrders() {
    ordersMessage.textContent = "Loading your orders...";
    ordersMessage.classList.remove("error");
    ordersContainer.replaceChildren();

    const token = localStorage.getItem("token");

    if (!token) {
        ordersMessage.textContent = "Please log in to view your orders.";
        ordersMessage.classList.add("error");
        return;
    }

    try {
        const response = await fetch("/api/orders/my-orders", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok) {
            throw new Error(data.message || "Unable to load your orders.");
        }

        const orders = Array.isArray(data.orders) ? data.orders : [];

        if (orders.length === 0) {
            ordersMessage.textContent = "You have no orders yet.";
            return;
        }

        ordersContainer.innerHTML = orders.map(renderOrder).join("");
        ordersMessage.textContent =
            `${orders.length} order${orders.length === 1 ? "" : "s"} found.`;

    } catch (error) {
        console.error("My Orders error:", error);
        ordersMessage.textContent =
            error.message || "Unable to load your orders. Please try again.";
        ordersMessage.classList.add("error");
    }
}

ordersContainer.addEventListener("click", async event => {
    const button = event.target.closest(".confirm-delivery-button");

    if (!button || button.disabled) return;

    const orderId = button.dataset.orderId;
    const token = localStorage.getItem("token");

    if (!token) {
        ordersMessage.textContent = "Please log in again to confirm delivery.";
        ordersMessage.classList.add("error");
        return;
    }

    button.disabled = true;
    button.textContent = "Confirming...";

    try {
        const response = await fetch(
            `/api/orders/${encodeURIComponent(orderId)}/confirm-delivery`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to confirm delivery.");
        }

        ordersMessage.classList.remove("error");
        ordersMessage.textContent = data.message || "Delivery confirmed successfully.";
        await loadMyOrders();

    } catch (error) {
        console.error("Confirm delivery error:", error);
        ordersMessage.textContent =
            error.message || "Unable to confirm delivery. Please try again.";
        ordersMessage.classList.add("error");
        button.disabled = false;
        button.textContent = "Confirm Delivery";
    }
});

loadMyOrders();
