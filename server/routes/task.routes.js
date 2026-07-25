const express = require("express");

const router = express.Router();

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  resolveConflict,
} = require("../controllers/task.controller");

router.post("/", createTask);
router.get("/", getTasks);
router.get("/:id", getTaskById);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);
// POST /api/tasks/:id/resolve — resolve a conflict by choosing local or github version
router.post("/:id/resolve", resolveConflict);

module.exports = router;