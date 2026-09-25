import { AppState } from "./state.js";
import { saveCart } from "./storage.js";
import { showToast } from "./utils.js";

const placeholders = { restaurant: "../assets/placeholder-restaurant.svg", food: "../assets/placeholder-food.svg" };
const detailState = { restaurantId: null, selectedCategory: null };

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
    image.addEventListener("error", () => { if (!image.src.endsWith(fallback)) image.src = fallback; }, { once: true });
    return image;
}

function addToCart(food) {
    if (!food.isAvailable) return;
    const item = AppState.cart.find(cartItem => cartItem.foodId === food.id);
    if (item) item.quantity += 1;
    else AppState.cart.push({ foodId: food.id, restaurantId: food.restaurantId, name: food.name, price: food.discountPrice ?? food.price, image: food.image, quantity: 1 });
    saveCart(AppState.cart);
    const count = AppState.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const detailCartCount = document.querySelector("#detail-cart-count");
    if (detailCartCount) detailCartCount.textContent = count;
    document.querySelectorAll(".cart-count").forEach(element => {
        element.textContent = count;
    });
    showToast(`${food.name} added to cart.`);
}

function foodCard(food, restaurantIsOpen) {
    const card = element("article", "detail-food-card");
    card.addEventListener("click", event => {
        if (!event.target.closest("button")) window.location.href = `food.html?id=${encodeURIComponent(food.id)}`;
    });
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") window.location.href = `food.html?id=${encodeURIComponent(food.id)}`;
    });
    card.append(imageFor(food.image, food.name, placeholders.food));
    const body = element("div", "detail-food-body");
    const heading = element("div", "detail-food-heading");
    heading.append(element("h3", "", food.name));
    heading.append(element("span", food.isVeg ? "food-badge veg" : "food-badge non-veg", food.isVeg ? "VEG" : "NON-VEG"));
    body.append(heading);
    body.append(element("p", "listing-muted", food.description));
    body.append(element("p", "detail-rating", `★ ${food.rating || "New"} · ${food.isAvailable ? "Available" : "Currently unavailable"}`));
    const footer = element("div", "detail-food-footer");
    footer.append(element("strong", "detail-price", `₹${food.discountPrice ?? food.price}`));
    const button = element("button", "detail-add", food.isAvailable && restaurantIsOpen ? "Add" : food.isAvailable ? "Currently closed" : "Unavailable");
    button.type = "button";
    button.disabled = !food.isAvailable || !restaurantIsOpen;
    button.setAttribute("aria-label", `Add ${food.name} to cart`);
    button.addEventListener("click", () => addToCart(food));
    footer.append(button);
    body.append(footer);
    card.append(body);
    return card;
}

function renderFood(restaurant) {
    const section = document.querySelector("#restaurant-food-section");
    const foods = AppState.foods.filter(food => food.restaurantId === restaurant.id);
    const categories = AppState.categories.filter(category => foods.some(food => food.categoryId === category.id));
    const tabs = document.querySelector("#food-category-tabs");
    tabs.replaceChildren();
    const allButton = element("button", !detailState.selectedCategory ? "active" : "", "All");
    allButton.type = "button";
    allButton.addEventListener("click", () => { detailState.selectedCategory = null; renderFood(restaurant); });
    tabs.append(allButton);
    categories.forEach(category => {
        const button = element("button", detailState.selectedCategory === category.id ? "active" : "", category.name);
        button.type = "button";
        button.addEventListener("click", () => { detailState.selectedCategory = category.id; renderFood(restaurant); });
        tabs.append(button);
    });
    const list = document.querySelector("#restaurant-food-list");
    list.replaceChildren();
    const visibleFoods = detailState.selectedCategory ? foods.filter(food => food.categoryId === detailState.selectedCategory) : foods;
    if (!visibleFoods.length) list.append(element("p", "empty-state", "No food items available at this restaurant."));
    else visibleFoods.forEach(food => list.append(foodCard(food, restaurant.isOpen)));
    section.hidden = false;
}

function render() {
    const container = document.querySelector("#restaurant-detail");
    const restaurant = AppState.restaurants.find(item => item.id === detailState.restaurantId);
    if (!restaurant) {
        container.replaceChildren(element("div", "not-found", "Restaurant not found."));
        const back = element("a", "back-button", "← Back to Restaurants");
        back.href = "restaurants.html";
        container.append(back);
        return;
    }
    document.title = `${restaurant.name} | Food Delivery App`;
    document.querySelector("#detail-breadcrumb").textContent = restaurant.name;
    const hero = element("section", "restaurant-hero");
    hero.append(imageFor(restaurant.image, `${restaurant.name} restaurant`, placeholders.restaurant));
    const info = element("div", "restaurant-hero-info");
    info.append(element("p", "kicker", restaurant.isOpen ? "Open now" : "Currently closed"));
    info.append(element("h1", "", restaurant.name));
    info.append(element("p", "restaurant-cuisines", restaurant.cuisines.join(" · ")));
    info.append(element("p", "restaurant-address", restaurant.address));
    const stats = element("div", "restaurant-stats");
    [[`★ ${restaurant.rating}`, `${restaurant.ratingCount} ratings`], [restaurant.deliveryTime, "delivery"], [`₹${restaurant.priceForTwo}`, "for two"], [`₹${restaurant.minimumOrder}`, "minimum order"]].forEach(([value, label]) => { const item = element("div", "restaurant-stat"); item.append(element("strong", "", value)); item.append(element("span", "", label)); stats.append(item); });
    info.append(stats);
    hero.append(info);
    container.replaceChildren(hero);
    const menu = document.createElement("section");
    menu.id = "restaurant-food-section";
    menu.className = "restaurant-menu";
    menu.innerHTML = "<div class=\"detail-section-heading\"><div><p class=\"kicker\">The menu</p><h2>What are you in the mood for?</h2></div></div><div id=\"food-category-tabs\" class=\"food-category-tabs\"></div><div id=\"restaurant-food-list\" class=\"detail-food-grid\"></div>";
    container.append(menu);
    renderFood(restaurant);
}

function setup() {
    detailState.restaurantId = new URLSearchParams(window.location.search).get("id");
    const count = AppState.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    document.querySelectorAll(".cart-count").forEach(element => {
        element.textContent = count;
    });
    render();
}

if (AppState.initialized) setup();
else document.addEventListener("app:initialized", setup, { once: true });
