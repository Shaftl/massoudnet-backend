const express = require("express");
const router = express.Router();
const conversationController = require("../controllers/conversationController");
const verifyToken = require("../middleware/authMiddleware");

router.post("/", verifyToken, conversationController.createConversation);
router.get("/", verifyToken, conversationController.getUserConversations);
router.delete("/:id", verifyToken, conversationController.deleteConversation);

// ✅ FIXED: Use controller and protect route
router.post(
  "/findOrCreate",
  verifyToken,
  conversationController.findOrCreateConversation
);

module.exports = router;
