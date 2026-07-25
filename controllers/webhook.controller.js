const Task = require("../models/Task");

exports.githubWebhook = async (req, res) => {
  try {
    const event = req.headers["x-github-event"];

    console.log("GitHub Event:", event);
    console.log("Payload:", req.body);

    // Only handle Issue events
    if (event !== "issues") {
      return res.status(200).json({
        success: true,
        message: "Ignored event",
      });
    }

    const action = req.body.action;
    const issue = req.body.issue;

    console.log("Action:", action);
    console.log("Issue Number:", issue.number);

    // Find Task using GitHub Issue Number
    const task = await Task.findOne({
      githubIssueNumber: issue.number,
    });
console.log("Matched Task:", task); 
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Update task from GitHub
    task.title = issue.title;
    task.description = issue.body;
    task.status = issue.state === "open" ? "open" : "completed";
    task.syncStatus = "synced";
    task.lastSyncedAt = new Date();

    await task.save();

    res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Webhook Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};