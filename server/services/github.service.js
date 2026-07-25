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
    { title, body }
  );
  return response.data;
};

const updateIssue = async (issueNumber, title, description, status) => {
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
    { state: "closed" }
  );
  return response.data;
};

const getIssue = async (issueNumber) => {
  const response = await githubAPI.get(
    `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues/${issueNumber}`
  );
  return response.data;
};

/**
 * Fetch a single page of issues from GitHub.
 * Used by paginated sync — never fetches everything at once.
 *
 * @param {number} page     - Page number (1-based)
 * @param {number} perPage  - Items per page (max 100)
 * @returns {Array}         - Array of GitHub issue objects
 */
const fetchIssuesPage = async (page = 1, perPage = 100) => {
  const response = await githubAPI.get(
    `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues`,
    {
      params: {
        state: "all",
        per_page: perPage,
        page,
        sort: "updated",
        direction: "desc",
      },
    }
  );
  return response.data; // array of issues
};

module.exports = {
  createIssue,
  updateIssue,
  closeIssue,
  getIssue,
  fetchIssuesPage,
};
