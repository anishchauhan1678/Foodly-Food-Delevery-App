import { AppState } from "./state.js";
import { getCurrentUser, getDefaultAddress } from "./auth.js";
import { getFromStorage, saveToStorage, saveOrders, clearCart } from "./storage.js";
import { calculateSubtotal, calculateDeliveryFee, calculateDiscount, calculateGrandTotal } from "./cart-page.js";

const CHECKOUT_DRAFT_KEY = "foodDeliveryCheckoutDraft";
const DEFAULT_PAYMENT = "cod";

function getSavedFoodlyAddress() {
    try {
        const saved = JSON.parse(localStorage.getItem("foodlyAddresses") || "[]");
        if (!Array.isArray(saved) || !saved.length) return null;
        const selectedId = localStorage.getItem("foodlySelectedAddress");
        return saved.find(address => address.id === selectedId) || saved.find(address => address.isDefault) || saved[0] || null;
    } catch (error) {
        localStorage.removeItem("foodlyAddresses");
        localStorage.removeItem("foodlySelectedAddress");
        return null;
    }
}

export const CheckoutState = {
    customer: {
        name: "",
        mobile: "",
        email: ""
    },
    address: {
        house: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
        landmark: ""
    },
    paymentMethod: DEFAULT_PAYMENT
};

const checkoutPageState = {
    processing: false
};

function money(value) {
    return `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
}

function element(tagName, className, textContent) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (textContent !== undefined && textContent !== null) node.textContent = String(textContent);
    return node;
}

function foodFor(item) {
    return AppState.foods.find(food => food.id === item?.foodId);
}

function restaurantFor(food) {
    return AppState.restaurants.find(restaurant => restaurant.id === food?.restaurantId);
}

function getFormValues() {
    const form = document.querySelector("#checkout-form");
    if (!form) return {};

    const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked')?.value || DEFAULT_PAYMENT;

    return {
        name: form.elements.name?.value.trim() || "",
        mobile: form.elements.mobile?.value.trim() || "",
        email: form.elements.email?.value.trim() || "",
        house: form.elements.house?.value.trim() || "",
        street: form.elements.street?.value.trim() || "",
        city: form.elements.city?.value.trim() || "",
        state: form.elements.state?.value.trim() || "",
        pincode: form.elements.pincode?.value.trim() || "",
        landmark: form.elements.landmark?.value.trim() || "",
        paymentMethod
    };
}

function setFieldError(fieldName, message) {
    const input = document.querySelector(`[name="${fieldName}"]`);
    const errorEl = document.querySelector(`#${fieldName}-error`);

    if (input) {
        input.setAttribute("aria-invalid", message ? "true" : "false");
    }

    if (errorEl) {
        errorEl.textContent = message || "";
    }
}

function setPaymentError(message) {
    const error = document.querySelector("#payment-error");
    if (error) error.textContent = message || "";
}

function showCheckoutAlert(message) {
    const alert = document.querySelector("#checkout-alert");
    if (!alert) return;
    alert.textContent = message || "";
    alert.hidden = !message;
}

function hideCheckoutMessage() {
    const message = document.querySelector("#checkout-message");
    if (message) {
        message.hidden = true;
        message.textContent = "";
    }
}

function clampCartItems() {
    if (!Array.isArray(AppState.cart)) {
        AppState.cart = [];
        return [];
    }

    const validItems = [];
    for (const item of AppState.cart) {
        if (!item || typeof item !== "object") continue;

        const food = foodFor(item);
        if (!food) continue;
        if (!food.isAvailable) continue;

        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) continue;

        const restaurant = restaurantFor(food);
        if (!restaurant) continue;
        if (restaurant.isOpen === false) continue;

        validItems.push({
            foodId: food.id,
            restaurantId: food.restaurantId,
            name: food.name,
            price: Number(food.discountPrice ?? food.price) || 0,
            image: food.image,
            quantity
        });
    }

    AppState.cart = validItems;
    return validItems;
}

function validateCartForCheckout() {
    const items = clampCartItems();
    if (!items.length) {
        return { valid: false, message: "Your cart is empty." };
    }

    for (const item of items) {
        const food = foodFor(item);
        const restaurant = restaurantFor(food);

        if (!food) {
            return { valid: false, message: "One or more items are no longer available." };
        }

        if (!food.isAvailable) {
            return { valid: false, message: `${food.name} is no longer available.` };
        }

        if (!restaurant) {
            return { valid: false, message: "One or more restaurants are unavailable." };
        }

        if (restaurant.isOpen === false) {
            return { valid: false, message: `${restaurant.name} is currently closed.` };
        }

        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
            return { valid: false, message: `Invalid quantity for ${food.name}.` };
        }
    }

    return { valid: true, message: "" };
}

function updatePaymentNotice(method) {
    const paymentMessage = document.querySelector("#online-payment-message");
    const placeOrderButton = document.querySelector("#place-order-button");

    if (!paymentMessage || !placeOrderButton) return;

    if (method === "cod") {
        paymentMessage.hidden = true;
        paymentMessage.textContent = "";
        placeOrderButton.textContent = checkoutPageState.processing ? "Processing..." : "Place Order";
        placeOrderButton.disabled = checkoutPageState.processing;
        return;
    }

    paymentMessage.hidden = false;
    paymentMessage.textContent = `Demo payment selected: ${method.toUpperCase()} will be simulated in this frontend only.`;
    placeOrderButton.textContent = checkoutPageState.processing ? "Processing..." : "Place Order";
    placeOrderButton.disabled = checkoutPageState.processing;
}

function persistDraft() {
    const values = getFormValues();

    CheckoutState.customer = {
        name: values.name,
        mobile: values.mobile,
        email: values.email
    };

    CheckoutState.address = {
        house: values.house,
        street: values.street,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        landmark: values.landmark
    };

    CheckoutState.paymentMethod = values.paymentMethod || DEFAULT_PAYMENT;

    saveToStorage(CHECKOUT_DRAFT_KEY, {
        customer: CheckoutState.customer,
        address: CheckoutState.address,
        paymentMethod: CheckoutState.paymentMethod
    });
}

function restoreDraft() {
    const form = document.querySelector("#checkout-form");
    if (!form) return;

    const currentUser = getCurrentUser();
    const defaultAddress = currentUser ? getDefaultAddress(currentUser) : null;
    const savedFoodlyAddress = getSavedFoodlyAddress();
    const draft = getFromStorage(CHECKOUT_DRAFT_KEY, null);

    const customer = draft?.customer || {};
    const address = draft?.address || {};

    const userName = customer.name || currentUser?.name || "";
    const userMobile = customer.mobile || currentUser?.phone || "";
    const userEmail = customer.email || currentUser?.email || "";
    const addressHouse = address.house || savedFoodlyAddress?.house || defaultAddress?.house || "";
    const addressStreet = address.street || savedFoodlyAddress?.area || savedFoodlyAddress?.street || defaultAddress?.street || "";
    const addressCity = address.city || savedFoodlyAddress?.city || defaultAddress?.city || "";
    const addressState = address.state || savedFoodlyAddress?.state || defaultAddress?.state || "";
    const addressPincode = address.pincode || savedFoodlyAddress?.pin || defaultAddress?.pin || "";
    const addressLandmark = address.landmark || savedFoodlyAddress?.landmark || defaultAddress?.landmark || "";

    form.elements.name.value = userName;
    form.elements.mobile.value = userMobile;
    form.elements.email.value = userEmail;
    form.elements.house.value = addressHouse;
    form.elements.street.value = addressStreet;
    form.elements.city.value = addressCity;
    form.elements.state.value = addressState;
    form.elements.pincode.value = addressPincode;
    form.elements.landmark.value = addressLandmark;

    const paymentRadios = form.querySelectorAll('input[name="paymentMethod"]');
    paymentRadios.forEach(radio => {
        radio.checked = radio.value === (draft?.paymentMethod || DEFAULT_PAYMENT);
    });

    CheckoutState.customer = {
        name: userName,
        mobile: userMobile,
        email: userEmail
    };
    CheckoutState.address = {
        house: addressHouse,
        street: addressStreet,
        city: addressCity,
        state: addressState,
        pincode: addressPincode,
        landmark: addressLandmark
    };
    CheckoutState.paymentMethod = draft?.paymentMethod || DEFAULT_PAYMENT;

    updatePaymentNotice(CheckoutState.paymentMethod);
}

function resetFormErrors() {
    ["name", "mobile", "email", "house", "street", "city", "state", "pincode", "landmark"].forEach(field => setFieldError(field, ""));
    setPaymentError("");
}

function validateForm() {
    const values = getFormValues();
    let valid = true;

    resetFormErrors();

    [
        ["name", "Full name is required."],
        ["mobile", "Mobile number is required."],
        ["house", "House or flat number is required."],
        ["street", "Street or area is required."],
        ["city", "City is required."],
        ["state", "State is required."],
        ["pincode", "PIN code is required."]
    ].forEach(([fieldName, message]) => {
        if (!values[fieldName]) {
            setFieldError(fieldName, message);
            valid = false;
        }
    });

    if (values.mobile && !/^[6-9]\d{9}$/.test(values.mobile)) {
        setFieldError("mobile", "Enter a valid 10-digit mobile number.");
        valid = false;
    }

    if (values.pincode && !/^\d{6}$/.test(values.pincode)) {
        setFieldError("pincode", "Enter a valid 6-digit PIN code.");
        valid = false;
    }

    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        setFieldError("email", "Enter a valid email address.");
        valid = false;
    }

    if (!values.paymentMethod) {
        setPaymentError("Please select a payment method.");
        valid = false;
    }

    return { valid, values };
}

function renderCheckoutItems() {
    const list = document.querySelector("#checkout-items");
    if (!list) return;

    list.replaceChildren();

    AppState.cart.forEach(item => {
        const food = foodFor(item);
        const restaurant = restaurantFor(food);
        if (!food || !restaurant) return;

        const row = element("article", "checkout-item");
        const image = document.createElement("img");
        image.src = food.image || "../assets/placeholder-food.svg";
        image.alt = food.name;
        image.addEventListener("error", () => {
            if (!image.src.endsWith("../assets/placeholder-food.svg")) {
                image.src = "../assets/placeholder-food.svg";
            }
        }, { once: true });

        const details = element("div");
        const heading = element("h3");
        heading.textContent = food.name;

        const restaurantName = element("p", "checkout-muted", restaurant.name || "Restaurant");
        const qty = element("p", "checkout-muted", `${money(item.price)} × ${item.quantity}`);
        details.append(heading, restaurantName, qty);

        const total = element("strong", "checkout-item-total", money(item.price * item.quantity));
        row.append(image, details, total);
        list.append(row);
    });
}

function renderSummary() {
    const subtotal = document.querySelector("#checkout-subtotal");
    const delivery = document.querySelector("#checkout-delivery");
    const discount = document.querySelector("#checkout-discount");
    const total = document.querySelector("#checkout-total");

    if (!subtotal || !delivery || !discount || !total) return;

    subtotal.textContent = money(calculateSubtotal());
    delivery.textContent = money(calculateDeliveryFee());
    discount.textContent = money(calculateDiscount());
    total.textContent = money(calculateGrandTotal());
}

function showEmptyCart() {
    const content = document.querySelector("#checkout-content");
    const empty = document.querySelector("#checkout-empty");
    const loading = document.querySelector("#checkout-loading");

    if (loading) loading.hidden = true;
    if (content) content.hidden = true;
    if (empty) empty.hidden = false;
}

function prepareOrder(values) {
    const orderId = `order_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const placedAt = new Date().toISOString();
    const currentUser = getCurrentUser();

    return {
        id: orderId,
        userId: currentUser?.id || null,
        orderCode: `ORD-${orderId.slice(-6).toUpperCase()}`,
        items: AppState.cart.map(item => ({
            foodId: item.foodId,
            quantity: item.quantity,
            price: item.price,
            name: item.name || foodFor(item)?.name || "Food item"
        })),
        customer: {
            name: values.name,
            mobile: values.mobile,
            email: values.email || ""
        },
        address: {
            house: values.house,
            street: values.street,
            city: values.city,
            state: values.state,
            pincode: values.pincode,
            landmark: values.landmark || ""
        },
        paymentMethod: values.paymentMethod,
        paymentStatus: values.paymentMethod === "cod" ? "Pending" : "Paid",
        subtotal: calculateSubtotal(),
        deliveryFee: calculateDeliveryFee(),
        discount: calculateDiscount(),
        total: calculateGrandTotal(),
        status: "placed",
        orderStatus: "placed",
        statusHistory: [{
            status: "placed",
            timestamp: placedAt
        }],
        createdAt: placedAt,
        orderDate: placedAt,
        estimatedDeliveryTime: "Coming soon"
    };
}

function handlePlaceOrder(event) {
    event.preventDefault();

    if (checkoutPageState.processing) return;

    const cartCheck = validateCartForCheckout();
    if (!cartCheck.valid) {
        showCheckoutAlert(cartCheck.message);
        showEmptyCart();
        return;
    }

    const validation = validateForm();
    if (!validation.valid) {
        showCheckoutAlert("Please correct the highlighted fields before placing your order.");
        return;
    }

    const button = document.querySelector("#place-order-button");
    const message = document.querySelector("#checkout-message");

    checkoutPageState.processing = true;
    if (button) {
        button.disabled = true;
        button.textContent = "Processing...";
    }
    showCheckoutAlert("");

    const order = prepareOrder(validation.values);
    const nextOrders = [...(Array.isArray(AppState.orders) ? AppState.orders : []), order];
    AppState.orders = nextOrders;
    saveOrders(nextOrders);
    AppState.cart = [];
    clearCart();
    localStorage.removeItem("foodDeliveryCheckoutDraft");

    if (message) {
        message.textContent = "Order placed successfully.";
        message.hidden = false;
    }

    if (button) {
        button.textContent = "Order Placed";
    }

    window.setTimeout(() => {
        const orderCode = order.orderCode || order.id;
        window.location.href = `order-confirmation.html?orderId=${encodeURIComponent(orderCode)}`;
    }, 300);

    checkoutPageState.processing = false;
}

function attachFormListeners() {
    const form = document.querySelector("#checkout-form");
    if (!form) return;

    form.addEventListener("input", () => {
        persistDraft();
        hideCheckoutMessage();
    });

    form.addEventListener("change", (event) => {
        persistDraft();
        if (event.target.name === "paymentMethod") {
            updatePaymentNotice(event.target.value);
        }
    });

    form.addEventListener("submit", handlePlaceOrder);
}

function setupCheckoutPage() {
    const loading = document.querySelector("#checkout-loading");
    const content = document.querySelector("#checkout-content");

    if (loading) loading.hidden = false;
    if (content) content.hidden = true;

    const cartCheck = validateCartForCheckout();
    if (!cartCheck.valid) {
        showCheckoutAlert(cartCheck.message);
        showEmptyCart();
        return;
    }

    renderCheckoutItems();
    renderSummary();
    restoreDraft();
    attachFormListeners();
    updatePaymentNotice(CheckoutState.paymentMethod || DEFAULT_PAYMENT);
    hideCheckoutMessage();

    if (loading) loading.hidden = true;
    if (content) content.hidden = false;
}

if (document.querySelector("#checkout-page")) {
    if (AppState.initialized) {
        setupCheckoutPage();
    } else {
        document.addEventListener("app:initialized", setupCheckoutPage, { once: true });
        window.setTimeout(() => {
            if (AppState.initialized) setupCheckoutPage();
        }, 500);
    }
}
