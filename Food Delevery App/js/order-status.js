import { AppState } from "./state.js";
import { saveOrders } from "./storage.js";

export const ORDER_STATUS_VALUES = [
    "placed",
    "accepted",
    "preparing",
    "out_for_delivery",
    "delivered",
    "cancelled"
];

export const ORDER_STATUS_LABELS = {
    placed: "Order Placed",
    accepted: "Restaurant Accepted",
    preparing: "Preparing Food",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Order Cancelled"
};

const ORDER_STATUS_ALIASES = {
    pending: "placed",
    "order placed": "placed",
    "restaurant accepted": "accepted",
    "preparing food": "preparing",
    "out for delivery": "out_for_delivery",
    "order cancelled": "cancelled",
    delivered: "delivered"
};

export function formatOrderCode(orderId) {
    if (!orderId) return "ORD-UNKNOWN";
    const cleaned = String(orderId).replace(/[^a-zA-Z0-9]/g, "").slice(-8);
    return cleaned ? `ORD-${cleaned.toUpperCase()}` : "ORD-UNKNOWN";
}

export function normalizeOrderStatus(status) {
    if (!status || typeof status !== "string") {
        return "placed";
    }

    const normalized = status.trim().toLowerCase().replace(/\s+/g, "_");
    const alias = ORDER_STATUS_ALIASES[normalized] || normalized;
    const safeStatus = alias.replace(/^_+|_+$/g, "");

    if (ORDER_STATUS_VALUES.includes(safeStatus)) {
        return safeStatus;
    }

    if (safeStatus === "outfor_delivery") {
        return "out_for_delivery";
    }

    return "placed";
}

export function buildStatusHistory(order, forceStatus = null) {
    const statusValue = normalizeOrderStatus(forceStatus || order?.status || order?.orderStatus || "placed");
    const history = Array.isArray(order?.statusHistory) ? order.statusHistory.filter(entry => entry && entry.status) : [];
    const normalizedHistory = history.map(entry => ({
        status: normalizeOrderStatus(entry.status),
        timestamp: entry.timestamp || order?.createdAt || new Date().toISOString()
    }));

    if (!normalizedHistory.length) {
        return [{ status: statusValue, timestamp: order?.createdAt || new Date().toISOString() }];
    }

    const lastStatus = normalizedHistory[normalizedHistory.length - 1].status;
    if (lastStatus !== statusValue) {
        normalizedHistory.push({ status: statusValue, timestamp: new Date().toISOString() });
    }

    return normalizedHistory;
}

export function normalizeOrder(order) {
    if (!order || typeof order !== "object") {
        return null;
    }

    const safeStatus = normalizeOrderStatus(order.status || order.orderStatus || "placed");
    const createdAt = order.createdAt || order.orderDate || new Date().toISOString();
    const normalizedHistory = buildStatusHistory(order, safeStatus);
    const address = order.address || order.deliveryAddress || {};
    const normalized = {
        ...order,
        address: {
            house: address.house || address.flat || address.houseNo || "",
            street: address.street || address.area || "",
            city: address.city || "",
            state: address.state || "",
            pincode: address.pincode || address.pin || "",
            landmark: address.landmark || ""
        },
        status: safeStatus,
        orderStatus: safeStatus,
        createdAt,
        statusHistory: normalizedHistory,
        orderCode: order.orderCode || formatOrderCode(order.id)
    };

    return normalized;
}

export function getOrderTimeline(status) {
    const normalized = normalizeOrderStatus(status);

    if (normalized === "cancelled") {
        return [
            { status: "placed", label: ORDER_STATUS_LABELS.placed, done: true },
            { status: "cancelled", label: ORDER_STATUS_LABELS.cancelled, done: true }
        ];
    }

    const steps = [
        "placed",
        "accepted",
        "preparing",
        "out_for_delivery",
        "delivered"
    ];

    const currentIndex = steps.indexOf(normalized);
    return steps.map((step, index) => ({
        status: step,
        label: ORDER_STATUS_LABELS[step],
        done: index <= currentIndex,
        active: normalized === step
    }));
}

export function findOrderById(orderId) {
    if (!orderId || !Array.isArray(AppState.orders)) {
        return null;
    }

    const lookup = String(orderId).trim();
    return AppState.orders.find(order => {
        const normalizedOrder = normalizeOrder(order);
        if (!normalizedOrder) {
            return false;
        }
        return normalizedOrder.id === lookup || normalizedOrder.orderCode === lookup || formatOrderCode(normalizedOrder.id) === lookup;
    }) || null;
}

export function getDisplayOrderId(order) {
    const normalizedOrder = normalizeOrder(order);
    if (!normalizedOrder) return "ORD-UNKNOWN";
    return normalizedOrder.orderCode || formatOrderCode(normalizedOrder.id);
}

export function getOrderSummaryCount(order) {
    if (!order || !Array.isArray(order.items)) {
        return 0;
    }
    return order.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

export function canCancelOrder(order) {
    const normalized = normalizeOrder(order);
    return Boolean(normalized && ["placed", "accepted", "preparing"].includes(normalized.status));
}

export function persistOrders(orders) {
    const list = Array.isArray(orders) ? orders.map(normalizeOrder).filter(Boolean) : [];
    AppState.orders = list;
    saveOrders(list);
    return list;
}

export function updateOrderStatus(orderId, newStatus) {
    if (!Array.isArray(AppState.orders) || !orderId) {
        return { ok: false, reason: "Order not found." };
    }

    const targetOrder = findOrderById(orderId);
    if (!targetOrder) {
        return { ok: false, reason: "Order not found." };
    }

    const safeStatus = normalizeOrderStatus(newStatus);
    if (!ORDER_STATUS_VALUES.includes(safeStatus)) {
        return { ok: false, reason: "Invalid order status." };
    }

    if (safeStatus === "cancelled" && !canCancelOrder(targetOrder)) {
        return { ok: false, reason: "This order can no longer be cancelled." };
    }

    const updatedOrder = normalizeOrder(targetOrder);
    updatedOrder.status = safeStatus;
    updatedOrder.orderStatus = safeStatus;
    updatedOrder.updatedAt = new Date().toISOString();
    updatedOrder.statusHistory = buildStatusHistory(updatedOrder, safeStatus);

    const index = AppState.orders.findIndex(entry => entry && entry.id === targetOrder.id);
    if (index >= 0) {
        AppState.orders[index] = updatedOrder;
    }

    persistOrders(AppState.orders);
    document.dispatchEvent(new CustomEvent("orders:updated"));

    return { ok: true, order: updatedOrder };
}
