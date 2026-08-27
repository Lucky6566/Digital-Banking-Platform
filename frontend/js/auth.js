const API_URL = "http://127.0.0.1:8004";

const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    message.textContent = "Logging in...";

    try {

        const formData = new URLSearchParams();

        formData.append("username", email);
        formData.append("password", password);

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

        if (!response.ok) {

            message.textContent =
                data.detail || "Login failed.";

            return;
        }

        localStorage.setItem(
            "access_token",
            data.access_token
        );

        message.textContent =
            "Login successful!";

        window.location.href =
            "dashboard.html";

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        message.textContent =
            "Unable to connect to the banking server.";
    }
});