const express = require("express");
const http = require("http");
const onlineUsers = new Map();
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const contactRoutes = require("./routes/contactRoutes");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const productRoutes = require("./routes/productRoutes");
const promotionRoutes = require("./routes/promotionRoutes");
const promotionPaymentRoutes = require("./routes/promotionPaymentRoutes");
const productLikeRoutes = require("./routes/productLikeRoutes");
const followRoutes = require("./routes/followRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const orderRoutes = require("./routes/orderRoutes");
const path = require("path");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");

dotenv.config({
    path: path.join(__dirname, ".env"),
    override: true
});

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});


app.use(cors());
app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "../client")
    )
);

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "../client/uploads")
    )
);

// Serve the React production frontend
const reactBuildPath = path.join(__dirname, "../client-react/dist");

app.use(express.static(reactBuildPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(reactBuildPath, "index.html"));
});

app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/product-likes", productLikeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/promotions", promotionPaymentRoutes);
app.use( "/api/follows", followRoutes);
app.use( "/api/notifications", notificationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/orders", orderRoutes);

// React Router fallback: serve the React app for frontend routes
app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
        return next();
    }
    res.sendFile(path.join(reactBuildPath, "index.html"));
});


// ========================================
// SOCKET.IO JWT AUTHENTICATION
// ========================================

io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(
                new Error("Authentication required")
            );
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        socket.userId = decoded.userId;

        next();

    } catch (error) {
        console.error(
            "Socket authentication error:",
            error.message
        );

        next(
            new Error("Invalid or expired token")
        );
    }
});


// ========================================
// SOCKET.IO CONNECTION
// ========================================

io.on("connection", (socket) => {

    console.log(
        "Authenticated user connected:",
        socket.id,
        "user:",
        socket.userId
    );

    const userId = String(socket.userId);

let userSockets = onlineUsers.get(userId);
const wasOffline = !userSockets || userSockets.size === 0;

if (!userSockets) {
    userSockets = new Set();
    onlineUsers.set(userId, userSockets);
}

userSockets.add(socket.id);

socket.emit("onlineUsers", Array.from(onlineUsers.keys()));

if (wasOffline) {
    socket.broadcast.emit("userOnline", { userId });
}


    // ====================================
    // JOIN CONVERSATION
    // ====================================

    socket.on(
        "joinConversation",
        async (conversationId) => {

            try {

                const conversation =
                    await Conversation.findOne({
                        _id: conversationId,
                        participants: socket.userId
                    });

                if (!conversation) {

                    socket.emit("messageError", {
                        message:
                            "Conversation not found"
                    });

                    return;
                }

                const room =
                    `conversation:${conversationId}`;

                socket.join(room);

                console.log(
                    `User ${socket.userId} joined ${room}`
                );

            } catch (error) {

                console.error(
                    "Join conversation error:",
                    error
                );

                socket.emit("messageError", {
                    message: "Server error"
                });
            }
        }
    );


    // ====================================
    // LEAVE CONVERSATION
    // ====================================

    socket.on(
        "leaveConversation",
        (conversationId) => {

            const room =
                `conversation:${conversationId}`;

            socket.leave(room);

            console.log(
                `User ${socket.userId} left ${room}`
            );
        }
    );

    // ====================================
// TYPING INDICATOR
// ====================================

socket.on("typing", ({ conversationId } = {}) => {
    if (!conversationId) return;

    const room = `conversation:${conversationId}`;

    // Only relay typing events to a room the socket has joined.
    if (!socket.rooms.has(room)) return;

    socket.to(room).emit("userTyping", {
        userId: String(socket.userId),
        conversationId: String(conversationId)
    });
});

socket.on("stopTyping", ({ conversationId } = {}) => {
    if (!conversationId) return;

    const room = `conversation:${conversationId}`;

    // Only relay stop-typing events to a room the socket has joined.
    if (!socket.rooms.has(room)) return;

    socket.to(room).emit("userStoppedTyping", {
        userId: String(socket.userId),
        conversationId: String(conversationId)
    });
});


    // ====================================
    // SEND MESSAGE
    // ====================================

    socket.on(
        "sendMessage",
        async (data) => {

            try {

                const {
                    conversationId,
                    text
                } = data;


                console.log(
                    "Message received from:",
                    socket.userId,
                    data
                );


                if (!conversationId || !text) {

                    socket.emit("messageError", {
                        message:
                            "conversationId and text are required"
                    });

                    return;
                }


                // IMPORTANT:
                // Sender comes from JWT,
                // NOT from the client.

                const senderId =
                    socket.userId;


                // Check conversation membership

                const conversation =
                    await Conversation.findOne({
                        _id: conversationId,
                        participants: senderId
                    });


                if (!conversation) {

                    socket.emit("messageError", {
                        message:
                            "Conversation not found"
                    });

                    return;
                }


                // Save message

                const message =
                    await Message.create({
                        conversation:
                            conversationId,

                        sender:
                            senderId,

                        text
                    });


                // Update last message

                conversation.lastMessage =
                    message._id;

                await conversation.save();


                // Populate sender

                const populatedMessage =
                    await Message.findById(
                        message._id
                    ).populate(
                        "sender",
                        "firstName lastName email"
                    );


                // Conversation room

                const room =
                    `conversation:${conversationId}`;


                // Send to everyone in room

                io.to(room).emit(
                    "newMessage",
                    populatedMessage
                );


            } catch (error) {

                console.error(
                    "Socket sendMessage error:",
                    error
                );

                socket.emit("messageError", {
                    message: "Server error"
                });
            }
        }
    );


    // ====================================
// CALL SIGNALING
// ====================================

socket.on("callOffer", async (data) => {
    try {
        const {
            targetUserId,
            conversationId,
            callType,
            offer
        } = data;

        if (
            !targetUserId ||
            !conversationId ||
            !callType ||
            !offer
        ) {
            socket.emit("callError", {
                message: "Invalid call data"
            });

            return;
        }

        const conversation =
            await Conversation.findOne({
                _id: conversationId,
                participants: socket.userId
            });

        if (!conversation) {
            socket.emit("callError", {
                message: "Conversation not found"
            });

            return;
        }

        // Find sockets belonging to target user
        const targetSockets =
            await io.fetchSockets();

        const targetUserSockets =
            targetSockets.filter(
                targetSocket =>
                    String(targetSocket.userId) ===
                    String(targetUserId)
            );

        if (targetUserSockets.length === 0) {
            socket.emit("callError", {
                message: "User is offline"
            });

            return;
        }

        for (const targetSocket of targetUserSockets) {

            targetSocket.emit(
                "incomingCall",
                {
                    callId: socket.id,
                    callerId: socket.userId,
                    targetSocketId: targetSocket.id,
                    conversationId,
                    callType,
                    offer
                }
            );
        }

    } catch (error) {

        console.error(
            "Call user error:",
            error
        );

        socket.emit("callError", {
            message: "Server error"
        });
    }
});


socket.on("acceptCall", (data) => {

    const {
        callerSocketId,
        answer
    } = data;

    if (!callerSocketId || !answer) {
        return;
    }

    io.to(callerSocketId).emit(
        "callAccepted",
        {
            answer,
            targetSocketId: socket.id
        }
    );
});


socket.on("rejectCall", (data) => {

    const {
        callerSocketId
    } = data;

    if (!callerSocketId) {
        return;
    }

    io.to(callerSocketId).emit(
        "callRejected"
    );
});


socket.on("iceCandidate", (data) => {

    const {
        targetSocketId,
        candidate
    } = data;

    if (!targetSocketId || !candidate) {
        return;
    }

    io.to(targetSocketId).emit(
        "iceCandidate",
        {
            candidate
        }
    );
});


socket.on("endCall", (data) => {

    const {
        targetSocketId
    } = data;

    if (!targetSocketId) {
        return;
    }

    io.to(targetSocketId).emit(
        "callEnded"
    );
});


    // ====================================
    // DISCONNECT
    // ====================================

    socket.on(
        "disconnect",
        () => {

            const userId = String(socket.userId);
const userSockets = onlineUsers.get(userId);

if (userSockets) {
    userSockets.delete(socket.id);

    if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("userOffline", { userId });
    }
}

console.log("User disconnected:", socket.id, "user:", userId);
        }
    );

});


const {
    expirePromotions
} = require("./services/promotionExpirationService");


// ========================================
// START SERVER
// ========================================

const PORT =
    process.env.PORT || 3000;

const startServer = async () => {

    try {

        // ========================================
        // CONNECT TO MONGODB FIRST
        // ========================================

        await connectDB();

        // ========================================
        // PROMOTION EXPIRATION JOB
        // ========================================

        const runPromotionExpiration = async () => {
            await expirePromotions();
        };

        // Run once after MongoDB is connected
        await runPromotionExpiration();

        // Then run every minute
        setInterval(
            runPromotionExpiration,
            60 * 1000
        );

        // ========================================
        // START HTTP SERVER
        // ========================================

        server.listen(
            PORT,
            () => {

                console.log(
                    `Server running on http://localhost:${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            "Server startup error:",
            error
        );

        process.exit(1);

    }

};

startServer();