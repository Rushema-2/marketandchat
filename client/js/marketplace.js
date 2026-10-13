const productsContainer =
    document.getElementById("productsContainer");

const loading =
    document.getElementById("loading");

const emptyState =
    document.getElementById("emptyState");

const resultInfo =
    document.getElementById("resultInfo");

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const sellButton =
    document.getElementById("sellButton");

let currentCategory = "";
let currentPage = 1;
const productsPerPage = 20;


async function loadProducts(page = 1) {

    loading.classList.remove("hidden");
    emptyState.classList.add("hidden");

    productsContainer.innerHTML = "";

    currentPage = page;

    try {

        const params = new URLSearchParams();

        params.set("page", currentPage);
        params.set("limit", productsPerPage);

        if (currentCategory) {
            params.set("category", currentCategory);
        }

        const search = searchInput.value.trim();

        if (search) {
            params.set("search", search);
        }

        const query =
            params.toString()
                ? `?${params.toString()}`
                : "";

        const response =
            await fetch(`/api/products${query}`);

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load products"
            );
        }

        renderProducts(data.products);

        resultInfo.textContent =
            `${data.pagination.total} product(s) found`;

        renderPagination(data.pagination);

    } catch (error) {

        console.error("Marketplace error:", error);

        resultInfo.textContent =
            "Could not load products.";

    } finally {

        loading.classList.add("hidden");
    }
}


function renderProducts(products) {

    productsContainer.innerHTML = "";

    if (!products || products.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    products.forEach(product => {

        const card =
            document.createElement("div");

        card.className = "product-card";

        const image =
            product.images &&
            product.images.length > 0
                ? `<img src="${escapeHtml(product.images[0])}" alt="${escapeHtml(product.title)}">`
                : "No image";

        const seller =
            product.seller
                ? `${product.seller.firstName || ""} ${product.seller.lastName || ""}`.trim()
                : "Seller";

        card.innerHTML = `
            <div class="product-image">
                ${image}
            </div>

            <div class="product-info">

                <div class="product-title">
                    ${escapeHtml(product.title)}
                </div>

                <div class="product-price">
                    ${formatPrice(product.price)}
                    ${escapeHtml(product.currency || "RWF")}
                </div>

                <div class="product-meta">
                    ${escapeHtml(product.category)}
                </div>

                <div class="product-meta">
                    ${escapeHtml(product.location || "Location not specified")}
                </div>

                <div class="product-meta">
                    Seller: ${escapeHtml(seller)}
                </div>

            </div>
        `;

        card.addEventListener("click", () => {
            window.location.href =
                `/product.html?id=${product._id}`;
        });

        productsContainer.appendChild(card);
    });
}


function renderPagination(pagination) {

    const paginationContainer =
        document.getElementById("pagination");

    if (!paginationContainer) {
        return;
    }

    paginationContainer.innerHTML = "";

    const totalPages =
        Number(pagination.pages) || 0;

    const page =
        Number(pagination.page) || 1;

    if (totalPages <= 1) {
        return;
    }

    const previousButton =
        document.createElement("button");

    previousButton.textContent =
        "Previous";

    previousButton.disabled =
        page <= 1;

    previousButton.addEventListener(
        "click",
        () => {
            if (page > 1) {
                loadProducts(page - 1);
            }
        }
    );

    paginationContainer.appendChild(
        previousButton
    );

    for (
        let pageNumber = 1;
        pageNumber <= totalPages;
        pageNumber++
    ) {

        const pageButton =
            document.createElement("button");

        pageButton.textContent =
            pageNumber;

        if (pageNumber === page) {
            pageButton.classList.add("active");
        }

        pageButton.addEventListener(
            "click",
            () => {
                loadProducts(pageNumber);
            }
        );

        paginationContainer.appendChild(
            pageButton
        );
    }

    const nextButton =
        document.createElement("button");

    nextButton.textContent =
        "Next";

    nextButton.disabled =
        page >= totalPages;

    nextButton.addEventListener(
        "click",
        () => {
            if (page < totalPages) {
                loadProducts(page + 1);
            }
        }
    );

    paginationContainer.appendChild(
        nextButton
    );
}


function formatPrice(price) {

    return new Intl.NumberFormat("en-RW").format(
        Number(price || 0)
    );
}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


searchButton.addEventListener(
    "click",
    loadProducts
);


searchInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            loadProducts();
        }
    }
);


document
    .querySelectorAll(".category")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".category")
                    .forEach(item =>
                        item.classList.remove("active")
                    );

                button.classList.add("active");

                currentCategory =
                    button.dataset.category;

                loadProducts();
            }
        );
    });


sellButton.addEventListener(
    "click",
    () => {

        const token =
            localStorage.getItem("token");

        if (!token) {
            window.location.href =
                "/login.html";

            return;
        }

        window.location.href =
            "/seller-dashboard.html";
    }
);


loadProducts();


// NOTIFICATION BADGE

async function loadNotificationBadge() {

    const notificationBadge =
        document.getElementById("notificationBadge");

    const token =
        localStorage.getItem("token");

    if (!notificationBadge || !token) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/notifications/unread-count",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                "Failed to load notification count"
            );
        }

        const data =
            await response.json();

        const unreadCount =
            Number(data.unreadCount) || 0;

        if (unreadCount > 0) {

            notificationBadge.textContent =
                unreadCount > 99
                    ? "99+"
                    : unreadCount;

            notificationBadge.classList.remove(
                "hidden"
            );

        } else {

            notificationBadge.textContent = "0";

            notificationBadge.classList.add(
                "hidden"
            );
        }

    } catch (error) {

        console.error(
            "Notification badge error:",
            error
        );

        notificationBadge.classList.add(
            "hidden"
        );
    }
}

loadNotificationBadge();
