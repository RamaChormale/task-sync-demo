const mongoose = require("mongoose");

const syncActivitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["synced", "duplicate", "conflict", "error", "retry", "rate_limited"],
      required: true,
    },
    message: { type: String, required: true },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SyncActivity", syncActivitySchema);
