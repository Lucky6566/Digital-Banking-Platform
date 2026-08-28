// =========================================================
// DIGITALBANK LOGIN
// =========================================================

const API_URL = "http://127.0.0.1:8004";

console.log("DigitalBank auth.js loaded");


document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginButton = document.getElementById("loginButton");
    const message = document.getElementById("loginMessage");


    if (!loginForm) {
        console.error("loginForm not found");
        return;
    }


    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();


        const email = emailInput.value.trim();
        const password = passwordInput.value;


        message.textContent = "";
        message.className = "login-message";


        if (!email || !password) {

            message.textContent =
                "Please enter email and password.";

            message.classList.add("error");

            return;
        }


        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";


        try {

            // IMPORTANT:
            // Send FORM DATA, not JSON.
            // FastAPI OAuth2 login normally expects:
            // username + password

            const formData = new URLSearchParams();

            formData.append("username", email);
            formData.append("password", password);


            console.log("Sending login request...");
            console.log("Username:", email);


            const response = await fetch(
                `${API_URL}/users/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    },

                    body: formData
                }
            );


            const data = await response.json();


            console.log(
                "Login status:",
                response.status
            );

            console.log(
                "Login response:",
                data
            );


            if (!response.ok) {

                let errorMessage = "Login failed.";


                if (Array.isArray(data.detail)) {

                    errorMessage = data.detail
                        .map(item => item.msg)
                        .join(", ");

                } else if (data.detail) {

                    errorMessage = data.detail;
                }


                message.textContent = errorMessage;
                message.classList.add("error");

                return;
            }


            if (!data.access_token) {

                message.textContent =
                    "Login succeeded but access token was not returned.";

                message.classList.add("error");

                return;
            }


            // Save token

            localStorage.setItem(
                "access_token",
                data.access_token
            );

            localStorage.setItem(
                "token_type",
                data.token_type || "bearer"
            );


            console.log(
                "ACCESS TOKEN SAVED"
            );


            message.textContent =
                "Login successful. Opening dashboard...";

            message.classList.add("success");


            setTimeout(() => {

                window.location.href =
                    "dashboard.html";

            }, 500);

        }

        catch (error) {

            console.error(
                "Login error:",
                error
            );


            message.textContent =
                "Unable to connect to the banking server.";

            message.classList.add("error");

        }

        finally {

            loginButton.disabled = false;
            loginButton.textContent = "Login";

        }

    });


    // =========================================================
    // FORGOT PASSWORD
    // =========================================================

    const forgotPassword =
        document.getElementById("forgotPassword");


    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                window.location.href =
                    "forgot-password.html";

            }
        );

    }

});