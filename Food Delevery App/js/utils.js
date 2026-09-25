export function formatCurrency(amount) {
    return `₹${(Number(amount) || 0).toFixed(2)}`;
}

export function generateId(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export function showToast(message) {
    const toast = document.createElement("div");
    toast.textContent = String(message);
    toast.setAttribute("role", "status");
    toast.className = "app-toast";
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 3000);
}

export function showLoading() {
    const app = document.querySelector("#app");
    if (app) {
        showLoadingState(app, "Loading application...", "Please wait.");
    }
}

export function showError(message) {
    const app = document.querySelector("#app");
    if (app) {
        showErrorState(app, "Something went wrong", String(message), "Try Again", () => window.location.reload());
    }
}

export function showEmptyState(message) {
    const app = document.querySelector("#app");
    if (app) {
        showEmptyStateIn(app, "Nothing here yet", String(message));
    }
}

export function showLoadingState(container, title = "Loading...", message = "Please wait.") {
    if (!container) return;
    container.innerHTML = `<div class="loading-state" role="status" aria-live="polite"><div class="state-icon" aria-hidden="true">◌</div><h2 class="state-title">${title}</h2><p class="state-message">${message}</p></div>`;
}

export function showEmptyStateIn(container, title, message, actionLabel = "", actionHref = "") {
    if (!container) return;
    const action = actionLabel && actionHref ? `<a class="primary-button state-action" href="${actionHref}">${actionLabel}</a>` : "";
    container.innerHTML = `<div class="empty-state"><div class="state-icon" aria-hidden="true">📦</div><h2 class="state-title">${title}</h2><p class="state-message">${message}</p>${action}</div>`;
}

export function showErrorState(container, title = "Something went wrong", message = "We couldn't display this content.", actionLabel = "Try Again", action = null) {
    if (!container) return;
    container.innerHTML = `<div class="error-state"><div class="state-icon" aria-hidden="true">⚠️</div><h2 class="state-title">${title}</h2><p class="state-message">${message}</p><button class="secondary-button state-action" type="button" data-state-retry>${actionLabel}</button></div>`;
    container.querySelector("[data-state-retry]")?.addEventListener("click", action || (() => window.location.reload()));
}

