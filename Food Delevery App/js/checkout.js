
/*
 * Food Delivery App
 * Checkout Module
 *
 * Purpose:
 * - Manage checkout information
 * - Validate delivery address
 * - Validate payment method
 * - Prepare order data
 * - Calculate final order amount
 *
 * UI rendering will be added later.
 */

"use strict";


/* =========================================
   CHECKOUT STATE
========================================= */

const CheckoutState = {
    deliveryAddress: null,
    paymentMethod: null,
    notes: "",
    isProcessing: false
};


/* =========================================
   AVAILABLE PAYMENT METHODS
========================================= */

const PaymentMethods = [
    {
        id: "UPI",
        name: "UPI",
        isActive: true
    },
    {
        id: "CARD",
        name: "Card",
        isActive: true
    },
    {
        id: "Cash on Delivery",
        name: "Cash on Delivery",
        isActive: true
    }
];


/* =========================================
   SET DELIVERY ADDRESS
========================================= */

function setDeliveryAddress(address) {

    CheckoutState.deliveryAddress = address;

    return true;
}


/* =========================================
   GET DELIVERY ADDRESS
========================================= */

function getDeliveryAddress() {

    return CheckoutState.deliveryAddress;
}


/* =========================================
   SET PAYMENT METHOD
========================================= */

function setPaymentMethod(method) {

    const validMethod = PaymentMethods.find(
        payment => payment.id === method
    );

    if (!validMethod || !validMethod.isActive) {
        return false;
    }

    CheckoutState.paymentMethod = method;

    return true;
}


/* =========================================
   GET PAYMENT METHOD
========================================= */

function getPaymentMethod() {

    return CheckoutState.paymentMethod;
}


/* =========================================
   SET ORDER NOTES
========================================= */

function setOrderNotes(notes) {

    CheckoutState.notes = notes.trim();
}


/* =========================================
   VALIDATE ADDRESS
========================================= */

function validateDeliveryAddress(address) {

    if (!address) {
        return false;
    }

    const requiredFields = [
        "houseNo",
        "street",
        "area",
        "city",
        "state",
        "pincode"
    ];

    return requiredFields.every(
        field =>
            address[field] &&
            String(address[field]).trim() !== ""
    );
}


/* =========================================
   VALIDATE PINCODE
========================================= */

function validatePincode(pincode) {

    return /^\d{6}$/.test(
        String(pincode).trim()
    );
}


/* =========================================
   VALIDATE CHECKOUT
========================================= */

function validateCheckout() {

    const cart = getCartSummary();

    if (cart.items.length === 0) {
        return {
            valid: false,
            message: "Your cart is empty."
        };
    }

    if (
        !CheckoutState.deliveryAddress ||
        !validateDeliveryAddress(
            CheckoutState.deliveryAddress
        )
    ) {
        return {
            valid: false,
            message: "Please enter a valid delivery address."
        };
    }

    if (
        !validatePincode(
            CheckoutState.deliveryAddress.pincode
        )
    ) {
        return {
            valid: false,
            message: "Please enter a valid 6-digit pincode."
        };
    }

    if (!CheckoutState.paymentMethod) {
        return {
            valid: false,
            message: "Please select a payment method."
        };
    }

    return {
        valid: true,
        message: "Checkout is valid."
    };
}


/* =========================================
   CREATE ORDER OBJECT
========================================= */

function createOrderObject(userId) {

    const validation = validateCheckout();

    if (!validation.valid) {
        return null;
    }

    const cart = getCartSummary();

    return {
        id: Date.now(),

        userId: Number(userId),

        restaurantId: cart.restaurantId,

        items: cart.items.map(item => ({
            foodId: item.foodId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
        })),

        subtotal: cart.subtotal,

        deliveryFee: cart.deliveryFee,

        discount: cart.discount,

        totalAmount: cart.totalAmount,

        paymentMethod: CheckoutState.paymentMethod,

        paymentStatus:
            CheckoutState.paymentMethod === "Cash on Delivery"
                ? "Pending"
                : "Paid",

        orderStatus: "Placed",

        deliveryAddress: CheckoutState.deliveryAddress,

        notes: CheckoutState.notes,

        orderDate: new Date()
            .toISOString()
            .split("T")[0],

        estimatedDeliveryTime:
            "25-35 min"
    };
}


/* =========================================
   START CHECKOUT
========================================= */

function startCheckout() {

    const validation = validateCheckout();

    if (!validation.valid) {
        console.warn(validation.message);
        return false;
    }

    CheckoutState.isProcessing = true;

    return true;
}


/* =========================================
   FINISH CHECKOUT
========================================= */

function finishCheckout() {

    CheckoutState.isProcessing = false;

    return true;
}


/* =========================================
   RESET CHECKOUT
========================================= */

function resetCheckout() {

    CheckoutState.deliveryAddress = null;
    CheckoutState.paymentMethod = null;
    CheckoutState.notes = "";
    CheckoutState.isProcessing = false;
}

