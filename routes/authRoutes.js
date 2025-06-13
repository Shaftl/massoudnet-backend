const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  register,
  login,
  verifyEmail,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} = require("../controllers/authController");

const User = require("../models/User");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail); // ✅ NEW

// Protected route
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true, // Required in HTTPS/Render
    sameSite: "None", // Must match your login cookie
    path: "/", // Default path where cookie was set
  });

  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;

// existing public routes ...
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

// protected routes...
