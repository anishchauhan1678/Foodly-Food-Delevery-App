
/*
 * Food Delivery App
 * Restaurant Module
 *
 * Purpose:
 * - Manage restaurant information
 * - Find restaurants
 * - Get restaurant menu
 * - Filter restaurant foods
 * - Check restaurant availability
 *
 * UI rendering will be added later.
 */

"use strict";


/* =========================================
   RESTAURANT STATE
========================================= */

const RestaurantState = {
    restaurants: [],
    foods: [],
    currentRestaurant: null
};


/* =========================================
   SET RESTAURANT DATA
========================================= */

function setRestaurantData(restaurants, foods) {

    RestaurantState.restaurants = restaurants || [];
    RestaurantState.foods = foods || [];
}


/* =========================================
   GET RESTAURANT BY ID
========================================= */

function getRestaurantById(restaurantId) {

    return RestaurantState.restaurants.find(
        restaurant => restaurant.id === Number(restaurantId)
    ) || null;
}


/* =========================================
   SET CURRENT RESTAURANT
========================================= */

function setCurrentRestaurant(restaurantId) {

    RestaurantState.currentRestaurant =
        getRestaurantById(restaurantId);

    return RestaurantState.currentRestaurant;
}


/* =========================================
   GET CURRENT RESTAURANT
========================================= */

function getCurrentRestaurant() {

    return RestaurantState.currentRestaurant;
}


/* =========================================
   GET RESTAURANT FOODS
========================================= */

function getRestaurantFoods(restaurantId) {

    return RestaurantState.foods.filter(
        food =>
            food.restaurantId === Number(restaurantId) &&
            food.isAvailable === true
    );
}


/* =========================================
   GET CURRENT RESTAURANT FOODS
========================================= */

function getCurrentRestaurantFoods() {

    if (!RestaurantState.currentRestaurant) {
        return [];
    }

    return getRestaurantFoods(
        RestaurantState.currentRestaurant.id
    );
}


/* =========================================
   GET POPULAR FOODS
========================================= */

function getPopularRestaurantFoods(restaurantId) {

    return getRestaurantFoods(restaurantId)
        .filter(food => food.isPopular === true);
}


/* =========================================
   FILTER FOODS BY CATEGORY
========================================= */

function filterRestaurantFoodsByCategory(
    restaurantId,
    categoryId
) {

    return getRestaurantFoods(restaurantId)
        .filter(
            food => food.categoryId === Number(categoryId)
        );
}


/* =========================================
   SEARCH FOODS IN RESTAURANT
========================================= */

function searchRestaurantFoods(
    restaurantId,
    query
) {

    const searchText = query
        .trim()
        .toLowerCase();

    if (!searchText) {
        return getRestaurantFoods(restaurantId);
    }

    return getRestaurantFoods(restaurantId)
        .filter(food => {

            const nameMatch = food.name
                .toLowerCase()
                .includes(searchText);

            const descriptionMatch = food.description
                .toLowerCase()
                .includes(searchText);

            return nameMatch || descriptionMatch;
        });
}


/* =========================================
   CHECK RESTAURANT STATUS
========================================= */

function isRestaurantOpen(restaurantId) {

    const restaurant =
        getRestaurantById(restaurantId);

    return restaurant
        ? restaurant.isOpen === true
        : false;
}


/* =========================================
   GET RESTAURANT MINIMUM ORDER
========================================= */

function getRestaurantMinimumOrder(restaurantId) {

    const restaurant =
        getRestaurantById(restaurantId);

    return restaurant
        ? restaurant.minimumOrder
        : 0;
}


/* =========================================
   GET RESTAURANT DELIVERY FEE
========================================= */

function getRestaurantDeliveryFee(restaurantId) {

    const restaurant =
        getRestaurantById(restaurantId);

    return restaurant
        ? restaurant.deliveryFee
        : 0;
}


/* =========================================
   CLEAR CURRENT RESTAURANT
========================================= */

function clearCurrentRestaurant() {

    RestaurantState.currentRestaurant = null;
}
