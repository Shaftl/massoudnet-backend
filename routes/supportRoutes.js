const express = require("express");
const router = express.Router();
const { submitSupportMessage } = require("../controllers/supportController");
const SupportMessage = require("../models/SupportMessage");

// POST: Submit new support message
router.post("/", submitSupportMessage);

// GET: Get all support messages (admin feature)
router.get("/", async (req, res) => {
  try {
    const messages = await SupportMessage.find().sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (err) {
    console.error("Error getting support messages:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
