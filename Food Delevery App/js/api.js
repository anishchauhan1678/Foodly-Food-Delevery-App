
import { loadJSON } from "./data-loader.js";

export async function loadAllData() {
    const files = [
        "settings.json",
        "categories.json",
        "restaurants.json",
        "foods.json",
        "offers.json",
        "users.json",
        "orders.json",
        "coupons.json",
        "addresses.json"
    ];

    const [settings, categories, restaurants, foods, offers, users, orders, coupons, addresses] =
        await Promise.all(files.map(loadJSON));

    const data = {
        settings,
        categories,
        restaurants,
        foods,
        offers,
        users,
        orders,
        coupons,
        addresses
    };

    validateApplicationData(data);
    return data;
}

export function validateApplicationData(data) {
    if (!data || typeof data.settings !== "object") {
        throw new Error("Application settings are missing or invalid.");
    }

    const collections = ["categories", "restaurants", "foods", "offers", "users", "orders", "coupons", "addresses"];

    for (const collection of collections) {
        if (!Array.isArray(data[collection])) {
            throw new Error(`${collection}.json must contain an array.`);
        }
    }

    const categoryIds = new Set(data.categories.map(category => category.id));
    const restaurantIds = new Set(data.restaurants.map(restaurant => restaurant.id));
    const userIds = new Set(data.users.map(user => user.id));
    const foodIds = new Set(data.foods.map(food => food.id));

    for (const restaurant of data.restaurants) {
        for (const categoryId of restaurant.categoryIds || []) {
            if (!categoryIds.has(categoryId)) {
                throw new Error(`Restaurant ${restaurant.id} references missing category ${categoryId}.`);
            }
        }
    }

    for (const food of data.foods) {
        if (!restaurantIds.has(food.restaurantId)) {
            throw new Error(`Food ${food.id} references missing restaurant ${food.restaurantId}.`);
        }

        if (!categoryIds.has(food.categoryId)) {
            throw new Error(`Food ${food.id} references missing category ${food.categoryId}.`);
        }
    }

    for (const order of data.orders) {
        if (!userIds.has(order.userId)) {
            throw new Error(`Order ${order.id} references missing user ${order.userId}.`);
        }

        for (const item of order.items || []) {
            if (!foodIds.has(item.foodId)) {
                throw new Error(`Order ${order.id} references missing food ${item.foodId}.`);
            }
        }
    }

    for (const address of data.addresses) {
        if (!userIds.has(address.userId)) {
            throw new Error(`Address ${address.id} references missing user ${address.userId}.`);
        }
    }

    return true;
}

export { loadJSON } from "./data-loader.js";
