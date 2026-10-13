const productLoading =
    document.getElementById("productLoading");

const productError =
    document.getElementById("productError");

const productContent =
    document.getElementById("productContent");

const sellerSection =
    document.getElementById("sellerSection");

const mainMedia =
    document.getElementById("mainMedia");

const mediaList =
    document.getElementById("mediaList");

const productTitle =
    document.getElementById("productTitle");

const productPromotionBadge =
    document.getElementById("productPromotionBadge");

const productPromotionExpired =
    document.getElementById("productPromotionExpired");

const productPrice =
    document.getElementById("productPrice");

const productCategory =
    document.getElementById("productCategory");

const productCondition =
    document.getElementById("productCondition");

const productStock =
    document.getElementById("productStock");

const productLocation =
    document.getElementById("productLocation");

const productDescription =
    document.getElementById("productDescription");

const sellerName =
    document.getElementById("sellerName");

const sellerEmail =
    document.getElementById("sellerEmail");

const sellerPhone =
    document.getElementById("sellerPhone");

const sellerAvatar =
    document.getElementById("sellerAvatar");

const chatSellerButton =
    document.getElementById("chatSellerButton");

const sellerPortfolioButton =
    document.getElementById("sellerPortfolioButton");

const likeButton =
    document.getElementById("likeButton");

const purchaseQuantity =
    document.getElementById("purchaseQuantity");

const buyNowButton =
    document.getElementById("buyNowButton");

const purchaseMessage =
    document.getElementById("purchaseMessage");


const params =
    new URLSearchParams(window.location.search);

const productId =
    params.get("id");


let currentProduct = null;


async function loadProduct() {

    if (!productId) {
        showError();
        return;
    }

    try {

        const response =
            await fetch(`/api/products/${productId}`);

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Product not found"
            );
        }

        currentProduct = data.product;

        renderProduct(currentProduct);

    } catch (error) {

        console.error(
            "Product loading error:",
            error
        );

        showError();
    }
}


function renderProduct(product) {

    productLoading.classList.add("hidden");

    productError.classList.add("hidden");

    productContent.classList.remove("hidden");

    sellerSection.classList.remove("hidden");


    productTitle.textContent =
        product.title;

    const promotionActive =
        product.isPromoted === true &&
        product.promotionEnd &&
        new Date(product.promotionEnd) > new Date();

    const promotionExpired =
        product.promotionEnd &&
        new Date(product.promotionEnd) <= new Date();

    if (productPromotionBadge) {
        productPromotionBadge.classList.toggle(
            "hidden",
            !promotionActive
        );
    }

    if (productPromotionExpired) {
        productPromotionExpired.classList.toggle(
            "hidden",
            !promotionExpired
        );
    }

    productPrice.textContent =
        `${formatPrice(product.price)} ${product.currency || "RWF"}`;

    productCategory.textContent =
        product.category || "Other";

    productCondition.textContent =
        `Condition: ${product.condition || "new"}`;

    productStock.textContent =
        `Stock: ${product.stock ?? 0}`;

    productLocation.textContent =
        `📍 ${product.location || "Location not specified"}`;

    productDescription.textContent =
        product.description;


    renderMedia(product);

    renderSeller(product.seller);


    likeButton.dataset.liked = "false";

    likeButton.textContent =
        `♡ Like (${product.likes || 0})`;

    likeButton.onclick =
        toggleLike;

    loadLikeStatus();


    chatSellerButton.onclick =
        startChatWithSeller;

    sellerPortfolioButton.onclick =
        openSellerPortfolio;

    if (purchaseQuantity) {
        purchaseQuantity.max = String(Math.max(0, Number(product.stock) || 0));
        purchaseQuantity.disabled = !product.stock || Number(product.stock) < 1;
    }

    if (buyNowButton) {
        buyNowButton.disabled = !product.stock || Number(product.stock) < 1;
        buyNowButton.onclick = startPurchase;
    }
}


function renderMedia(product) {

    mainMedia.innerHTML = "";
    mediaList.innerHTML = "";


    const images =
        Array.isArray(product.images)
            ? product.images
            : [];


    if (images.length === 0 && !product.video) {

        mainMedia.textContent =
            "No media available";

        return;
    }


    if (images.length > 0) {

        showImage(images[0]);

        images.forEach(
            (image, index) => {

                const thumb =
                    document.createElement("div");

                thumb.className =
                    "media-thumb";

                if (index === 0) {
                    thumb.classList.add("active");
                }

                thumb.innerHTML =
                    `<img src="${escapeHtml(image)}" alt="Product image">`;

                thumb.onclick = () => {

                    document
                        .querySelectorAll(".media-thumb")
                        .forEach(item =>
                            item.classList.remove("active")
                        );

                    thumb.classList.add("active");

                    showImage(image);
                };

                mediaList.appendChild(thumb);
            }
        );
    }


   if (product.video) {

    const videoThumb =
        document.createElement("div");

    videoThumb.className =
        "video-thumb";

    videoThumb.innerHTML =
        "▶";

    videoThumb.title =
        "View product video";

    videoThumb.onclick = () => {

        document
            .querySelectorAll(".media-thumb, .video-thumb")
            .forEach(item =>
                item.classList.remove("active")
            );

        videoThumb.classList.add("active");

        mainMedia.innerHTML = `
            <video
                src="${escapeHtml(product.video)}"
                controls
                autoplay
                playsinline
            ></video>
        `;
    };

    mediaList.appendChild(videoThumb);
}
}


function showImage(image) {

    mainMedia.innerHTML = `
        <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(currentProduct.title)}"
        >
    `;
}


function renderSeller(seller) {

    if (!seller) {

        sellerName.textContent =
            "Unknown seller";

        return;
    }


    const fullName =
        `${seller.firstName || ""} ${seller.lastName || ""}`.trim();


    sellerName.textContent =
        fullName || "Seller";


    sellerEmail.textContent =
        seller.email || "";


    sellerPhone.textContent =
        seller.phone || "";


    sellerAvatar.textContent =
        (seller.firstName || "S")
            .charAt(0)
            .toUpperCase();
}


function openSellerPortfolio() {

    if (!currentProduct?.seller?._id) {

        alert("Seller information unavailable.");

        return;
    }

    const sellerId =
        currentProduct.seller._id;

    window.location.href =
        `/portfolio.html?seller=${sellerId}`;
}


async function loadLikeStatus() {

    const token =
        localStorage.getItem("token");

    if (!token || !currentProduct?._id) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/product-likes/${currentProduct._id}/status`,
                {
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
                "Failed to load like status"
            );
        }

        currentProduct.likes =
            Number(data.likes) || 0;

        likeButton.dataset.liked =
            data.liked
                ? "true"
                : "false";

        likeButton.textContent =
            data.liked
                ? `♥ Liked (${currentProduct.likes})`
                : `♡ Like (${currentProduct.likes})`;

    } catch (error) {

        console.error(
            "Like status error:",
            error
        );
    }
}


async function toggleLike() {

    const token =
        localStorage.getItem("token");

    if (!token) {
        window.location.href =
            "/login.html";
        return;
    }

    if (!currentProduct?._id) {
        return;
    }

    const isLiked =
        likeButton.dataset.liked === "true";

    const method =
        isLiked
            ? "DELETE"
            : "POST";

    try {

        likeButton.disabled = true;

        const response =
            await fetch(
                `/api/product-likes/${currentProduct._id}`,
                {
                    method,
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
                "Failed to update like"
            );
        }

        currentProduct.likes =
            Number(data.likes) || 0;

        likeButton.dataset.liked =
            data.liked
                ? "true"
                : "false";

        likeButton.textContent =
            data.liked
                ? `♥ Liked (${currentProduct.likes})`
                : `♡ Like (${currentProduct.likes})`;

    } catch (error) {

        console.error(
            "Like error:",
            error
        );

    } finally {

        likeButton.disabled = false;
    }
}


function startChatWithSeller() {

    if (!currentProduct?.seller?._id) {

        alert("Seller information unavailable.");

        return;
    }


    const token =
        localStorage.getItem("token");


    if (!token) {

        window.location.href =
            "/login.html";

        return;
    }


    const sellerId =
        currentProduct.seller._id;


    window.location.href =
        `/chat.html?seller=${sellerId}`;
}


async function startPurchase() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    if (!currentProduct?._id) {
        showPurchaseMessage("Product information is unavailable.", true);
        return;
    }

    const quantity = Number(purchaseQuantity?.value);

    if (!Number.isInteger(quantity) || quantity < 1) {
        showPurchaseMessage("Enter a valid quantity of at least 1.", true);
        return;
    }

    if (quantity > Number(currentProduct.stock || 0)) {
        showPurchaseMessage("The requested quantity exceeds available stock.", true);
        return;
    }

    buyNowButton.disabled = true;
    purchaseQuantity.disabled = true;
    buyNowButton.textContent = "Creating order...";

    let orderId = null;

    try {
        const orderResponse = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                productId: currentProduct._id,
                quantity
            })
        });

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
            throw new Error(orderData.message || "Unable to create the order.");
        }

        orderId = orderData.order?._id;

        if (!orderId) {
            throw new Error("The order was created, but its ID was not returned. Check My Orders.");
        }

        showPurchaseMessage("Order created. Sending the MTN MoMo payment request...");

        const paymentResponse = await fetch(
            `/api/orders/${encodeURIComponent(orderId)}/pay`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
            showPurchaseMessage(
                `Order created (${orderId}), but payment could not be started: ${paymentData.message || "Please check My Orders."}`,
                true,
                orderId
            );
            return;
        }

        showPurchaseMessage(
            paymentData.message ||
                "Payment request sent. Approve it on your registered phone, then check payment status.",
            false,
            orderId
        );
    } catch (error) {
        console.error("Purchase error:", error);

        showPurchaseMessage(
            orderId
                ? `Order ${orderId} may already exist. Check My Orders before trying to purchase again. ${error.message}`
                : error.message || "Unable to create the order.",
            true,
            orderId
        );
    } finally {
        buyNowButton.disabled = false;
        purchaseQuantity.disabled = false;
        buyNowButton.textContent = "🛒 Buy Now";
    }
}

function showPurchaseMessage(message, isError = false, orderId = null) {
    if (!purchaseMessage) return;

    purchaseMessage.textContent = message;
    purchaseMessage.classList.toggle("error", isError);
    purchaseMessage.classList.toggle("success", !isError);

    if (orderId) {
        const checkButton = document.createElement("button");
        checkButton.type = "button";
        checkButton.className = "check-payment-button";
        checkButton.textContent = "Check Payment Status";
        checkButton.addEventListener("click", () => checkPurchasePayment(orderId, checkButton));

        const ordersLink = document.createElement("a");
        ordersLink.href = "/my-orders.html";
        ordersLink.textContent = " View My Orders";

        purchaseMessage.append(document.createTextNode(" "));
        purchaseMessage.append(checkButton, ordersLink);
    }
}

async function checkPurchasePayment(orderId, button) {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    button.disabled = true;
    button.textContent = "Checking...";

    try {
        const response = await fetch(
            `/api/orders/${encodeURIComponent(orderId)}/payment-status`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to check payment status.");
        }

        if (data.paymentStatus === "successful") {
            showPurchaseMessage(
                "Payment confirmed successfully! Your order is now paid.",
                false,
                orderId
            );
        } else if (data.paymentStatus === "failed") {
            showPurchaseMessage(
                "Payment failed or was rejected. Check My Orders before trying again.",
                true,
                orderId
            );
        } else {
            showPurchaseMessage(
                "Payment is still pending. Approve the MTN MoMo request on your phone, then check again.",
                false,
                orderId
            );
        }
    } catch (error) {
        console.error("Payment status error:", error);
        showPurchaseMessage(error.message || "Unable to check payment status.", true, orderId);
    }
}

function formatPrice(price) {

    return new Intl.NumberFormat(
        "en-RW"
    ).format(Number(price || 0));
}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showError() {

    productLoading.classList.add("hidden");

    productContent.classList.add("hidden");

    sellerSection.classList.add("hidden");

    productError.classList.remove("hidden");
}


loadProduct();
