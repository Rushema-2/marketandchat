const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const createMessage = async (req, res) => {
    try {
        const { conversationId, text } = req.body;
        const currentUserId = req.user.userId;

        if (!conversationId || !text) {
            return res.status(400).json({
                message: "conversationId and text are required"
            });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUserId
        });

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found"
            });
        }

        const message = await Message.create({
            conversation: conversationId,
            sender: currentUserId,
            text
        });

        conversation.lastMessage = message._id;
        await conversation.save();

        res.status(201).json({
            message: "Message sent successfully",
            data: message
        });

    } catch (error) {
        console.error("Create message error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const currentUserId = req.user.userId;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUserId
        });

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found"
            });
        }

        const messages = await Message.find({
            conversation: conversationId
        })
        .populate("sender", "firstName lastName email")
        .sort({ createdAt: 1 });

        res.status(200).json({
            messages
        });

    } catch (error) {
        console.error("Get messages error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


module.exports = {
    createMessage,
    getMessages
};
