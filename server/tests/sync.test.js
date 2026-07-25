/**
 * Task Sync Engine — Test Suite
 * Covers: duplicate webhook, conflict detection, optimistic locking,
 *         retry logic, pagination, and resume sync (checkpoint).
 *
 * Uses MongoMemoryServer so no real DB or GitHub token is needed.
 * GitHub API calls are mocked via jest.mock.
 */

require("./setup");

const request = require("supertest");
const app = require("../app");
const Task = require("../models/Task");
const WebhookEvent = require("../models/WebhookEvent");
const SyncActivity = require("../models/SyncActivity");
const SyncCheckpoint = require("../models/SyncCheckpoint");

// ─── Mock GitHub service so tests never hit the real API ─────────────────────
jest.mock("../services/github.service", () => ({
  createIssue: jest.fn().mockResolvedValue({ number: 42, node_id: "node_42" }),
  updateIssue: jest.fn().mockResolvedValue({}),
  closeIssue: jest.fn().mockResolvedValue({}),
  getIssue: jest.fn().mockResolvedValue({
    title: "GitHub Title",
    body: "GitHub body",
    state: "open",
    updated_at: new Date(Date.now() + 60_000).toISOString(), // GitHub is 1 min newer
  }),
  fetchIssuesPage: jest.fn(),
}));

const githubService = require("../services/github.service");

// ─── Helper: create a task directly in DB ────────────────────────────────────
const seedTask = (overrides = {}) =>
  Task.create({
    title: "Test Task",
    description: "desc",
    status: "open",
    syncStatus: "synced",
    githubIssueNumber: 42,
    lastSyncedAt: new Date(Date.now() - 120_000), // synced 2 min ago
    version: 1,
    ...overrides,
  });

// ═══════════════════════════════════════════════════════════════════════════════
// 1. DUPLICATE WEBHOOK
// ═══════════════════════════════════════════════════════════════════════════════
describe("Duplicate Webhook", () => {
  it("processes the first webhook and returns 200", async () => {
    const task = await seedTask();

    const res = await request(app)
      .post("/webhook/github")
      .set("x-github-delivery", "evt-001")
      .set("x-github-event", "issues")
      .send({ issue: { number: 42, title: "Updated", body: "body", state: "open" } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("ignores a duplicate webhook with the same delivery ID", async () => {
    await seedTask();

    const payload = {
      issue: { number: 42, title: "Updated", body: "body", state: "open" },
    };
    const headers = {
      "x-github-delivery": "evt-dup-001",
      "x-github-event": "issues",
    };

    // First delivery
    await request(app).post("/webhook/github").set(headers).send(payload);

    // Second delivery — same ID
    const res = await request(app).post("/webhook/github").set(headers).send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/duplicate/i);

    // Exactly one duplicate activity logged
    const dupes = await SyncActivity.find({ type: "duplicate" });
    expect(dupes).toHaveLength(1);
  });

  it("ignores non-issues events", async () => {
    const res = await request(app)
      .post("/webhook/github")
      .set("x-github-delivery", "evt-push-001")
      .set("x-github-event", "push")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/ignored/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CONFLICT DETECTION
// ═══════════════════════════════════════════════════════════════════════════════
describe("Conflict Detection", () => {
  it("marks task as conflict when both local and GitHub were modified after last sync", async () => {
    // getIssue mock returns updated_at = now+60s (GitHub is newer than lastSyncedAt)
    const task = await seedTask();

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .send({ title: "Local Change", version: 1 });

    expect(res.status).toBe(200);
    expect(res.body.conflict).toBe(true);

    const updated = await Task.findById(task._id);
    expect(updated.syncStatus).toBe("conflict");
    expect(updated.conflictVersions.local.title).toBe("Local Change");
    expect(updated.conflictVersions.github.title).toBe("GitHub Title");
  });

  it("resolves conflict by keeping local version", async () => {
    const task = await seedTask({
      syncStatus: "conflict",
      conflictVersions: {
        local: { title: "Local Title", description: "local desc", status: "open", updatedAt: new Date() },
        github: { title: "GitHub Title", description: "github desc", status: "open", updatedAt: new Date() },
      },
    });

    const res = await request(app)
      .post(`/api/tasks/${task._id}/resolve`)
      .send({ resolution: "local" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Local Title");
    expect(res.body.data.syncStatus).toBe("synced");
  });

  it("resolves conflict by keeping github version", async () => {
    const task = await seedTask({
      syncStatus: "conflict",
      conflictVersions: {
        local: { title: "Local Title", description: "local desc", status: "open", updatedAt: new Date() },
        github: { title: "GitHub Title", description: "github desc", status: "open", updatedAt: new Date() },
      },
    });

    const res = await request(app)
      .post(`/api/tasks/${task._id}/resolve`)
      .send({ resolution: "github" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("GitHub Title");
  });

  it("rejects resolve on a non-conflict task", async () => {
    const task = await seedTask({ syncStatus: "synced" });

    const res = await request(app)
      .post(`/api/tasks/${task._id}/resolve`)
      .send({ resolution: "local" });

    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. OPTIMISTIC LOCKING
// ═══════════════════════════════════════════════════════════════════════════════
describe("Optimistic Locking", () => {
  it("rejects an update when the client sends a stale version", async () => {
    // Make getIssue return something older than lastSyncedAt so no conflict triggers
    githubService.getIssue.mockResolvedValueOnce({
      title: "GH",
      body: "",
      state: "open",
      updated_at: new Date(Date.now() - 200_000).toISOString(), // older than lastSyncedAt
    });

    const task = await seedTask({ version: 5 });

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .send({ title: "Stale Update", version: 3 }); // wrong version

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/version conflict/i);
  });

  it("accepts an update when the client sends the correct version", async () => {
    githubService.getIssue.mockResolvedValueOnce({
      title: "GH",
      body: "",
      state: "open",
      updated_at: new Date(Date.now() - 200_000).toISOString(),
    });

    const task = await seedTask({ version: 2 });

    const res = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .send({ title: "Correct Update", version: 2 });

    expect(res.status).toBe(200);

    const updated = await Task.findById(task._id);
    expect(updated.version).toBe(3); // incremented
  });

  it("increments version on every successful update", async () => {
    githubService.getIssue.mockResolvedValue({
      title: "GH",
      body: "",
      state: "open",
      updated_at: new Date(Date.now() - 200_000).toISOString(),
    });

    const task = await seedTask({ version: 1 });

    await request(app).patch(`/api/tasks/${task._id}`).send({ title: "v2", version: 1 });
    await request(app).patch(`/api/tasks/${task._id}`).send({ title: "v3", version: 2 });

    const updated = await Task.findById(task._id);
    expect(updated.version).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. RETRY LOGIC
// ═══════════════════════════════════════════════════════════════════════════════
describe("Retry Logic", () => {
  it("retries on 503 and succeeds on the third attempt", async () => {
    const { default: retry } = await import("../utils/retry.js").catch(() => ({
      default: require("../utils/retry"),
    }));

    let attempts = 0;
    const fn = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        const err = new Error("Service Unavailable");
        err.response = { status: 503 };
        throw err;
      }
      return Promise.resolve("ok");
    });

    const result = await retry(fn, { baseDelay: 10 }); // tiny delay for tests
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 404 (non-retryable)", async () => {
    const retry = require("../utils/retry");

    const fn = jest.fn().mockImplementation(() => {
      const err = new Error("Not Found");
      err.response = { status: 404 };
      throw err;
    });

    await expect(retry(fn, { baseDelay: 10 })).rejects.toThrow("Not Found");
    expect(fn).toHaveBeenCalledTimes(1); // no retries
  });

  it("throws after exhausting all retries", async () => {
    const retry = require("../utils/retry");

    const fn = jest.fn().mockImplementation(() => {
      const err = new Error("Gateway Timeout");
      err.response = { status: 504 };
      throw err;
    });

    await expect(retry(fn, { maxRetries: 3, baseDelay: 10 })).rejects.toThrow("Gateway Timeout");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("logs a retry activity when GitHub sync fails transiently", async () => {
    // First call to createIssue fails with 503, second succeeds
    githubService.createIssue
      .mockRejectedValueOnce(Object.assign(new Error("503"), { response: { status: 503, headers: {} } }))
      .mockResolvedValueOnce({ number: 99, node_id: "node_99" });

    const res = await request(app)
      .post("/api/tasks")
      .send({ title: "Retry Task", description: "test", status: "open" });

    expect(res.status).toBe(201);

    const retryActivities = await SyncActivity.find({ type: "retry" });
    expect(retryActivities.length).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PAGINATION
// ═══════════════════════════════════════════════════════════════════════════════
describe("Pagination — Full Sync", () => {
  it("fetches multiple pages and stops when a page returns fewer than 100 items", async () => {
    // Seed a task that matches an issue number
    await seedTask({ githubIssueNumber: 1, lastSyncedAt: new Date(Date.now() - 300_000) });

    // Page 1: 100 issues (full page), page 2: 1 issue (last page)
    const makePage = (count, startNum = 1) =>
      Array.from({ length: count }, (_, i) => ({
        number: startNum + i,
        title: `Issue ${startNum + i}`,
        body: "body",
        state: "open",
        updated_at: new Date().toISOString(),
        pull_request: undefined,
      }));

    githubService.fetchIssuesPage
      .mockResolvedValueOnce(makePage(100, 1))  // page 1 — full
      .mockResolvedValueOnce(makePage(1, 101)); // page 2 — last

    const res = await request(app).post("/api/sync/run");

    expect(res.status).toBe(200);
    // fetchIssuesPage called exactly twice (stopped after partial page)
    expect(githubService.fetchIssuesPage).toHaveBeenCalledTimes(2);
    expect(githubService.fetchIssuesPage).toHaveBeenNthCalledWith(1, 1, 100);
    expect(githubService.fetchIssuesPage).toHaveBeenNthCalledWith(2, 2, 100);
  });

  it("skips pull requests during sync", async () => {
    await seedTask({ githubIssueNumber: 10 });

    githubService.fetchIssuesPage.mockResolvedValueOnce([
      { number: 10, title: "PR", body: "", state: "open", updated_at: new Date().toISOString(), pull_request: {} },
    ]);

    const res = await request(app).post("/api/sync/run");
    expect(res.status).toBe(200);
    // Task should NOT be updated since the issue was a PR
    const task = await Task.findOne({ githubIssueNumber: 10 });
    expect(task.title).toBe("Test Task"); // unchanged
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. RESUME SYNC (CHECKPOINT)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Resume Sync — Checkpoint", () => {
  it("resumes from the saved checkpoint page instead of page 1", async () => {
    // Simulate a previous sync that crashed on page 3
    await SyncCheckpoint.create({ provider: "github", lastPage: 3, lastSyncedAt: new Date() });

    githubService.fetchIssuesPage.mockResolvedValueOnce([]); // page 3 returns empty → done

    const res = await request(app).post("/api/sync/run");
    expect(res.status).toBe(200);

    // Must start from page 3, not page 1
    expect(githubService.fetchIssuesPage).toHaveBeenCalledWith(3, 100);
  });

  it("resets checkpoint to page 1 after a successful full sync", async () => {
    await SyncCheckpoint.create({ provider: "github", lastPage: 2 });

    githubService.fetchIssuesPage.mockResolvedValueOnce([]); // empty → done immediately

    await request(app).post("/api/sync/run");

    const checkpoint = await SyncCheckpoint.findOne({ provider: "github" });
    expect(checkpoint.lastPage).toBe(1);
  });

  it("creates a checkpoint on first sync if none exists", async () => {
    githubService.fetchIssuesPage.mockResolvedValueOnce([]);

    await request(app).post("/api/sync/run");

    const checkpoint = await SyncCheckpoint.findOne({ provider: "github" });
    expect(checkpoint).not.toBeNull();
    expect(checkpoint.provider).toBe("github");
  });

  it("saves checkpoint after each page so a crash can be resumed", async () => {
    await seedTask({ githubIssueNumber: 1 });

    const fullPage = Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      title: `Issue ${i + 1}`,
      body: "",
      state: "open",
      updated_at: new Date().toISOString(),
    }));

    githubService.fetchIssuesPage
      .mockResolvedValueOnce(fullPage) // page 1 — full
      .mockResolvedValueOnce([]);      // page 2 — empty → done

    await request(app).post("/api/sync/run");

    // After success, checkpoint resets to 1
    const checkpoint = await SyncCheckpoint.findOne({ provider: "github" });
    expect(checkpoint.lastPage).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SYNC METRICS + ACTIVITY ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════
describe("Sync Metrics & Activity API", () => {
  it("GET /api/sync/metrics returns correct counts", async () => {
    await Task.create([
      { title: "T1", syncStatus: "synced", version: 1 },
      { title: "T2", syncStatus: "synced", version: 1 },
      { title: "T3", syncStatus: "pending", version: 1 },
      { title: "T4", syncStatus: "conflict", version: 1 },
      { title: "T5", syncStatus: "error", version: 1 },
    ]);
    await WebhookEvent.create({ eventId: "dup-1", eventType: "issues", status: "duplicate" });

    const res = await request(app).get("/api/sync/metrics");

    expect(res.status).toBe(200);
    expect(res.body.metrics.totalTasks).toBe(5);
    expect(res.body.metrics.synced).toBe(2);
    expect(res.body.metrics.pending).toBe(1);
    expect(res.body.metrics.conflict).toBe(1);
    expect(res.body.metrics.errors).toBe(1);
    expect(res.body.metrics.duplicateEvents).toBe(1);
  });

  it("GET /api/sync/activity returns latest 20 activities", async () => {
    // Insert 25 activities
    const docs = Array.from({ length: 25 }, (_, i) => ({
      type: "synced",
      message: `Activity ${i}`,
    }));
    await SyncActivity.insertMany(docs);

    const res = await request(app).get("/api/sync/activity");

    expect(res.status).toBe(200);
    expect(res.body.activities).toHaveLength(20);
  });
});
