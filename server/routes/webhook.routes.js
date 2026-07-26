const express = require("express");

const router = express.Router();

const webhookController = require("../controllers/webhook.controller");
const verifyGithubWebhook = require("../middleware/githubWebhook.middleware");


// Test route — GET /webhook/github/ping to confirm webhook route is reachable
router.get('/github/ping', (req, res) => {
  res.json({ success: true, message: 'Webhook route is reachable ✅' });
});

router.post('/github', webhookController.githubWebhook);


module.exports = router;