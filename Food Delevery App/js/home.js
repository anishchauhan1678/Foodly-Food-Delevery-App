import { AppState } from "./state.js";
import { saveCart } from "./storage.js";
import { showToast } from "./utils.js";
import { searchAll } from "./search.js";
import { createFavoriteButton } from "./favorites.js";

const PLACEHOLDERS = {
    food: "../assets/placeholder-food.svg",
    restaurant: "../assets/placeholder-restaurant.svg",
    category: "../assets/placeholder-category.svg"
};

function normalizeSearch(value) {
    return String(value ?? "").trim().toLowerCase();
}

function createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = String(content);
    return element;
}

function imageWithFallback(image, alt, type = "food") {
    const element = document.createElement("img");
    const placeholder = PLACEHOLDERS[type];
    element.src = image || placeholder;
    element.alt = alt;
    element.loading = "lazy";
    element.addEventListener("error", () => {
        if (element.src.endsWith(placeholder)) {
            element.removeAttribute("src");
            return;
        }
        element.src = placeholder;
    }, { once: true });
    return element;
}

function restaurantName(restaurantId) {
    return AppState.restaurants.find(item => item.id === restaurantId)?.name || "Local kitchen";
}

function renderCategories() {
    const container = document.querySelector("#categories-container");
    container.replaceChildren();
    if (!AppState.categories.length) {
        container.append(createElement("p", "empty-state", "No categories available."));
        return;
    }
    AppState.categories.forEach(category => {
        const button = createElement("button", "category-card");
        button.type = "button";
        button.append(imageWithFallback(category.image, `${category.name} category`, "category"));
        button.append(createElement("span", "category-name", category.name));
        button.addEventListener("click", () => {
            AppState.selectedCategory = category.id;
            renderSearchResults(category.name);
            document.querySelector("#search-results-section").scrollIntoView({ behavior: "smooth" });
        });
        container.append(button);
    });
}

function renderOffers() {
    const container = document.querySelector("#offers-container");
    container.replaceChildren();
    const offers = AppState.offers.filter(offer => offer.isActive);
    if (!offers.length) {
        container.append(createElement("p", "empty-state", "No current offers."));
        return;
    }
    offers.forEach(offer => {
        const card = createElement("article", "offer-card");
        const discount = offer.discountType === "percentage" ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`;
        card.append(createElement("span", "offer-label", discount));
        card.append(createElement("h3", "offer-title", offer.title));
        card.append(createElement("p", "offer-description", offer.description));
        card.append(createElement("code", "offer-code", `Use code: ${offer.code}`));
        card.append(createElement("small", "offer-minimum", `Minimum order ₹${offer.minimumOrder}`));
        container.append(card);
    });
}

function createRestaurantCard(restaurant) {
    const link = createElement("a", "restaurant-card");
    link.href = `restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
    const imageWrap = createElement("div", "image-wrap");
    imageWrap.append(imageWithFallback(restaurant.image, `${restaurant.name} restaurant`, "restaurant"));
    imageWrap.append(createFavoriteButton(restaurant, "restaurant", "favorite-toggle restaurant-favorite"));
    link.append(imageWrap);
    const body = createElement("div", "card-body");
    const top = createElement("div", "card-row");
    top.append(createElement("h3", "card-title", restaurant.name));
    top.append(createElement("span", restaurant.isOpen ? "status open" : "status closed", restaurant.isOpen ? "Open" : "Closed"));
    body.append(top);
    body.append(createElement("p", "muted", `${restaurant.cuisines.join(" · ")} · ${restaurant.deliveryTime}`));
    body.append(createElement("p", "card-meta", `★ ${restaurant.rating}  ·  ₹${restaurant.priceForTwo} for two`));
    link.append(body);
    return link;
}

function renderRestaurants() {
    const container = document.querySelector("#restaurants-container");
    container.replaceChildren();
    if (!AppState.restaurants.length) {
        container.append(createElement("p", "empty-state", "No restaurants available."));
        return;
    }
    [...AppState.restaurants].sort((a, b) => b.rating - a.rating).slice(0, 6).forEach(restaurant => container.append(createRestaurantCard(restaurant)));
}

function addToCart(foodId) {
    const food = AppState.foods.find(item => item.id === foodId);
    if (!food) return;
    const item = AppState.cart.find(cartItem => cartItem.foodId === food.id);
    if (item) {
        item.quantity += 1;
    } else {
        AppState.cart.push({ foodId: food.id, restaurantId: food.restaurantId, name: food.name, price: food.discountPrice ?? food.price, image: food.image, quantity: 1 });
    }
    saveCart(AppState.cart);
    updateCartCount();
    showToast(`${food.name} added to cart.`);
}

function createFoodCard(food) {
    const card = createElement("article", "food-card");
    card.addEventListener("click", event => {
        if (!event.target.closest("button")) window.location.href = `food.html?id=${encodeURIComponent(food.id)}`;
    });
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") window.location.href = `food.html?id=${encodeURIComponent(food.id)}`;
    });
    const imageWrap = createElement("div", "image-wrap");
    imageWrap.append(imageWithFallback(food.image, food.name));
    imageWrap.append(createFavoriteButton(food, "food", "favorite-toggle food-favorite"));
    card.append(imageWrap);
    const body = createElement("div", "card-body");
    const heading = createElement("div", "card-row");
    heading.append(createElement("h3", "card-title", food.name));
    heading.append(createElement("span", food.isVeg ? "food-type veg" : "food-type non-veg", food.isVeg ? "VEG" : "NON-VEG"));
    body.append(heading);
    body.append(createElement("p", "muted", `${restaurantName(food.restaurantId)} · ★ ${food.rating || "New"}`));
    body.append(createElement("p", "food-description", food.description));
    const footer = createElement("div", "card-row food-footer");
    footer.append(createElement("strong", "food-price", `₹${food.discountPrice ?? food.price}`));
    const button = createElement("button", "add-button", "Add");
    button.type = "button";
    button.setAttribute("aria-label", `Add ${food.name} to cart`);
    button.addEventListener("click", event => {
        event.preventDefault();
        addToCart(food.id);
    });
    footer.append(button);
    body.append(footer);
    card.append(body);
    return card;
}

function renderFoods() {
    const container = document.querySelector("#foods-container");
    container.replaceChildren();
    if (!AppState.foods.length) {
        container.append(createElement("p", "empty-state", "No food items available."));
        return;
    }
    [...AppState.foods].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6).forEach(food => container.append(createFoodCard(food)));
}

export function searchFoodsAndRestaurants(query) {
    const results = searchAll(query);
    return { restaurants: results.restaurants, foods: results.foods, categories: results.categories };
}

function buildSuggestionItem(type, label, value, icon) {
    return { type, label, value, icon };
}

function getSuggestionList(query) {
    const value = normalizeSearch(query);
    if (!value) return [];

    const { foods, restaurants, categories } = searchFoodsAndRestaurants(value);
    const suggestions = [];

    foods.slice(0, 4).forEach(food => suggestions.push(buildSuggestionItem("FOOD", `${food.name}`, food.name, "🍔")));
    restaurants.slice(0, 4).forEach(restaurant => suggestions.push(buildSuggestionItem("RESTAURANT", `${restaurant.name}`, restaurant.name, "🍽️")));
    categories.slice(0, 4).forEach(category => suggestions.push(buildSuggestionItem("CATEGORY", `${category.name}`, category.name, "🏷️")));

    return suggestions.filter((item, index, array) => array.findIndex(candidate => candidate.value.toLowerCase() === item.value.toLowerCase()) === index).slice(0, 8);
}

function closeSuggestions() {
    const suggestions = document.querySelector("#search-suggestions");
    if (suggestions) {
        suggestions.hidden = true;
        suggestions.innerHTML = "";
    }
}

function renderSuggestions(query) {
    const suggestions = document.querySelector("#search-suggestions");
    const value = normalizeSearch(query);
    if (!value) {
        closeSuggestions();
        return;
    }

    const items = getSuggestionList(value);
    if (!items.length) {
        closeSuggestions();
        return;
    }

    suggestions.innerHTML = "";
    items.forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "search-suggestion";
        button.setAttribute("role", "option");
        button.innerHTML = `
            <span class="suggestion-icon">${item.icon}</span>
            <span class="suggestion-label">${item.label}</span>
            <span class="suggestion-type">${item.type}</span>
        `;
        button.addEventListener("click", () => {
            const input = document.querySelector("#hero-search-input");
            input.value = item.value;
            closeSuggestions();
            renderSearchResults(item.value);
            document.querySelector("#search-results-section").scrollIntoView({ behavior: "smooth", block: "start" });
        });
        suggestions.append(button);
    });
    suggestions.hidden = false;
}

function renderSearchResults(query) {
    const section = document.querySelector("#search-results-section");
    const container = document.querySelector("#search-results");
    const title = document.querySelector("#search-results-title");
    const searchText = String(query ?? "").trim();
    const { restaurants, foods, categories } = searchFoodsAndRestaurants(searchText);

    if (!searchText) {
        section.hidden = true;
        container.replaceChildren();
        title.textContent = "Results";
        return;
    }

    section.hidden = false;
    title.textContent = `Results for "${searchText}"`;
    container.replaceChildren();
    const groups = [
        ["Foods", foods, food => createFoodCard(food)],
        ["Restaurants", restaurants, restaurant => createRestaurantCard(restaurant)],
        ["Categories", categories, category => {
            const link = createElement("a", "search-category-result", category.name);
            link.href = `restaurants.html?category=${encodeURIComponent(category.id)}`;
            return link;
        }]
    ];
    groups.forEach(([label, items, create]) => {
        if (!items.length) return;
        const group = createElement("div", "search-result-group");
        group.append(createElement("h3", "search-group-title", label));
        items.slice(0, 5).forEach(item => group.append(create(item)));
        if (items.length > 5) {
            const link = createElement("a", "view-all-results", "View all results");
            link.href = `restaurants.html?search=${encodeURIComponent(searchText)}`;
            group.append(link);
        }
        container.append(group);
    });
    if (!restaurants.length && !foods.length && !categories.length) {
        const emptyState = createElement("div", "empty-search-state");
        const icon = createElement("div", "empty-search-icon", "🔍");
        icon.setAttribute("aria-hidden", "true");
        const title = createElement("h3", "", "No results found");
        const description = createElement("p", "", `We couldn't find anything matching "${searchText}".`);
        const suggestions = createElement("div", "empty-search-suggestions");
        ["Burger", "Pizza", "Biryani"].forEach(item => {
            const pill = createElement("span", "", item);
            suggestions.append(pill);
        });
        emptyState.append(icon, title, description, suggestions);
        container.append(emptyState);
    }
}

function updateCartCount() {
    const count = AppState.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    document.querySelectorAll(".cart-count").forEach(element => {
        element.textContent = count;
    });
}

function setupSearchInteractions() {
    const form = document.querySelector("#hero-search-form");
    const input = document.querySelector("#hero-search-input");
    const clearButton = document.querySelector("#search-clear-btn");
    const suggestions = document.querySelector("#search-suggestions");

    if (!form || !input || !clearButton || !suggestions) return;

    const showClearButton = () => {
        clearButton.hidden = !input.value.trim();
    };

    input.addEventListener("input", event => {
        const value = event.target.value;
        showClearButton();
        if (!value.trim()) {
            closeSuggestions();
            return;
        }
        renderSuggestions(value);
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSuggestions();
            input.blur();
        }
    });

    clearButton.addEventListener("click", () => {
        input.value = "";
        closeSuggestions();
        showClearButton();
        const section = document.querySelector("#search-results-section");
        if (section) section.hidden = true;
        const container = document.querySelector("#search-results");
        if (container) container.replaceChildren();
    });

    form.addEventListener("submit", event => {
        event.preventDefault();
        const value = input.value.trim();
        closeSuggestions();
        renderSearchResults(value);
        document.querySelector("#search-results-section").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    showClearButton();
}

function renderHome() {
    renderCategories();
    renderOffers();
    renderRestaurants();
    renderFoods();
    updateCartCount();
    setupSearchInteractions();
}

if (AppState.initialized) renderHome();
else document.addEventListener("app:initialized", renderHome, { once: true });
