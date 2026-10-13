const loading =
    document.getElementById("loading");

const errorState =
    document.getElementById("errorState");

const portfolioContent =
    document.getElementById("portfolioContent");

const sellerAvatar =
    document.getElementById("sellerAvatar");

const sellerName =
    document.getElementById("sellerName");

const sellerEmail =
    document.getElementById("sellerEmail");

const sellerPhone =
    document.getElementById("sellerPhone");

const chatSellerButton =
    document.getElementById("chatSellerButton");

    const followSellerButton =
    document.getElementById(
        "followSellerButton"
    );

const followersCount =
    document.getElementById(
        "followersCount"
    );

const productsContainer =
    document.getElementById("productsContainer");

const productCount =
    document.getElementById("productCount");

const emptyState =
    document.getElementById("emptyState");


const params =
    new URLSearchParams(
        window.location.search
    );

const sellerId =
    params.get("seller");


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatPrice(price, currency = "RWF") {

    const number =
        Number(price || 0);

    return `${number.toLocaleString()} ${currency}`;
}


function showError(message) {

    loading.classList.add("hidden");

    portfolioContent.classList.add("hidden");

    errorState.textContent =
        message;

    errorState.classList.remove("hidden");
}


function renderSeller(seller) {

    if (!seller) {
        sellerName.textContent =
            "Seller";

        return;
    }

    const fullName =
        `${seller.firstName || ""} ${seller.lastName || ""}`
            .trim();

    sellerName.textContent =
        fullName || "Seller";

    sellerEmail.textContent =
        seller.email || "";

    sellerPhone.textContent =
        seller.phone || "";

    sellerAvatar.textContent =
        (
            seller.firstName ||
            fullName ||
            "S"
        )
            .charAt(0)
            .toUpperCase();
}


function renderProducts(products) {

    productCount.textContent =
        `${products.length} ${
            products.length === 1
                ? "product"
                : "products"
        }`;

    if (!products.length) {

        productsContainer.innerHTML = "";

        emptyState.classList.remove(
            "hidden"
        );

        return;
    }

    emptyState.classList.add(
        "hidden"
    );

    productsContainer.innerHTML =
        products.map((product) => {

            let media = `
                <div class="product-placeholder">
                    No image
                </div>
            `;

            if (
                Array.isArray(product.images) &&
                product.images.length > 0
            ) {

                media = `
                    <img
                        src="${escapeHtml(product.images[0])}"
                        alt="${escapeHtml(product.title)}"
                    >
                `;

            } else if (product.video) {

                media = `
                    <video
                        src="${escapeHtml(product.video)}"
                        muted
                        preload="metadata"
                    ></video>
                `;
            }

            return `
                <article
                    class="product-card"
                    data-product-id="${escapeHtml(product._id)}"
                >

                    <div class="product-media">
                        ${media}
                    </div>

                    <div class="product-info">

                        <h3 class="product-title">
                            ${escapeHtml(product.title)}
                        </h3>

                        <div class="product-price">
                            ${formatPrice(
                                product.price,
                                product.currency
                            )}
                        </div>

                        <div class="product-meta">
                            ${escapeHtml(
                                product.category || ""
                            )}
                            ${
                                product.location
                                    ? ` • ${escapeHtml(product.location)}`
                                    : ""
                            }
                        </div>

                    </div>

                </article>
            `;

        })
        .join("");


    document
        .querySelectorAll(".product-card")
        .forEach((card) => {

            card.addEventListener(
                "click",
                () => {

                    const productId =
                        card.dataset.productId;

                    window.location.href =
                        `/product.html?id=${encodeURIComponent(productId)}`;
                }
            );

        });
}


async function loadPortfolio() {

    if (!sellerId) {

        showError(
            "Seller information is missing."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `/api/products/seller/${encodeURIComponent(sellerId)}`
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Could not load seller portfolio."
            );
        }

        const products =
            Array.isArray(data.products)
                ? data.products
                : [];

const seller =
    data.seller || null;

renderSeller(seller);

renderProducts(products);

        loading.classList.add(
            "hidden"
        );

        errorState.classList.add(
            "hidden"
        );

        portfolioContent.classList.remove(
            "hidden"
        );

    } catch (error) {

        console.error(
            "Load portfolio error:",
            error
        );

        showError(
            error.message ||
            "Seller portfolio could not be loaded."
        );
    }
}

async function loadFollowStatus() {

    const token =
        localStorage.getItem("token");

    if (!sellerId) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/follows/${encodeURIComponent(
                    sellerId
                )}/status`,
                {
                    headers: token
                        ? {
                            Authorization:
                                `Bearer ${token}`
                        }
                        : {}
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Could not load follow status."
            );
        }

        followersCount.textContent =
            `${data.followersCount || 0} ${
                data.followersCount === 1
                    ? "follower"
                    : "followers"
            }`;

        if (data.following) {

            followSellerButton.textContent =
                "Following";

        } else {

            followSellerButton.textContent =
                "Follow Seller";
        }

    } catch (error) {

        console.error(
            "Follow status error:",
            error
        );
    }
}


async function toggleFollow() {

    const token =
        localStorage.getItem("token");

    if (!token) {

        window.location.href =
            `/login.html?redirect=${encodeURIComponent(
                window.location.href
            )}`;

        return;
    }

    if (!sellerId) {
        return;
    }

    const isFollowing =
        followSellerButton.textContent ===
        "Following";

    try {

        followSellerButton.disabled =
            true;

        const response =
            await fetch(
                `/api/follows/${encodeURIComponent(
                    sellerId
                )}`,
                {
                    method:
                        isFollowing
                            ? "DELETE"
                            : "POST",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Could not update follow status."
            );
        }

        followSellerButton.textContent =
            data.following
                ? "Following"
                : "Follow Seller";

        followersCount.textContent =
            `${data.followersCount || 0} ${
                data.followersCount === 1
                    ? "follower"
                    : "followers"
            }`;

    } catch (error) {

        console.error(
            "Toggle follow error:",
            error
        );

        alert(
            error.message ||
            "Could not update follow status."
        );

    } finally {

        followSellerButton.disabled =
            false;
    }
}


followSellerButton.addEventListener(
    "click",
    toggleFollow
);


chatSellerButton.addEventListener(
    "click",
    () => {

        if (!sellerId) {
            return;
        }

        const token =
            localStorage.getItem("token");

        if (!token) {

            window.location.href =
                `/login.html?redirect=${encodeURIComponent(
                    `/portfolio.html?seller=${sellerId}`
                )}`;

            return;
        }

        window.location.href =
            `/chat.html?seller=${encodeURIComponent(
                sellerId
            )}`;
    }
);


loadPortfolio();
loadFollowStatus();
