const Task = require('../models/Task');
const WebhookEvent = require('../models/WebhookEvent');
const SyncActivity = require('../models/SyncActivity');

// GitHub actions we care about for bidirectional sync
const HANDLED_ACTIONS = new Set(['opened', 'edited', 'closed', 'reopened']);

exports.githubWebhook = async (req, res) => {
  const eventId = req.headers['x-github-delivery'];
  const eventType = req.headers['x-github-event'];
  const action = req.body?.action;

  console.log(`[Webhook] Received: eventType=${eventType} action=${action} eventId=${eventId}`);

  try {
    // Only process "issues" events — always return 200 for others so GitHub
    // does not mark the delivery as failed
    if (eventType !== 'issues') {
      return res.status(200).json({ success: true, message: `Ignored event type: ${eventType}` });
    }

    // Only process actions that represent a real change
    if (!HANDLED_ACTIONS.has(action)) {
      return res.status(200).json({ success: true, message: `Ignored action: ${action}` });
    }

    // ── Idempotency: reject duplicate deliveries ──────────────────────────
    try {
      await WebhookEvent.create({
        eventId,
        eventType,
        payload: req.body,
        status: 'processing',
      });
    } catch (err) {
      if (err.code === 11000) {
        await Promise.all([
          SyncActivity.create({ type: 'duplicate', message: 'Duplicate webhook ignored' }),
          WebhookEvent.updateOne({ eventId }, { status: 'duplicate' }),
        ]).catch(() => {});

        console.log(`[Webhook] Duplicate delivery ignored: ${eventId}`);
        return res.status(200).json({ success: true, message: 'Duplicate webhook ignored' });
      }
      throw err;
    }

    const issue = req.body.issue;

    if (!issue) {
      console.warn('[Webhook] No issue object in payload');
      return res.status(200).json({ success: true, message: 'No issue in payload' });
    }

    console.log(`[Webhook] Processing issue #${issue.number} action=${action}`);

    // Find the matching task by GitHub issue number
    const task = await Task.findOne({ githubIssueNumber: issue.number });

    if (!task) {
      // Return 200 so GitHub doesn't retry — this issue just isn't tracked in our app
      console.log(`[Webhook] No task found for issue #${issue.number} — skipping`);
      await WebhookEvent.updateOne({ eventId }, { status: 'completed', processedAt: new Date() });
      return res.status(200).json({ success: true, message: 'Issue not tracked in this app' });
    }

    // ── Apply GitHub changes to local task ───────────────────────────────
    task.title = issue.title;
    // issue.body can be null on GitHub — fall back to empty string
    task.description = issue.body ?? '';
    task.status = issue.state === 'closed' ? 'completed' : 'open';
    task.syncStatus = 'synced';
    task.lastSyncedAt = new Date();
    task.version += 1;

    await task.save();

    console.log(`[Webhook] Task "${task.title}" updated from GitHub issue #${issue.number}`);

    await Promise.all([
      WebhookEvent.updateOne({ eventId }, { status: 'completed', processedAt: new Date() }),
      SyncActivity.create({
        type: 'synced',
        message: `GitHub → App: Issue #${issue.number} "${issue.title}" (${action})`,
        taskId: task._id,
      }),
    ]).catch((err) => console.error('[Webhook] Post-save ops failed:', err.message));

    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('[Webhook] Error:', error.message);

    await SyncActivity.create({
      type: 'error',
      message: `Webhook processing failed: ${error.message}`,
    }).catch(() => {});

    // Always return 200 — returning 500 causes GitHub to retry the same broken payload
    return res.status(200).json({ success: false, message: error.message });
  }
};
