const User = require("../models/User");
exports.followUser = async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId); // ✅ FIXED
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (currentUser.following.includes(targetUser._id))
      return res.status(400).json({ message: "Already following" });

    currentUser.following.push(targetUser._id);
    targetUser.followers.push(currentUser._id);
    await currentUser.save();
    await targetUser.save();

    res.status(200).json({ message: "Followed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId); // ✅ FIXED
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    currentUser.following.pull(targetUser._id);
    targetUser.followers.pull(currentUser._id);
    await currentUser.save();
    await targetUser.save();

    res.status(200).json({ message: "Unfollowed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "followers",
      "name profilePic"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.followers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "following",
      "name profilePic"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.following);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.userId;

    const user = await User.findById(id).populate("friends");

    if (!user) return res.status(404).json({ error: "User not found" });

    const isFriend = user.friends.some((f) => f._id.equals(viewerId));

    if (user.profileVisibility === "private" && !user._id.equals(viewerId)) {
      return res.status(403).json({ error: "This profile is private" });
    }

    if (
      user.profileVisibility === "friends" &&
      !isFriend &&
      !user._id.equals(viewerId)
    ) {
      return res
        .status(403)
        .json({ error: "Only friends can view this profile" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
