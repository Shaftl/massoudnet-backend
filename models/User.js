const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: String,
    dob: String,
    gender: String,
    bio: { type: String, default: "" },

    country: { type: String, default: "" },
    city: { type: String, default: "" },

    profilePic: { type: String, default: "" },
    coverImg: { type: String, default: "" },

    profileVisibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    // Email Verification
    isVerified: { type: Boolean, default: false },
    verificationCode: String,
    verificationCodeExpires: Date,

    // Social Connections
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    pendingRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    resetPasswordCode: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
