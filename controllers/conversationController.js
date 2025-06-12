const Conversation = require("../models/Conversation");

const User = require("../models/User");

exports.createConversation = async (req, res) => {
  try {
    const { members, isGroup, groupName } = req.body;

    if (!members || members.length < 2) {
      return res
        .status(400)
        .json({ message: "At least two members required." });
    }

    const newConversation = new Conversation({
      members,
      isGroup,
      groupName: isGroup ? groupName : undefined,
      admin: isGroup ? req.userId : undefined,
    });

    const saved = await newConversation.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const conversations = await Conversation.find({
      members: { $in: [userId] },
    }).populate("members", "username _id");

    res.status(200).json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.deleteConversation = async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo)
      return res.status(404).json({ message: "Conversation not found" });

    // Optional: Only admin can delete group conversation
    if (convo.isGroup && convo.admin.toString() !== req.userId) {
      return res.status(403).json({ message: "Only admin can delete group" });
    }

    // Delete all messages of the conversation
    await Message.deleteMany({ conversationId: convo._id });

    // Delete the conversation itself
    await convo.deleteOne();

    res.status(200).json({ message: "Conversation and messages deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findOrCreateConversation = async (req, res) => {
  const { recipientId } = req.body;
  const currentUserId = req.userId;

  if (!recipientId)
    return res.status(400).json({ message: "recipientId is required" });

  try {
    // Check for existing 1-on-1 conversation
    let conversation = await Conversation.findOne({
      isGroup: false,
      members: { $all: [currentUserId, recipientId], $size: 2 },
    });

    if (!conversation) {
      // Create it if it doesn't exist
      conversation = new Conversation({
        members: [currentUserId, recipientId],
        isGroup: false,
      });
      await conversation.save();
    }

    return res.status(200).json(conversation);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
