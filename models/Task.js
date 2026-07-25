const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "completed"],
      default: "open",
    },

    // Required for assignment
    syncStatus: {
      type: String,
      enum: ["pending", "synced", "conflict", "error"],
      default: "pending",
    },

    githubIssueNumber: {
      type: Number,
      default: null,
    },

    githubIssueId: {
      type: String,
      default: null,
    },

    version: {
      type: Number,
      default: 1,
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);