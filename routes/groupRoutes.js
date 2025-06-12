// routes/groupRoutes.js

const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");
const authMiddleware = require("../middleware/authMiddleware");

// Group core functionality
router.post("/create", authMiddleware, groupController.createGroup);
router.post("/join/:groupId", authMiddleware, groupController.joinGroup);
router.post("/leave/:groupId", authMiddleware, groupController.leaveGroup);
router.post(
  "/kick/:groupId/:userId",
  authMiddleware,
  groupController.kickMember
);
router.get("/:groupId", authMiddleware, groupController.getGroupById);
router.get("/", authMiddleware, groupController.getAllGroups);

router.put(
  "/:groupId/settings",
  authMiddleware,
  groupController.updateGroupSettings
);
// ✅ Group Post Routes
const groupPostRoutes = require("./groupPostRoutes");
router.use("/", groupPostRoutes);

const groupAdminRoutes = require("./groupAdminRoutes");
router.use("/:groupId/admin", groupAdminRoutes);

// routes/groupRoutes.js
const groupLeaderOnly = require("../middleware/groupLeaderOnly");

router.delete(
  "/:groupId",
  authMiddleware,
  groupLeaderOnly,
  groupController.deleteGroup
);

module.exports = router;
