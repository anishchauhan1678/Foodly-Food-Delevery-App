import { AppState } from "./state.js";
import { saveCart, loadCart } from "./storage.js";
import { showToast } from "./utils.js";
import {
    calculateCouponDiscount,
    clearAppliedCoupon,
    getAvailableCoupons,
    getCurrentAppliedCoupon,
    normalizeCouponCode,
    saveAppliedCoupon,
    validateCoupon
} from "./coupons.js";

const DEFAULT_DELIVERY_FEE = 40;
const MAX_QUANTITY = 10;
const PLACEHOLDER = "../assets/placeholder-food.svg";

const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
};
const money = amount => `₹${Math.round(Number(amount) || 0).toLocaleString("en-IN")}`;
const foodFor = item => AppState.foods.find(food => food.id === item.foodId);
const restaurantFor = food => AppState.restaurants.find(restaurant => restaurant.id === food?.restaurantId);
const getBaseDeliveryFee = () => Number(AppState.settings?.deliveryFee) || DEFAULT_DELIVERY_FEE;

function getCartQuantityCount() {
    return AppState.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

function imageFor(food) {
    const image = document.createElement("img");
    image.src = food.image || PLACEHOLDER;
    image.alt = food.name;
    image.loading = "lazy";
    image.addEventListener("error", () => { if (!image.src.endsWith(PLACEHOLDER)) image.src = PLACEHOLDER; }, { once: true });
    return image;
}

function normalizeCart() {
    if (!Array.isArray(AppState.cart)) {
        AppState.cart = [];
    }

    if (!AppState.foods || !AppState.foods.length) {
        AppState.cart = Array.isArray(loadCart()) ? loadCart() : AppState.cart;
        return;
    }

    const valid = [];
    const byId = new Map();
    for (const stored of Array.isArray(AppState.cart) ? AppState.cart : []) {
        const food = foodFor(stored);
        const quantity = Math.floor(Number(stored?.quantity));
        if (!food || !Number.isFinite(quantity) || quantity < 1) continue;
        const existing = byId.get(food.id);
        if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
        else {
            const item = { foodId: food.id, restaurantId: food.restaurantId, name: food.name, price: food.discountPrice ?? food.price, image: food.image, quantity: Math.min(MAX_QUANTITY, quantity) };
            byId.set(food.id, item);
            valid.push(item);
        }
    }
    AppState.cart = valid;
    saveCart(valid);
}

export function getCartItemCount() { return getCartQuantityCount(); }
export function calculateSubtotal() { return AppState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0); }
export function calculateDeliveryFee() {
    if (!AppState.cart.length) return 0;
    const baseFee = getBaseDeliveryFee();
    const activeCoupon = getCurrentAppliedCoupon();

    if (!activeCoupon || activeCoupon.type !== "delivery") return baseFee;

    const validation = validateCoupon(activeCoupon.code, calculateSubtotal(), baseFee);
    if (!validation.valid) return baseFee;

    const discount = Math.min(baseFee, Number(activeCoupon.maxDiscount || activeCoupon.value || baseFee));
    return Math.max(0, baseFee - discount);
}
export function calculateDiscount() {
    const subtotal = calculateSubtotal();
    const coupon = getCurrentAppliedCoupon();
    if (!coupon) return 0;
    const validation = validateCoupon(coupon.code, subtotal, getBaseDeliveryFee());
    if (!validation.valid) return 0;
    return calculateCouponDiscount(coupon, subtotal, getBaseDeliveryFee());
}
export function calculateGrandTotal() { return Math.max(0, calculateSubtotal() + calculateDeliveryFee() - calculateDiscount()); }

function updateCount() {
    const count = getCartQuantityCount();
    document.querySelectorAll(".cart-count").forEach(element => {
        element.textContent = count;
        element.classList.remove("cart-bump");
        void element.offsetWidth;
        element.classList.add("cart-bump");
    });
    const itemCountText = document.querySelector("#cart-item-count");
    if (itemCountText) {
        itemCountText.textContent = count === 1 ? "1 item in your cart" : `${count} items in your cart`;
    }
}

function commit() {
    saveCart(AppState.cart);
    renderCart();
}

function changeQuantity(foodId, delta) {
    const item = AppState.cart.find(entry => entry.foodId === foodId);
    if (!item) return;
    item.quantity = Math.max(1, Math.min(MAX_QUANTITY, item.quantity + delta));
    commit();
}

function removeItem(foodId) {
    AppState.cart = AppState.cart.filter(item => item.foodId !== foodId);
    saveCart(AppState.cart);
    showToast("Item removed from cart.");
    renderCart();
}

function renderItem(item) {
    const food = foodFor(item);
    if (!food) return null;
    const restaurant = restaurantFor(food);
    const card = el("article", "cart-item");
    card.append(imageFor(food));
    const content = el("div", "cart-item-content");
    const heading = el("div", "cart-item-heading");
    const link = el("a", "cart-food-name", food.name);
    link.href = `food.html?id=${encodeURIComponent(food.id)}`;
    heading.append(link);
    const remove = el("button", "remove-item", "Remove");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${food.name}`);
    remove.addEventListener("click", () => removeItem(food.id));
    heading.append(remove);
    content.append(
        heading,
        el("p", "cart-muted", `Restaurant: ${restaurant?.name || "Unavailable"}`),
        el("p", "cart-muted", `Category: ${food.categoryId || "General"}`),
        el("p", "cart-muted", `Price per item: ${money(item.price)}`)
    );
    const footer = el("div", "cart-item-footer");
    const controls = el("div", "cart-quantity-controls");
    const minus = el("button", "quantity-button", "−");
    const quantity = el("span", "cart-quantity", item.quantity);
    const plus = el("button", "quantity-button", "+");
    minus.type = plus.type = "button";
    minus.setAttribute("aria-label", `Decrease quantity of ${food.name}`);
    plus.setAttribute("aria-label", `Increase quantity of ${food.name}`);
    minus.addEventListener("click", () => changeQuantity(food.id, -1));
    plus.addEventListener("click", () => changeQuantity(food.id, 1));
    controls.append(minus, quantity, plus);
    footer.append(controls, el("strong", "cart-item-total", `Item total: ${money(item.price * item.quantity)}`));
    content.append(footer);
    card.append(content);
    return card;
}

function renderSummary() {
    const subtotal = calculateSubtotal();
    const deliveryFee = calculateDeliveryFee();
    const discount = calculateDiscount();
    const total = calculateGrandTotal();
    const subtotalNode = document.querySelector("#cart-subtotal");
    const deliveryNode = document.querySelector("#cart-delivery");
    const discountNode = document.querySelector("#cart-discount");
    const totalNode = document.querySelector("#cart-total");
    if (subtotalNode) subtotalNode.textContent = money(subtotal);
    if (deliveryNode) deliveryNode.textContent = money(deliveryFee);
    if (discountNode) discountNode.textContent = money(discount);
    if (totalNode) totalNode.textContent = money(total);
}

function renderCouponList() {
    const list = document.querySelector("#coupon-list");
    if (!list) return;
    list.replaceChildren();
    getAvailableCoupons().forEach(coupon => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "coupon-chip";
        item.textContent = coupon.code;
        item.setAttribute("aria-label", `Use coupon ${coupon.code}`);
        item.addEventListener("click", () => {
            const input = document.querySelector("#coupon-code");
            if (input) {
                input.value = coupon.code;
                input.focus();
            }
        });
        list.append(item);
    });
}

function renderCouponState() {
    const form = document.querySelector("#coupon-form");
    const emptyState = document.querySelector("#coupon-empty-state");
    const appliedState = document.querySelector("#coupon-applied");
    const message = document.querySelector("#coupon-message");
    const hasItems = AppState.cart.length > 0;
    const activeCoupon = getCurrentAppliedCoupon();
    const activeCode = activeCoupon ? normalizeCouponCode(activeCoupon.code) : "";

    if (message) {
        message.className = "coupon-message";
    }

    if (!hasItems) {
        if (form) form.hidden = true;
        if (appliedState) appliedState.hidden = true;
        if (emptyState) emptyState.hidden = false;
        if (message) {
            message.textContent = "Your cart is empty. Add some delicious food before applying a coupon.";
            message.classList.add("warning");
        }
        return;
    }

    if (form) form.hidden = false;
    if (emptyState) emptyState.hidden = true;

    if (activeCoupon) {
        if (appliedState) {
            appliedState.hidden = false;
            const codeNode = appliedState.querySelector("#applied-coupon-code");
            const discountNode = appliedState.querySelector("#applied-coupon-discount");
            if (codeNode) codeNode.textContent = activeCode;
            if (discountNode) discountNode.textContent = `Discount: -${money(calculateDiscount())}`;
        }
        if (form) form.hidden = true;
        if (message) {
            message.textContent = `Coupon ${activeCode} applied successfully.`;
            message.classList.add("success");
        }
    } else {
        if (appliedState) appliedState.hidden = true;
        if (message) {
            message.textContent = "Use a valid Foodly coupon for eligible orders.";
            message.classList.add("info");
        }
    }
}

function handleCouponSubmit(event) {
    event.preventDefault();
    const input = document.querySelector("#coupon-code");
    const message = document.querySelector("#coupon-message");
    if (!input) return;

    const code = normalizeCouponCode(input.value);
    if (!AppState.cart.length) {
        const msg = "Your cart is empty. Add some delicious food before applying a coupon.";
        if (message) {
            message.textContent = msg;
            message.className = "coupon-message warning";
        }
        showToast(msg);
        return;
    }

    if (!code) {
        const msg = "Enter a coupon code to continue.";
        if (message) {
            message.textContent = msg;
            message.className = "coupon-message warning";
        }
        showToast(msg);
        return;
    }

    const activeCoupon = getCurrentAppliedCoupon();
    if (activeCoupon && normalizeCouponCode(activeCoupon.code) !== code) {
        const msg = "A coupon is already applied. Remove it before applying another coupon.";
        if (message) {
            message.textContent = msg;
            message.className = "coupon-message warning";
        }
        showToast(msg);
        return;
    }

    const validation = validateCoupon(code, calculateSubtotal(), getBaseDeliveryFee());
    if (!validation.valid) {
        if (message) {
            message.textContent = validation.message;
            message.className = `coupon-message ${validation.reason === "invalid" ? "error" : "warning"}`;
        }
        showToast(validation.message);
        return;
    }

    saveAppliedCoupon(code);
    input.value = code;
    renderCouponState();
    renderSummary();
    showToast(validation.message);
}

function handleRemoveCoupon() {
    clearAppliedCoupon();
    const message = document.querySelector("#coupon-message");
    if (message) {
        message.textContent = "Coupon removed.";
        message.className = "coupon-message info";
    }
    showToast("Coupon removed.");
    renderCouponState();
    renderSummary();
}

function setup() {
    const clearButton = document.querySelector("#clear-cart-button");
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (!window.confirm("Are you sure you want to clear your cart?")) return;
            AppState.cart = [];
            clearAppliedCoupon();
            saveCart([]);
            showToast("Cart cleared.");
            renderCart();
        });
    }

    const couponForm = document.querySelector("#coupon-form");
    if (couponForm) {
        couponForm.addEventListener("submit", handleCouponSubmit);
    }

    const couponInput = document.querySelector("#coupon-code");
    if (couponInput) {
        couponInput.addEventListener("input", () => {
            couponInput.value = normalizeCouponCode(couponInput.value);
        });
    }

    const removeButton = document.querySelector("#remove-coupon-button");
    if (removeButton) {
        removeButton.addEventListener("click", handleRemoveCoupon);
    }

    renderCouponList();
    renderCart();
}

export function renderCart() {
    const savedCart = loadCart();
    if (Array.isArray(savedCart) && savedCart.length && !AppState.cart.length) {
        AppState.cart = savedCart;
    }
    normalizeCart();
    const activeCoupon = getCurrentAppliedCoupon();
    if (activeCoupon) {
        const validation = validateCoupon(activeCoupon.code, calculateSubtotal(), getBaseDeliveryFee());
        if (!validation.valid) {
            clearAppliedCoupon();
        }
    }
    if (!AppState.cart.length) {
        clearAppliedCoupon();
    }
    updateCount();
    const hasItems = AppState.cart.length > 0;
    const list = document.querySelector("#cart-items");
    const emptySection = document.querySelector("#cart-empty");
    const summary = document.querySelector("#cart-summary");
    const actions = document.querySelector("#cart-actions");
    if (emptySection) emptySection.hidden = hasItems;
    if (summary) summary.hidden = !hasItems;
    if (actions) actions.hidden = !hasItems;
    if (list) {
        list.hidden = !hasItems;
        list.replaceChildren();
    }
    if (!hasItems) {
        renderCouponState();
        return;
    }
    const fragment = document.createDocumentFragment();
    AppState.cart.forEach(item => { const card = renderItem(item); if (card) fragment.append(card); });
    list.append(fragment);
    renderSummary();
    renderCouponState();
}

if (document.querySelector("#cart-page")) {
    if (AppState.initialized) setup();
    else {
        document.addEventListener("app:initialized", setup, { once: true });
        window.setTimeout(() => { if (AppState.initialized && document.querySelector("#cart-items") && document.querySelector("#cart-items").hidden) setup(); }, 500);
    }
}
