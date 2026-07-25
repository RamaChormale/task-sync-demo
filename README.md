# Task Sync Engine 🚀

A full-stack, production-ready task management system with **bidirectional sync between MongoDB and GitHub Issues**.

> **Live repo:** [github.com/RamaChormale/task-sync-demo](https://github.com/RamaChormale/task-sync-demo)

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Folder Structure](#folder-structure)
4. [Data Models](#data-models)
5. [API Reference](#api-reference)
6. [Data Flow](#data-flow)
7. [Feature Deep-Dives](#feature-deep-dives)
   - [Conflict Resolution](#conflict-resolution)
   - [Optimistic Locking](#optimistic-locking)
   - [Retry + Exponential Backoff](#retry--exponential-backoff)
   - [Resumable Sync + Pagination](#resumable-sync--pagination)
   - [Idempotent Webhooks](#idempotent-webhooks)
   - [Sync Metrics & Activity](#sync-metrics--activity)
8. [Frontend Components](#frontend-components)
9. [How Sync Correctness is Ensured](#how-sync-correctness-is-ensured)
10. [Running the Project](#running-the-project)
11. [Running Tests](#running-tests)
12. [Environment Variables](#environment-variables)
13. [Known Limitations](#known-limitations)
14. [Future Improvements](#future-improvements)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS v4, Vite |
| Backend | Node.js, Express.js 5 |
| Database | MongoDB + Mongoose 9 |
| External API | GitHub Issues REST API v3 |
| HTTP Client | Axios (server), fetch (client) |
| Testing | Jest + Supertest + MongoMemoryServer |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│                                                             │
│  Dashboard                                                  │
│    ├── SyncMetrics      (6 metric cards, auto-refresh 10s)  │
│    ├── SyncActivity     (latest 20 events, auto-refresh)    │
│    ├── TaskCard (grid)  (inline ConflictResolver)           │
│    └── TaskTable        (table view, conflict column)       │
│                                                             │
│  Hooks                                                      │
│    ├── useTasks         (CRUD + optimistic lock + conflict) │
│    ├── useSyncActivity  (metrics + activity, 10s interval)  │
│    └── useToast         (toast notifications)               │
│                                                             │
│  Services                                                   │
│    └── taskService      (fetch wrapper for all task APIs)   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP  (Vite proxy → localhost:5000)
┌────────────────────────▼────────────────────────────────────┐
│                    SERVER (Express.js)                       │
│                                                             │
│  app.js          ← Express app (imported by tests too)      │
│  server.js       ← connectDB() + app.listen()               │
│                                                             │
│  /api/tasks      → task.controller.js                       │
│    POST   /               create task + GitHub issue        │
│    GET    /               list all tasks                    │
│    GET    /:id            get single task                   │
│    PATCH  /:id            update + conflict check           │
│    DELETE /:id            delete + close GitHub issue       │
│    POST   /:id/resolve    resolve conflict (local|github)   │
│                                                             │
│  /api/sync       → sync.controller.js                       │
│    GET    /metrics        aggregate counts                  │
│    GET    /activity       latest 20 sync events + metrics   │
│    POST   /run            paginated + resumable full sync   │
│                                                             │
│  /webhook/github → webhook.controller.js                    │
│    POST   /               idempotent GitHub webhook         │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
┌──────────▼──────────┐   ┌──────────▼──────────────────────┐
│   MongoDB (Mongoose) │   │       GitHub Issues API          │
│                      │   │                                  │
│  tasks               │   │  POST   /repos/:o/:r/issues      │
│  webhookevents       │   │  PATCH  /repos/:o/:r/issues/:n   │
│  syncactivities      │   │  GET    /repos/:o/:r/issues/:n   │
│  synccheckpoints     │   │  GET    /repos/:o/:r/issues      │
└──────────────────────┘   └─────────────────────────────────┘
```

---

## Folder Structure

```
task-sync-engine/
├── client/                        # React frontend
│   └── src/
│       ├── components/
│       │   ├── common/
│       │   │   ├── Badge.jsx
│       │   │   ├── Button.jsx
│       │   │   ├── Card.jsx
│       │   │   ├── EmptyState.jsx
│       │   │   ├── Loader.jsx
│       │   │   ├── MetricCard.jsx
│       │   │   ├── Modal.jsx
│       │   │   └── Toast.jsx
│       │   └── tasks/
│       │       ├── ConflictResolver.jsx   ← side-by-side conflict UI
│       │       ├── GithubIssueModal.jsx   ← GitHub issue preview modal
│       │       ├── SyncActivity.jsx       ← recent events list
│       │       ├── SyncMetrics.jsx        ← 6 metric cards
│       │       ├── TaskCard.jsx           ← grid card
│       │       ├── TaskForm.jsx           ← create/edit form
│       │       ├── TaskStatus.jsx         ← sync status dot+label
│       │       └── TaskTable.jsx          ← table view
│       ├── hooks/
│       │   ├── useSyncActivity.js         ← auto-refresh every 10s
│       │   ├── useTasks.js                ← CRUD + locking + conflict
│       │   └── useToast.js
│       ├── pages/
│       │   └── Dashboard.jsx
│       └── services/
│           └── taskService.js             ← fetch wrapper
│
└── server/                        # Express backend
    ├── app.js                     ← Express app (no listen)
    ├── server.js                  ← entry point (listen)
    ├── config/
    │   └── db.js
    ├── controllers/
    │   ├── task.controller.js
    │   ├── sync.controller.js
    │   └── webhook.controller.js
    ├── middleware/
    │   └── githubWebhook.middleware.js    ← HMAC-SHA256 verification
    ├── models/
    │   ├── Task.js
    │   ├── SyncActivity.js
    │   ├── SyncCheckpoint.js
    │   └── WebhookEvent.js
    ├── routes/
    │   ├── task.routes.js
    │   ├── sync.routes.js
    │   ├── webhook.routes.js
    │   └── github.routes.js
    ├── services/
    │   └── github.service.js              ← all GitHub API calls
    ├── utils/
    │   └── retry.js                       ← exponential backoff
    └── tests/
        ├── setup.js                       ← MongoMemoryServer lifecycle
        └── sync.test.js                   ← 22 tests
```

---

## Data Models

### Task

```js
{
  title:             String,   // required
  description:       String,
  status:            "open" | "in_progress" | "completed",
  syncStatus:        "pending" | "synced" | "conflict" | "error",
  githubIssueNumber: Number,
  githubIssueId:     String,
  version:           Number,   // optimistic locking counter (starts at 1)
  lastSyncedAt:      Date,
  conflictVersions: {
    local:  { title, description, status, updatedAt },
    github: { title, description, status, updatedAt }
  },
  createdAt:         Date,     // auto (timestamps: true)
  updatedAt:         Date      // auto (timestamps: true)
}
```

### SyncActivity

```js
{
  type:      "synced" | "duplicate" | "conflict" | "error" | "retry" | "rate_limited",
  message:   String,
  taskId:    ObjectId (ref: Task),
  createdAt: Date
}
```

### SyncCheckpoint

```js
{
  provider:     "github",   // unique per provider
  lastPage:     Number,     // resumes from here on crash
  lastCursor:   String,
  lastSyncedAt: Date,
  totalSynced:  Number
}
```

### WebhookEvent

```js
{
  eventId:     String,   // x-github-delivery header (unique index)
  eventType:   String,   // x-github-event header
  payload:     Mixed,
  status:      "processing" | "completed" | "failed" | "duplicate",
  processedAt: Date
}
```

---

## API Reference

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tasks` | Create task + GitHub issue |
| `GET` | `/api/tasks` | List all tasks |
| `GET` | `/api/tasks/:id` | Get single task |
| `PATCH` | `/api/tasks/:id` | Update task (optimistic lock + conflict check) |
| `DELETE` | `/api/tasks/:id` | Delete task + close GitHub issue |
| `POST` | `/api/tasks/:id/resolve` | Resolve conflict `{ resolution: "local"\|"github" }` |

### Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sync/metrics` | `{ totalTasks, synced, pending, conflict, errors, duplicateEvents }` |
| `GET` | `/api/sync/activity` | Latest 20 sync events + metrics combined |
| `POST` | `/api/sync/run` | Trigger paginated + resumable full sync |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhook/github` | Receive GitHub issue events (idempotent) |

---

## Data Flow

### Local → GitHub (write path)

```
User submits form
  → useTasks.createTask / updateTask
    → taskService.create / update  (sends version for locking)
      → POST/PATCH /api/tasks
        → task.controller.js
          → save to MongoDB
          → retry(() => github.service.createIssue / updateIssue)
            → on success: syncStatus="synced", lastSyncedAt=now, version++
            → on retry:   SyncActivity { type:"retry" }
            → on failure: syncStatus="error", SyncActivity { type:"error" }
```

### GitHub → Local (webhook path)

```
GitHub sends POST /webhook/github
  → webhook.controller.js
    → check x-github-delivery in WebhookEvent (unique index)
      → duplicate (code 11000): SyncActivity { type:"duplicate" }, return 200
      → new event:
          → find task by githubIssueNumber
          → update title, description, status, syncStatus="synced"
          → WebhookEvent.status = "completed"
          → SyncActivity { type:"synced" }
```

### Full Sync (manual / scheduled)

```
POST /api/sync/run
  → load SyncCheckpoint { provider:"github" }  (create if missing)
  → page = checkpoint.lastPage
  → loop:
      retry(() => fetchIssuesPage(page, 100))
        → skip pull_request items
        → for each issue: find task by githubIssueNumber
            → Last-Write-Wins: if githubUpdatedAt > task.updatedAt → apply GitHub version
        → checkpoint.lastPage = page  (saved after every page)
        → if issues.length < 100 → stop
        → else page++
  → checkpoint.lastPage = 1  (reset after full success)
  → SyncActivity { type:"synced", message:"Full sync completed — N tasks updated" }
```

---

## Feature Deep-Dives

### Conflict Resolution

A conflict is declared during `PATCH /api/tasks/:id` when **both** conditions are true:

| Condition | Check |
|-----------|-------|
| GitHub was updated after our last sync | `githubIssue.updated_at > task.lastSyncedAt` |
| The local request also carries changes | title / description / status differs from DB |

**What happens:**

1. `task.syncStatus = "conflict"`
2. Both versions saved in `task.conflictVersions.local` and `task.conflictVersions.github`
3. API returns `{ conflict: true, data: task }` with HTTP 200
4. Frontend (`useTasks`) detects `res.conflict === true`, updates task in state, fires `onConflict` toast
5. `TaskCard` renders `<ConflictResolver>` inline — side-by-side diff with timestamps
6. `TaskTable` shows a **Conflict** column with Keep Local / Keep GitHub buttons
7. User clicks → `POST /api/tasks/:id/resolve` with `{ resolution: "local" | "github" }`
8. Server applies chosen version to MongoDB + syncs to GitHub, clears `conflictVersions`

**Last-Write-Wins (full sync):** During `POST /api/sync/run`, if only one side changed, the newer `updatedAt` wins automatically — no user intervention needed.

---

### Optimistic Locking

Every `Task` document has a `version: Number` field (starts at 1).

| Step | Detail |
|------|--------|
| Client reads a task | Receives `{ ..., version: N }` |
| `useTasks.updateTask` | Reads `current.version` from local state, sends `{ ...data, version: N }` |
| Server checks | `if (req.body.version !== task.version)` → HTTP 409 |
| Server applies | `task.version += 1` before every `task.save()` |
| Client on 409 | Returns `{ versionConflict: true }` → Dashboard shows "please refresh" message |

This prevents two concurrent browser tabs (or API clients) from silently overwriting each other.

---

### Retry + Exponential Backoff

All GitHub API calls go through `utils/retry.js`.

```
retry(fn, { maxRetries: 5, baseDelay: 1000, onRetry })
```

| Attempt | Wait |
|---------|------|
| 1 | 1 s |
| 2 | 2 s |
| 3 | 4 s |
| 4 | 8 s |
| 5 | 16 s (then throws) |

**Retryable statuses:** `429, 500, 502, 503, 504`  
**Non-retryable:** all others (404, 422, etc.) — thrown immediately, no retry  
**Retry-After header:** if GitHub returns `429` with `Retry-After: 30`, the exact 30 s is used instead of the formula

Each retry attempt writes a `SyncActivity { type: "retry" }` record so the dashboard shows live retry progress.

---

### Resumable Sync + Pagination

GitHub Issues are fetched one page at a time — never all at once.

```
GET /repos/RamaChormale/task-sync-demo/issues
    ?state=all&per_page=100&page=N&sort=updated&direction=desc
```

- Page size is fixed at 100 (GitHub maximum)
- If response length < 100 → last page, loop stops
- Pull requests are skipped: `if (issue.pull_request) continue`
- Supports repos with 10 000+ issues without memory pressure

**Checkpoint recovery:**

```json
{ "provider": "github", "lastPage": 7, "lastSyncedAt": "...", "totalSynced": 642 }
```

- Checkpoint is **written after every page** completes
- If the process crashes on page 7, the next `POST /api/sync/run` reads `lastPage: 7` and resumes there
- After a full successful sync, `lastPage` resets to 1

---

### Idempotent Webhooks

Every GitHub webhook delivery has a unique `x-github-delivery` header. This ID is stored in `WebhookEvent` with a **unique index** on `eventId`.

```
First delivery  → inserted → processed normally
Duplicate       → unique index throws code 11000
                → caught → SyncActivity { type:"duplicate" }
                → WebhookEvent.status = "duplicate"
                → return 200 (GitHub won't retry)
```

Guarantees exactly-once processing even if GitHub retries a delivery multiple times.

---

### Sync Metrics & Activity

**`GET /api/sync/metrics`** — single aggregation query:

```json
{
  "totalTasks": 12,
  "synced": 9,
  "pending": 1,
  "conflict": 1,
  "errors": 1,
  "duplicateEvents": 3
}
```

**`GET /api/sync/activity`** — returns metrics + latest 20 `SyncActivity` records in one call.  
The frontend `useSyncActivity` hook polls this endpoint every **10 seconds** using `setInterval`.

Activity types and their dashboard icons:

| Type | Icon | Meaning |
|------|------|---------|
| `synced` | ✅ | Task successfully synced to GitHub |
| `duplicate` | 🔁 | Duplicate webhook ignored |
| `conflict` | ⚠️ | Conflict detected, needs resolution |
| `error` | ❌ | Sync failed |
| `retry` | 🔄 | Retry attempt in progress |

---

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `Dashboard.jsx` | Root page — wires all hooks and modals together |
| `SyncMetrics.jsx` | 6 metric cards (Total, Synced, Pending, Conflict, Errors, Duplicates) |
| `SyncActivity.jsx` | Scrollable list of latest 20 sync events with icons |
| `TaskCard.jsx` | Grid card — includes inline `ConflictResolver` and "View Issue" modal trigger |
| `TaskTable.jsx` | Table view — adds Conflict column when any task is in conflict |
| `ConflictResolver.jsx` | Side-by-side diff of local vs GitHub versions with Keep Local / Keep GitHub buttons |
| `GithubIssueModal.jsx` | GitHub-style issue preview modal — opens on "View Issue" click |
| `TaskForm.jsx` | Create / edit form with validation |
| `TaskStatus.jsx` | Coloured dot + label for sync status |
| `MetricCard.jsx` | Reusable metric card with icon, label, animated value |
| `Modal.jsx` | Accessible modal (Escape key, backdrop click to close) |
| `Toast.jsx` | Auto-dismissing toast notifications (info / success / error) |
| `Button.jsx` | Variants: primary, secondary, danger, ghost — with loading spinner |
| `Badge.jsx` | Status pill (open / in_progress / completed) |

---

## How Sync Correctness is Ensured

| Concern | Mechanism |
|---------|-----------|
| Duplicate webhooks | `eventId` unique index → code 11000 caught → 200 returned |
| Concurrent local updates | `version` field → HTTP 409 on mismatch |
| Concurrent local + GitHub edits | Conflict detection → manual resolution UI |
| Transient GitHub failures | Exponential backoff retry (up to 5 attempts) |
| GitHub rate limits | `Retry-After` header respected |
| Partial sync crash | Checkpoint written per page → resume on restart |
| Stale full-sync data | Last-Write-Wins on `updatedAt` timestamp |
| Sync visibility | `SyncActivity` log + dashboard metrics + 10s auto-refresh |

---

## Running the Project

```bash
# 1. Clone
git clone https://github.com/RamaChormale/task-sync-demo.git
cd task-sync-demo

# 2. Install server dependencies
cd server && npm install

# 3. Install client dependencies
cd ../client && npm install

# 4. Configure environment (see Environment Variables section)

# 5. Start server  →  http://localhost:5000
cd server && npm run dev

# 6. Start client  →  http://localhost:5173
cd ../client && npm run dev
```

The Vite dev server proxies `/api` and `/webhook` to `localhost:5000` automatically — no CORS issues.

---

## Running Tests

```bash
cd server && npm test
```

**22 tests across 7 suites — all pass with no real DB or GitHub token needed:**

```
Duplicate Webhook         (3 tests)
  ✓ processes the first webhook and returns 200
  ✓ ignores a duplicate webhook with the same delivery ID
  ✓ ignores non-issues events

Conflict Detection        (4 tests)
  ✓ marks task as conflict when both local and GitHub were modified
  ✓ resolves conflict by keeping local version
  ✓ resolves conflict by keeping github version
  ✓ rejects resolve on a non-conflict task

Optimistic Locking        (3 tests)
  ✓ rejects an update when the client sends a stale version
  ✓ accepts an update when the client sends the correct version
  ✓ increments version on every successful update

Retry Logic               (4 tests)
  ✓ retries on 503 and succeeds on the third attempt
  ✓ does not retry on 404 (non-retryable)
  ✓ throws after exhausting all retries
  ✓ logs a retry activity when GitHub sync fails transiently

Pagination — Full Sync    (2 tests)
  ✓ fetches multiple pages and stops when a page returns fewer than 100 items
  ✓ skips pull requests during sync

Resume Sync — Checkpoint  (4 tests)
  ✓ resumes from the saved checkpoint page instead of page 1
  ✓ resets checkpoint to page 1 after a successful full sync
  ✓ creates a checkpoint on first sync if none exists
  ✓ saves checkpoint after each page so a crash can be resumed

Sync Metrics & Activity   (2 tests)
  ✓ GET /api/sync/metrics returns correct counts
  ✓ GET /api/sync/activity returns latest 20 activities
```

Tests use `MongoMemoryServer` — no real MongoDB connection required. All GitHub API calls are mocked with `jest.mock`.

---

## Environment Variables

### `server/.env`

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/task_sync_db
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=RamaChormale
GITHUB_REPO=task-sync-demo
GITHUB_WEBHOOK_SECRET=your-webhook-secret
```

### `client/.env`

```env
VITE_GITHUB_OWNER=RamaChormale
VITE_GITHUB_REPO=task-sync-demo
```

> These two variables are used to build GitHub issue URLs in the frontend (e.g. the "Open on GitHub" button in `GithubIssueModal`).

---

## Known Limitations

- **No real-time push** — dashboard polls every 10 seconds. A WebSocket or SSE channel would give true real-time updates.
- **Single provider** — checkpoint and sync logic is GitHub-only. Adding GitLab or Jira requires provider-specific adapters.
- **No distributed lock** — if multiple server instances run `POST /api/sync/run` simultaneously they may process the same pages. A Redis `SET NX` lock would prevent this.
- **Conflict detection requires a valid GitHub token** — if `GITHUB_TOKEN` is missing or rate-limited, conflict detection is skipped and the local change is applied directly.
- **Webhook signature not enforced in production** — `verifyGithubWebhook` middleware exists in `middleware/githubWebhook.middleware.js` but is not applied in `webhook.routes.js`. Add it before going live.

---

## Future Improvements

- **Enable webhook signature verification** — add `verifyGithubWebhook` to `webhook.routes.js` for production security.
- **WebSocket / SSE** — push sync events to the dashboard in real time instead of polling.
- **Distributed lock on sync run** — use Redis `SET NX` to prevent concurrent full syncs across multiple server instances.
- **Multi-provider support** — abstract `github.service.js` behind a provider interface to support GitLab, Linear, or Jira.
- **Per-field conflict merging** — allow keeping local title but GitHub status instead of all-or-nothing resolution.
- **Sync scheduling** — run `POST /api/sync/run` on a cron schedule (e.g. every 15 minutes) using `node-cron`.
- **Audit log** — extend `SyncActivity` with `userId` and `ip` for compliance tracing.
- **Frontend pagination** — task list currently loads all tasks; add cursor-based pagination for large datasets.
