const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createGroupPost,
  getGroupPosts,
  likeGroupPost,
  unlikeGroupPost,
  addCommentToGroupPost,
  deleteGroupPost,
  deleteCommentFromGroupPost,
  updateGroupPost,
} = require("../controllers/groupPostController");

// Create a post in a group
router.post("/:groupId/posts", authMiddleware, createGroupPost);

router.put("/posts/:postId", authMiddleware, updateGroupPost);

// Get all posts in a group
router.get("/:groupId/posts", authMiddleware, getGroupPosts);

// Like a post
router.post("/posts/:postId/like", authMiddleware, likeGroupPost);

// Unlike a post
router.post("/posts/:postId/unlike", authMiddleware, unlikeGroupPost);

// Add comment to post
router.post("/posts/:postId/comments", authMiddleware, addCommentToGroupPost);

// Delete a post
router.delete("/posts/:postId", authMiddleware, deleteGroupPost);

// Delete a comment
router.delete(
  "/posts/:postId/comments/:commentId",
  authMiddleware,
  deleteCommentFromGroupPost
);

module.exports = router;
