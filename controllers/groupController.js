// controllers/groupController.js

const Group = require("../models/Group");
const User = require("../models/User");
const GroupPost = require("../models/GroupPostModel"); // ✅ Add this line

// controllers/groupController.js
exports.createGroup = async (req, res) => {
  try {
    const { name, description, privacy, coverImage, bgCoverImage } = req.body;
    const leader = req.userId;

    if (!name || !leader) {
      return res
        .status(400)
        .json({ success: false, error: "Group name and leader are required." });
    }

    const newGroup = new Group({
      name,
      description,
      leader,
      members: [leader],
      privacy: ["public", "private"].includes(privacy) ? privacy : "public",
      coverImage: coverImage || "",
      bgCoverImage: bgCoverImage || "",
    });

    const savedGroup = await newGroup.save();
    res.status(201).json({ success: true, data: savedGroup });
  } catch (err) {
    console.error("Create group error:", err);
    res
      .status(500)
      .json({ success: false, error: "Server error while creating group." });
  }
};

// Leader-only update settings
exports.updateGroupSettings = async (req, res) => {
  try {
    const { name, description, privacy, coverImage, bgCoverImage } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found" });
    }

    // Only leader may change settings
    if (group.leader.toString() !== req.userId) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (privacy && ["public", "private"].includes(privacy)) {
      group.privacy = privacy;
    }
    if (coverImage !== undefined) {
      group.coverImage = coverImage;
    }

    if (bgCoverImage !== undefined) {
      group.bgCoverImage = bgCoverImage;
    }

    await group.save();
    res.status(200).json({ success: true, data: group });
  } catch (err) {
    console.error("updateGroupSettings:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/// controllers/groupController.js
exports.joinGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  const group = await Group.findById(groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });

  if (group.privacy === "private") {
    // Instead of breaking, push to joinRequests safely
    if (!group.joinRequests.includes(userId)) {
      group.joinRequests.push(userId);
      await group.save();
    }
    return res.status(200).json({ message: "Join request sent" });
  }

  // Public group, auto join
  if (!group.members.includes(userId)) {
    group.members.push(userId);
    await group.save();
  }

  return res.status(200).json({ message: "Joined successfully" });
};

exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    if (group.leader.toString() === req.userId) {
      return res
        .status(403)
        .json({ success: false, error: "Leader cannot leave the group" });
    }

    const wasMember = group.members.includes(req.userId);
    if (!wasMember) {
      return res
        .status(400)
        .json({ success: false, error: "You are not a member of this group" });
    }

    group.members = group.members.filter(
      (memberId) => memberId.toString() !== req.userId
    );

    await group.save();
    res.status(200).json({ success: true, message: "Left group" });
  } catch (err) {
    console.error("Leave group error:", err);
    res.status(500).json({ success: false, error: "Error leaving group" });
  }
};

exports.kickMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    if (group.leader.toString() !== req.userId) {
      return res
        .status(403)
        .json({ success: false, error: "Only leader can kick members" });
    }

    const memberId = req.params.userId;

    if (memberId === req.userId) {
      return res
        .status(400)
        .json({ success: false, error: "Leader cannot kick themselves" });
    }

    const wasMember = group.members.includes(memberId);
    if (!wasMember) {
      return res
        .status(400)
        .json({ success: false, error: "User is not a group member" });
    }

    group.members = group.members.filter((id) => id.toString() !== memberId);
    await group.save();

    res.status(200).json({ success: true, message: "Member kicked" });
  } catch (err) {
    console.error("Kick member error:", err);
    res.status(500).json({ success: false, error: "Error kicking member" });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("leader", "name email, profilePic") // ✅ Populating leader fields
      .populate("members", "name email, profilePic"); // ✅ Populating members with username + email

    if (!group)
      return res.status(404).json({ success: false, error: "Group not found" });

    res.status(200).json({ success: true, data: group });
  } catch (err) {
    console.error("Fetch group error:", err);
    res.status(500).json({ success: false, error: "Error fetching group" });
  }
};

exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find().populate("leader", "name");
    res.status(200).json({ success: true, data: groups });
  } catch (err) {
    console.error("Fetch all groups error:", err);
    res.status(500).json({ success: false, error: "Error fetching groups" });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    // 1. Delete all posts in the group
    await GroupPost.deleteMany({ group: groupId });

    // 2. Delete the group itself
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({ success: true, message: "Group and posts deleted" });
  } catch (err) {
    console.error("deleteGroup error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
