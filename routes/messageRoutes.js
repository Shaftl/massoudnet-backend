// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const verifyToken = require("../middleware/authMiddleware");

router.post("/", verifyToken, messageController.sendMessage);
router.get("/:conversationId", verifyToken, messageController.getMessages);
router.put("/seen", verifyToken, messageController.markAsSeen);

// ✅ DELETE message for current user
router.delete("/:id", verifyToken, messageController.deleteMessageForUser);
// ✅ Add this new route at the bottom
router.delete(
  "/conversation/:conversationId",
  verifyToken,
  messageController.deleteConversation
);

router.delete(
  "/delete-everyone/:id",
  verifyToken,
  messageController.deleteMessageForEveryone
);

module.exports = router;
