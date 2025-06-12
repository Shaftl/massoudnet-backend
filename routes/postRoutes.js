const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Post = require("../models/Post");
const User = require("../models/User");
const sendNotification = require("../utils/sendNotification");

// Get posts by user with privacy filtering + populate comments
router.get("/user/:id", authMiddleware, async (req, res) => {
  try {
    const viewerId = req.userId;
    const ownerId = req.params.id;

    const owner = await User.findById(ownerId).select("friends");

    const isSelf = viewerId === ownerId;
    const isFriend = owner.friends.some((f) => f.toString() === viewerId);

    let privacyFilter;
    if (isSelf) {
      privacyFilter = ["public", "friends", "onlyMe"];
    } else if (isFriend) {
      privacyFilter = ["public", "friends"];
    } else {
      privacyFilter = ["public"];
    }

    const posts = await Post.find({
      author: ownerId,
      privacy: { $in: privacyFilter },
    })
      .sort({ createdAt: -1 })
      .populate("author", "name profilePic")
      .populate("comments.user", "name profilePic"); // ✅ THIS FIXES COMMENTS

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user's posts" });
  }
});

// Create post with privacy
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { text, image, video, privacy } = req.body;

    if (!text && !image && !video) {
      return res.status(400).json({ error: "Post must have content" });
    }

    const newPost = new Post({
      author: req.userId,
      text,
      image: image || null,
      video: video || null,
      privacy: privacy || "public", // ✅ support privacy
    });

    await newPost.save();
    await newPost.populate("author", "name profilePic");

    res.status(201).json(newPost);
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Feed filtered by privacy
router.get("/feed", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const friendIds = user?.friends || [];
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const posts = await Post.find({
      $or: [
        { author: req.userId }, // Own posts
        {
          author: { $in: friendIds },
          privacy: { $in: ["friends", "public"] },
        },
        { privacy: "public" },
      ],
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "name profilePic")
      .populate("comments.user", "name profilePic");

    res.json(posts);
  } catch (err) {
    console.error("Error fetching feed:", err);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

// Like/unlike post
router.put("/like/:postId", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const userIdStr = req.userId.toString();
    const alreadyLiked = post.likes.some((id) => id.toString() === userIdStr);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userIdStr); // Unlike
    } else {
      post.likes.push(req.userId); // Like
      // Only send notification on actual like
      await sendNotification({
        senderId: req.userId,
        receiverId: post.author,
        type: "like",
        postId: post._id,
        io: global._io,
      });
    }

    await post.save();
    res.json({ likes: post.likes });
  } catch (err) {
    console.error("Error liking/unliking post:", err);
    res.status(500).json({ error: "Failed to like/unlike post" });
  }
});

// Comment on post
router.post("/comment/:postId", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text)
      return res.status(400).json({ error: "Comment cannot be empty" });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({ user: req.userId, text });
    await post.save();

    await post.populate("comments.user", "name profilePic");

    const receiverId = post.author;
    const senderId = req.userId;

    await sendNotification({
      senderId,
      receiverId,
      type: "comment",
      postId: post._id,
      io: global._io,
    });

    res.json({ comments: post.comments });
  } catch (err) {
    console.error("Error commenting on post:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// DELETE A COMMENT
router.delete(
  "/comment/:postId/:commentId",
  authMiddleware,
  async (req, res) => {
    const { postId, commentId } = req.params;
    console.log("🗑️  DELETE /comment", req.params);

    try {
      const post = await Post.findById(postId);
      console.log("→ got post:", post ? post._id : null);
      if (!post) return res.status(404).json({ error: "Post not found" });

      const comment = post.comments.id(commentId);
      console.log("→ got comment:", comment);
      if (!comment) return res.status(404).json({ error: "Comment not found" });
      if (comment.user.toString() !== req.userId)
        return res.status(403).json({ error: "Unauthorized" });

      // remove and save
      post.comments = post.comments.filter(
        (c) => c._id.toString() !== commentId
      );
      await post.save();

      // re-populate for response
      const fresh = await Post.findById(postId).populate(
        "comments.user",
        "name profilePic"
      );
      console.log("→ fresh.comments:", fresh.comments.length);

      return res.json({ comments: fresh.comments });
    } catch (err) {
      console.error("❌ Error deleting comment:", err);
      return res.status(500).json({ error: "Failed to delete comment" });
    }
  }
);

// Delete post
router.delete("/:postId", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.author.toString() !== req.userId)
      return res.status(403).json({ error: "Unauthorized" });

    await post.deleteOne();
    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Edit post with privacy support
router.put("/:postId", authMiddleware, async (req, res) => {
  try {
    const { text, image, video, privacy } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.author.toString() !== req.userId)
      return res.status(403).json({ error: "Unauthorized" });

    if (text !== undefined) post.text = text;
    if (image !== undefined) post.image = image || null;
    if (video !== undefined) post.video = video || null;
    if (privacy !== undefined) post.privacy = privacy; // ✅ update privacy

    await post.save();
    await post.populate("author", "name profilePic");

    res.json(post);
  } catch (err) {
    console.error("Error editing post:", err);
    res.status(500).json({ error: "Failed to edit post" });
  }
});

// Count posts by user
router.get("/count/:userId", authMiddleware, async (req, res) => {
  try {
    const count = await Post.countDocuments({ author: req.params.userId });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Failed to count user's posts" });
  }
});

// Get single post
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author");
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.status(200).json(post);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching post", error: err.message });
  }
});

module.exports = router;
