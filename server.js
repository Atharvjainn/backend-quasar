const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "*", // allow all origins (safe for your use-case)
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

const {
  GITHUB_TOKEN,
  GITHUB_ORG,
  PORT = 3000
} = process.env;

if (!GITHUB_TOKEN || !GITHUB_ORG) {
  throw new Error("Missing GITHUB_TOKEN or GITHUB_ORG in .env");
}

/**
 * Expected request body:
 * {
 *   "repos": ["repo-one", "repo-two"]
 * }
 */

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});


app.post("/commit-count", async (req, res) => {
  const { repos } = req.body;

  if (!Array.isArray(repos) || repos.length === 0) {
    return res.status(400).json({ error: "repos must be a non-empty array" });
  }

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };

  const commitCounts = {};

  try {
    for (const repo of repos) {
      let page = 1;
      let totalCommits = 0;

      while (true) {
        const response = await axios.get(
          `https://api.github.com/repos/${GITHUB_ORG}/${repo}/commits`,
          {
            headers,
            params: { per_page: 100, page },
          }
        );

        if (response.data.length === 0) break;

        totalCommits += response.data.length;
        page++;
      }

      commitCounts[repo] = totalCommits;
    }

    res.json({
      organization: GITHUB_ORG,
      commitCounts,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch commits from GitHub",
    });
  }
});

app.listen(PORT, () => {
    console.log("Using token:", GITHUB_TOKEN?.slice(0, 6));

  console.log(`🚀 Server running on port ${PORT}`);
});
