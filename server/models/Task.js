const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "closed"],
      default: "open",
    },

    // Set when a task is closed — preserves history without deletion
    closedAt: { type: Date, default: null },

    syncStatus: {
      type: String,
      enum: ["pending", "synced", "conflict", "error"],
      default: "pending",
    },

    githubIssueNumber: { type: Number, default: null },
    githubIssueId: { type: String, default: null },

    // Optimistic locking — incremented on every update
    version: { type: Number, default: 1 },

    lastSyncedAt: { type: Date, default: null },
    isOpen: { type: Boolean, default: true }, // false when status === "closed"

    // Conflict resolution — stores both versions when conflict is detected
    conflictVersions: {
      local: {
        title: String,
        description: String,
        status: String,
        updatedAt: Date,
      },
      github: {
        title: String,
        description: String,
        status: String,
        updatedAt: Date,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
