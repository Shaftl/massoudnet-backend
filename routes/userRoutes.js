const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Story = require("../models/Story"); // ✅ Add this line

const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");
const parser = require("../middleware/uploadMiddleware");
const bcrypt = require("bcryptjs");

const sendNotification = require("../utils/sendNotification"); // ✅ Add this

const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserById,
} = require("../controllers/userController");

// ✅ FOLLOW user + send notification
router.put("/follow/:id", authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (currentUser.following.includes(targetUser._id))
      return res.status(400).json({ message: "Already following" });

    currentUser.following.push(targetUser._id);
    targetUser.followers.push(currentUser._id);
    await currentUser.save();
    await targetUser.save();

    // ✅ Send real-time follow notification
    await sendNotification({
      senderId: req.userId,
      receiverId: targetUser._id,
      type: "follow",
      io: global._io,
    });

    res.status(200).json({ message: "Followed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ UNFOLLOW
router.put("/unfollow/:id", authMiddleware, unfollowUser);

// ✅ Other user/friend endpoints
router.get("/followers/:id", authMiddleware, getFollowers);
router.get("/following/:id", authMiddleware, getFollowing);

router.get("/friends/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "friends",
      "name profilePic _id"
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ friends: user.friends });
  } catch (err) {
    console.error("Error fetching friends by ID:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/friends", authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).populate(
    "friends",
    "name profilePic _id"
  );
  res.json({ friends: user.friends });
});

router.get("/friend-requests", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate("pendingRequests", "name email profilePic")
      .exec();

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.pendingRequests);
    await sendNotification({
      senderId: req.userId,
      receiverId: targetUser._id,
      type: "friend_request",
      io: global._io,
    });
  } catch (err) {
    console.error("Error fetching friend requests:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/remove-friend/:id", authMiddleware, async (req, res) => {
  const currentUser = req.userId;
  const friendId = req.params.id;

  try {
    const user = await User.findById(currentUser);
    const friend = await User.findById(friendId);

    if (!user || !friend) {
      return res.status(404).json({ error: "User not found" });
    }

    user.friends = user.friends.filter((id) => id.toString() !== friendId);
    friend.friends = friend.friends.filter(
      (id) => id.toString() !== currentUser
    );

    await user.save();
    await friend.save();

    res.json({ success: true, message: "Friend removed" });
  } catch (err) {
    console.error("Remove friend error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/mutual-friends/:id", authMiddleware, async (req, res) => {
  const currentUserId = req.userId;
  const targetUserId = req.params.id;

  try {
    const currentUser = await User.findById(currentUserId).select("friends");
    const targetUser = await User.findById(targetUserId).select("friends");

    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const mutualIds = currentUser.friends.filter((id) =>
      targetUser.friends.includes(id)
    );

    const mutualFriends = await User.find({ _id: { $in: mutualIds } }).select(
      "name profilePic"
    );

    res.json({ mutualFriends });
  } catch (err) {
    console.error("Error getting mutual friends:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/update", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Destructure country & city instead of location
    const { name, bio, country, city, profilePic, profileVisibility } =
      req.body;

    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (bio) updatedFields.bio = bio;

    // New fields
    if (country) updatedFields.country = country;
    if (city) updatedFields.city = city;

    if (profilePic) updatedFields.profilePic = profilePic;
    if (profileVisibility) updatedFields.profileVisibility = profileVisibility;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post(
  "/upload-profile-pic",
  authMiddleware,
  parser.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const imageUrl = req.file.path;

      await User.findByIdAndUpdate(req.userId, { profilePic: imageUrl });

      res.json({ imageUrl });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

router.post("/friend-request/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const currentUser = req.userId;

  if (id === currentUser)
    return res.status(400).json({ error: "Cannot friend yourself" });

  const user = await User.findById(currentUser);
  const target = await User.findById(id);

  if (!user || !target)
    return res.status(404).json({ error: "User not found" });

  if (user.friends.includes(id))
    return res.status(400).json({ error: "Already friends" });

  if (user.sentRequests.includes(id))
    return res.status(409).json({ error: "Request already sent" });

  user.sentRequests.push(id);
  target.pendingRequests.push(currentUser);

  await user.save();
  await target.save();

  res.json({ success: true, message: "Friend request sent" });
  await sendNotification({
    senderId: req.userId,
    receiverId: targetUser._id,
    type: "friend_request",
    io: global._io,
  });
});

router.put("/respond-request/:id", authMiddleware, async (req, res) => {
  const { action } = req.body;
  const senderId = req.params.id;
  const currentUser = req.userId;

  const user = await User.findById(currentUser);
  const sender = await User.findById(senderId);

  if (!user || !sender)
    return res.status(404).json({ error: "User not found" });

  if (action === "accept") {
    if (!user.pendingRequests.includes(senderId)) {
      return res.status(400).json({ error: "No request to accept" });
    }

    user.friends.push(senderId);
    sender.friends.push(currentUser);

    user.pendingRequests = user.pendingRequests.filter(
      (id) => id.toString() !== senderId
    );
    sender.sentRequests = sender.sentRequests.filter(
      (id) => id.toString() !== currentUser
    );

    await user.save();
    await sender.save();

    return res.json({ success: true, message: "Friend request accepted" });
  } else if (action === "decline") {
    user.pendingRequests = user.pendingRequests.filter(
      (id) => id.toString() !== senderId
    );
    sender.sentRequests = sender.sentRequests.filter(
      (id) => id.toString() !== currentUser
    );

    await user.save();
    await sender.save();

    return res.json({ success: true, message: "Friend request declined" });
  } else {
    return res.status(400).json({ error: "Invalid action" });
  }
});

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect current password" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Delete posts, stories, messages
    await Post.deleteMany({ author: userId });
    await Story.deleteMany({ user: userId }); // ✅ fixed this line
    await Message.deleteMany({ sender: userId }); // optional

    // 2. Remove user from all references
    await User.updateMany(
      {},
      {
        $pull: {
          friends: userId,
          followers: userId,
          following: userId,
          sentRequests: userId,
          pendingRequests: userId,
        },
      }
    );

    // 3. Delete the user
    await User.findByIdAndDelete(userId);

    // 4. Clear cookie
    res
      .clearCookie("token")
      .status(200)
      .json({ message: "Account and all related data deleted." });
  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).json({ message: "Server error" });
  }
};

router.post("/change-password", authMiddleware, changePassword);
router.delete("/delete-account", authMiddleware, deleteAccount);

// === add this to check if I already sent a friend request ===

// GET list of user‐IDs you have sent requests to
router.get("/sent-requests", authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).populate(
    "sentRequests",
    "name profilePic _id"
  );
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ sentRequests: user.sentRequests });
});

// optional: cancel a sent request
router.delete("/sent-requests/:id", authMiddleware, async (req, res) => {
  const me = await User.findById(req.userId);
  const them = await User.findById(req.params.id);
  if (!me || !them) return res.status(404).json({ error: "User not found" });

  me.sentRequests = me.sentRequests.filter(
    (id) => id.toString() !== req.params.id
  );
  them.pendingRequests = them.pendingRequests.filter(
    (id) => id.toString() !== req.userId
  );
  await me.save();
  await them.save();

  res.json({ success: true });
});

// GET all users (name, pic, _id)
router.get("/all", authMiddleware, async (req, res) => {
  const users = await User.find().select("name profilePic _id");
  res.json({ users });
});

// === add this to check if I already sent a friend request ===
router.get("/friend-request/status/:id", authMiddleware, async (req, res) => {
  const currentUser = await User.findById(req.userId);
  if (!currentUser) return res.status(404).json({ error: "User not found" });
  const sent = currentUser.sentRequests.includes(req.params.id);
  res.json({ sent });
  x;
});

router.get("/:id", authMiddleware, getUserById);

router.put("/cover", authMiddleware, async (req, res) => {
  try {
    const { coverImg } = req.body;
    await User.findByIdAndUpdate(req.userId, { coverImg });
    return res.json({ coverImg });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update cover image" });
  }
});

module.exports = router;
