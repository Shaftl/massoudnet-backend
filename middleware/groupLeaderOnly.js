// middleware/groupLeaderOnly.js
const Group = require("../models/Group");

module.exports = async function groupLeaderOnly(req, res, next) {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    if (group.leader.toString() !== req.userId) {
      return res.status(403).json({ message: "Only group leader allowed" });
    }
    next();
  } catch (err) {
    console.error("groupLeaderOnly error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
