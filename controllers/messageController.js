const Message = require("../models/Message");
const cloudinary = require("../utils/cloudinary");

exports.sendMessage = async (req, res) => {
  try {
    const { text, conversationId, media, receiverId } = req.body;

    let mediaUrl = null;

    // ✅ Upload media (base64) to Cloudinary if provided
    if (media) {
      const result = await cloudinary.uploader.upload(media, {
        folder: "chat_messages",
      });
      mediaUrl = result.secure_url;
    }

    // ✅ Create new message with or without media
    const newMessage = new Message({
      sender: req.userId,
      conversation: conversationId,
      text,
      media: mediaUrl,
    });

    const saved = await newMessage.save();
    const populated = await saved.populate("sender", "username _id");

    // ✅ Emit real-time notification to receiver (via sockets)
    global._io.emit("sendNotification", {
      senderId: req.userId,
      receiverId,
      type: "message",
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId,
      deletedFor: { $ne: req.userId },
    }).populate("sender", "username _id");

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAsSeen = async (req, res) => {
  try {
    const { messageId } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (!message.seenBy.includes(req.userId)) {
      message.seenBy.push(req.userId);
      await message.save();
    }

    res.status(200).json({ message: "Marked as seen" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMessageForUser = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({ message: "Message deleted for you" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;

    const messages = await Message.find({ conversation: conversationId });

    // Optional: collect public_ids from media URLs if you want to delete from Cloudinary
    for (let msg of messages) {
      if (msg.media) {
        try {
          const publicId = msg.media.split("/").pop().split(".")[0]; // crude way to get public_id
          await cloudinary.uploader.destroy(`chat_messages/${publicId}`);
        } catch (cloudErr) {
          console.warn("Cloudinary deletion failed:", cloudErr.message);
        }
      }
    }

    // ✅ Delete messages
    await Message.deleteMany({ conversation: conversationId });

    res.status(200).json({ message: "Conversation and messages deleted." });
  } catch (err) {
    console.error("Delete conversation error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMessageForEveryone = async (req, res) => {
  try {
    const messageId = req.params.id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Optional: delete media from Cloudinary
    if (message.media) {
      try {
        const publicId = message.media.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`chat_messages/${publicId}`);
      } catch (err) {
        console.warn("Cloudinary delete failed:", err.message);
      }
    }

    await Message.findByIdAndDelete(messageId);
    res.status(200).json({ message: "Message deleted for everyone" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
