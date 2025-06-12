const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  event: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Object },
});

module.exports = mongoose.model("Analytics", analyticsSchema);
