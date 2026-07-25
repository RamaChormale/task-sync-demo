const axios = require("axios");

const githubAPI = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  },
});


const createIssue = async (title, body) => {
  const response = await githubAPI.post(
    `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues`,
    {
      title,
      body,
    }
  );

  return response.data;
};


const updateIssue = async (
  issueNumber,
  title,
  description,
  status
) => {
  const response = await githubAPI.patch(
    `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues/${issueNumber}`,
    {
      title,
      body: description,
      state: status === "completed" ? "closed" : "open",
    }
  );

  return response.data;
};


const closeIssue = async (issueNumber) => {
  const response = await githubAPI.patch(
    `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues/${issueNumber}`,
    {
      state: "closed",
    }
  );

  return response.data;
};


const getIssue = async (issueNumber) => {
  const response = await githubAPI.get(
    `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues/${issueNumber}`
  );

  return response.data;
};


module.exports = {
  createIssue,
  updateIssue,
  closeIssue,
  getIssue
};