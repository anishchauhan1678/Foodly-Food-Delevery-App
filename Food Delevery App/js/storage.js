const STORAGE_KEYS = {
    cart: "foodDeliveryCart",
    user: "foodDelivery_currentUser",
    legacyUser: "foodDeliveryUser",
    users: "foodDelivery_users",
    orders: "foodDeliveryOrders",
    favorites: "foodlyFavorites"
};

function normalizeFavoriteEntry(value) {
    if (!value || typeof value !== "object") return null;
    const type = value.type === "restaurant" ? "restaurant" : value.type === "food" ? "food" : null;
    if (!type) return null;
    const id = String(value.id ?? "").trim();
    if (!id) return null;
    return {
        id,
        type,
        name: String(value.name ?? ""),
        image: String(value.image ?? ""),
        price: Number(value.price) || 0,
        restaurantId: value.restaurantId ? String(value.restaurantId) : ""
    };
}

export function loadFavorites() {
    try {
        const favorites = getFromStorage(STORAGE_KEYS.favorites, []);
        if (!Array.isArray(favorites)) return [];
        const normalized = favorites.map(normalizeFavoriteEntry).filter(Boolean);
        if (normalized.length !== favorites.length) {
            saveFavorites(normalized);
        }
        return normalized;
    } catch (error) {
        console.error("Unable to read favorites.", error);
        return [];
    }
}

export function saveFavorites(favorites) {
    const normalized = Array.isArray(favorites)
        ? favorites.map(normalizeFavoriteEntry).filter(Boolean)
        : [];
    return saveToStorage(STORAGE_KEYS.favorites, normalized);
}

export function isFavorite(id, type) {
    const favoriteId = String(id ?? "").trim();
    const favoriteType = type === "restaurant" || type === "food" ? type : "";
    if (!favoriteId || !favoriteType) return false;
    return loadFavorites().some(item => item.id === favoriteId && item.type === favoriteType);
}

export function toggleFavorite(item) {
    const favorite = normalizeFavoriteEntry(item);
    if (!favorite) return { isFavorite: false, favorites: [] };
    const favorites = loadFavorites();
    const existingIndex = favorites.findIndex(entry => entry.id === favorite.id && entry.type === favorite.type);
    if (existingIndex >= 0) {
        favorites.splice(existingIndex, 1);
        saveFavorites(favorites);
        return { isFavorite: false, favorites };
    }
    favorites.push(favorite);
    saveFavorites(favorites);
    return { isFavorite: true, favorites };
}

export function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Unable to save storage key: ${key}`, error);
        return false;
    }
}

export function getFromStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? defaultValue : JSON.parse(value);
    } catch (error) {
        console.error(`Unable to read storage key: ${key}`, error);
        try {
            localStorage.removeItem(key);
        } catch (removeError) {
            console.error(`Unable to remove corrupted storage key: ${key}`, removeError);
        }
        return defaultValue;
    }
}

export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Unable to remove storage key: ${key}`, error);
    }
}

export function clearStorage() {
    try {
        localStorage.clear();
    } catch (error) {
        console.error("Unable to clear local storage.", error);
    }
}

export function saveCart(cart) {
    return saveToStorage(STORAGE_KEYS.cart, cart);
}

export function loadCart() {
    return getFromStorage(STORAGE_KEYS.cart, []);
}

export function clearCart() {
    removeFromStorage(STORAGE_KEYS.cart);
}

export function saveUser(user) {
    const ok = saveToStorage(STORAGE_KEYS.user, user);
    if (ok) {
        saveToStorage(STORAGE_KEYS.legacyUser, user);
    }
    return ok;
}

export function loadUser() {
    const current = getFromStorage(STORAGE_KEYS.user, null);
    if (current) return current;
    return getFromStorage(STORAGE_KEYS.legacyUser, null);
}

export function clearUser() {
    removeFromStorage(STORAGE_KEYS.user);
    removeFromStorage(STORAGE_KEYS.legacyUser);
}

export function saveUsers(users) {
    return saveToStorage(STORAGE_KEYS.users, users);
}

export function loadUsers() {
    return getFromStorage(STORAGE_KEYS.users, []);
}

export function saveOrders(orders) {
    return saveToStorage(STORAGE_KEYS.orders, orders);
}

export function loadOrders() {
    return getFromStorage(STORAGE_KEYS.orders, []);
}