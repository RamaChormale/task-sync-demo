const express = require("express");
const cors = require("cors");
require("dotenv").config();


const app = express();

app.use(cors());
app.use(express.json());
const connectDB = require("./config/db");
const taskRoutes = require("./routes/task.routes");
const githubRoutes = require("./routes/github.routes");
const webhookRoutes = require("./routes/webhook.routes");


console.log("Webhook Routes Loaded:", webhookRoutes);
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Task Sync Engine API Running 🚀",
  });
});

app.use("/api/tasks", taskRoutes);
app.use("/api/github", githubRoutes);
app.use("/webhook", webhookRoutes);

const PORT = process.env.PORT || 5000;
connectDB();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});