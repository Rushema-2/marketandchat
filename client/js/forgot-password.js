const emailInput =
    document.getElementById("email");

const sendResetBtn =
    document.getElementById("sendResetBtn");

sendResetBtn.addEventListener(
    "click",
    async () => {
        const email =
            emailInput.value.trim();

        if (!email) {
            alert("Please enter your email");
            return;
        }

        try {
            const response = await fetch(
                "http://localhost:3000/api/users/forgot-password",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                alert(
                    data.message ||
                    "Failed to send reset link"
                );
                return;
            }

            alert(
                data.message ||
                "If the account exists, a reset link has been sent."
            );

            emailInput.value = "";

        } catch (error) {
            console.error(
                "Forgot password error:",
                error
            );

            alert("Server error");
        }
    }
);
