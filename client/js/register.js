
const API = "http://localhost:3000/api";

const registerForm =
    document.getElementById("registerForm");

const registerBtn =
    document.getElementById("registerBtn");

const message =
    document.getElementById("message");


registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const firstName =
        document.getElementById("firstName")
            .value
            .trim();

    const lastName =
        document.getElementById("lastName")
            .value
            .trim();

    const email =
        document.getElementById("email")
            .value
            .trim()
            .toLowerCase();

    const phone =
        document.getElementById("phone")
            .value
            .trim();

    const password =
        document.getElementById("password")
            .value;


    message.innerText = "";


    if (
        !firstName ||
        !lastName ||
        !email ||
        !phone ||
        !password
    ) {
        message.innerText =
            "Please fill all fields";

        return;
    }


    if (password.length < 6) {

        message.innerText =
            "Password must be at least 6 characters";

        return;
    }


    registerBtn.disabled = true;

    registerBtn.innerText =
        "Creating account...";


    try {

        const response = await fetch(
            `${API}/auth/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    phone,
                    password
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            message.innerText =
                data.message ||
                "Registration failed";

            return;
        }


        message.classList.add("success");

        message.innerText =
            "Account created successfully";


        registerForm.reset();


        setTimeout(() => {

            window.location.href =
                "login.html";

        }, 1200);


    } catch (error) {

        console.error(
            "Register error:",
            error
        );

        message.innerText =
            "Cannot connect to server";

    } finally {

        registerBtn.disabled = false;

        registerBtn.innerText =
            "Create account";

    }

});

