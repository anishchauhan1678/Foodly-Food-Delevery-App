import { AppState } from "./state.js";
import { getFromStorage, saveToStorage, removeFromStorage } from "./storage.js";

export const COUPON_STORAGE_KEY = "foodlyAppliedCoupon";

export const foodlyCoupons = [];

function normalizeCoupon(raw = {}) {
    if (!raw || typeof raw !== "object") return null;
    const code = String(raw.code || "").trim();
    if (!code) return null;

    return {
        code,
        title: String(raw.title || "Offer"),
        description: String(raw.description || ""),
        type: String(raw.type || "fixed"),
        value: Number(raw.value ?? raw.discountValue ?? 0),
        maxDiscount: Number(raw.maxDiscount ?? raw.maximumDiscount ?? raw.value ?? 0),
        minOrder: Number(raw.minimumOrder ?? raw.minOrder ?? 0),
        expiry: raw.expiry || "2026-12-31",
        category: raw.category || "Offer",
        active: raw.active !== false
    };
}

function getCouponCatalog() {
    const source = Array.isArray(AppState.coupons) && AppState.coupons.length ? AppState.coupons : foodlyCoupons;
    return source
        .map(normalizeCoupon)
        .filter(Boolean);
}

export function normalizeCouponCode(code) {
    return String(code ?? "").trim().toUpperCase();
}

export function getAvailableCoupons() {
    return getCouponCatalog().map(coupon => ({ ...coupon }));
}

export function findCoupon(code) {
    const normalized = normalizeCouponCode(code);
    return getCouponCatalog().find(coupon => normalizeCouponCode(coupon.code) === normalized) || null;
}

export function isCouponExpired(coupon) {
    if (!coupon || !coupon.expiry) return false;
    const expiryDate = new Date(coupon.expiry);
    if (Number.isNaN(expiryDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate < today;
}

export function saveAppliedCoupon(code) {
    const coupon = findCoupon(code);
    if (!coupon) return null;

    const payload = { code: coupon.code };
    try {
        saveToStorage(COUPON_STORAGE_KEY, payload);
        return coupon;
    } catch (error) {
        console.error("Unable to save applied coupon.", error);
        return null;
    }
}

export function clearAppliedCoupon() {
    try {
        removeFromStorage(COUPON_STORAGE_KEY);
        return true;
    } catch (error) {
        console.error("Unable to clear applied coupon.", error);
        return false;
    }
}

export function getCurrentAppliedCoupon() {
    try {
        const savedCoupon = getFromStorage(COUPON_STORAGE_KEY, null);
        if (!savedCoupon || typeof savedCoupon !== "object") {
            clearAppliedCoupon();
            return null;
        }

        const code = normalizeCouponCode(savedCoupon.code);
        if (!code) {
            clearAppliedCoupon();
            return null;
        }

        const coupon = findCoupon(code);
        if (!coupon) {
            clearAppliedCoupon();
            return null;
        }

        if (isCouponExpired(coupon)) {
            clearAppliedCoupon();
            return null;
        }

        return { ...coupon };
    } catch (error) {
        console.error("Unable to read applied coupon.", error);
        clearAppliedCoupon();
        return null;
    }
}

export function validateCoupon(code, subtotal = 0, deliveryFee = 0) {
    const normalizedCode = normalizeCouponCode(code);
    const coupon = findCoupon(normalizedCode);

    if (!coupon) {
        return {
            valid: false,
            reason: "invalid",
            message: "Invalid coupon code."
        };
    }

    if (isCouponExpired(coupon)) {
        return {
            valid: false,
            reason: "expired",
            message: "This coupon has expired."
        };
    }

    const orderSubtotal = Number(subtotal) || 0;
    if (orderSubtotal < Number(coupon.minOrder || 0)) {
        const remaining = Math.max(0, Number(coupon.minOrder || 0) - orderSubtotal);
        return {
            valid: false,
            reason: "minimum",
            message: `Add ₹${Math.round(remaining).toLocaleString("en-IN")} more to use this coupon.`
        };
    }

    if (coupon.type === "delivery" && Number(deliveryFee || 0) <= 0) {
        return {
            valid: false,
            reason: "minimum",
            message: "Add some delicious food to apply this coupon."
        };
    }

    return {
        valid: true,
        coupon,
        reason: "success",
        message: `Coupon ${coupon.code} applied successfully.`
    };
}

export function calculateCouponDiscount(coupon, subtotal = 0, deliveryFee = 0) {
    if (!coupon) return 0;
    const safeSubtotal = Math.max(0, Number(subtotal) || 0);
    const safeDeliveryFee = Math.max(0, Number(deliveryFee) || 0);

    const validation = validateCoupon(coupon.code, safeSubtotal, safeDeliveryFee);
    if (!validation.valid) {
        return 0;
    }

    if (coupon.type === "percentage") {
        const discount = safeSubtotal * (Number(coupon.value) / 100);
        return Math.min(Math.max(0, discount), Number(coupon.maxDiscount || discount || 0));
    }

    if (coupon.type === "fixed") {
        return Math.min(Math.max(0, Number(coupon.value) || 0), safeSubtotal);
    }

    if (coupon.type === "delivery") {
        return Math.min(Math.max(0, safeDeliveryFee), Number(coupon.maxDiscount || coupon.value || safeDeliveryFee));
    }

    return 0;
}

export function restoreAppliedCoupon(subtotal = 0, deliveryFee = 0) {
    const activeCoupon = getCurrentAppliedCoupon();
    if (!activeCoupon) return null;

    const validation = validateCoupon(activeCoupon.code, subtotal, deliveryFee);
    if (!validation.valid) {
        clearAppliedCoupon();
        return null;
    }

    return { ...activeCoupon };
}
