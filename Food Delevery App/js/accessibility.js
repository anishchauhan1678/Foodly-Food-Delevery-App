import { loadJSON } from "./data-loader.js";

const SETTINGS_KEY = "foodlyAccessibility";
const DEFAULT_SETTINGS = {
    easyMode: false,
    textSize: "normal",
    highContrast: false,
    voiceReading: true
};

let settings = { ...DEFAULT_SETTINGS };

function readSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
        return saved && typeof saved === "object" ? { ...settings, ...saved } : { ...settings };
    } catch {
        return { ...settings };
    }
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings() {
    const root = document.documentElement;
    const body = document.body;

    const isLargeText = settings.textSize === "large";
    const isExtraLargeText = settings.textSize === "extra-large";
    const isHighContrast = settings.highContrast;
    const isEasyModeActive = Boolean(settings.easyMode || isLargeText || isExtraLargeText || isHighContrast);

    root.classList.toggle("text-large", isLargeText);
    root.classList.toggle("text-extra-large", isExtraLargeText);
    root.classList.toggle("high-contrast", isHighContrast);
    root.dataset.textSize = settings.textSize || "normal";
    root.dataset.highContrast = String(isHighContrast);

    body.classList.toggle("easy-mode", isEasyModeActive);
    body.classList.toggle("text-large", isLargeText);
    body.classList.toggle("text-extra-large", isExtraLargeText);
    body.classList.toggle("high-contrast", isHighContrast);

    document.dispatchEvent(new CustomEvent("accessibility:changed", { detail: { ...settings } }));
}

async function initializeAccessibility() {
    if (!document.querySelector("link[data-foodly-accessibility-styles]")) {
        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = new URL("../css/accessibility.css", import.meta.url).href;
        stylesheet.dataset.foodlyAccessibilityStyles = "true";
        document.head.append(stylesheet);
    }

    settings = { ...DEFAULT_SETTINGS, ...readSettings() };
    applySettings();

    try {
        const defaults = await loadJSON("accessibility.json");
        if (!localStorage.getItem(SETTINGS_KEY)) {
            settings = {
                ...DEFAULT_SETTINGS,
                easyMode: Boolean(defaults.easyMode),
                textSize: defaults.defaultTextSize || DEFAULT_SETTINGS.textSize,
                voiceReading: defaults.voiceReading !== false,
                highContrast: Boolean(defaults.highContrast)
            };
            saveSettings();
            applySettings();
        }
    } catch (error) {
        console.warn("Accessibility defaults could not be loaded.", error);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAccessibility, { once: true });
} else {
    initializeAccessibility();
}
