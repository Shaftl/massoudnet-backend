// controllers/groupPostController.js

const GroupPost = require("../models/GroupPostModel");
const Group = require("../models/Group");

exports.createGroupPost = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text = "", media = [] } = req.body; // default to empty string/array
    const userId = req.userId;

    // 1) ensure group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // 2) ensure user is a member
    const isMember = group.members.some(
      (memberId) => memberId.toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a group member" });
    }

    // 3) reject if *both* text and media are empty
    if (text.trim() === "" && (!Array.isArray(media) || media.length === 0)) {
      return res.status(400).json({ message: "Cannot create an empty post." });
    }

    // 4) create the post
    const post = await GroupPost.create({
      group: groupId,
      author: userId,
      text: text.trim(),
      media,
    });

    res.status(201).json(post);
  } catch (err) {
    console.error("Create Group Post Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getGroupPosts = async (req, res) => {
  try {
    const { groupId } = req.params;

    const posts = await GroupPost.find({ group: groupId })
      .populate("author", "name profilePic")
      .populate("comments.author", "name profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    console.error("Get Group Posts Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.likeGroupPost = async (req, res) => {
  try {
    const post = await GroupPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.likes.includes(req.userId)) {
      return res.status(400).json({ error: "Already liked" });
    }

    post.likes.push(req.userId);
    await post.save();
    res.status(200).json(post);
  } catch (err) {
    console.error("Like Group Post Error:", err);
    res.status(500).json({ error: "Failed to like post" });
  }
};

exports.unlikeGroupPost = async (req, res) => {
  try {
    const post = await GroupPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.likes = post.likes.filter((id) => id.toString() !== req.userId);
    await post.save();
    res.status(200).json(post);
  } catch (err) {
    console.error("Unlike Group Post Error:", err);
    res.status(500).json({ error: "Failed to unlike post" });
  }
};

exports.addCommentToGroupPost = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const post = await GroupPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({
      author: req.userId,
      text: text.trim(),
    });
    await post.save();

    const updatedPost = await GroupPost.findById(req.params.postId)
      .populate("author", "name profilePic")
      .populate("comments.author", "name profilePic");

    res.status(200).json(updatedPost);
  } catch (err) {
    console.error("Add Comment Error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
};

exports.deleteGroupPost = async (req, res) => {
  try {
    const post = await GroupPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await post.deleteOne();
    res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    console.error("Delete Post Error:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
};

exports.deleteCommentFromGroupPost = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await GroupPost.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    if (comment.author.toString() !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    comment.deleteOne();
    await post.save();
    res.status(200).json(post);
  } catch (err) {
    console.error("Delete Comment Error:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
};

exports.updateGroupPost = async (req, res) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    const { text = "", media } = req.body;

    const post = await GroupPost.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== userId)
      return res.status(403).json({ message: "Unauthorized" });

    // Only reject if updated post would be empty
    if (text.trim() === "" && (!Array.isArray(media) || media.length === 0)) {
      return res
        .status(400)
        .json({ message: "Cannot update to an empty post." });
    }

    post.text = text.trim();
    if (media) post.media = media;

    await post.save();
    res.status(200).json({ message: "Post updated", post });
  } catch (err) {
    console.error("Update Group Post Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
