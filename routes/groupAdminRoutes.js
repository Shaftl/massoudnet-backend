// routes/groupAdminRoutes.js
const express = require("express");
const router = express.Router({ mergeParams: true }); // ✅ mergeParams added!
const authMiddleware = require("../middleware/authMiddleware");
const groupLeaderOnly = require("../middleware/groupLeaderOnly");
const adminCtrl = require("../controllers/groupAdminController");

// 1) GET pending requests
router.get(
  "/requests",
  authMiddleware,
  groupLeaderOnly,
  adminCtrl.getJoinRequests
);

// 2) POST approve
router.post(
  "/requests/:userId/approve",
  authMiddleware,
  groupLeaderOnly,
  adminCtrl.approveJoinRequest
);

// 3) POST deny
router.post(
  "/requests/:userId/deny", // ✅ Fixed here
  authMiddleware,
  groupLeaderOnly,
  adminCtrl.denyJoinRequest
);

module.exports = router;
