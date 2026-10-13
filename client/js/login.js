const API = "http://localhost:3000/api";

async function login() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const message =
        document.getElementById("message");

    if (!email || !password) {
        message.innerText = "Email and password are required";
        return;
    }

    try {

        const response = await fetch(
            `${API}/auth/login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            message.innerText =
                data.message || "Login failed";
            return;
        }

        localStorage.setItem(
            "token",
            data.token
        );

        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        console.log("Login successful:", data.user);

        window.location.href = "chat.html";

    } catch (error) {

        console.error("Login error:", error);

        message.innerText =
            "Cannot connect to server";
    }
}
