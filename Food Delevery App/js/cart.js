
/* Phase 7 cart module placeholder
 *
 * Purpose:
 * - Add food to cart
 * - Remove food from cart
 * - Update quantity
 * - Calculate cart totals
 * - Apply offers
 * - Manage cart state
 *
 * UI rendering will be added later.
 */

"use strict";


/* =========================================
   CART STATE
========================================= */

const CartState = {
    items: [],
    restaurantId: null,
    appliedOffer: null,
};


/* =========================================
   CLEAR CART
========================================= */

function clearCart() {

    CartState.items = [];
    CartState.restaurantId = null;
    CartState.appliedOffer = null;
}


/* =========================================
   GET CART ITEMS
========================================= */

function getCartItems() {

    return CartState.items;
}


/* =========================================
   GET CART ITEM
========================================= */

function getCartItem(foodId) {

    return CartState.items.find(
        item => item.foodId === Number(foodId)
    ) || null;
}


/* =========================================
   ADD FOOD TO CART
========================================= */

function addToCart(foodId, quantity = 1) {

    const food = getFoodById(foodId);

    if (!food || !food.isAvailable) {
        return false;
    }

    /*
     * A cart can contain food from
     * only one restaurant at a time.
     */
    if (
        CartState.restaurantId !== null &&
        CartState.restaurantId !== food.restaurantId
    ) {
        console.warn(
            "Food from another restaurant cannot be added."
        );

        return false;
    }

    CartState.restaurantId = food.restaurantId;

    const existingItem = getCartItem(foodId);

    if (existingItem) {

        existingItem.quantity += quantity;

    } else {

        CartState.items.push({
            foodId: food.id,
            restaurantId: food.restaurantId,
            name: food.name,
            price: getFoodPrice(food.id),
            image: food.image,
            quantity: quantity
        });
    }

    return true;
}


/* =========================================
   REMOVE FOOD FROM CART
========================================= */

function removeFromCart(foodId) {

    const index = CartState.items.findIndex(
        item => item.foodId === Number(foodId)
    );

    if (index === -1) {
        return false;
    }

    CartState.items.splice(index, 1);

    if (CartState.items.length === 0) {
        CartState.restaurantId = null;
        CartState.appliedOffer = null;
    }

    return true;
}


/* =========================================
   UPDATE QUANTITY
========================================= */

function updateCartQuantity(foodId, quantity) {

    const item = getCartItem(foodId);

    if (!item) {
        return false;
    }

    const newQuantity = Number(quantity);

    if (newQuantity <= 0) {
        removeFromCart(foodId);
        return true;
    }

    item.quantity = newQuantity;

    return true;
}


/* =========================================
   INCREASE QUANTITY
========================================= */

function increaseCartQuantity(foodId) {

    const item = getCartItem(foodId);

    if (!item) {
        return false;
    }

    item.quantity++;

    return true;
}


/* =========================================
   DECREASE QUANTITY
========================================= */

function decreaseCartQuantity(foodId) {

    const item = getCartItem(foodId);

    if (!item) {
        return false;
    }

    if (item.quantity <= 1) {
        removeFromCart(foodId);
        return true;
    }

    item.quantity--;

    return true;
}


/* =========================================
   GET TOTAL ITEMS
========================================= */

function getCartItemCount() {

    return CartState.items.reduce(
        (total, item) => total + item.quantity,
        0
    );
}


/* =========================================
   GET SUBTOTAL
========================================= */

function getCartSubtotal() {

    return CartState.items.reduce(
        (total, item) =>
            total + (item.price * item.quantity),
        0
    );
}


/* =========================================
   GET DELIVERY FEE
========================================= */

function getCartDeliveryFee() {

    if (
        CartState.items.length === 0 ||
        CartState.restaurantId === null
    ) {
        return 0;
    }

    return getRestaurantDeliveryFee(
        CartState.restaurantId
    );
}


/* =========================================
   APPLY OFFER
========================================= */

function applyCartOffer(offer) {

    if (!offer || !offer.isActive) {
        return false;
    }

    const subtotal = getCartSubtotal();

    if (subtotal < offer.minimumOrder) {
        return false;
    }

    CartState.appliedOffer = offer;

    return true;
}


/* =========================================
   REMOVE OFFER
========================================= */

function removeCartOffer() {

    CartState.appliedOffer = null;
}


/* =========================================
   CALCULATE DISCOUNT
========================================= */

function getCartDiscount() {

    const offer = CartState.appliedOffer;

    if (!offer) {
        return 0;
    }

    const subtotal = getCartSubtotal();

    if (subtotal < offer.minimumOrder) {
        return 0;
    }

    if (offer.discountType === "percentage") {

        const discount =
            subtotal * (offer.discountValue / 100);

        return Math.min(
            discount,
            offer.maximumDiscount
        );
    }

    if (offer.discountType === "fixed") {

        return Math.min(
            offer.discountValue,
            subtotal
        );
    }

    return 0;
}


/* =========================================
   CALCULATE FREE DELIVERY
========================================= */

function isFreeDelivery() {

    const offer = CartState.appliedOffer;

    if (!offer) {
        return false;
    }

    return (
        offer.discountType === "delivery" &&
        getCartSubtotal() >= offer.minimumOrder
    );
}


/* =========================================
   GET FINAL DELIVERY FEE
========================================= */

function getFinalDeliveryFee() {

    if (isFreeDelivery()) {
        return 0;
    }

    return getCartDeliveryFee();
}


/* =========================================
   GET CART TOTAL
========================================= */

function getCartTotal() {

    const subtotal = getCartSubtotal();
    const deliveryFee = getFinalDeliveryFee();
    const discount = getCartDiscount();

    return Math.max(
        0,
        subtotal + deliveryFee - discount
    );
}


/* =========================================
   GET COMPLETE CART SUMMARY
========================================= */

function getCartSummary() {

    return {
        items: getCartItems(),
        itemCount: getCartItemCount(),
        subtotal: getCartSubtotal(),
        deliveryFee: getFinalDeliveryFee(),
        discount: getCartDiscount(),
        totalAmount: getCartTotal(),
        appliedOffer: CartState.appliedOffer,
        restaurantId: CartState.restaurantId
    };
}
