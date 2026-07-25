const Task = require("../models/Task");
const WebhookEvent = require("../models/WebhookEvent");
const SyncActivity = require("../models/SyncActivity");
const SyncCheckpoint = require("../models/SyncCheckpoint");
const { fetchIssuesPage } = require("../services/github.service");
const retry = require("../utils/retry");

// ─── GET /api/sync/metrics ────────────────────────────────────────────────────
exports.getSyncMetrics = async (req, res) => {
  try {
    const [totalTasks, synced, pending, conflict, errors, duplicateEvents] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ syncStatus: "synced" }),
      Task.countDocuments({ syncStatus: "pending" }),
      Task.countDocuments({ syncStatus: "conflict" }),
      Task.countDocuments({ syncStatus: "error" }),
      WebhookEvent.countDocuments({ status: "duplicate" }),
    ]);

    res.json({
      success: true,
      metrics: { totalTasks, synced, pending, conflict, errors, duplicateEvents },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/sync/activity ───────────────────────────────────────────────────
exports.getSyncActivity = async (req, res) => {
  try {
    const [
      totalTasks, synced, pending, conflict, errors, duplicateEvents,
      activities,
    ] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ syncStatus: "synced" }),
      Task.countDocuments({ syncStatus: "pending" }),
      Task.countDocuments({ syncStatus: "conflict" }),
      Task.countDocuments({ syncStatus: "error" }),
      WebhookEvent.countDocuments({ status: "duplicate" }),
      SyncActivity.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    res.json({
      success: true,
      metrics: { totalTasks, synced, pending, conflict, errors, duplicateEvents },
      activities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/sync/run ───────────────────────────────────────────────────────
// Paginated + resumable full sync from GitHub Issues.
// Reads checkpoint to resume from last page if a previous sync crashed.
exports.runSync = async (req, res) => {
  const PROVIDER = "github";
  const PER_PAGE = 100;

  try {
    // Load or create checkpoint
    let checkpoint = await SyncCheckpoint.findOne({ provider: PROVIDER });
    if (!checkpoint) {
      checkpoint = await SyncCheckpoint.create({ provider: PROVIDER, lastPage: 1 });
    }

    let page = checkpoint.lastPage;
    let totalSynced = 0;
    let hasMore = true;

    while (hasMore) {
      // Fetch one page with retry + backoff
      const issues = await retry(() => fetchIssuesPage(page, PER_PAGE), {
        onRetry: async (attempt, waitMs) => {
          await SyncActivity.create({
            type: "retry",
            message: `Retry attempt ${attempt} fetching GitHub issues page ${page} (waiting ${waitMs}ms)`,
          }).catch(() => {});
        },
      });

      if (!issues || issues.length === 0) {
        hasMore = false;
        break;
      }

      // Process each issue in this batch
      for (const issue of issues) {
        // Skip pull requests (GitHub returns them in issues endpoint)
        if (issue.pull_request) continue;

        const task = await Task.findOne({ githubIssueNumber: issue.number });
        if (!task) continue;

        const githubUpdatedAt = new Date(issue.updated_at);
        const localUpdatedAt = new Date(task.updatedAt);

        // Last-Write-Wins: GitHub is newer → apply GitHub version
        if (githubUpdatedAt > localUpdatedAt) {
          task.title = issue.title;
          task.description = issue.body || "";
          task.status = issue.state === "open" ? "open" : "completed";
          task.syncStatus = "synced";
          task.lastSyncedAt = new Date();
          task.version += 1;
          await task.save();
          totalSynced++;
        }
      }

      // Save checkpoint after each page so we can resume if crash occurs
      checkpoint.lastPage = page;
      checkpoint.lastSyncedAt = new Date();
      checkpoint.totalSynced += totalSynced;
      await checkpoint.save();

      // If we got fewer than PER_PAGE, we've reached the last page
      if (issues.length < PER_PAGE) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Reset checkpoint page to 1 after successful full sync
    checkpoint.lastPage = 1;
    await checkpoint.save();

    await SyncActivity.create({
      type: "synced",
      message: `Full sync completed — ${totalSynced} tasks updated from GitHub`,
    }).catch(() => {});

    res.json({
      success: true,
      message: `Sync completed. ${totalSynced} tasks updated.`,
      totalSynced,
    });
  } catch (error) {
    console.error("Sync failed:", error.message);

    await SyncActivity.create({
      type: "error",
      message: `Full sync failed: ${error.message}`,
    }).catch(() => {});

    res.status(500).json({ success: false, message: error.message });
  }
};
