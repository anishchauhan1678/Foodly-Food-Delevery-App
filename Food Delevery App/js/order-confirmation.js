import { AppState } from "./state.js";
import { findOrderById, getDisplayOrderId, normalizeOrder } from "./order-status.js";

function readOrderIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("orderId") || params.get("id");
}

function renderConfirmation() {
    const orderId = readOrderIdFromUrl();
    const order = findOrderById(orderId) || AppState.orders.find(entry => entry.id === orderId || entry.orderCode === orderId);
    const orderIdEl = document.querySelector("#confirmation-order-id");
    const totalEl = document.querySelector("#confirmation-total");
    const messageEl = document.querySelector("#confirmation-message");
    const detailsLink = document.querySelector("#confirmation-details-link");
    const trackLink = document.querySelector("#confirmation-track-link");

    if (!orderIdEl || !totalEl || !messageEl) return;

    if (!order) {
        orderIdEl.textContent = orderId || "Unknown";
        totalEl.textContent = "₹0";
        messageEl.textContent = "Your order details were not found. Please check your orders page.";
        if (detailsLink) detailsLink.href = "orders.html";
        if (trackLink) trackLink.href = "orders.html";
        return;
    }

    const normalizedOrder = normalizeOrder(order);
    orderIdEl.textContent = getDisplayOrderId(normalizedOrder);
    totalEl.textContent = `₹${Math.round(Number(normalizedOrder.total || normalizedOrder.subtotal || 0) || 0).toLocaleString("en-IN")}`;
    messageEl.textContent = `Estimated delivery: ${normalizedOrder.estimatedDeliveryTime || "Coming soon"}.`;

    const orderIdentifier = normalizedOrder.orderCode || normalizedOrder.id;
    if (detailsLink) detailsLink.href = `order-details.html?orderId=${encodeURIComponent(orderIdentifier)}`;
    if (trackLink) trackLink.href = `order-tracking.html?orderId=${encodeURIComponent(orderIdentifier)}`;
}

if (document.querySelector("#confirmation-page")) {
    if (AppState.initialized) {
        renderConfirmation();
    } else {
        document.addEventListener("app:initialized", renderConfirmation, { once: true });
    }
}
