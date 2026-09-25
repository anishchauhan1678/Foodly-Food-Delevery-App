
import { AppState } from "./state.js";
import { saveCart } from "./storage.js";
import { showToast } from "./utils.js";
import { createFavoriteButton } from "./favorites.js";

const FoodPageState = { foodId: null, quantity: 1 };
const foodPlaceholder = "../assets/placeholder-food.svg";

function foodPageElement(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = String(content);
    return node;
}

function foodPageImage(source, alt) {
    const image = document.createElement("img");
    image.src = source || foodPlaceholder;
    image.alt = alt;
    image.addEventListener("error", () => { if (!image.src.endsWith(foodPlaceholder)) image.src = foodPlaceholder; }, { once: true });
    return image;
}

function foodPageFind() { return AppState.foods.find(item => item.id === FoodPageState.foodId); }
function foodPageRestaurant(food) { return AppState.restaurants.find(item => item.id === food.restaurantId); }
function foodPageCategory(food) { return AppState.categories.find(item => item.id === food.categoryId); }

function foodPageAddToCart(food) {
    const restaurant = foodPageRestaurant(food);
    if (!food.isAvailable || (restaurant && !restaurant.isOpen)) return;
    const item = AppState.cart.find(cartItem => cartItem.foodId === food.id);
    if (item) item.quantity += FoodPageState.quantity;
    else AppState.cart.push({ foodId: food.id, restaurantId: food.restaurantId, name: food.name, price: food.discountPrice ?? food.price, image: food.image, quantity: FoodPageState.quantity });
    saveCart(AppState.cart);
    const count = AppState.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const foodCartCount = document.querySelector("#food-cart-count");
    if (foodCartCount) foodCartCount.textContent = count;
    document.querySelectorAll(".cart-count").forEach(element => {
        element.textContent = count;
    });
    showToast("Food added to cart.");
}

function foodPageRelated(food) {
    return AppState.foods.filter(item => item.id !== food.id && (item.restaurantId === food.restaurantId || item.categoryId === food.categoryId)).sort((a, b) => Number(b.restaurantId === food.restaurantId) - Number(a.restaurantId === food.restaurantId)).slice(0, 6);
}

function foodPageRelatedLink(food) {
    const link = foodPageElement("a", "related-food-card");
    link.href = `food.html?id=${encodeURIComponent(food.id)}`;
    link.append(foodPageImage(food.image, food.name));
    const body = foodPageElement("div", "related-food-body");
    body.append(foodPageElement("h3", "", food.name));
    body.append(foodPageElement("p", "food-muted", `★ ${food.rating || "New"} · ₹${food.discountPrice ?? food.price}`));
    link.append(body);
    return link;
}

function foodPageInvalid() {
    const container = document.querySelector("#food-detail");
    container.replaceChildren(foodPageElement("div", "not-found", "Food item not found."));
    const back = foodPageElement("a", "back-button", "← Back to Restaurants");
    back.href = "restaurants.html";
    container.append(back);
}

function foodPageRender(food) {
    const restaurant = foodPageRestaurant(food);
    const category = foodPageCategory(food);
    const container = document.querySelector("#food-detail");
    if (!restaurant) { foodPageInvalid(); return; }
    document.title = `${food.name} | Food Delivery App`;
    document.querySelector("#food-breadcrumb").textContent = food.name;
    const restaurantCrumb = document.querySelector("#food-restaurant-breadcrumb");
    if (restaurantCrumb) {
        restaurantCrumb.textContent = restaurant.name;
        restaurantCrumb.href = `restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
    }
    const layout = foodPageElement("section", "food-detail-layout");
    layout.append(foodPageImage(food.image, food.name));
    const info = foodPageElement("div", "food-detail-info");
    info.append(foodPageElement("p", "kicker", category?.name || "Food item"));
    info.append(foodPageElement("h1", "", food.name));
    info.append(foodPageElement("p", "food-detail-rating", `★ ${food.rating || "New"}${food.ratingCount ? ` (${food.ratingCount} ratings)` : ""}`));
    info.append(foodPageElement("strong", "food-detail-price", `₹${food.discountPrice ?? food.price}`));
    info.append(foodPageElement("p", "food-detail-description", food.description));
    const badges = foodPageElement("div", "food-detail-badges");
    badges.append(foodPageElement("span", food.isVeg ? "food-badge veg" : "food-badge non-veg", food.isVeg ? "VEG" : "NON-VEG"));
    badges.append(foodPageElement("span", food.isAvailable ? "availability available" : "availability unavailable", food.isAvailable ? "Available" : "Currently unavailable"));
    info.append(badges);
    const restaurantBox = foodPageElement("div", "food-restaurant-box");
    restaurantBox.append(foodPageElement("p", "kicker", "From the kitchen"));
    restaurantBox.append(foodPageElement("h2", "", restaurant.name));
    restaurantBox.append(foodPageElement("p", "food-muted", `${restaurant.cuisines.join(" · ")} · ${restaurant.deliveryTime}`));
    restaurantBox.append(foodPageElement("p", restaurant.isOpen ? "restaurant-open" : "restaurant-closed", restaurant.isOpen ? "Open now" : "Restaurant currently closed"));
    const restaurantLink = foodPageElement("a", "view-restaurant-button", "View Restaurant");
    restaurantLink.href = `restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
    restaurantBox.append(restaurantLink);
    info.append(restaurantBox);
    const controls = foodPageElement("div", "quantity-controls");
    const minus = foodPageElement("button", "quantity-button", "−");
    const quantity = foodPageElement("output", "quantity-value", FoodPageState.quantity);
    const plus = foodPageElement("button", "quantity-button", "+");
    minus.type = plus.type = "button";
    minus.setAttribute("aria-label", "Decrease quantity");
    plus.setAttribute("aria-label", "Increase quantity");
    minus.addEventListener("click", () => { FoodPageState.quantity = Math.max(1, FoodPageState.quantity - 1); quantity.value = FoodPageState.quantity; quantity.textContent = FoodPageState.quantity; });
    plus.addEventListener("click", () => { FoodPageState.quantity = Math.min(10, FoodPageState.quantity + 1); quantity.value = FoodPageState.quantity; quantity.textContent = FoodPageState.quantity; });
    controls.append(minus, quantity, plus);
    info.append(controls);
    const actions = foodPageElement("div", "food-detail-actions");
    const add = foodPageElement("button", "food-add-button", "Add to Cart");
    add.type = "button";
    add.disabled = !food.isAvailable || !restaurant.isOpen;
    add.addEventListener("click", () => foodPageAddToCart(food));
    actions.append(add, createFavoriteButton(food, "food", "favorite-toggle food-favorite"));
    info.append(actions);
    layout.append(info);
    const related = foodPageElement("section", "related-food-section");
    related.append(foodPageElement("p", "kicker", "Keep exploring"));
    related.append(foodPageElement("h2", "", "Related Food"));
    const relatedGrid = foodPageElement("div", "related-food-grid");
    foodPageRelated(food).forEach(item => relatedGrid.append(foodPageRelatedLink(item)));
    if (!relatedGrid.children.length) relatedGrid.append(foodPageElement("p", "empty-state", "No related food items available."));
    related.append(relatedGrid);
    container.replaceChildren(layout, related);
}

function setupFoodPage() {
    FoodPageState.foodId = new URLSearchParams(window.location.search).get("id");
    const count = AppState.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    document.querySelectorAll(".cart-count").forEach(element => {
        element.textContent = count;
    });
    const food = foodPageFind();
    if (food) foodPageRender(food); else foodPageInvalid();
}

if (document.querySelector("#food-detail")) {
    if (AppState.initialized) setupFoodPage();
    else {
        document.addEventListener("app:initialized", setupFoodPage, { once: true });
        const initializationCheck = window.setInterval(() => {
            if (AppState.initialized) {
                window.clearInterval(initializationCheck);
                setupFoodPage();
            }
        }, 50);
    }
    window.setTimeout(() => {
        if (AppState.initialized && document.querySelector("#food-detail").querySelector(".loading-state")) setupFoodPage();
    }, 500);
}


