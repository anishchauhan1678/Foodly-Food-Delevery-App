import { AppState } from "./state.js";
import { toggleFavorite, isFavorite, getFavoriteIds } from "./favorites.js";

function applyTheme() {
    const prefersDark = localStorage.getItem("foodDeliveryTheme") === "dark";
    document.body.classList.toggle("dark-theme", prefersDark);
    const toggle = document.querySelector("[data-theme-toggle]");
    if (toggle) toggle.setAttribute("aria-pressed", String(prefersDark));
    if (toggle) toggle.textContent = prefersDark ? "☀️" : "🌙";
}

function bindThemeToggle() {
    const toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;
    toggle.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark-theme");
        localStorage.setItem("foodDeliveryTheme", isDark ? "dark" : "light");
        toggle.setAttribute("aria-pressed", String(isDark));
        toggle.textContent = isDark ? "☀️" : "🌙";
    });
}

function bindFavorites() {
    document.querySelectorAll("[data-favorite-id]").forEach(button => {
        const type = button.dataset.favoriteType || "food";
        const id = button.dataset.favoriteId;
        if (!id) return;
        const update = () => {
            const active = isFavorite(type, id);
            button.classList.toggle("is-favorite", active);
            button.setAttribute("aria-pressed", String(active));
            button.title = active ? "Remove from favorites" : "Add to favorites";
            button.textContent = active ? "♥" : "♡";
        };
        update();
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            toggleFavorite(type, id);
            update();
        });
    });
}

function attachFavoriteButtons() {
    const pages = ["home", "restaurants", "restaurant", "food"];
    pages.forEach(page => {
        const ids = getFavoriteIds(page);
        if (!ids.length) return;
        ids.forEach(id => {
            const buttons = document.querySelectorAll(`[data-favorite-type="${page}"]`);
            const match = Array.from(buttons).find(button => String(button.dataset.favoriteId) === String(id));
            if (match) {
                match.classList.add("is-favorite");
                match.setAttribute("aria-pressed", "true");
                match.textContent = "♥";
            }
        });
    });
}

export function bootUiEnhancements() {
    applyTheme();
    bindThemeToggle();
    bindFavorites();
    attachFavoriteButtons();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootUiEnhancements, { once: true });
} else {
    bootUiEnhancements();
}

export function hydrateFavoriteButtons() {
    bindFavorites();
    attachFavoriteButtons();
}
