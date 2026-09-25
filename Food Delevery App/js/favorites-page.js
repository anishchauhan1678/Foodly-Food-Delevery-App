import { AppState } from "./state.js";
import { createFavoriteButton } from "./favorites.js";
import { loadFavorites, saveCart } from "./storage.js";
import { showToast } from "./utils.js";

function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = String(content);
    return node;
}

function imageFor(source, alt, fallback) {
    const image = document.createElement("img");
    image.src = source || fallback;
    image.alt = alt;
    image.loading = "lazy";
    image.addEventListener("error", () => {
        if (!image.src.endsWith(fallback)) image.src = fallback;
    }, { once: true });
    return image;
}

function updateCartBadge() {
    const total = AppState.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    document.querySelectorAll(".cart-count").forEach(node => {
        node.textContent = total;
    });
}

function addToCart(food) {
    if (!food) return;
    const existing = AppState.cart.find(item => item.foodId === food.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        AppState.cart.push({
            foodId: food.id,
            restaurantId: food.restaurantId,
            name: food.name,
            price: food.discountPrice ?? food.price,
            image: food.image,
            quantity: 1
        });
    }
    saveCart(AppState.cart);
    updateCartBadge();
    showToast(`${food.name} added to cart.`);
}

function createRestaurantFavoriteCard(restaurant) {
    const card = element("article", "favorite-card");
    const imageWrap = element("div", "image-wrap");
    imageWrap.append(imageFor(restaurant.image, `${restaurant.name} restaurant`, "../assets/placeholder-restaurant.svg"));
    imageWrap.append(createFavoriteButton(restaurant, "restaurant", "favorite-toggle"));
    card.append(imageWrap);

    const content = element("div", "content");
    const titleLink = document.createElement("a");
    titleLink.href = `restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
    titleLink.append(element("h3", "", restaurant.name));
    content.append(titleLink);

    const meta = element("div", "meta-row");
    meta.append(element("span", "muted", restaurant.cuisines.join(" · ")));
    meta.append(element("span", "tag", restaurant.isOpen ? "Open" : "Closed"));
    content.append(meta);
    content.append(element("div", "muted", `${restaurant.deliveryTime} · ★ ${restaurant.rating}`));

    const footer = element("div", "meta-row");
    const price = element("span", "price", `₹${restaurant.priceForTwo} for two`);
    const action = document.createElement("a");
    action.href = `restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
    action.className = "secondary-button";
    action.textContent = "View";
    footer.append(price, action);
    content.append(footer);
    card.append(content);
    return card;
}

function createFoodFavoriteCard(food) {
    const card = element("article", "favorite-card");
    const imageWrap = element("div", "image-wrap");
    imageWrap.append(imageFor(food.image, food.name, "../assets/placeholder-food.svg"));
    imageWrap.append(createFavoriteButton(food, "food", "favorite-toggle"));
    card.append(imageWrap);

    const content = element("div", "content");
    const titleLink = document.createElement("a");
    titleLink.href = `food.html?id=${encodeURIComponent(food.id)}`;
    titleLink.append(element("h3", "", food.name));
    content.append(titleLink);
    content.append(element("div", "muted", food.description || "Freshly prepared and ready to enjoy."));

    const metaRow = element("div", "meta-row");
    metaRow.append(element("span", "tag", food.isVeg ? "VEG" : "NON-VEG"));
    metaRow.append(element("span", "price", `₹${food.discountPrice ?? food.price}`));
    content.append(metaRow);

    const actionRow = element("div", "meta-row");
    const view = document.createElement("a");
    view.href = `food.html?id=${encodeURIComponent(food.id)}`;
    view.className = "secondary-button";
    view.textContent = "View";

    const add = document.createElement("button");
    add.type = "button";
    add.className = "primary-button";
    add.textContent = "Add";
    add.addEventListener("click", event => {
        event.preventDefault();
        addToCart(food);
    });

    actionRow.append(view, add);
    content.append(actionRow);
    card.append(content);
    return card;
}

function emptyState(title, message) {
    const wrapper = document.createElement("div");
    wrapper.className = "favorite-empty empty-state";
    wrapper.innerHTML = `<div class="state-icon" aria-hidden="true">♥</div><h3 class="state-title">${title}</h3><p class="state-message">${message}</p><a class="primary-button state-action" href="restaurants.html">Explore Restaurants</a>`;
    return wrapper;
}

function renderFavorites() {
    const favorites = loadFavorites();
    const restaurants = favorites
        .filter(item => item.type === "restaurant")
        .map(item => AppState.restaurants.find(restaurant => restaurant.id === item.id))
        .filter(Boolean);
    const foods = favorites
        .filter(item => item.type === "food")
        .map(item => AppState.foods.find(food => food.id === item.id))
        .filter(Boolean);

    const restaurantList = document.querySelector("#favorite-restaurants-list");
    const foodList = document.querySelector("#favorite-foods-list");

    if (!restaurantList || !foodList) return;

    restaurantList.replaceChildren();
    foodList.replaceChildren();

    if (!restaurants.length) {
        restaurantList.append(emptyState("No favorites yet", "Save restaurants or dishes you love for quick access."));
    } else {
        restaurants.forEach(restaurant => restaurantList.append(createRestaurantFavoriteCard(restaurant)));
    }

    if (!foods.length) {
        foodList.append(emptyState("No favorites yet", "Save restaurants or dishes you love for quick access."));
    } else {
        foods.forEach(food => foodList.append(createFoodFavoriteCard(food)));
    }
}

function observeFavoriteUpdates() {
    document.addEventListener("favorites:updated", renderFavorites);
    document.addEventListener("app:initialized", renderFavorites);
    window.addEventListener("load", renderFavorites, { once: true });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeFavoriteUpdates, { once: true });
} else {
    observeFavoriteUpdates();
}

if (AppState.initialized) {
    renderFavorites();
    updateCartBadge();
} else if (document.readyState === "complete") {
    window.addEventListener("load", renderFavorites, { once: true });
}
