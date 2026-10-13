const API = "/api";

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "/login.html";
}

const loadingState =
    document.getElementById("loadingState");

const errorState =
    document.getElementById("errorState");

const emptyState =
    document.getElementById("emptyState");

const notificationsList =
    document.getElementById("notificationsList");

const markAllReadButton =
    document.getElementById("markAllReadButton");

const notificationSummary =
    document.getElementById("notificationSummary");

let notifications = [];

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNotificationTime(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleString();
}

function getSenderName(notification) {
    const sender = notification.sender;

    if (!sender) {
        return "RwhatsApp";
    }

    const fullName =
        `${sender.firstName || ""} ${sender.lastName || ""}`
            .trim();

    return fullName || sender.email || "RwhatsApp user";
}

function getNotificationIcon(type) {
    switch (type) {
        case "follow":
            return "👤";

        case "message":
            return "💬";

        case "product_like":
            return "❤️";

        case "product_view":
            return "👁️";

        default:
            return "🔔";
    }
}

function updateSummary() {
    const total = notifications.length;

    const unread =
        notifications.filter(
            notification => !notification.read
        ).length;

    notificationSummary.textContent =
        `${total} notification${total === 1 ? "" : "s"} · ` +
        `${unread} unread`;
}

function renderNotifications() {
    loadingState.classList.add("hidden");
    errorState.classList.add("hidden");

    if (!notifications.length) {
        notificationsList.classList.add("hidden");
        emptyState.classList.remove("hidden");
        updateSummary();
        return;
    }

    emptyState.classList.add("hidden");
    notificationsList.classList.remove("hidden");

    notificationsList.innerHTML =
        notifications
            .map(notification => {
                const unreadClass =
                    notification.read
                        ? ""
                        : "unread";

                const unreadDot =
                    notification.read
                        ? ""
                        : `<span
                            class="notification-unread-dot"
                          ></span>`;

                const senderName =
                    getSenderName(notification);

                return `
                    <article
                        class="notification-item ${unreadClass}"
                        data-id="${escapeHtml(notification._id)}"
                    >
                        <div class="notification-icon">
                            ${getNotificationIcon(notification.type)}
                        </div>

                        <div class="notification-content">

                            <p class="notification-message">
                                ${escapeHtml(notification.message)}
                            </p>

                            <p class="notification-sender">
                                From:
                                ${escapeHtml(senderName)}
                            </p>

                            <p class="notification-time">
                                ${escapeHtml(
                                    formatNotificationTime(
                                        notification.createdAt
                                    )
                                )}
                            </p>

                        </div>

                        ${unreadDot}
                    </article>
                `;
            })
            .join("");

    updateSummary();

    document
        .querySelectorAll(".notification-item")
        .forEach(item => {
            item.addEventListener(
                "click",
                () => {
                    markNotificationAsRead(
                        item.dataset.id
                    );
                }
            );
        });
}

async function loadNotifications() {
    try {
        loadingState.classList.remove("hidden");
        errorState.classList.add("hidden");

        const response =
            await fetch(
                `${API}/notifications`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                "Failed to load notifications"
            );
        }

        const data =
            await response.json();

        notifications =
            Array.isArray(data.notifications)
                ? data.notifications
                : [];

        renderNotifications();

    } catch (error) {
        console.error(
            "Load notifications error:",
            error
        );

        loadingState.classList.add("hidden");
        emptyState.classList.add("hidden");
        notificationsList.classList.add("hidden");
        errorState.classList.remove("hidden");
    }
}

async function markNotificationAsRead(
    notificationId
) {
    const notification =
        notifications.find(
            item => item._id === notificationId
        );

    if (!notification || notification.read) {
        return;
    }

    try {
        const response =
            await fetch(
                `${API}/notifications/${notificationId}/read`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                "Failed to mark notification as read"
            );
        }

        notification.read = true;

        renderNotifications();

    } catch (error) {
        console.error(
            "Mark notification read error:",
            error
        );
    }
}

async function markAllAsRead() {
    try {
        markAllReadButton.disabled = true;

        const response =
            await fetch(
                `${API}/notifications/read-all`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                "Failed to mark all notifications as read"
            );
        }

        notifications =
            notifications.map(
                notification => ({
                    ...notification,
                    read: true
                })
            );

        renderNotifications();

    } catch (error) {
        console.error(
            "Mark all notifications read error:",
            error
        );
    } finally {
        markAllReadButton.disabled = false;
    }
}

markAllReadButton.addEventListener(
    "click",
    markAllAsRead
);

loadNotifications();
