import { AppState } from "./state.js";
import { getCurrentUser, updateCurrentUser } from "./auth.js";
import { loadFavorites, loadCart, getFromStorage, saveToStorage } from "./storage.js";
import { calculateSubtotal } from "./cart-page.js";
import { normalizeOrder, getDisplayOrderId, ORDER_STATUS_LABELS } from "./order-status.js";

const PROFILE_KEY = "foodlyProfile";
const DEMO_PROFILE = { name: "Foodly Member", email: "", phone: "", bio: "Your personal food dashboard." };

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function loadProfile() {
    const currentUser = getCurrentUser();
    const saved = getFromStorage(PROFILE_KEY, {});
    const profile = saved && typeof saved === "object" ? saved : {};
    return { ...DEMO_PROFILE, ...profile, ...(currentUser || {}) };
}

function saveProfile(profile) {
    saveToStorage(PROFILE_KEY, profile);
    const currentUser = getCurrentUser();
    if (currentUser) updateCurrentUser({ ...currentUser, name: profile.name, email: profile.email, phone: profile.phone });
}

function getAddresses() {
    try {
        const addresses = JSON.parse(localStorage.getItem("foodlyAddresses") || "[]");
        return Array.isArray(addresses) ? addresses : [];
    } catch (error) {
        localStorage.removeItem("foodlyAddresses");
        return [];
    }
}

function getOrders() {
    return Array.isArray(AppState.orders) ? AppState.orders.map(normalizeOrder).filter(Boolean) : [];
}

function getOrderStats() {
    const orders = getOrders();
    return {
        total: orders.length,
        active: orders.filter(order => ["placed", "accepted", "preparing", "out_for_delivery"].includes(order.status)).length,
        delivered: orders.filter(order => order.status === "delivered").length
    };
}

function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
}

function setMessage(message, type = "success") {
    const node = document.querySelector("#profile-message");
    if (!node) return;
    node.textContent = message;
    node.className = `profile-message ${type === "error" ? "error" : ""}`.trim();
    node.hidden = false;
    window.setTimeout(() => { node.hidden = true; }, 3500);
}

function renderProfile() {
    const profile = loadProfile();
    setText("#dashboard-profile-name", profile.name || "Foodly Member");
    setText("#dashboard-profile-bio", profile.bio || "Your personal food dashboard.");
    setText("#dashboard-profile-email", profile.email || "Email not added");
    setText("#dashboard-profile-phone", profile.phone || "Phone not added");
    setText("#profile-name", profile.name || "Not added");
    setText("#profile-email", profile.email || "Not added");
    setText("#profile-phone", profile.phone || "Not added");
}

function renderStats() {
    const stats = getOrderStats();
    const addresses = getAddresses();
    const favorites = loadFavorites();
    setText("#profile-total-orders", stats.total);
    setText("#profile-active-orders", stats.active);
    setText("#profile-delivered-orders", stats.delivered);
    setText("#profile-address-count", addresses.length);
    setText("#profile-favorite-count", favorites.length);
    setText("#favorites-summary-count", `${favorites.length} saved item${favorites.length === 1 ? "" : "s"}`);
}

function renderAddress() {
    const address = getAddresses().find(entry => entry.isDefault) || getAddresses()[0];
    const content = document.querySelector("#default-address-content");
    if (!content) return;
    if (!address) {
        content.innerHTML = `<p class="profile-muted">No default address saved.</p><a class="primary-button" href="addresses.html">Add Address</a>`;
        return;
    }
    const cityLine = [address.city, address.state].filter(Boolean).join(", ");
    content.innerHTML = `<p><strong>⭐ ${escapeHtml(address.label || address.type || "Home")}</strong></p><p>${escapeHtml(address.fullName || "Delivery contact")}</p><p>${escapeHtml(address.house || "")}</p><p>${escapeHtml(address.area || address.street || "")}</p><p>${escapeHtml(cityLine)}${address.pin ? ` - ${escapeHtml(address.pin)}` : ""}</p>`;
}

function renderRecentOrders() {
    const list = document.querySelector("#recent-orders-list");
    if (!list) return;
    const orders = getOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
    if (!orders.length) {
        list.innerHTML = `<p class="profile-muted">No recent orders.</p><a class="primary-button" href="restaurants.html">Browse Restaurants</a>`;
        return;
    }
    list.innerHTML = orders.map(order => {
        const date = new Date(order.createdAt || order.orderDate || Date.now());
        const itemNames = (order.items || []).slice(0, 1).map(item => `${escapeHtml(item.name || "Food item")} × ${Number(item.quantity) || 0}`).join("");
        return `<a class="recent-order" href="order-details.html?order=${encodeURIComponent(order.orderCode || order.id)}"><span><strong>${escapeHtml(getDisplayOrderId(order))}</strong><br><small>${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${escapeHtml(itemNames || "Order details")}</small></span><strong class="recent-total">₹${Math.round(Number(order.total) || 0).toLocaleString("en-IN")}<br><small>${escapeHtml(ORDER_STATUS_LABELS[order.status] || order.status)}</small></strong></a>`;
    }).join("");
}

function renderCartSummary() {
    const cart = Array.isArray(AppState.cart) ? AppState.cart : loadCart();
    const quantity = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    setText("#cart-summary-title", quantity ? `${quantity} item${quantity === 1 ? "" : "s"} in your cart` : "Your cart is empty.");
    setText("#cart-summary-total", quantity ? `Subtotal: ₹${Math.round(calculateSubtotal()).toLocaleString("en-IN")}` : "Add something delicious to get started.");
}

function openEditor() {
    const profile = loadProfile();
    const dialog = document.createElement("div");
    dialog.className = "profile-edit-dialog";
    dialog.innerHTML = `<section class="profile-edit-panel" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title"><div class="profile-section-heading"><h2 id="profile-edit-title">Edit Profile</h2><button type="button" class="text-button" data-close-profile aria-label="Close edit profile">Close</button></div><form id="profile-edit-form" novalidate><label for="profile-edit-name">Full Name<input id="profile-edit-name" value="${escapeHtml(profile.name)}" required></label><label for="profile-edit-email">Email<input id="profile-edit-email" type="email" value="${escapeHtml(profile.email)}"></label><label for="profile-edit-phone">Phone Number<input id="profile-edit-phone" type="tel" inputmode="numeric" value="${escapeHtml(profile.phone)}"></label><label for="profile-edit-bio">Profile Bio<textarea id="profile-edit-bio">${escapeHtml(profile.bio)}</textarea></label><div class="profile-edit-error" id="profile-edit-error" role="alert"></div><div class="profile-edit-actions"><button type="button" class="secondary-button" data-close-profile>Cancel</button><button type="submit" class="primary-button">Save Changes</button></div></form></section>`;
    document.body.append(dialog);
    const close = () => dialog.remove();
    dialog.querySelectorAll("[data-close-profile]").forEach(button => button.addEventListener("click", close));
    dialog.addEventListener("click", event => { if (event.target === dialog) close(); });
    dialog.querySelector("#profile-edit-form").addEventListener("submit", event => {
        event.preventDefault();
        const name = dialog.querySelector("#profile-edit-name").value.trim();
        const email = dialog.querySelector("#profile-edit-email").value.trim().toLowerCase();
        const phone = dialog.querySelector("#profile-edit-phone").value.trim();
        const error = dialog.querySelector("#profile-edit-error");
        if (!name) return error.textContent = "Please enter your name.";
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error.textContent = "Please enter a valid email address.";
        if (phone && !/^[6-9]\d{9}$/.test(phone)) return error.textContent = "Please enter a valid 10-digit phone number.";
        saveProfile({ name, email, phone, bio: dialog.querySelector("#profile-edit-bio").value.trim() });
        renderProfile();
        close();
        setMessage("Profile saved successfully.");
    });
    dialog.querySelector("#profile-edit-name").focus();
}

function renderDashboard() {
    renderProfile();
    renderStats();
    renderAddress();
    renderRecentOrders();
    renderCartSummary();
}

if (document.querySelector("#profile-dashboard")) {
    if (AppState.initialized) renderDashboard();
    else document.addEventListener("app:initialized", renderDashboard, { once: true });
    document.querySelectorAll("#edit-profile-toggle, [data-edit-profile]").forEach(button => button.addEventListener("click", openEditor));
    document.addEventListener("orders:updated", renderDashboard);
    document.addEventListener("favorites:updated", renderDashboard);
}
