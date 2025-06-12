const SupportMessage = require("../models/SupportMessage");

const submitSupportMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Check if the user has already submitted a message within the last 24 hours
    const lastMessage = await SupportMessage.findOne({ email }).sort({
      createdAt: -1,
    });

    if (
      lastMessage &&
      Date.now() - new Date(lastMessage.createdAt).getTime() <
        24 * 60 * 60 * 1000
    ) {
      return res.status(429).json({
        error: "You can only send one support message every 24 hours.",
      });
    }

    const newMessage = new SupportMessage({ name, email, message });
    await newMessage.save();

    res
      .status(200)
      .json({ message: "Support message submitted successfully." });
  } catch (error) {
    console.error("Error submitting support message:", error);
    res.status(500).json({
      error: "Something went wrong. Please try again later.",
    });
  }
};

module.exports = { submitSupportMessage };
