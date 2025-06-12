const express = require("express");
const router = express.Router();
const storyController = require("../controllers/storyController");
const authMiddleware = require("../middleware/authMiddleware");

// Create a story
router.post("/", authMiddleware, storyController.createStory);

// Get all visible stories
router.get("/", authMiddleware, storyController.getStories);

// Optional: alias
router.get("/feed", authMiddleware, storyController.getStories);

// View a story
router.post("/:id/view", authMiddleware, storyController.viewStory);

// Update a story
router.put("/:id", authMiddleware, storyController.updateStory);

// Delete a story
router.delete("/:id", authMiddleware, storyController.deleteStory);

module.exports = router;
