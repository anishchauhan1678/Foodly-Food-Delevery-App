import { getCurrentUser, updateCurrentUser, getDefaultAddress } from "./auth.js";

const addressList = document.querySelector("#address-list");
const addressForm = document.querySelector("#address-form");
const errorBox = document.querySelector("#address-error");
const formTitle = document.querySelector("#address-form-title");
const cancelEdit = document.querySelector("#cancel-edit");

let editingAddressId = null;

function ensureLogin() {
    if (!getCurrentUser()) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

function renderAddresses() {
    if (!ensureLogin()) return;
    const user = getCurrentUser();
    const addresses = Array.isArray(user?.addresses) ? user.addresses : [];

    if (!addressList) return;
    if (!addresses.length) {
        addressList.innerHTML = '<div class="empty-orders"><h2>No saved addresses yet.</h2></div>';
        return;
    }

    addressList.innerHTML = addresses.map(address => `
        <article class="address-item">
            <div class="address-meta">
                <div>
                    <strong>${address.label || "Address"}</strong>
                    ${address.isDefault ? '<span class="badge default">Default</span>' : ""}
                </div>
            </div>
            <p>${address.house || ""}, ${address.street || ""}</p>
            <p>${address.city || ""}, ${address.state || ""} - ${address.pin || ""}</p>
            ${address.landmark ? `<p>Landmark: ${address.landmark}</p>` : ""}
            <div class="answer-actions">
                <button type="button" class="primary-button" data-edit-address="${address.id}">Edit</button>
                <button type="button" class="secondary-button" data-default-address="${address.id}">Set as Default</button>
                <button type="button" class="secondary-button" data-delete-address="${address.id}">Delete</button>
            </div>
        </article>
    `).join("");

    document.querySelectorAll("[data-edit-address]").forEach(button => {
        button.addEventListener("click", () => {
            const id = button.getAttribute("data-edit-address");
            const user = getCurrentUser();
            const address = user?.addresses?.find(item => item.id === id);
            if (!address) return;
            editingAddressId = id;
            formTitle.textContent = "Edit Address";
            cancelEdit.hidden = false;
            document.querySelector("#address-label").value = address.label || "";
            document.querySelector("#address-house").value = address.house || "";
            document.querySelector("#address-street").value = address.street || "";
            document.querySelector("#address-city").value = address.city || "";
            document.querySelector("#address-state").value = address.state || "";
            document.querySelector("#address-pin").value = address.pin || "";
            document.querySelector("#address-landmark").value = address.landmark || "";
            document.querySelector("#address-default").checked = Boolean(address.isDefault);
            errorBox.textContent = "";
        });
    });

    document.querySelectorAll("[data-default-address]").forEach(button => {
        button.addEventListener("click", () => {
            const user = getCurrentUser();
            if (!user) return;
            const nextAddresses = (user.addresses || []).map(address => ({
                ...address,
                isDefault: address.id === button.getAttribute("data-default-address")
            }));
            updateCurrentUser({ ...user, addresses: nextAddresses });
            renderAddresses();
        });
    });

    document.querySelectorAll("[data-delete-address]").forEach(button => {
        button.addEventListener("click", () => {
            const user = getCurrentUser();
            if (!user) return;
            const id = button.getAttribute("data-delete-address");
            const nextAddresses = (user.addresses || []).filter(address => address.id !== id);
            if (nextAddresses.length && !nextAddresses.some(address => address.isDefault)) {
                nextAddresses[0].isDefault = true;
            }
            updateCurrentUser({ ...user, addresses: nextAddresses });
            renderAddresses();
        });
    });
}

addressForm?.addEventListener("submit", event => {
    event.preventDefault();
    if (!ensureLogin()) return;

    const user = getCurrentUser();
    const label = document.querySelector("#address-label")?.value.trim() || "";
    const house = document.querySelector("#address-house")?.value.trim() || "";
    const street = document.querySelector("#address-street")?.value.trim() || "";
    const city = document.querySelector("#address-city")?.value.trim() || "";
    const state = document.querySelector("#address-state")?.value.trim() || "";
    const pin = document.querySelector("#address-pin")?.value.trim() || "";
    const landmark = document.querySelector("#address-landmark")?.value.trim() || "";
    const isDefault = document.querySelector("#address-default")?.checked || false;

    if (!label || !house || !street || !city || !state || !pin) {
        errorBox.textContent = "Please fill in all required address fields.";
        return;
    }

    const existing = Array.isArray(user.addresses) ? user.addresses : [];
    const nextAddress = {
        id: editingAddressId || `ADDR-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        label,
        house,
        street,
        city,
        state,
        pin,
        landmark,
        isDefault: isDefault || existing.length === 0
    };

    let nextAddresses = editingAddressId
        ? existing.map(item => item.id === editingAddressId ? nextAddress : item)
        : [...existing, nextAddress];

    if (isDefault) {
        nextAddresses = nextAddresses.map(address => ({ ...address, isDefault: address.id === nextAddress.id }));
    }

    if (existing.length === 0 && !isDefault) {
        nextAddresses = nextAddresses.map((address, index) => ({ ...address, isDefault: index === 0 }));
    }

    updateCurrentUser({ ...user, addresses: nextAddresses });
    addressForm.reset();
    editingAddressId = null;
    cancelEdit.hidden = true;
    formTitle.textContent = "Add Address";
    errorBox.textContent = "";
    renderAddresses();
});

cancelEdit?.addEventListener("click", () => {
    editingAddressId = null;
    cancelEdit.hidden = true;
    formTitle.textContent = "Add Address";
    addressForm.reset();
    errorBox.textContent = "";
});

renderAddresses();
