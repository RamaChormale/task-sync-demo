const express = require("express");
const router = express.Router();

const { 
  createIssue,
  updateIssue,
  getIssue,
  closeIssue
} = require("../services/github.service");


router.get("/test", async (req, res) => {
  try {
    const issue = await createIssue(
      "My First Issue from Node.js",
      "This issue was created from my Task Sync Engine 🚀"
    );

    res.json({
      success: true,
      data: issue,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


router.get("/update-test", async (req, res) => {
  try {
    const data = await updateIssue(
      2,
      "Updated via Test Route",
      "Testing GitHub Update API",
      "open"
    );

    res.json(data);

  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(500).json(
      err.response?.data || { message: err.message }
    );
  }
});


router.get("/issues/:issueNumber", async (req, res) => {
  try {
    const { issueNumber } = req.params;

    const issue = await getIssue(issueNumber);

    res.status(200).json({
      success: true,
      data: issue
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
});


router.patch("/issues/:issueNumber/close", async (req, res) => {
  try {
    const { issueNumber } = req.params;

    const issue = await closeIssue(issueNumber);

    res.status(200).json({
      success: true,
      data: issue
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


module.exports = router;