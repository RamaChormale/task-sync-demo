const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true
  },

  description: String,

  status: {
    type: String,
    default: "open"
  },

  githubIssueNumber: {
    type: Number
  },

  githubIssueUrl: {
    type: String
  }

},
{
  timestamps:true
});


module.exports = mongoose.model(
  "Task",
  taskSchema
);