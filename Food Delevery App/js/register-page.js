import { registerUser, getCurrentUser } from "./auth.js";

const form = document.querySelector("#register-form");
const errorBox = document.querySelector("#register-error");

if (getCurrentUser()) {
    window.location.href = "../index.html";
}

form?.addEventListener("submit", event => {
    event.preventDefault();
    const payload = {
        name: document.querySelector("#register-name")?.value.trim() || "",
        email: document.querySelector("#register-email")?.value.trim() || "",
        phone: document.querySelector("#register-phone")?.value.trim() || "",
        password: document.querySelector("#register-password")?.value || "",
        confirmPassword: document.querySelector("#register-confirm-password")?.value || ""
    };

    const result = registerUser(payload);
    if (!result.ok) {
        errorBox.textContent = result.message;
        return;
    }

    errorBox.textContent = "Account created successfully. Redirecting to login...";
    errorBox.classList.add("success");
    window.setTimeout(() => {
        window.location.href = "login.html";
    }, 700);
});
