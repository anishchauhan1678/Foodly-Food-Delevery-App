import { loginUser, getCurrentUser } from "./auth.js";

const form = document.querySelector("#login-form");
const errorBox = document.querySelector("#login-error");
const forgotLink = document.querySelector("[data-forgot-password]");

if (getCurrentUser()) {
    window.location.href = "../index.html";
}

form?.addEventListener("submit", event => {
    event.preventDefault();
    const email = document.querySelector("#login-email")?.value.trim() || "";
    const password = document.querySelector("#login-password")?.value || "";

    const result = loginUser({ email, password });
    if (!result.ok) {
        if (errorBox) errorBox.textContent = result.message;
        return;
    }

    window.location.href = "../index.html";
});

forgotLink?.addEventListener("click", event => {
    event.preventDefault();
    if (errorBox) {
        errorBox.textContent = "Password recovery will be available after backend authentication is connected.";
    }
});
