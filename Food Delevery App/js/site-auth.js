import { getCurrentUser, logoutUser } from "./auth.js";

let headerActionListenersBound = false;

function updateHeaderAuth() {
    const currentUser = getCurrentUser();
    const loggedOutEls = document.querySelectorAll("[data-auth-logged-out]");
    const loggedInEls = document.querySelectorAll("[data-auth-logged-in]");
    const userNameEls = document.querySelectorAll("[data-user-name]");
    const logoutButtons = document.querySelectorAll("[data-logout-button]");
    const headerSearchButtons = document.querySelectorAll('.header-icon[aria-label="Search"]');

    const isLogged = Boolean(currentUser);
    loggedOutEls.forEach(element => {
        element.hidden = isLogged;
    });
    loggedInEls.forEach(element => {
        element.hidden = !isLogged;
    });

    userNameEls.forEach(element => {
        element.textContent = currentUser?.name ? currentUser.name.split(" ")[0] : "User";
    });

    if (headerActionListenersBound) return;
    headerActionListenersBound = true;

    logoutButtons.forEach(button => {
        button.addEventListener("click", () => {
            logoutUser();
            window.location.href = "../index.html";
        }, { once: true });
    });

    headerSearchButtons.forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            const homeInput = document.querySelector("#hero-search-input");
            const restaurantsInput = document.querySelector("#restaurant-search");
            const activeSearch = [homeInput, restaurantsInput].find(input => input && !input.disabled);

            if (activeSearch) {
                activeSearch.focus();
                activeSearch.scrollIntoView({ behavior: "smooth", block: "center" });
                return;
            }

            const currentPath = window.location.pathname;
            const targetPath = currentPath.includes("/pages/") ? "home.html" : "pages/home.html";
            window.location.href = targetPath;
        }, { once: true });
    });
}

document.addEventListener("DOMContentLoaded", updateHeaderAuth);
window.addEventListener("load", updateHeaderAuth);
