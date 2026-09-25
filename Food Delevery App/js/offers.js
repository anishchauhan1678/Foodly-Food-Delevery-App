import { AppState } from "./state.js";
import { getAvailableCoupons, normalizeCouponCode, validateCoupon, clearAppliedCoupon, saveAppliedCoupon, getCurrentAppliedCoupon } from "./coupons.js";
import { calculateSubtotal, calculateDeliveryFee } from "./cart-page.js";
import { showToast } from "./utils.js";

const money = amount => `₹${Math.round(Number(amount) || 0).toLocaleString("en-IN")}`;

async function copyCoupon(code) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(code);
        } else {
            const helper = document.createElement("textarea");
            helper.value = code;
            helper.setAttribute("readonly", "true");
            helper.style.position = "fixed";
            helper.style.left = "-9999px";
            document.body.appendChild(helper);
            helper.select();
            document.execCommand("copy");
            helper.remove();
        }
        showToast("Coupon code copied!");
    } catch (error) {
        console.error("Unable to copy coupon code.", error);
        showToast("Unable to copy coupon code.");
    }
}

function applyCoupon(code) {
    const normalizedCode = normalizeCouponCode(code);
    const activeCoupon = getCurrentAppliedCoupon();

    if (!AppState.cart || !AppState.cart.length) {
        showToast("Add items to your cart to apply this coupon.");
        return;
    }

    if (activeCoupon && normalizeCouponCode(activeCoupon.code) !== normalizedCode) {
        showToast("A coupon is already applied. Remove it before applying another coupon.");
        return;
    }

    const validation = validateCoupon(normalizedCode, calculateSubtotal(), calculateDeliveryFee());
    if (!validation.valid) {
        showToast(validation.message);
        return;
    }

    saveAppliedCoupon(normalizedCode);
    showToast(`Coupon ${normalizedCode} applied successfully.`);
    window.location.href = "cart.html";
}

function renderCouponCards() {
    const container = document.querySelector("#offers-list");
    if (!container) return;

    const coupons = getAvailableCoupons();
    container.replaceChildren();

    if (!coupons.length) {
        container.innerHTML = '<div class="empty-state"><div class="state-icon" aria-hidden="true">🎁</div><h2 class="state-title">No offers available</h2><p class="state-message">Check back later for new Foodly offers.</p></div>';
        return;
    }

    coupons.forEach(coupon => {
        const card = document.createElement("article");
        card.className = "offer-card";

        const badge = document.createElement("span");
        badge.className = "offer-badge";
        badge.textContent = coupon.category || "Offer";

        const title = document.createElement("h3");
        title.textContent = coupon.title;

        const description = document.createElement("p");
        description.textContent = coupon.description;

        const codeBox = document.createElement("div");
        codeBox.className = "offer-code-box";
        const codeLabel = document.createElement("span");
        codeLabel.textContent = coupon.code;
        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "coupon-copy-btn";
        copyButton.textContent = "Copy code";
        copyButton.setAttribute("aria-label", `Copy ${coupon.code} coupon code`);
        copyButton.addEventListener("click", () => copyCoupon(coupon.code));
        codeBox.append(codeLabel, copyButton);

        const meta = document.createElement("div");
        meta.className = "offer-meta";
        meta.innerHTML = `
            <span>Minimum order: ${money(coupon.minOrder)}</span>
            <span>Max discount: ${money(coupon.maxDiscount || coupon.value || 0)}</span>
            <span>Valid until: ${new Date(coupon.expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
        `;

        const actions = document.createElement("div");
        actions.className = "offer-actions";

        const applyButton = document.createElement("button");
        applyButton.type = "button";
        applyButton.className = "coupon-apply-btn";
        applyButton.textContent = "Apply";
        applyButton.setAttribute("aria-label", `Apply ${coupon.code} coupon`);
        applyButton.addEventListener("click", () => applyCoupon(coupon.code));

        actions.append(copyButton.cloneNode(true), applyButton);

        card.append(badge, title, description, codeBox, meta, actions);
        container.append(card);
    });
}

function bindFilters() {
    const pills = document.querySelectorAll(".filter-pill");
    pills.forEach(pill => {
        pill.addEventListener("click", () => {
            pills.forEach(item => item.classList.toggle("active", item === pill));
        });
    });
}

function initializeOffersPage() {
    renderCouponCards();
    bindFilters();
}

if (document.querySelector("#offers-page")) {
    if (AppState.initialized) {
        initializeOffersPage();
    } else {
        document.addEventListener("app:initialized", initializeOffersPage, { once: true });
    }
}
