const Story = require("../models/Story");
const User = require("../models/User");

// POST /api/stories - Create a story
exports.createStory = async (req, res) => {
  try {
    const { mediaUrl, mediaType, visibility } = req.body;

    if (!mediaUrl || !mediaType) {
      return res.status(400).json({ error: "Media and type are required." });
    }

    const newStory = new Story({
      user: req.userId,
      mediaUrl,
      mediaType,
      visibility,
    });

    await newStory.save();
    res.status(201).json(newStory);
  } catch (err) {
    console.error("Create Story Error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// GET /api/stories - Get stories from friends and public
exports.getStories = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("friends");

    if (!user) return res.status(404).json({ error: "User not found." });

    const stories = await Story.find({
      $or: [
        { visibility: "public" },
        { user: { $in: user.friends }, visibility: "friends" },
        { user: userId },
      ],
    })
      .populate("user", "username profilePic")
      .sort({ createdAt: -1 })
      .lean();

    // ✅ Filter out stories where the user was deleted
    const filtered = stories.filter((story) => story.user);

    res.status(200).json(filtered);
  } catch (err) {
    console.error("Get Stories Error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// POST /api/stories/:id/view - Mark story as viewed
exports.viewStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.userId;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ error: "Story not found." });

    if (!story.viewers.includes(userId)) {
      story.viewers.push(userId);
      await story.save();
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("View Story Error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// DELETE /api/stories/:id - Delete a story
exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found" });

    if (story.user.toString() !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await story.deleteOne();
    res.status(200).json({ message: "Story deleted" });
  } catch (err) {
    console.error("Delete Story Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/stories/:id - Update a story
exports.updateStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found" });

    if (story.user.toString() !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { visibility, mediaUrl, mediaType } = req.body;

    if (visibility) story.visibility = visibility;
    if (mediaUrl) story.mediaUrl = mediaUrl;
    if (mediaType) story.mediaType = mediaType;

    await story.save();
    res.status(200).json(story);
  } catch (err) {
    console.error("Update Story Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
