const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const createConversation = async (req, res) => {
    try {
        const { userId } = req.body;
        const currentUserId = req.user.userId;

        if (!userId) {
            return res.status(400).json({
                message: "userId is required"
            });
        }

        if (userId === currentUserId) {
            return res.status(400).json({
                message: "You cannot create a conversation with yourself"
            });
        }

        let conversation = await Conversation.findOne({
            participants: {
                $all: [currentUserId, userId]
            }
        });

        if (conversation) {
            return res.status(200).json({
                message: "Conversation already exists",
                conversation
            });
        }

        conversation = await Conversation.create({
            participants: [currentUserId, userId]
        });

        res.status(201).json({
            message: "Conversation created successfully",
            conversation
        });

    } catch (error) {
        console.error("Create conversation error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


const getConversations = async (req, res) => {
    try {
        const currentUserId = req.user.userId;

        const conversations = await Conversation.find({
    participants: currentUserId
})
.populate(
    "participants",
    "firstName lastName email phone"
)
.populate(
    "lastMessage"
)
.sort({ updatedAt: -1 });

        res.status(200).json({
            conversations
        });

    } catch (error) {
        console.error("Get conversations error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};
const deleteConversation = async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const conversationId = req.params.id;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: currentUserId
        });

        if (!conversation) {
            return res.status(404).json({
                message: "Conversation not found"
            });
        }

        await Message.deleteMany({
            conversation: conversationId
        });

        await Conversation.deleteOne({
            _id: conversationId
        });

        res.status(200).json({
            message: "Conversation deleted successfully"
        });

    } catch (error) {
        console.error("Delete conversation error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    createConversation,
    getConversations,
    deleteConversation
};

