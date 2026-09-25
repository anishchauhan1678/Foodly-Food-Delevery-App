import { AppState } from "./state.js";
import { clearUser, getFromStorage, loadUsers, saveToStorage, saveUser, saveUsers } from "./storage.js";

const USER_STORAGE_KEY = "foodDelivery_users";
const CURRENT_USER_KEY = "foodDelivery_currentUser";

function uniqueId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeAddress(address = {}) {
    return {
        id: address.id || uniqueId("ADDR"),
        label: address.label || "Home",
        house: address.house || "",
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        pin: address.pin || address.pincode || "",
        landmark: address.landmark || "",
        isDefault: Boolean(address.isDefault)
    };
}

function normalizeUserRecord(user) {
    if (!user || typeof user !== "object") return null;

    const safeUser = {
        id: user.id || uniqueId("USR"),
        name: String(user.name || "").trim(),
        email: String(user.email || "").trim(),
        phone: String(user.phone || "").trim(),
        profileImage: user.profileImage || "",
        addresses: Array.isArray(user.addresses) ? user.addresses.map(normalizeAddress) : [],
        createdAt: user.createdAt || new Date().toISOString()
    };

    if (user.password) safeUser.password = String(user.password);
    if (user.address && !safeUser.addresses.length) {
        safeUser.addresses = [{
            id: uniqueId("ADDR"),
            label: "Home",
            house: user.address.house || "",
            street: user.address.street || "",
            city: user.address.city || "",
            state: user.address.state || "",
            pin: user.address.pin || user.address.pincode || "",
            landmark: user.address.landmark || "",
            isDefault: true
        }];
    }
    return safeUser;
}

export function getUserCollection() {
    const users = loadUsers();
    if (!Array.isArray(users)) return [];
    return users.map(normalizeUserRecord).filter(Boolean);
}

export function saveUserCollection(users) {
    const safeUsers = (Array.isArray(users) ? users : []).map(normalizeUserRecord).filter(Boolean);
    AppState.users = safeUsers;
    saveUsers(safeUsers);
    return safeUsers;
}

export function sanitizeUserSession(user) {
    const normalized = normalizeUserRecord(user);
    if (!normalized) return null;
    return { ...normalized };
}

export function getCurrentUser() {
    const sessionUser = getFromStorage(CURRENT_USER_KEY, null);
    if (sessionUser) {
        const sanitized = sanitizeUserSession(sessionUser);
        AppState.user = sanitized;
        return sanitized;
    }

    if (AppState.user) {
        return sanitizeUserSession(AppState.user);
    }

    return null;
}

export function isLoggedIn() {
    return Boolean(getCurrentUser());
}

export function findUserByEmail(email) {
    const users = getUserCollection();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    return users.find(user => String(user.email || "").trim().toLowerCase() === normalizedEmail) || null;
}

export function registerUser(payload = {}) {
    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim();
    const phone = String(payload.phone || "").trim();
    const password = String(payload.password || "");
    const confirmPassword = String(payload.confirmPassword || "");

    if (!name) return { ok: false, message: "Name is required." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Enter a valid email address." };
    if (!/^[6-9]\d{9}$/.test(phone)) return { ok: false, message: "Enter a valid Indian mobile number." };
    if (password.length < 6) return { ok: false, message: "Password must be at least 6 characters long." };
    if (password !== confirmPassword) return { ok: false, message: "Passwords do not match." };

    const users = getUserCollection();
    const existing = findUserByEmail(email);
    if (existing) {
        return { ok: false, message: "An account with this email already exists. Login" };
    }

    // DEMO ONLY — passwords must never be stored this way in production.
    const user = normalizeUserRecord({
        id: uniqueId("USR"),
        name,
        email: email.toLowerCase(),
        phone,
        password,
        profileImage: "",
        addresses: [],
        createdAt: new Date().toISOString()
    });

    users.push(user);
    saveUserCollection(users);
    return { ok: true, user: sanitizeUserSession(user) };
}

export function loginUser(payload = {}) {
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");

    if (!email || !password) {
        return { ok: false, message: "Invalid email or password." };
    }

    const user = findUserByEmail(email);
    if (!user || user.password !== password) {
        return { ok: false, message: "Invalid email or password." };
    }

    const sessionUser = sanitizeUserSession(user);
    AppState.user = sessionUser;
    saveUser(sessionUser);
    saveToStorage(CURRENT_USER_KEY, sessionUser);
    return { ok: true, user: sessionUser };
}

export function logoutUser() {
    AppState.user = null;
    clearUser();
    localStorage.removeItem(CURRENT_USER_KEY);
    return true;
}

export function getDefaultAddress(user) {
    const currentUser = sanitizeUserSession(user || getCurrentUser() || {});
    if (!currentUser || !Array.isArray(currentUser.addresses)) return null;
    return currentUser.addresses.find(address => address.isDefault) || currentUser.addresses[0] || null;
}

export function updateCurrentUser(updatedUser) {
    const safeUser = sanitizeUserSession(updatedUser);
    if (!safeUser) return null;

    const users = getUserCollection();
    const index = users.findIndex(user => user.id === safeUser.id);
    if (index >= 0) {
        const persistedUser = normalizeUserRecord({ ...users[index], ...safeUser, email: safeUser.email.toLowerCase() });
        users[index] = persistedUser;
        saveUserCollection(users);
    }

    AppState.user = safeUser;
    saveUser(safeUser);
    saveToStorage(CURRENT_USER_KEY, safeUser);
    return safeUser;
}

export function getSessionUserKey() {
    return CURRENT_USER_KEY;
}

export function getUsersKey() {
    return USER_STORAGE_KEY;
}
