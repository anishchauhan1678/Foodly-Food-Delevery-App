import { AppState } from "./state.js";
import { createFavoriteButton } from "./favorites.js";

const defaultFilters = {
    search: "",
    cuisine: "All",
    rating: "All",
    delivery: "All",
    price: "All",
    vegetarian: false,
    category: "All",
    sort: "recommended"
};

const state = { ...defaultFilters };
const draftState = { ...defaultFilters };
const placeholders = { restaurant: "../assets/placeholder-restaurant.svg" };
let lastMobileFilterTrigger = null;

const filterMeta = {
    cuisine: { label: "Cuisine", empty: "All" },
    rating: { label: "Rating", empty: "All" },
    delivery: { label: "Delivery", empty: "All" },
    price: { label: "Price", empty: "All" },
    category: { label: "Category", empty: "All" },
    vegetarian: { label: "Vegetarian", empty: "Off" },
    search: { label: "Search", empty: "" }
};

function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = String(content);
    return node;
}

function imageFor(item, alt) {
    const image = document.createElement("img");
    image.src = item.image || placeholders.restaurant;
    image.alt = alt;
    image.loading = "lazy";
    image.addEventListener("error", () => {
        if (!image.src.endsWith(placeholders.restaurant)) image.src = placeholders.restaurant;
    }, { once: true });
    return image;
}

function parseDeliveryMinutes(deliveryTime) {
    if (typeof deliveryTime === "number") return deliveryTime;
    const matches = String(deliveryTime).match(/\d+/g);
    if (!matches || !matches.length) return Number.MAX_SAFE_INTEGER;
    const values = matches.map(Number);
    return Math.max(...values);
}

function getCategoryName(categoryId) {
    return AppState.categories.find(category => category.id === categoryId)?.name || "Unknown";
}

function getVisibleCuisines() {
    const unique = new Set();
    AppState.restaurants.forEach(restaurant => {
        (restaurant.cuisines || []).forEach(cuisine => unique.add(cuisine));
    });
    return ["All", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
}

function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase();
}

export function searchRestaurants(query) {
    const value = normalizeText(query);
    if (!value) return [...AppState.restaurants];
    const matchingCategoryIds = new Set(AppState.categories
        .filter(category => category.name.toLowerCase().includes(value))
        .map(category => category.id));

    return AppState.restaurants.filter(restaurant => {
        const categoryText = (restaurant.categoryIds || []).map(getCategoryName).join(" ").toLowerCase();
        const nearbyText = [
            restaurant.name,
            restaurant.address,
            ...(restaurant.cuisines || []),
            categoryText
        ].join(" ").toLowerCase();

        return nearbyText.includes(value) || restaurant.categoryIds.some(categoryId => matchingCategoryIds.has(categoryId));
    });
}

function getPriceFilterLabel(value) {
    switch (value) {
        case "under-200": return "Under ₹200";
        case "200-400": return "₹200–₹400";
        case "above-400": return "Above ₹400";
        default: return "Any Price";
    }
}

function getDeliveryFilterLabel(value) {
    if (value === "All") return "Any Time";
    return `Under ${value} min`;
}

function getRatingFilterLabel(value) {
    if (value === "All") return "All Ratings";
    return `${value}+`;
}

function isRestaurantMatch(restaurant) {
    const query = normalizeText(state.search);
    const categoryMatches = state.category === "All" || (restaurant.categoryIds || []).includes(state.category);
    const cuisineMatches = state.cuisine === "All" || (restaurant.cuisines || []).some(cuisine => cuisine.toLowerCase() === state.cuisine.toLowerCase());
    const ratingMatches = state.rating === "All" || restaurant.rating >= Number(state.rating);
    const deliveryMatches = state.delivery === "All" || parseDeliveryMinutes(restaurant.deliveryTime) <= Number(state.delivery);
    const priceMatches = state.price === "All" || (
        (state.price === "under-200" && restaurant.priceForTwo < 200) ||
        (state.price === "200-400" && restaurant.priceForTwo >= 200 && restaurant.priceForTwo <= 400) ||
        (state.price === "above-400" && restaurant.priceForTwo > 400)
    );
    const vegetarianMatches = !state.vegetarian || Boolean(restaurant.vegetarian);

    const matchesQuery = !query || searchRestaurants(query).some(item => item.id === restaurant.id);

    return categoryMatches && cuisineMatches && ratingMatches && deliveryMatches && priceMatches && vegetarianMatches && matchesQuery;
}

function applyFilters() {
    let results = [...AppState.restaurants];
    if (state.search) {
        results = searchRestaurants(state.search);
    }

    results = results.filter(restaurant => isRestaurantMatch(restaurant));

    const sorted = [...results];
    switch (state.sort) {
        case "rating":
            sorted.sort((a, b) => b.rating - a.rating);
            break;
        case "delivery":
            sorted.sort((a, b) => parseDeliveryMinutes(a.deliveryTime) - parseDeliveryMinutes(b.deliveryTime));
            break;
        case "price-low":
            sorted.sort((a, b) => a.priceForTwo - b.priceForTwo);
            break;
        case "price-high":
            sorted.sort((a, b) => b.priceForTwo - a.priceForTwo);
            break;
        case "name-asc":
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        default:
            break;
    }
    return sorted;
}

function restaurantCard(restaurant) {
    const link = element("a", "listing-restaurant-card");
    link.href = `restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
    const imageWrap = element("div", "listing-image-wrap");
    imageWrap.append(imageFor(restaurant, `${restaurant.name} restaurant`));
    imageWrap.append(createFavoriteButton(restaurant, "restaurant", "favorite-toggle restaurant-favorite"));
    link.append(imageWrap);
    const body = element("div", "listing-card-body");
    const heading = element("div", "listing-card-heading");
    heading.append(element("h3", "", restaurant.name));
    heading.append(element("span", restaurant.isOpen ? "listing-status open" : "listing-status closed", restaurant.isOpen ? "Open" : "Closed"));
    body.append(heading);
    body.append(element("p", "listing-muted", `${(restaurant.cuisines || []).join(" · ")}`));
    body.append(element("p", "listing-muted", `${restaurant.address} · ${restaurant.deliveryTime}`));
    body.append(element("p", "listing-meta", `★ ${restaurant.rating} (${restaurant.ratingCount}) · ₹${restaurant.priceForTwo} for two`));
    if (restaurant.vegetarian) {
        body.append(element("p", "listing-minimum", "🌿 Vegetarian friendly"));
    }
    body.append(element("p", "listing-minimum", `Minimum order ₹${restaurant.minimumOrder}`));
    link.append(body);
    return link;
}

function getActiveFilters() {
    const filters = [];
    if (state.search) filters.push({ key: "search", label: `Search: ${state.search}` });
    if (state.cuisine !== "All") filters.push({ key: "cuisine", label: `Cuisine: ${state.cuisine}` });
    if (state.rating !== "All") filters.push({ key: "rating", label: `Rating: ${getRatingFilterLabel(state.rating)}` });
    if (state.delivery !== "All") filters.push({ key: "delivery", label: `Delivery: ${getDeliveryFilterLabel(state.delivery)}` });
    if (state.price !== "All") filters.push({ key: "price", label: `Price: ${getPriceFilterLabel(state.price)}` });
    if (state.category !== "All") filters.push({ key: "category", label: `Category: ${getCategoryName(state.category)}` });
    if (state.vegetarian) filters.push({ key: "vegetarian", label: "Vegetarian only" });
    return filters;
}

function renderActiveFilters() {
    const container = document.querySelector("#active-filters");
    if (!container) return;
    container.replaceChildren();

    const activeFilters = getActiveFilters();
    if (!activeFilters.length) {
        container.append(element("span", "", "No active filters"));
        return;
    }

    activeFilters.forEach(filter => {
        const chip = element("button", "filter-chip", filter.label);
        chip.type = "button";
        chip.setAttribute("aria-label", `Remove ${filter.label} filter`);
        const close = element("span", "chip-close", "×");
        close.setAttribute("aria-hidden", "true");
        chip.append(close);
        chip.addEventListener("click", () => {
            if (filter.key === "search") state.search = "";
            else if (filter.key === "cuisine") state.cuisine = "All";
            else if (filter.key === "rating") state.rating = "All";
            else if (filter.key === "delivery") state.delivery = "All";
            else if (filter.key === "price") state.price = "All";
            else if (filter.key === "category") state.category = "All";
            else if (filter.key === "vegetarian") state.vegetarian = false;
            render();
        });
        container.append(chip);
    });
}

function renderResults() {
    const list = document.querySelector("#restaurant-list");
    const title = document.querySelector("#restaurant-results-title");
    const count = document.querySelector("#restaurant-results-count");
    const results = applyFilters();

    if (!list || !title || !count) return;

    list.replaceChildren();

    const countText = results.length === 1 ? "1 restaurant found" : `${results.length} restaurants found`;
    count.textContent = countText;
    title.textContent = state.search ? `Results for "${state.search}"` : "All restaurants";

    if (!results.length) {
        const empty = element("div", "empty-results");
        const icon = element("div", "empty-icon", "🔍");
        const heading = element("h3", "", "No restaurants found");
        const message = element("p", "", "Try changing your search or filters.");
        const button = element("button", "primary-button", "Clear Filters");
        button.type = "button";
        button.addEventListener("click", () => {
            clearAllFilters();
        });
        empty.append(icon, heading, message, button);
        list.append(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    results.forEach(restaurant => fragment.append(restaurantCard(restaurant)));
    list.append(fragment);
}

function buildOptionButton(option, valueKey, source, onChange, isMobile = false) {
    const button = element("button", `option-button${source[valueKey] === option.value ? " selected" : ""}`);
    button.type = "button";
    button.textContent = option.label;
    button.setAttribute("aria-pressed", String(source[valueKey] === option.value));
    button.addEventListener("click", () => {
        if (onChange) {
            onChange(valueKey, option.value, button);
        }
    });
    return button;
}

function buildFilterGroup(title, options, key, source, onChange, type = "buttons", isMobile = false) {
    const group = element("div", "filter-group");
    const heading = element("h3", "", title);
    group.append(heading);

    if (type === "toggle") {
        const row = element("label", "checkbox-row");
        const labelText = element("span", "", "Vegetarian Only");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(source.vegetarian);
        checkbox.addEventListener("change", event => {
            if (onChange) onChange(key, event.target.checked);
        });
        row.append(labelText, checkbox);
        group.append(row);
        return group;
    }

    const optionWrapper = element("div", "filter-options");
    options.forEach(option => {
        optionWrapper.append(buildOptionButton(option, key, source, onChange, isMobile));
    });
    group.append(optionWrapper);
    return group;
}

function renderFilterPanel(container, sourceState, isMobile = false) {
    if (!container) return;
    container.replaceChildren();

    const cuisineOptions = getVisibleCuisines().map(value => ({ label: value === "All" ? "All" : value, value }));
    const ratingOptions = [
        { label: "All Ratings", value: "All" },
        { label: "4.5+", value: "4.5" },
        { label: "4.0+", value: "4.0" },
        { label: "3.5+", value: "3.5" }
    ];
    const deliveryOptions = [
        { label: "Any Time", value: "All" },
        { label: "Under 30 min", value: "30" },
        { label: "Under 45 min", value: "45" },
        { label: "Under 60 min", value: "60" }
    ];
    const priceOptions = [
        { label: "Any Price", value: "All" },
        { label: "Under ₹200", value: "under-200" },
        { label: "₹200–₹400", value: "200-400" },
        { label: "Above ₹400", value: "above-400" }
    ];
    const categoryOptions = [{ label: "All Categories", value: "All" }, ...AppState.categories.map(category => ({ label: category.name, value: category.id }))];

    const groups = [
        { key: "cuisine", title: "Cuisine", options: cuisineOptions },
        { key: "rating", title: "Rating", options: ratingOptions },
        { key: "delivery", title: "Delivery Time", options: deliveryOptions },
        { key: "price", title: "Price Range", options: priceOptions },
        { key: "category", title: "Category", options: categoryOptions },
        { key: "vegetarian", title: "Vegetarian", options: [], type: "toggle" }
    ];

    groups.forEach(group => {
        const item = buildFilterGroup(group.title, group.options, group.key, sourceState, (key, value) => {
            if (isMobile) {
                sourceState[key] = value;
            } else {
                state[key] = value;
                render();
            }
        }, group.type || "buttons", isMobile);
        container.append(item);
    });
}

function clearAllFilters() {
    Object.assign(state, defaultFilters);
    const input = document.querySelector("#restaurant-search");
    if (input) input.value = "";
    const sortSelect = document.querySelector("#sort-filter");
    if (sortSelect) sortSelect.value = state.sort;
    render();
}

function render() {
    const sortSelect = document.querySelector("#sort-filter");
    if (sortSelect) sortSelect.value = state.sort;

    const searchInput = document.querySelector("#restaurant-search");
    if (searchInput) searchInput.value = state.search;

    renderFilterPanel(document.querySelector("#desktop-filters"), state, false);
    renderActiveFilters();
    renderResults();
    updateCartCount();
}

function updateCartCount() {
    const count = AppState.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    document.querySelectorAll(".cart-count").forEach(element => {
        element.textContent = count;
    });
}

function openMobileFilters() {
    Object.assign(draftState, state);
    const panel = document.querySelector("#mobile-filters");
    renderFilterPanel(panel, draftState, true);
    const drawer = document.querySelector("#mobile-filter-drawer");
    if (drawer) drawer.classList.remove("hidden");
    document.querySelector("#mobile-filter-toggle")?.setAttribute("aria-expanded", "true");
    drawer?.querySelector("button, input, select")?.focus();
}

function closeMobileFilters() {
    const drawer = document.querySelector("#mobile-filter-drawer");
    if (drawer) drawer.classList.add("hidden");
    document.querySelector("#mobile-filter-toggle")?.setAttribute("aria-expanded", "false");
    lastMobileFilterTrigger?.focus();
}

function applyMobileFilters() {
    Object.assign(state, draftState);
    render();
    closeMobileFilters();
}

function setup() {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get("category");
    const searchParam = params.get("search") || "";

    if (categoryParam && AppState.categories.some(category => category.id === categoryParam)) {
        state.category = categoryParam;
    }

    state.search = searchParam;

    const input = document.querySelector("#restaurant-search");
    if (input) input.value = state.search;

    const searchForm = document.querySelector("#restaurant-search-form");
    if (searchForm) {
        searchForm.addEventListener("submit", event => {
            event.preventDefault();
            state.search = input.value.trim();
            render();
        });
    }

    if (input) {
        input.addEventListener("input", event => {
            state.search = event.target.value.trim();
            render();
        });
    }

    const sortSelect = document.querySelector("#sort-filter");
    if (sortSelect) {
        sortSelect.addEventListener("change", event => {
            state.sort = event.target.value;
            render();
        });
    }

    const clearButton = document.querySelector("#clear-filters-btn");
    if (clearButton) {
        clearButton.addEventListener("click", clearAllFilters);
    }

    const mobileToggle = document.querySelector("#mobile-filter-toggle");
    if (mobileToggle) {
        mobileToggle.addEventListener("click", () => {
            lastMobileFilterTrigger = mobileToggle;
            openMobileFilters();
        });
    }

    const closeButton = document.querySelector("#close-mobile-filters");
    if (closeButton) {
        closeButton.addEventListener("click", closeMobileFilters);
    }

    const mobileApply = document.querySelector("#mobile-apply-filters");
    if (mobileApply) {
        mobileApply.addEventListener("click", applyMobileFilters);
    }

    const mobileClear = document.querySelector("#mobile-clear-filters");
    if (mobileClear) {
        mobileClear.addEventListener("click", () => {
            Object.assign(draftState, defaultFilters);
            renderFilterPanel(document.querySelector("#mobile-filters"), draftState, true);
            Object.assign(state, defaultFilters);
            render();
            closeMobileFilters();
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !document.querySelector("#mobile-filter-drawer")?.classList.contains("hidden")) {
            closeMobileFilters();
        }
    });

    render();
}

if (AppState.initialized) setup();
else document.addEventListener("app:initialized", setup, { once: true });
