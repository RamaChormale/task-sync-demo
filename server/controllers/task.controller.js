const Task = require("../models/Task");
const SyncActivity = require("../models/SyncActivity");
const { createIssue, updateIssue, closeIssue, getIssue } = require("../services/github.service");
const retry = require("../utils/retry");

// ─── Create Task ─────────────────────────────────────────────────────────────
exports.createTask = async (req, res) => {
  try {
    const { title, description, status } = req.body;

    const task = await Task.create({
      title,
      description,
      status,
      syncStatus: "pending",
    });

    try {
      const issue = await retry(() =>
        createIssue(task.title, task.description || "No description"),
        {
          onRetry: async (attempt, waitMs) => {
            await SyncActivity.create({
              type: "retry",
              message: `Retry attempt ${attempt} for creating GitHub issue (waiting ${waitMs}ms)`,
              taskId: task._id,
            }).catch(() => {});
          },
        }
      );

      task.githubIssueNumber = issue.number;
      task.githubIssueId = issue.node_id;
      task.syncStatus = "synced";
      task.lastSyncedAt = new Date();
      await task.save();

      await SyncActivity.create({
        type: "synced",
        message: `Task "${task.title}" synced — Issue #${issue.number} created`,
        taskId: task._id,
      });
    } catch (githubError) {
      console.error("GitHub Sync Failed:", githubError.message);
      task.syncStatus = "error";
      await task.save();

      await SyncActivity.create({
        type: "error",
        message: `Failed to create GitHub issue for "${task.title}": ${githubError.message}`,
        taskId: task._id,
      }).catch(() => {});
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get All Tasks ────────────────────────────────────────────────────────────
// Supports ?filter=open|closed|all  (default: all)
exports.getTasks = async (req, res) => {
  try {
    const { filter } = req.query;
    let query = {};
    if (filter === 'open')   query = { isOpen: true };
    if (filter === 'closed') query = { isOpen: false };
    const tasks = await Task.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Task By ID ───────────────────────────────────────────────────────────
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Task (Optimistic Locking + Conflict Detection) ───────────────────
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // ── Optimistic Locking ──────────────────────────────────────────────────
    // Client must send the version it last read.
    // If it doesn't match the DB version, another update happened in between.
    const clientVersion = req.body.version;
    if (clientVersion !== undefined && clientVersion !== task.version) {
      return res.status(409).json({
        success: false,
        message: "Version conflict: task was modified by another request. Please refresh and try again.",
        currentVersion: task.version,
      });
    }

    // ── Conflict Detection ──────────────────────────────────────────────────
    // If task has a GitHub issue, fetch the latest GitHub state and compare
    // updatedAt timestamps to detect bidirectional conflicts.
    if (task.githubIssueNumber) {
      try {
        const githubIssue = await getIssue(task.githubIssueNumber);
        const githubUpdatedAt = new Date(githubIssue.updated_at);
        const localUpdatedAt = new Date(task.updatedAt);

        // Conflict: GitHub was updated after our last sync
        const githubNewerThanSync = task.lastSyncedAt && githubUpdatedAt > new Date(task.lastSyncedAt);
        // Local was also modified (client is sending new data)
        const localHasChanges =
          req.body.title !== task.title ||
          req.body.description !== task.description ||
          req.body.status !== task.status;

        if (githubNewerThanSync && localHasChanges) {
          // Both sides changed — save conflict versions and mark as conflict
          task.syncStatus = "conflict";
          task.conflictVersions = {
            local: {
              title: req.body.title || task.title,
              description: req.body.description || task.description,
              status: req.body.status || task.status,
              updatedAt: localUpdatedAt,
            },
            github: {
              title: githubIssue.title,
              description: githubIssue.body || "",
              status: githubIssue.state === "open" ? "open" : "completed",
              updatedAt: githubUpdatedAt,
            },
          };
          task.version += 1;
          await task.save();

          await SyncActivity.create({
            type: "conflict",
            message: `Conflict detected on task "${task.title}" — both local and GitHub were modified`,
            taskId: task._id,
          }).catch(() => {});

          return res.status(200).json({
            success: true,
            conflict: true,
            message: "Conflict detected. Please resolve manually.",
            data: task,
          });
        }
      } catch (fetchError) {
        // Non-fatal: if we can't fetch GitHub state, proceed with local update
        console.warn("Could not fetch GitHub issue for conflict check:", fetchError.message);
      }
    }

    // ── Apply local changes ─────────────────────────────────────────────────
    task.title = req.body.title || task.title;
    task.description = req.body.description !== undefined ? req.body.description : task.description;
    task.status = req.body.status || task.status;
    task.version += 1; // increment version on every successful update

    // ── Sync to GitHub with retry + backoff ─────────────────────────────────
    if (task.githubIssueNumber) {
      try {
        await retry(
          () => updateIssue(task.githubIssueNumber, task.title, task.description, task.status),
          {
            onRetry: async (attempt, waitMs) => {
              await SyncActivity.create({
                type: "retry",
                message: `Retry attempt ${attempt} syncing task "${task.title}" to GitHub (waiting ${waitMs}ms)`,
                taskId: task._id,
              }).catch(() => {});
            },
          }
        );

        task.syncStatus = "synced";
        task.lastSyncedAt = new Date();
        task.conflictVersions = undefined; // clear any previous conflict

        await SyncActivity.create({
          type: "synced",
          message: `Task "${task.title}" updated and synced to GitHub`,
          taskId: task._id,
        }).catch(() => {});
      } catch (githubError) {
        console.error("GitHub Update Failed:", githubError.message);
        task.syncStatus = "error";

        await SyncActivity.create({
          type: "error",
          message: `Failed to sync task "${task.title}" to GitHub: ${githubError.message}`,
          taskId: task._id,
        }).catch(() => {});
      }
    }

    await task.save();

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Resolve Conflict ─────────────────────────────────────────────────────────
// POST /api/tasks/:id/resolve
// body: { resolution: "local" | "github" }
exports.resolveConflict = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (task.syncStatus !== "conflict") {
      return res.status(400).json({ success: false, message: "Task is not in conflict state" });
    }

    const { resolution } = req.body; // "local" or "github"
    if (!["local", "github"].includes(resolution)) {
      return res.status(400).json({ success: false, message: 'resolution must be "local" or "github"' });
    }

    const chosen = resolution === "local"
      ? task.conflictVersions.local
      : task.conflictVersions.github;

    // Apply the chosen version
    task.title = chosen.title;
    task.description = chosen.description;
    task.status = chosen.status;
    task.syncStatus = "pending";
    task.conflictVersions = undefined;
    task.version += 1;

    // Sync the resolved version to GitHub
    if (task.githubIssueNumber) {
      try {
        await retry(() =>
          updateIssue(task.githubIssueNumber, task.title, task.description, task.status)
        );
        task.syncStatus = "synced";
        task.lastSyncedAt = new Date();
      } catch (err) {
        task.syncStatus = "error";
      }
    }

    await task.save();

    await SyncActivity.create({
      type: "synced",
      message: `Conflict resolved on task "${task.title}" — kept ${resolution} version`,
      taskId: task._id,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Conflict resolved using ${resolution} version`,
      data: task,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Close Task ───────────────────────────────────────────────────────────────
// PATCH /api/tasks/:id/close
// Sets status="closed", isOpen=false, closes GitHub issue. Record is preserved.
exports.closeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (task.status === "closed") {
      return res.status(400).json({ success: false, message: "Task is already closed" });
    }

    task.status = "closed";
    task.isOpen = false;
    task.closedAt = new Date();
    task.version += 1;

    // Close the linked GitHub issue with retry + backoff
    if (task.githubIssueNumber) {
      try {
        await retry(() => closeIssue(task.githubIssueNumber), {
          onRetry: async (attempt, waitMs) => {
            await SyncActivity.create({
              type: "retry",
              message: `Retry attempt ${attempt} closing GitHub issue #${task.githubIssueNumber} (waiting ${waitMs}ms)`,
              taskId: task._id,
            }).catch(() => {});
          },
        });
        task.syncStatus = "synced";
        task.lastSyncedAt = new Date();

        await SyncActivity.create({
          type: "synced",
          message: `Task "${task.title}" closed — GitHub Issue #${task.githubIssueNumber} closed`,
          taskId: task._id,
        }).catch(() => {});
      } catch (githubError) {
        console.error("GitHub close failed:", githubError.message);
        task.syncStatus = "error";

        await SyncActivity.create({
          type: "error",
          message: `Task "${task.title}" closed locally but GitHub sync failed: ${githubError.message}`,
          taskId: task._id,
        }).catch(() => {});
      }
    }

    await task.save();

    res.json({ success: true, message: "Task closed successfully", data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
