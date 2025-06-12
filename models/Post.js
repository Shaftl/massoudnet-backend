const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, default: "" },
    image: { type: String }, // for image URLs
    video: { type: String }, // ✅ NEW: for video URLs
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    privacy: {
      type: String,
      enum: ["public", "friends", "onlyMe"],
      default: "public",
    },
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
