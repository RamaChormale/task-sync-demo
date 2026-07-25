const express = require('express');
const router = express.Router();
const { getSyncMetrics, getSyncActivity, runSync } = require('../controllers/sync.controller');

// GET /api/sync/metrics  — returns { totalTasks, synced, pending, conflict, errors, duplicateEvents }
router.get('/metrics', getSyncMetrics);

// GET /api/sync/activity — returns latest 20 sync events + metrics in one call
router.get('/activity', getSyncActivity);

// POST /api/sync/run — triggers a paginated, resumable full sync from GitHub
router.post('/run', runSync);

module.exports = router;
