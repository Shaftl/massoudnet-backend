// routes/feedRoutes.js
const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const GroupPost = require("../models/GroupPostModel");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/group-posts", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Find all groups the user is a member of
    const groups = await Group.find({ members: userId }).select("_id");
    const groupIds = groups.map((g) => g._id);

    // Get posts from those groups, plus populate nested comment authors
    const posts = await GroupPost.find({ group: { $in: groupIds } })
      .populate("group", "name coverImage")
      .populate("author", "name profilePic")
      .populate({
        path: "comments.author",
        select: "name profilePic",
      })
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
