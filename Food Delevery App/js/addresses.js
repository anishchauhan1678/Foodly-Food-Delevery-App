const ADDRESS_STORAGE_KEY = "foodlyAddresses";
const SELECTED_ADDRESS_KEY = "foodlySelectedAddress";
const ADDRESS_TYPES = ["Home", "Work", "Other"];

function generateId(prefix = "addr") {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function safeGetStorageValue(key, fallback = []) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        const parsed = JSON.parse(raw);
        return parsed === undefined ? fallback : parsed;
    } catch (error) {
        console.warn(`Unable to read ${key} from localStorage.`, error);
        localStorage.removeItem(key);
        return fallback;
    }
}

function normalizeAddress(input = {}, fallbackId = null) {
    if (!input || typeof input !== "object") return null;

    const type = ADDRESS_TYPES.includes(String(input.type || "").trim())
        ? String(input.type).trim()
        : "Home";

    const customLabel = String(input.label || input.customLabel || "").trim();
    const label = customLabel || (type === "Other" ? "Other" : type);
    const id = String(input.id || fallbackId || generateId()).trim() || generateId();

    return {
        id,
        type,
        label,
        fullName: String(input.fullName || "").trim(),
        phone: String(input.phone || "").trim(),
        house: String(input.house || "").trim(),
        area: String(input.area || "").trim(),
        city: String(input.city || "").trim(),
        state: String(input.state || "").trim(),
        pin: String(input.pin || "").trim(),
        landmark: String(input.landmark || "").trim(),
        isDefault: Boolean(input.isDefault)
    };
}

export function loadAddresses() {
    const saved = safeGetStorageValue(ADDRESS_STORAGE_KEY, []);
    if (!Array.isArray(saved)) {
        localStorage.removeItem(ADDRESS_STORAGE_KEY);
        return [];
    }

    const normalized = saved
        .map((entry) => normalizeAddress(entry, generateId()))
        .filter(Boolean);

    if (!normalized.length) return [];

    const hasDefault = normalized.some((address) => address.isDefault);
    if (!hasDefault) normalized[0].isDefault = true;

    return normalized;
}

export function saveAddresses(addresses) {
    const safeAddresses = Array.isArray(addresses) ? addresses.map((address) => normalizeAddress(address)).filter(Boolean) : [];

    if (!safeAddresses.length) {
        localStorage.removeItem(ADDRESS_STORAGE_KEY);
        localStorage.removeItem(SELECTED_ADDRESS_KEY);
        return [];
    }

    const hasDefault = safeAddresses.some((address) => address.isDefault);
    if (!hasDefault) safeAddresses[0].isDefault = true;

    localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(safeAddresses));

    const selected = getSelectedAddressId();
    if (!selected || !safeAddresses.some((address) => address.id === selected)) {
        setSelectedAddressId(safeAddresses.find((address) => address.isDefault)?.id || safeAddresses[0].id);
    }

    return safeAddresses;
}

export function getSelectedAddressId() {
    try {
        const value = localStorage.getItem(SELECTED_ADDRESS_KEY);
        return typeof value === "string" && value ? value : null;
    } catch (error) {
        console.warn("Unable to read selected address.", error);
        return null;
    }
}

export function setSelectedAddressId(addressId) {
    if (!addressId) {
        localStorage.removeItem(SELECTED_ADDRESS_KEY);
        return null;
    }

    localStorage.setItem(SELECTED_ADDRESS_KEY, String(addressId));
    return String(addressId);
}

export function getSelectedAddress() {
    const addresses = loadAddresses();
    const selectedId = getSelectedAddressId();
    const selected = addresses.find((address) => address.id === selectedId) || addresses.find((address) => address.isDefault) || addresses[0] || null;
    if (selected) {
        setSelectedAddressId(selected.id);
    }
    return selected;
}

export function setDefaultAddress(addressId) {
    const addresses = loadAddresses();
    if (!addresses.length) return null;

    const nextAddresses = addresses.map((address) => ({
        ...address,
        isDefault: address.id === addressId
    }));

    const saved = saveAddresses(nextAddresses);
    setSelectedAddressId(addressId);
    return saved;
}

export function selectAddress(addressId) {
    const addresses = loadAddresses();
    if (!addresses.some((address) => address.id === addressId)) return null;
    setSelectedAddressId(addressId);
    return getSelectedAddress();
}

export function validateAddressForm(formData = {}) {
    const fullName = String(formData.fullName || "").trim();
    const phone = String(formData.phone || "").trim();
    const house = String(formData.house || "").trim();
    const area = String(formData.area || "").trim();
    const city = String(formData.city || "").trim();
    const state = String(formData.state || "").trim();
    const pin = String(formData.pin || "").trim();
    const type = String(formData.type || "").trim();
    const customLabel = String(formData.label || "").trim();

    if (!fullName) return { ok: false, message: "Please enter your full name." };
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) return { ok: false, message: "Please enter a valid 10-digit phone number." };
    if (!house) return { ok: false, message: "Please enter your house or flat number." };
    if (!area) return { ok: false, message: "Please enter your area or street." };
    if (!city) return { ok: false, message: "Please enter your city." };
    if (!state) return { ok: false, message: "Please enter your state." };
    if (!pin || !/^\d{6}$/.test(pin)) return { ok: false, message: "Please enter a valid 6-digit PIN code." };
    if (!type) return { ok: false, message: "Please select an address type." };
    if (type === "Other" && !customLabel) return { ok: false, message: "Please enter a custom label for the Other address type." };

    return { ok: true };
}

function getAddressLabel(type, label) {
    const value = String(label || "").trim();
    if (type === "Other") return value || "Other";
    return value || type;
}

function renderCartSelectedAddress() {
    const labelNode = document.querySelector("#selected-address-label");
    const personNode = document.querySelector("#selected-address-person");
    const lineNode = document.querySelector("#selected-address-line");
    const currentAddress = getSelectedAddress();

    if (!labelNode || !personNode || !lineNode) return;

    if (!currentAddress) {
        labelNode.textContent = "No address selected";
        personNode.textContent = "Add a delivery address to continue.";
        lineNode.textContent = "";
        return;
    }

    labelNode.textContent = `${currentAddress.isDefault ? "⭐ " : ""}${currentAddress.label || currentAddress.type || "Home"}`;
    personNode.textContent = currentAddress.fullName || "Delivery contact";
    const addressLine = [currentAddress.house, currentAddress.area, `${currentAddress.city || ""}${currentAddress.city && currentAddress.state ? ", " : ""}${currentAddress.state || ""}`].filter(Boolean).join(", ");
    const pinLine = currentAddress.pin ? ` - ${currentAddress.pin}` : "";
    lineNode.textContent = `${addressLine}${pinLine}`;
}

function initCartAddressSummary() {
    const summary = document.querySelector("#delivery-address-summary");
    if (!summary) return;

    const changeButton = document.querySelector("#change-address-button");
    if (changeButton) {
        changeButton.addEventListener("click", () => {
            window.location.href = "addresses.html?return=cart";
        });
    }

    renderCartSelectedAddress();
}

function initAddressPage() {
    const addressList = document.querySelector("#address-list");
    const addressForm = document.querySelector("#address-form");
    const errorBox = document.querySelector("#address-error");
    const formTitle = document.querySelector("#address-form-title");
    const cancelButton = document.querySelector("#cancel-edit");
    const addButton = document.querySelector("#add-address-button");
    const modal = document.querySelector("#delete-address-modal");
    const cancelDeleteButton = document.querySelector("#delete-address-cancel");
    const confirmDeleteButton = document.querySelector("#delete-address-confirm");
    const backToCartLink = document.querySelector("#back-to-cart-link");
    const returnParam = new URLSearchParams(window.location.search).get("return");

    if (backToCartLink && returnParam === "cart") {
        backToCartLink.hidden = false;
    }

    let editingId = null;
    let deleteTargetId = null;

    function resetForm() {
        if (addressForm) addressForm.reset();
        const typeRadio = document.querySelector('input[name="address-type"][value="Home"]');
        if (typeRadio) typeRadio.checked = true;
        const customLabel = document.querySelector("#address-custom-label");
        if (customLabel) customLabel.hidden = true;
        editingId = null;
        if (formTitle) formTitle.textContent = "Add New Address";
        if (cancelButton) cancelButton.hidden = true;
        if (errorBox) errorBox.textContent = "";
    }

    function setError(message) {
        if (errorBox) errorBox.textContent = message;
    }

    function renderAddresses() {
        if (!addressList) return;
        const addresses = loadAddresses();
        const selectedId = getSelectedAddressId();

        if (!addresses.length) {
            addressList.innerHTML = `
                <div class="empty-address-card empty-state">
                    <div class="empty-address-icon state-icon" aria-hidden="true">📍</div>
                    <h3 class="state-title">No saved addresses yet</h3>
                    <p class="state-message">Add a delivery address to make ordering faster.</p>
                    <button type="button" class="primary-button state-action" id="empty-address-button">+ Add New Address</button>
                </div>
            `;
            const emptyButton = document.querySelector("#empty-address-button");
            if (emptyButton) emptyButton.addEventListener("click", () => { resetForm(); document.querySelector("#address-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
            return;
        }

        addressList.innerHTML = addresses.map((address) => {
            const isSelected = address.id === selectedId;
            const labelText = address.label || address.type || "Home";
            const addressLine = [address.house, address.area].filter(Boolean).join(", ");
            const cityLine = [address.city, address.state].filter(Boolean).join(", ");
            const pinLine = address.pin ? ` - ${address.pin}` : "";

            return `
                <article class="address-card">
                    <div class="address-card-header">
                        <div>
                            <div class="address-card-label-row">
                                <span class="address-icon" aria-hidden="true">${address.type === "Work" ? "💼" : address.type === "Other" ? "📌" : "🏠"}</span>
                                <strong>${labelText}</strong>
                            </div>
                            ${address.isDefault ? '<span class="address-badge default">Default</span>' : ''}
                            ${isSelected ? '<span class="address-badge selected">Selected</span>' : ''}
                        </div>
                    </div>
                    <div class="address-card-body">
                        <p class="address-name">${address.fullName || "Delivery contact"}</p>
                        <p class="address-phone">📱 ${address.phone || "Phone not added"}</p>
                        <p>${addressLine || "Address details pending"}</p>
                        <p>${cityLine || "City not added"}${pinLine}</p>
                        ${address.landmark ? `<p class="address-landmark">Landmark: ${address.landmark}</p>` : ""}
                    </div>
                    <div class="address-card-actions">
                        <button type="button" class="secondary-button" data-address-action="select" data-address-id="${address.id}">${isSelected ? "Selected" : "Select"}</button>
                        <button type="button" class="secondary-button" data-address-action="default" data-address-id="${address.id}">${address.isDefault ? "Default" : "Set as Default"}</button>
                        <button type="button" class="ghost-button" data-address-action="edit" data-address-id="${address.id}">Edit</button>
                        <button type="button" class="ghost-button danger" data-address-action="delete" data-address-id="${address.id}">Delete</button>
                    </div>
                </article>
            `;
        }).join("");

        const actionButtons = addressList.querySelectorAll("[data-address-action]");
        actionButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const action = button.dataset.addressAction;
                const targetId = button.dataset.addressId;
                if (!targetId) return;

                if (action === "select") {
                    selectAddress(targetId);
                    renderAddresses();
                    renderCartSelectedAddress();
                    return;
                }

                if (action === "default") {
                    setDefaultAddress(targetId);
                    renderAddresses();
                    renderCartSelectedAddress();
                    return;
                }

                if (action === "edit") {
                    const targetAddress = loadAddresses().find((address) => address.id === targetId);
                    if (!targetAddress) return;
                    editingId = targetId;
                    if (formTitle) formTitle.textContent = "Edit Address";
                    if (cancelButton) cancelButton.hidden = false;

                    const selectedType = document.querySelector(`input[name="address-type"][value="${targetAddress.type || "Home"}"]`);
                    if (selectedType) selectedType.checked = true;

                    const customLabelField = document.querySelector("#address-custom-label");
                    if (customLabelField) {
                        customLabelField.value = targetAddress.label && targetAddress.type === "Other" ? targetAddress.label : "";
                        customLabelField.hidden = targetAddress.type !== "Other";
                    }

                    const fields = {
                        fullName: document.querySelector("#address-full-name"),
                        phone: document.querySelector("#address-phone"),
                        house: document.querySelector("#address-house"),
                        area: document.querySelector("#address-area"),
                        city: document.querySelector("#address-city"),
                        state: document.querySelector("#address-state"),
                        pin: document.querySelector("#address-pin"),
                        landmark: document.querySelector("#address-landmark")
                    };

                    fields.fullName.value = targetAddress.fullName || "";
                    fields.phone.value = targetAddress.phone || "";
                    fields.house.value = targetAddress.house || "";
                    fields.area.value = targetAddress.area || "";
                    fields.city.value = targetAddress.city || "";
                    fields.state.value = targetAddress.state || "";
                    fields.pin.value = targetAddress.pin || "";
                    fields.landmark.value = targetAddress.landmark || "";
                    setError("");
                    document.querySelector("#address-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    return;
                }

                if (action === "delete") {
                    deleteTargetId = targetId;
                    if (modal) modal.hidden = false;
                }
            });
        });
    }

    function applyAddressSubmit(event) {
        event.preventDefault();
        const fields = {
            fullName: document.querySelector("#address-full-name")?.value || "",
            phone: document.querySelector("#address-phone")?.value || "",
            house: document.querySelector("#address-house")?.value || "",
            area: document.querySelector("#address-area")?.value || "",
            city: document.querySelector("#address-city")?.value || "",
            state: document.querySelector("#address-state")?.value || "",
            pin: document.querySelector("#address-pin")?.value || "",
            landmark: document.querySelector("#address-landmark")?.value || "",
            type: document.querySelector('input[name="address-type"]:checked')?.value || "Home",
            label: document.querySelector("#address-custom-label")?.value || ""
        };

        const validation = validateAddressForm(fields);
        if (!validation.ok) {
            setError(validation.message);
            return;
        }

        const addresses = loadAddresses();
        const baseAddress = {
            id: editingId || generateId(),
            type: fields.type,
            label: getAddressLabel(fields.type, fields.label),
            fullName: fields.fullName,
            phone: fields.phone,
            house: fields.house,
            area: fields.area,
            city: fields.city,
            state: fields.state,
            pin: fields.pin,
            landmark: fields.landmark,
            isDefault: false
        };

        let nextAddresses;
        if (editingId) {
            nextAddresses = addresses.map((address) => address.id === editingId ? baseAddress : address);
        } else {
            nextAddresses = [...addresses, baseAddress];
        }

        const isDefaultAssigment = document.querySelector("#address-default")?.checked || addresses.length === 0;
        if (isDefaultAssigment) {
            nextAddresses = nextAddresses.map((address) => ({
                ...address,
                isDefault: address.id === baseAddress.id
            }));
        }

        saveAddresses(nextAddresses);
        if (!getSelectedAddressId() || !nextAddresses.some((address) => address.id === getSelectedAddressId())) {
            setSelectedAddressId(baseAddress.id);
        }
        renderAddresses();
        renderCartSelectedAddress();
        resetForm();
    }

    if (addressForm) {
        addressForm.addEventListener("submit", applyAddressSubmit);
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", resetForm);
    }

    const typeRadios = document.querySelectorAll('input[name="address-type"]');
    typeRadios.forEach((radio) => {
        radio.addEventListener("change", () => {
            const customLabel = document.querySelector("#address-custom-label");
            if (!customLabel) return;
            customLabel.hidden = radio.value !== "Other";
            if (radio.value !== "Other") customLabel.value = "";
        });
    });

    if (addButton) {
        addButton.addEventListener("click", () => {
            resetForm();
            document.querySelector("#address-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    if (cancelDeleteButton && modal) {
        cancelDeleteButton.addEventListener("click", () => {
            deleteTargetId = null;
            modal.hidden = true;
        });
    }

    if (confirmDeleteButton && modal) {
        confirmDeleteButton.addEventListener("click", () => {
            if (!deleteTargetId) {
                modal.hidden = true;
                return;
            }

            const addresses = loadAddresses();
            const remaining = addresses.filter((address) => address.id !== deleteTargetId);
            saveAddresses(remaining);
            if (remaining.length) {
                const nextSelected = remaining.find((address) => address.isDefault) || remaining[0];
                setSelectedAddressId(nextSelected ? nextSelected.id : null);
            } else {
                setSelectedAddressId(null);
            }
            renderAddresses();
            renderCartSelectedAddress();
            deleteTargetId = null;
            modal.hidden = true;
        });
    }

    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.hidden = true;
                deleteTargetId = null;
            }
        });
    }

    resetForm();
    renderAddresses();
    renderCartSelectedAddress();
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector("#address-list") || document.querySelector("#address-form")) {
        initAddressPage();
    }

    if (document.querySelector("#delivery-address-summary")) {
        initCartAddressSummary();
    }
});
