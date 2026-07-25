const express = require("express");

const router = express.Router();

const webhookController = require("../controllers/webhook.controller");
const verifyGithubWebhook = require("../middleware/githubWebhook.middleware");


router.post(
  "/github",
  webhookController.githubWebhook
);


module.exports = router;