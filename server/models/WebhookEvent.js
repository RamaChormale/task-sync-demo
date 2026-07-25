const mongoose = require("mongoose");

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
    },

    payload: mongoose.Schema.Types.Mixed,

    status: {
      type: String,
      enum: ["processing", "completed", "failed", "duplicate"],
      default: "processing",
    },

    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WebhookEvent", webhookEventSchema);