
import { AppState } from "./state.js";
import "./theme.js?v=19";
import { loadAllData } from "./api.js";
import { loadCart, loadUser, loadOrders, loadUsers } from "./storage.js";
import { showError, showLoading } from "./utils.js";

function mergeOrders(seedOrders, savedOrders) {
    const byId = new Map();
    for (const order of [...(savedOrders || []), ...(seedOrders || [])]) {
        if (!order || !order.id) continue;
        if (!byId.has(order.id)) {
            byId.set(order.id, order);
        }
    }
    return [...byId.values()].sort((a, b) => new Date(b.createdAt || b.orderDate || 0) - new Date(a.createdAt || a.orderDate || 0));
}

function mergeUsers(seedUsers, savedUsers) {
    const byId = new Map();
    const byEmail = new Map();
    for (const user of [...(seedUsers || []), ...(savedUsers || [])]) {
        if (!user || !user.id) continue;
        const normalized = { ...user, addresses: Array.isArray(user.addresses) ? user.addresses : [] };
        byId.set(normalized.id, normalized);
        if (normalized.email) {
            byEmail.set(String(normalized.email).trim().toLowerCase(), normalized);
        }
    }
    const merged = [...byId.values()];
    for (const user of [...byEmail.values()]) {
        const index = merged.findIndex(item => item.id === user.id);
        if (index >= 0) merged[index] = user;
    }
    return merged;
}

export async function initializeApp() {
    showLoading();

    try {
        const data = await loadAllData();

        AppState.settings = data.settings;
        AppState.categories = data.categories;
        AppState.restaurants = data.restaurants;
        AppState.foods = data.foods;
        AppState.offers = data.offers;
        AppState.coupons = Array.isArray(data.coupons) ? data.coupons : [];
        AppState.addresses = Array.isArray(data.addresses) ? data.addresses : [];
        AppState.users = mergeUsers(data.users, loadUsers());
        AppState.orders = mergeOrders(data.orders, loadOrders());
        AppState.cart = loadCart();
        AppState.user = loadUser();
        AppState.initialized = true;

        const app = document.querySelector("#app");
        if (app) {
            app.textContent =
                "Food Delivery App\nApplication initialized successfully.";
        }

        document.dispatchEvent(new CustomEvent("app:initialized"));
    } catch (error) {
        console.error("Unable to initialize the application.", error);
        showError("Unable to load application data. Check the browser console for details.");
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
} else {
    initializeApp();
}
