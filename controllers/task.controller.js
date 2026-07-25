const Task = require("../models/Task");
const { createIssue, updateIssue, closeIssue } = require("../services/github.service");
const retry = require("../utils/retry");

// Create Task
exports.createTask = async (req, res) => {
    try {
        const { title, description, status } = req.body;

        // Step 1: Save task in MongoDB
        const task = await Task.create({
            title,
            description,
            status,
            syncStatus: "pending",
        });

        try {
            // Step 2: Create GitHub Issue
            const issue = await createIssue(
                task.title,
                task.description || "No description"
            );

            // Step 3: Update MongoDB
            task.githubIssueNumber = issue.number;
            task.githubIssueId = issue.node_id;
            task.syncStatus = "synced";
            task.lastSyncedAt = new Date();

            await task.save();
        } catch (githubError) {
            console.error("GitHub Sync Failed:", githubError.message);

            task.syncStatus = "error";
            await task.save();
        }

        res.status(201).json({
            success: true,
            data: task,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get All Tasks
exports.getTasks = async (req, res) => {
    try {
        const tasks = await Task.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        res.status(200).json({
            success: true,
            data: task,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.updateTask = async (req, res) => {
    try {
        // Find existing task
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        // Update task fields
        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.status = req.body.status || task.status;

        // Sync changes to GitHub
        if (task.githubIssueNumber) {
            try {
                await retry(() =>
                    updateIssue(
                        task.githubIssueNumber,
                        task.title,
                        task.description,
                        task.status
                    )
                );

                task.syncStatus = "synced";
                task.lastSyncedAt = new Date();
            } catch (githubError) {
                console.error("GitHub Update Failed:", githubError.message);

                task.syncStatus = "error";
            }
        }

        // Save updated task
        await task.save();

        res.status(200).json({
            success: true,
            message: "Task updated successfully",
            data: task,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        if (task.githubIssueNumber) {
            await closeIssue(task.githubIssueNumber);
        }

        await task.deleteOne();

        res.json({
            success: true,
            message: "Task deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};