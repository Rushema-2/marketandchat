const newPassword =
    document.getElementById("newPassword");

const confirmPassword =
    document.getElementById("confirmPassword");

const resetPasswordBtn =
    document.getElementById("resetPasswordBtn");

const params =
    new URLSearchParams(window.location.search);

const token =
    params.get("token");

resetPasswordBtn.addEventListener(
    "click",
    async () => {

        const password =
            newPassword.value;

        const confirm =
            confirmPassword.value;

        if (!token) {
            alert("Invalid reset link.");
            return;
        }

        if (!password || !confirm) {
            alert("Please enter both passwords.");
            return;
        }

        if (password !== confirm) {
            alert("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            alert(
                "Password must be at least 6 characters."
            );
            return;
        }

        try {

            const response =
                await fetch(
                    "http://localhost:3000/api/users/reset-password",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            token,
                            newPassword: password,
                            confirmPassword: confirm
                        })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                alert(
                    data.message ||
                    "Password reset failed."
                );
                return;
            }

            alert(
                data.message ||
                "Password reset successfully."
            );

            window.location.href =
                "login.html";

        } catch (error) {

            console.error(
                "Reset password error:",
                error
            );

            alert("Server error.");
        }
    }
);
