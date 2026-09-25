const THEME_KEY = "foodlyTheme";

function getInitialTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme = getInitialTheme()) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem(THEME_KEY, nextTheme);
    updateThemeToggle(nextTheme);
    return nextTheme;
}

function updateThemeToggle(theme) {
    const button = document.querySelector(".theme-toggle");
    if (!button) return;
    const dark = theme === "dark";
    button.textContent = dark ? "☀️" : "🌙";
    button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    button.title = dark ? "Switch to light mode" : "Switch to dark mode";
}

export function toggleTheme() {
    return applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

export function initTheme() {
    applyTheme();
    if (!document.querySelector("link[data-foodly-interaction-styles]")) {
        const interactionStyles = document.createElement("link");
        interactionStyles.rel = "stylesheet";
        interactionStyles.href = new URL("../css/interaction.css", import.meta.url).href;
        interactionStyles.dataset.foodlyInteractionStyles = "true";
        document.head.append(interactionStyles);
    }
    const actions = document.querySelector(".header-actions");
    if (actions && !actions.querySelector(".theme-toggle")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "header-icon theme-toggle";
        button.addEventListener("click", toggleTheme);
        actions.insertBefore(button, actions.firstElementChild);
    }
    updateThemeToggle(document.documentElement.dataset.theme);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTheme, { once: true });
} else {
    initTheme();
}
