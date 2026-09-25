import { AppState } from "./state.js";
import { isFavorite, loadFavorites, toggleFavorite } from "./storage.js";

export function getFavoriteCount() {
    return loadFavorites().length;
}

function updateFavoriteBadges() {
    const count = getFavoriteCount();
    document.querySelectorAll(".favorite-count").forEach(element => {
        element.textContent = count;
        element.hidden = count === 0;
    });
}

export function syncFavoriteBadges() {
    updateFavoriteBadges();
}

export function createFavoriteButton(item, type, className = "favorite-toggle") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.favoriteId = String(item?.id ?? "");
    button.dataset.favoriteType = type === "restaurant" || type === "food" ? type : "";
    button.setAttribute("aria-label", "Add to favorites");
    button.title = "Add to favorites";

    const updateButton = () => {
        const active = Boolean(item && item.id && isFavorite(item.id, type));
        button.classList.toggle("active", active);
        button.textContent = active ? "♥" : "♡";
        button.setAttribute("aria-label", active ? `Remove ${item?.name || "item"} from favorites` : `Add ${item?.name || "item"} to favorites`);
        button.setAttribute("aria-pressed", String(active));
        button.title = active ? "Remove from favorites" : "Add to favorites";
    };

    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();

        const payload = {
            id: item?.id,
            type,
            name: item?.name || item?.title || "",
            image: item?.image || "",
            price: Number(item?.price ?? item?.discountPrice ?? 0) || 0,
            restaurantId: item?.restaurantId || ""
        };

        const result = toggleFavorite(payload);
        updateButton();
        button.classList.remove("favorite-pop");
        void button.offsetWidth;
        button.classList.add("favorite-pop");
        syncFavoriteBadges();
        document.dispatchEvent(new CustomEvent("favorites:updated", {
            detail: {
                item: payload,
                type,
                isFavorite: result.isFavorite
            }
        }));
    });

    updateButton();
    return button;
}

document.addEventListener("favorites:updated", syncFavoriteBadges);
window.addEventListener("load", syncFavoriteBadges);
