import { AppState } from "./state.js";

function normalizeQuery(value) {
    return String(value ?? "").trim().toLowerCase();
}

function getCategoryName(categoryId) {
    return AppState.categories.find(category => category.id === categoryId)?.name ?? "";
}

function getRestaurantName(restaurantId) {
    return AppState.restaurants.find(restaurant => restaurant.id === restaurantId)?.name ?? "";
}

export function searchAll(query) {
    const value = normalizeQuery(query);
    if (!value) return { foods: [], restaurants: [], categories: [] };

    const categories = AppState.categories.filter(category => {
        const categoryName = category.name ?? "";
        return categoryName.toLowerCase().includes(value);
    });
    const categoryIds = new Set(categories.map(category => category.id));

    const foods = AppState.foods.filter(food => {
        const categoryName = getCategoryName(food.categoryId);
        const restaurantName = getRestaurantName(food.restaurantId);
        const searchable = [
            food.name,
            food.description,
            categoryName,
            restaurantName,
            food.isVeg ? "veg" : "non veg",
            food.isVeg ? "vegetarian" : "non vegetarian"
        ].join(" ").toLowerCase();

        return searchable.includes(value) || categoryIds.has(food.categoryId);
    });

    const restaurants = AppState.restaurants.filter(restaurant => {
        const categoryNames = restaurant.categoryIds
            .map(getCategoryName)
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const searchable = [
            restaurant.name,
            restaurant.address,
            restaurant.cuisines.join(" "),
            categoryNames,
            restaurant.deliveryTime,
            restaurant.priceForTwo
        ].join(" ").toLowerCase();

        return searchable.includes(value) || restaurant.categoryIds.some(categoryId => categoryIds.has(categoryId));
    });

    return { foods, restaurants, categories };
}
