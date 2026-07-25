const mongoose = require("mongoose");

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: String,
    payload: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WebhookEvent", webhookEventSchema);