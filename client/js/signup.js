const signupForm = document.getElementById("signupForm");

const firstName = document.getElementById("first-name");
const lastName = document.getElementById("last-name");
const email = document.getElementById("email");
const phone = document.getElementById("phone");
const password = document.getElementById("password");

const message = document.getElementById("message");

signupForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const user = {
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        password: password.value
    };

    try {

        const response = await fetch(
            "http://localhost:3000/api/auth/register",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(user)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message;
            message.style.color = "red";
            return;
        }

        message.textContent = data.message;
        message.style.color = "green";

        signupForm.reset();

        phone.value = "+250";

    } catch (error) {

        console.error(error);

        message.textContent = "Unable to connect to server";
        message.style.color = "red";
    }
});