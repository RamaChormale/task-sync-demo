const mongoose = require("mongoose");

const syncCheckpointSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      unique: true, // one checkpoint per provider e.g. "github"
    },
    lastPage: { type: Number, default: 1 },
    lastCursor: { type: String, default: null },
    lastSyncedAt: { type: Date, default: null },
    totalSynced: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SyncCheckpoint", syncCheckpointSchema);
