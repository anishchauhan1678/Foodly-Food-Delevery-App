import { loadJSON } from "./data-loader.js";

let support = { supportPhone: "", supportHours: "" };

function supportPhoneIsConfigured() {
    return /^\+?[0-9\s-]{7,}$/.test(String(support.supportPhone || ""));
}

function createSupportPanel() {
    if (document.querySelector("[data-support-panel]")) return;

    const main = document.querySelector("main");
    if (!main) return;

    const panel = document.createElement("section");
    panel.className = "support-panel";
    panel.dataset.supportPanel = "true";
    panel.setAttribute("aria-labelledby", "support-title");
    panel.innerHTML = `
        <div>
            <p class="support-label">Need help?</p>
            <h2 id="support-title">We're here to help</h2>
            <p class="support-hours">Support hours: ${support.supportHours || "Please check back later."}</p>
        </div>
        <div class="support-actions">
            <a class="secondary-button support-call" ${supportPhoneIsConfigured() ? `href="tel:${support.supportPhone}"` : "aria-disabled=\"true\""}>
                Call Support
            </a>
            <a class="secondary-button" href="orders.html">Where is my order?</a>
            <a class="secondary-button" href="addresses.html">Change delivery address</a>
            <a class="secondary-button" href="checkout.html">Payment help</a>
            <a class="secondary-button" href="cart.html">Cart help</a>
        </div>`;
    main.append(panel);
}

function removeSupportPanel() {
    document.querySelector("[data-support-panel]")?.remove();
}

export function refreshSupportPanel() {
    removeSupportPanel();
    createSupportPanel();
}

async function initializeSupport() {
    try {
        support = await loadJSON("support.json");
    } catch (error) {
        console.warn("Support configuration could not be loaded.", error);
    }
    refreshSupportPanel();
    document.addEventListener("accessibility:changed", refreshSupportPanel);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSupport, { once: true });
} else {
    initializeSupport();
}