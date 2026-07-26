const express = require("express");

const router = express.Router();

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  closeTask,
  resolveConflict,
} = require("../controllers/task.controller");

router.post("/", createTask);
router.get("/", getTasks);
router.get("/:id", getTaskById);
router.patch("/:id", updateTask);
router.patch("/:id/close", closeTask);          // close — preserves record
router.post("/:id/resolve", resolveConflict);

module.exports = router;