import { AppState } from "./state.js";
import { findOrderById, getDisplayOrderId, getOrderSummaryCount, getOrderTimeline, ORDER_STATUS_LABELS, normalizeOrder } from "./order-status.js";

function money(value) {
    return `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
}

function renderNotFound() {
    const container = document.querySelector("#order-details-content");
    if (!container) return;
    container.innerHTML = `
        <div class="error-state">
            <div class="state-icon" aria-hidden="true">📦</div>
            <h2 class="state-title">Order not found</h2>
            <p class="state-message">We couldn't find the order you're looking for.</p>
            <a class="primary-button state-action" href="orders.html">View My Orders</a>
        </div>
    `;
}

function renderDetails() {
    const container = document.querySelector("#order-details-content");
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order") || params.get("orderId") || params.get("id");
    const order = findOrderById(orderId);

    if (!order) {
        renderNotFound();
        return;
    }

    const normalizedOrder = normalizeOrder(order);
    const orderCode = getDisplayOrderId(normalizedOrder);
    const customer = normalizedOrder.customer || {};
    const address = normalizedOrder.address || normalizedOrder.deliveryAddress || {};
    const items = Array.isArray(normalizedOrder.items) ? normalizedOrder.items : [];

    container.innerHTML = `
        <div class="checkout-panel">
            <p class="kicker">Order ID</p>
            <h2>${orderCode}</h2>
            <p><strong>Order date:</strong> ${new Date(normalizedOrder.createdAt || normalizedOrder.orderDate || Date.now()).toLocaleString()}</p>
            <p><strong>Order status:</strong> ${ORDER_STATUS_LABELS[normalizedOrder.status] || normalizedOrder.status}</p>

            <div style="margin-top: 1.5rem;">
                <h3>Customer information</h3>
                <p>${customer.name || "N/A"}</p>
                <p>${customer.mobile || "N/A"}</p>
                <p>${customer.email || "N/A"}</p>
            </div>

            <div style="margin-top: 1.5rem;">
                <h3>Delivery address</h3>
                <p>${address.house || ""} ${address.street || ""}</p>
                <p>${address.city || ""}, ${address.state || ""} ${address.pincode || ""}</p>
                <p>${address.landmark || ""}</p>
            </div>

            <div style="margin-top: 1.5rem;">
                <h3>Ordered items</h3>
                <ul>
                    ${items.map(item => `
                        <li style="margin-bottom: 0.75rem;">
                            ${item.name || "Food item"} × ${item.quantity || 0} — ${money((Number(item.price) || 0) * (Number(item.quantity) || 0))}
                        </li>
                    `).join("")}
                </ul>
            </div>

            <div style="margin-top: 1.5rem;">
                <p><strong>Subtotal:</strong> ${money(normalizedOrder.subtotal || 0)}</p>
                <p><strong>Delivery fee:</strong> ${money(normalizedOrder.deliveryFee || 0)}</p>
                <p><strong>Discount:</strong> ${money(normalizedOrder.discount || 0)}</p>
                <p><strong>Total:</strong> ${money(normalizedOrder.total || 0)}</p>
                <p><strong>Payment method:</strong> ${normalizedOrder.paymentMethod || "Cash on Delivery"}</p>
                <p><strong>Payment status:</strong> ${normalizedOrder.paymentStatus || "Pending"}</p>
            </div>

            <div class="checkout-empty-actions" style="margin-top: 1.5rem;">
                ${!["delivered", "cancelled"].includes(normalizedOrder.status) ? `<a class="primary-button" href="track-order.html?order=${encodeURIComponent(normalizedOrder.orderCode || normalizedOrder.id)}">Track Order</a>` : ""}
                <a class="secondary-button" href="../index.html">Continue Shopping</a>
                <a class="secondary-button" href="orders.html">Back to Orders</a>
            </div>
        </div>
    `;
}

if (document.querySelector("#order-details-page")) {
    if (AppState.initialized) {
        renderDetails();
    } else {
        document.addEventListener("app:initialized", renderDetails, { once: true });
    }
}
