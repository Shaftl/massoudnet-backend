// models/Group.js

const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    privacy: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    coverImage: {
      type: String,
      default: "",
    },

    bgCoverImage: {
      type: String,
      default: "",
    },

    // models/GroupModel.js
    joinRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", groupSchema);
