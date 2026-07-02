# GitHub Profile Analyzer API

A Node.js backend service that fetches public user profiles from the GitHub API, computes metrics (stars, forks, primary language, top repository), and stores them in a local SQLite database.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```ini
PORT=3000
DB_PATH=./database.sqlite
GITHUB_TOKEN=
```
*(No database setup is required. SQLite will auto-create the database file `database.sqlite` on startup).*

### 3. Start the Server
```bash
npm run dev
```
The server will start at: `http://localhost:3000`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/profiles/:username` | Analyzes a GitHub profile and saves/updates it in the DB. |
| **GET** | `/api/profiles` | Lists all analyzed profiles in the DB (supports sorting, pagination, and search). |
| **GET** | `/api/profiles/:username` | Fetches a single analyzed profile from the DB. |
| **DELETE** | `/api/profiles/:username` | Deletes a profile from the DB. |

*Query parameters for `GET /api/profiles`:*
* `search`: Search username/name
* `sortBy`: Sort by field (e.g. `followers`, `total_stars`, `created_at`)
* `order`: `ASC` or `DESC`
* `limit`/`offset`: Pagination controls


