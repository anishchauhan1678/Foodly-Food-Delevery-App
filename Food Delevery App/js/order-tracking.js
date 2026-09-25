import { AppState } from "./state.js";
import { findOrderById, getDisplayOrderId, ORDER_STATUS_LABELS, normalizeOrder, updateOrderStatus } from "./order-status.js";

const TRACKING_STEPS = [
    { status: "placed", label: "Order Placed", icon: "✓", description: "Your order has been received." },
    { status: "preparing", label: "Preparing", icon: "🍳", description: "The restaurant is preparing your food." },
    { status: "out_for_delivery", label: "Out for Delivery", icon: "🛵", description: "Your order is on the way." },
    { status: "delivered", label: "Delivered", icon: "✓", description: "Enjoy your meal." }
];

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function money(value) {
    return `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
}

function getStatusIndex(status) {
    if (status === "accepted") return 1;
    return Math.max(0, TRACKING_STEPS.findIndex(step => step.status === status));
}

function getStatusCopy(status) {
    return {
        placed: "Your order has been received.",
        accepted: "The restaurant has accepted your order.",
        preparing: "The restaurant is preparing your food.",
        out_for_delivery: "Your order is on the way.",
        delivered: "Your order has been delivered.",
        cancelled: "This order has been cancelled."
    }[status] || "Your order status is being prepared.";
}

function getAddress(order) {
    if (order.addressId) {
        try {
            const saved = JSON.parse(localStorage.getItem("foodlyAddresses") || "[]");
            const match = Array.isArray(saved) ? saved.find(address => address.id === order.addressId) : null;
            if (match) {
                return {
                    fullName: match.fullName,
                    phone: match.phone,
                    house: match.house,
                    street: match.area,
                    city: match.city,
                    state: match.state,
                    pincode: match.pin,
                    landmark: match.landmark
                };
            }
        } catch (error) {
            console.warn("Unable to read saved delivery address.", error);
        }
    }
    const directAddress = order.address || order.deliveryAddress || {};
    return { ...directAddress, fullName: order.customer?.name || directAddress.fullName || "", phone: order.customer?.mobile || directAddress.phone || "" };
}

function renderTimeline(order) {
    const currentIndex = getStatusIndex(order.status);
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    return `<div class="track-timeline" aria-label="Order progress">${TRACKING_STEPS.map((step, index) => {
        const completed = index < currentIndex || order.status === "delivered";
        const current = index === currentIndex && order.status !== "delivered";
        const historyEntry = history.find(entry => entry.status === step.status);
        const timestamp = historyEntry?.timestamp ? new Date(historyEntry.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
        return `<div class="timeline-step ${completed ? "completed" : ""} ${current ? "current" : "upcoming"}">
            <div class="timeline-marker" aria-hidden="true">${completed ? "✓" : current ? "●" : "○"}</div>
            <div class="timeline-copy"><strong>${step.label}</strong><span>${step.description}</span>${timestamp ? `<small>${timestamp}</small>` : ""}</div>
        </div>`;
    }).join("")}</div>`;
}

function renderAddress(order) {
    const address = getAddress(order);
    const lines = [address.house || address.houseNo, address.street || address.area, [address.city, address.state].filter(Boolean).join(", ") + (address.pincode ? ` - ${address.pincode}` : "")].filter(Boolean);
    return `<section class="track-section"><div class="section-label">Delivery information</div><h2>📍 Delivery address</h2>${address.fullName ? `<p><strong>${escapeHtml(address.fullName)}</strong></p>` : ""}${address.phone ? `<p class="track-muted">📱 ${escapeHtml(address.phone)}</p>` : ""}${lines.length ? lines.map(line => `<p>${escapeHtml(line)}</p>`).join("") : `<p class="track-muted">Address information unavailable.</p>`}${address.landmark ? `<p class="track-muted">Landmark: ${escapeHtml(address.landmark)}</p>` : ""}</section>`;
}

function renderItems(order) {
    return `<section class="track-section"><div class="section-label">Order summary</div><h2>🍽️ Ordered items</h2><div class="track-items">${(order.items || []).map(item => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        return `<div class="track-item"><div><strong>${escapeHtml(item.name || "Food item")}</strong><span>${money(price)} × ${quantity}</span></div><strong>${money(price * quantity)}</strong></div>`;
    }).join("") || `<p class="track-muted">Item information unavailable.</p>`}</div></section>`;
}

function renderPayment(order) {
    if (!order.paymentMethod && !order.paymentStatus) return "";
    return `<section class="track-payment"><div><span>Payment method</span><strong>${escapeHtml(order.paymentMethod || "Unavailable")}</strong></div><div><span>Payment status</span><strong>${escapeHtml(order.paymentStatus || "Unavailable")}</strong></div></section>`;
}

function renderNotFound(container) {
    container.innerHTML = `<section class="track-empty error-state"><div class="track-empty-icon state-icon">🚚</div><h1 class="state-title">Order Not Found</h1><p class="state-message">We couldn't find the order you're looking for.</p><a class="primary-button state-action" href="orders.html">View My Orders</a></section>`;
}

function renderTracking() {
    const container = document.querySelector("#tracking-content");
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const requestedOrderId = params.get("order") || params.get("orderId") || params.get("id");
    const fallbackOrder = AppState.orders[0];
    const orderId = requestedOrderId || fallbackOrder?.orderCode || fallbackOrder?.id || "ORD-B81104";
    const order = findOrderById(orderId);

    if (!order) return renderNotFound(container);

    const normalizedOrder = normalizeOrder(order);
    const devMode = localStorage.getItem("foodDelivery_devMode") === "true";
    const orderCode = getDisplayOrderId(normalizedOrder);
    const currentStatus = ORDER_STATUS_LABELS[normalizedOrder.status] || normalizedOrder.status;
    const date = new Date(normalizedOrder.createdAt || normalizedOrder.orderDate || Date.now());
    const cancelled = normalizedOrder.status === "cancelled";
    const estimate = normalizedOrder.estimatedDeliveryTime || "25-35 min";

    container.innerHTML = `
        <a class="track-back" href="orders.html">← Back to Orders</a>
        <header class="track-hero"><div><p class="track-eyebrow">Track your order</p><h1>${cancelled ? "Order Cancelled" : "Track Your Order"}</h1><p>Order <strong>${escapeHtml(orderCode)}</strong> · Placed on ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div><span class="track-demo-badge">Frontend demo</span></header>
        <section class="track-status-card ${cancelled ? "cancelled" : "status-" + normalizedOrder.status}"><div class="track-status-icon">${cancelled ? "❌" : "🚚"}</div><div><p class="track-eyebrow">Current status</p><h2>${escapeHtml(cancelled ? "Order Cancelled" : currentStatus)}</h2><p>${getStatusCopy(normalizedOrder.status)}</p></div><div class="track-estimate"><span>Estimated delivery</span><strong>${cancelled || normalizedOrder.status === "delivered" ? "--" : escapeHtml(estimate)}</strong>${!cancelled && normalizedOrder.estimatedDeliveryTime ? "" : !cancelled ? "<small>Demo estimate</small>" : ""}</div></section>
        ${cancelled ? `<section class="track-cancelled"><strong>❌ This order has been cancelled.</strong><span>Your order history and details are still available below.</span></section>` : `<section class="track-section"><div class="section-label">Order progress</div><h2>Where your order is now</h2>${renderTimeline(normalizedOrder)}</section>`}
        <div class="track-grid">${renderAddress(normalizedOrder)}<section class="track-section"><div class="section-label">Order total</div><h2>💰 Price summary</h2><div class="track-prices"><p><span>Subtotal</span><strong>${money(normalizedOrder.subtotal)}</strong></p><p><span>Delivery fee</span><strong>${money(normalizedOrder.deliveryFee)}</strong></p><p><span>Discount</span><strong>${money(normalizedOrder.discount)}</strong></p><p class="track-total"><span>Total</span><strong>${money(normalizedOrder.total)}</strong></p></div></section></div>
        ${renderItems(normalizedOrder)}
        ${renderPayment(normalizedOrder)}
        ${devMode && !cancelled ? `<details class="track-dev"><summary>Demo status controls</summary><div>${TRACKING_STEPS.slice(1).map(step => `<button type="button" class="secondary-button" data-status="${step.status}">Set ${step.label}</button>`).join("")}</div></details>` : ""}
        <div class="track-actions"><a class="primary-button" href="order-details.html?order=${encodeURIComponent(normalizedOrder.orderCode || normalizedOrder.id)}">View Order Details</a><a class="secondary-button" href="orders.html">Back to Orders</a></div>
    `;

    if (devMode) {
        container.querySelectorAll("[data-status]").forEach(button => {
            button.addEventListener("click", () => {
                const newStatus = button.dataset.status;
                const result = updateOrderStatus(normalizedOrder.id, newStatus);
                if (result.ok) {
                    window.location.reload();
                }
            });
        });
    }
}

if (document.querySelector("#order-tracking-page")) {
    if (AppState.initialized) {
        renderTracking();
    } else {
        document.addEventListener("app:initialized", renderTracking, { once: true });
    }
}
