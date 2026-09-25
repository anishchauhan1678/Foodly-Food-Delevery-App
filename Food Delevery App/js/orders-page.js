import { AppState } from "./state.js";
import { getCurrentUser } from "./auth.js";
import { normalizeOrder, getDisplayOrderId, getOrderSummaryCount, ORDER_STATUS_LABELS, canCancelOrder, updateOrderStatus } from "./order-status.js";
import { saveCart } from "./storage.js";

function money(value) {
    return `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function getRestaurantNames(order) {
    const names = new Set();
    if (order.restaurant) names.add(order.restaurant);
    for (const item of order.items || []) {
        const food = AppState.foods.find(entry => entry.id === item.foodId);
        const restaurant = AppState.restaurants.find(entry => entry.id === (item.restaurantId || food?.restaurantId));
        if (restaurant?.name) names.add(restaurant.name);
    }
    return [...names];
}

function isOrderForCurrentUser(order, currentUser) {
    const belongsToUser = order.userId && currentUser?.id && order.userId === currentUser.id;
    return belongsToUser || (!order.userId && !order.customer?.email);
}

function getVisibleOrders() {
    const currentUser = getCurrentUser();
    const orders = Array.isArray(AppState.orders) ? AppState.orders.map(normalizeOrder).filter(Boolean) : [];
    const filter = document.querySelector("#orders-filter")?.value || "all";
    const search = document.querySelector("#orders-search")?.value || "";
    const sort = document.querySelector("#orders-sort")?.value || "newest";

    if (!currentUser) {
        return [];
    }

    let result = orders.filter(order => {
        if (!isOrderForCurrentUser(order, currentUser)) return false;
        if (filter === "active") {
            return ["placed", "accepted", "preparing", "out_for_delivery"].includes(order.status);
        }
        if (filter === "delivered") {
            return order.status === "delivered";
        }
        if (filter === "cancelled") return order.status === "cancelled";
        return true;
    });

    if (search.trim()) {
        const term = search.trim().toLowerCase();
        result = result.filter(order => {
            const itemNames = (order.items || []).map(item => item.name || "").join(" ");
            const restaurantNames = getRestaurantNames(order).join(" ");
            return [getDisplayOrderId(order), order.id, itemNames, restaurantNames].some(value => String(value || "").toLowerCase().includes(term));
        });
    }

    result = [...result].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.orderDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.orderDate || 0).getTime();
        return sort === "oldest" ? timeA - timeB : timeB - timeA;
    });

    return result;
}

function reorder(orderId) {
    const order = AppState.orders.map(normalizeOrder).find(entry => entry?.id === orderId);
    if (!order) return;

    const cartByFoodId = new Map((Array.isArray(AppState.cart) ? AppState.cart : []).map(item => [item.foodId, { ...item }]));
    for (const item of order.items || []) {
        const food = AppState.foods.find(entry => entry.id === item.foodId) || AppState.foods.find(entry => entry.name?.toLowerCase() === item.name?.toLowerCase());
        if (!food) continue;
        const existing = cartByFoodId.get(food.id);
        if (existing) existing.quantity = Math.min(10, (Number(existing.quantity) || 0) + (Number(item.quantity) || 0));
        else cartByFoodId.set(food.id, { foodId: food.id, restaurantId: food.restaurantId, name: food.name, price: food.discountPrice ?? food.price, image: food.image, quantity: Math.min(10, Number(item.quantity) || 1) });
    }
    AppState.cart = [...cartByFoodId.values()];
    saveCart(AppState.cart);
    window.location.href = "cart.html";
}

function renderOrders() {
    const container = document.querySelector("#orders-list");
    const empty = document.querySelector("#orders-empty");
    const loginPrompt = document.querySelector("#orders-login-prompt");
    const search = document.querySelector("#orders-search");
    if (!container) return;

    const currentUser = getCurrentUser();
    const allOrders = Array.isArray(AppState.orders) ? AppState.orders.map(normalizeOrder).filter(order => order && isOrderForCurrentUser(order, currentUser)) : [];
    const countNode = document.querySelector("#total-orders-count");
    const activeNode = document.querySelector("#active-orders-count");
    const deliveredNode = document.querySelector("#delivered-orders-count");
    if (countNode) countNode.textContent = allOrders.length;
    if (activeNode) activeNode.textContent = allOrders.filter(order => ["placed", "accepted", "preparing", "out_for_delivery"].includes(order.status)).length;
    if (deliveredNode) deliveredNode.textContent = allOrders.filter(order => order.status === "delivered").length;
    if (!currentUser) {
        container.innerHTML = "";
        if (loginPrompt) loginPrompt.hidden = false;
        if (empty) empty.classList.add("hidden");
        return;
    }

    if (loginPrompt) loginPrompt.hidden = true;

    const orders = getVisibleOrders();
    if (!orders.length) {
        container.innerHTML = "";
        const hasFilters = search?.value.trim() || document.querySelector("#orders-filter")?.value !== "all";
        if (hasFilters) {
            container.innerHTML = '<div class="empty-orders empty-state"><div class="empty-orders-icon state-icon">🔎</div><h2 class="state-title">No matching orders found.</h2><p class="state-message">Try another order, restaurant, or food item.</p><button class="secondary-button state-action" type="button" id="clear-order-filters">Clear Filters</button></div>';
            document.querySelector("#clear-order-filters")?.addEventListener("click", () => {
                if (search) search.value = "";
                const filter = document.querySelector("#orders-filter");
                if (filter) filter.value = "all";
                renderOrders();
            });
            if (empty) empty.classList.add("hidden");
            return;
        }
        if (empty) empty.classList.remove("hidden");
        return;
    }

    if (empty) empty.classList.add("hidden");
    container.innerHTML = orders.map(order => {
        const date = new Date(order.createdAt || order.orderDate || Date.now());
        const items = order.items || [];
        const restaurantNames = getRestaurantNames(order);
        const itemSummary = items.slice(0, 3).map(item => `${escapeHtml(item.name || "Food item")} × ${Number(item.quantity) || 0}`).join("<br>");
        const active = !["delivered", "cancelled"].includes(order.status);
        return `
        <article class="order-card">
            <div class="order-card-header">
                <div>
                    <p class="eyebrow">📦 ${escapeHtml(getDisplayOrderId(order))}</p>
                    <h3>${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</h3>
                </div>
                <span class="status-pill status-${order.status}">${escapeHtml(ORDER_STATUS_LABELS[order.status] || order.status)}</span>
            </div>
            ${restaurantNames.length ? `<p class="order-restaurant">${escapeHtml(restaurantNames.join(" · "))}</p>` : ""}
            <p class="order-items">${itemSummary || "No item details available"}</p>
            <p class="order-item-count">${getOrderSummaryCount(order)} ${getOrderSummaryCount(order) === 1 ? "item" : "items"}</p>
            <p class="order-total"><strong>Total: ${money(order.total || order.subtotal || 0)}</strong></p>
            <div class="order-card-actions">
                <a class="secondary-button" href="order-details.html?order=${encodeURIComponent(order.orderCode || order.id)}">View Details</a>
                ${active ? `<a class="primary-button" href="track-order.html?order=${encodeURIComponent(order.orderCode || order.id)}">Track Order</a>` : ""}
                <button type="button" class="secondary-button" data-reorder-order="${escapeHtml(order.id)}">Reorder</button>
                ${canCancelOrder(order) ? `<button type="button" class="btn btn-danger" data-cancel-order="${order.id}">Cancel Order</button>` : ""}
            </div>
        </article>
    `;
    }).join("");

    container.querySelectorAll("[data-reorder-order]").forEach(button => button.addEventListener("click", () => reorder(button.dataset.reorderOrder)));

    container.querySelectorAll("[data-cancel-order]").forEach(button => {
        button.addEventListener("click", () => {
            const orderId = button.dataset.cancelOrder;
            if (!orderId || !window.confirm("Cancel this order?")) return;
            const result = updateOrderStatus(orderId, "cancelled");
            if (result.ok) {
                renderOrders();
            }
        });
    });
}

function setupOrdersPage() {
    const search = document.querySelector("#orders-search");
    const filter = document.querySelector("#orders-filter");
    const sort = document.querySelector("#orders-sort");

    [search, filter, sort].forEach(control => {
        if (control) control.addEventListener("input", renderOrders);
        if (control) control.addEventListener("change", renderOrders);
    });

    renderOrders();
}

if (document.querySelector("#orders-page")) {
    if (AppState.initialized) {
        setupOrdersPage();
    } else {
        document.addEventListener("app:initialized", setupOrdersPage, { once: true });
    }
    document.addEventListener("orders:updated", renderOrders);
}
