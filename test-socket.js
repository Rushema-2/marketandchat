const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
    auth: {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTg2YzYzNmY3Nzc5OGQ3OWExMjhjMjUiLCJpYXQiOjE3ODcyNDMzNzMsImV4cCI6MTc4Nzg0ODE3M30.6PegQbCfBDxZNgSigfiboQ0c2xsjmjfqM6Qy0k0zsl4"
    }
});

socket.on("connect", () => {
    console.log("Connected:", socket.id);

    socket.emit(
        "joinConversation",
        "6a86fd962855edaec86993cc"
    );

    socket.emit("sendMessage", {
        conversationId: "6a86fd962855edaec86993cc",
        text: "Hello from authenticated Socket!"
    });
});

socket.on("newMessage", (message) => {
    console.log("New message received:");
    console.log(message);
});

socket.on("messageError", (error) => {
    console.log("Message error:", error);
});

socket.on("connect_error", (error) => {
    console.log("Connection error:", error.message);
});
