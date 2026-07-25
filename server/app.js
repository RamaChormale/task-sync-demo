const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const taskRoutes = require("./routes/task.routes");
const githubRoutes = require("./routes/github.routes");
const webhookRoutes = require("./routes/webhook.routes");
const syncRoutes = require("./routes/sync.routes");

app.get("/", (req, res) => {
  res.json({ success: true, message: "Task Sync Engine API Running 🚀" });
});

app.use("/api/tasks", taskRoutes);
app.use("/api/github", githubRoutes);
app.use("/webhook", webhookRoutes);
app.use("/api/sync", syncRoutes);

module.exports = app;
