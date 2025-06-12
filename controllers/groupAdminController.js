// controllers/groupAdminController.js
const Group = require("../models/Group");

// 1️⃣ List pending join requests
exports.getJoinRequests = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate(
      "joinRequests",
      "_id name email profilePic"
    );
    if (!group) return res.status(404).json({ message: "Group not found" });

    res.status(200).json({ success: true, data: group.joinRequests });
  } catch (err) {
    console.error("GetJoinRequests error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 2️⃣ Approve a join request
exports.approveJoinRequest = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.joinRequests.includes(userId)) {
      return res.status(400).json({ message: "No such pending request" });
    }

    group.members.push(userId);
    group.joinRequests = group.joinRequests.filter(
      (id) => id.toString() !== userId
    );
    await group.save();

    res.status(200).json({ success: true, message: "User approved" });
  } catch (err) {
    console.error("approveJoinRequest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 3️⃣ Deny a join request
exports.denyJoinRequest = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.joinRequests.includes(userId)) {
      return res.status(400).json({ message: "No such pending request" });
    }

    group.joinRequests = group.joinRequests.filter(
      (id) => id.toString() !== userId
    );
    await group.save();

    res.status(200).json({ success: true, message: "User denied" });
  } catch (err) {
    console.error("denyJoinRequest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
