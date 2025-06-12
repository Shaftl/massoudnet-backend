const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");

// GET /api/notifications — Get all notifications for current user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ receiverId: req.userId })
      .sort({ createdAt: -1 })
      .populate("senderId", "name profilePic");
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// ✅ PUT /api/notifications/mark-all-seen — Mark all as seen
router.put("/mark-all-seen", authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { receiverId: req.userId, seen: false },
      { $set: { seen: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

module.exports = router;
