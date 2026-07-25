const Task = require('../models/Task');
const WebhookEvent = require('../models/WebhookEvent');
const SyncActivity = require('../models/SyncActivity');

exports.githubWebhook = async (req, res) => {
  const eventId = req.headers['x-github-delivery'];
  const eventType = req.headers['x-github-event'];

  try {
    if (eventType !== 'issues') {
      return res.status(200).json({ success: true, message: 'Ignored event' });
    }

    // Idempotency check
    try {
      await WebhookEvent.create({
        eventId,
        eventType,
        payload: req.body,
        status: 'processing',
      });
    } catch (err) {
      if (err.code === 11000) {
        // Record duplicate activity and mark the event
        await Promise.all([
          SyncActivity.create({ type: 'duplicate', message: 'Duplicate webhook ignored' }),
          WebhookEvent.updateOne({ eventId }, { status: 'duplicate' }),
        ]);

        return res.status(200).json({
          success: true,
          message: 'Duplicate webhook ignored',
        });
      }
      throw err;
    }

    const issue = req.body.issue;
    const task = await Task.findOne({ githubIssueNumber: issue.number });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.title = issue.title;
    task.description = issue.body;
    task.status = issue.state === 'open' ? 'open' : 'completed';
    task.syncStatus = 'synced';
    task.lastSyncedAt = new Date();

    await task.save();

    await Promise.all([
      WebhookEvent.updateOne({ eventId }, { status: 'completed', processedAt: new Date() }),
      SyncActivity.create({
        type: 'synced',
        message: `Task synced to GitHub — Issue #${issue.number}`,
        taskId: task._id,
      }),
    ]);

    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error(error);

    // Record error activity
    await SyncActivity.create({ type: 'error', message: `Sync failed: ${error.message}` }).catch(() => {});

    return res.status(500).json({ success: false, message: error.message });
  }
};
