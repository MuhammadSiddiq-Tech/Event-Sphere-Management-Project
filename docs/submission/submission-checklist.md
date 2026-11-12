# EventSphere Management — Submission Package & Checklist

> **eProject Phase 10 — Task T-10.8**  
> **Project Name:** EventSphere Management  
> **Target Evaluation:** Aptech eProject Evaluation Committee  
> **Repository:** [https://github.com/MuhammadSiddiq-Tech/Event-Sphere-Management-Project](https://github.com/MuhammadSiddiq-Tech/Event-Sphere-Management-Project)  
> **Release Version:** `v1.0.0`

---

## 1. Source Code Location & Packaging Rules

### 1.1 Source Code Directory
- **Root Directory:** `E:\Event Sphere Management Project`
- **Monorepo Layout:**
  - `/client` — React 18 + Vite + Bootstrap 5.3 + Sass frontend application
  - `/server` — Plain Node.js 20 native `http` server (custom in-house core, zero Express) + Socket.IO + Mongoose
  - `/docs` — Comprehensive architecture, developer guides, user guides, API specs, and demo scripts
  - Root configuration files (`package.json`, `docker-compose.yml`, documentation markdown files)

### 1.2 Include vs. Exclude Manifest
To ensure clean, lightweight, and secure project submission, follow the strict inclusion and exclusion rules:

| Category | Include in Submission | Exclude from Submission |
| :--- | :--- | :--- |
| **Dependencies** | `package.json`, `package-lock.json` in root, client, and server | `node_modules/` (in root, `/client`, and `/server`) |
| **Environment & Secrets** | `.env.example` in root, `/client`, and `/server` | `.env`, `.env.local`, `.env.production` (live secrets) |
| **Build Artifacts** | Clean source files, build scripts | `/client/dist/`, `/build/`, `/coverage/`, `.cache/` |
| **System & IDE** | Repository git history (`.git` optional for zip or clone directly from GitHub) | `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`, `npm-debug.log*` |
| **Databases & Logs** | Database seed scripts (`server/seed/`), data fixtures | Local MongoDB runtime database files, MailHog runtime storage, `logs/` |

---

## 2. Archive Generation (Zip Commands)

Use one of the following commands to create the clean submission archive excluding `node_modules` and `.env` files.

### 2.1 PowerShell (Windows)
Run from the parent directory of the project:
```powershell
# Navigate to the workspace directory
cd "E:\Event Sphere Management Project"

# Create a clean zip archive excluding node_modules, build outputs, and .env files
$exclude = @("*node_modules*", "*.env", "*.env.local", "*client\dist*", "*coverage*", "*.git*")
Get-ChildItem -Path . -Recurse | Where-Object {
    $item = $_
    $match = $false
    foreach ($pattern in $exclude) {
        if ($item.FullName -like $pattern) { $match = $true; break }
    }
    -not $match
} | Compress-Archive -DestinationPath "..\EventSphere-Management-v1.0.0-Submission.zip" -Force
```

### 2.2 Git Archive (Recommended & Cleanest)
If packaging directly from the verified Git repository:
```bash
# Exports committed source code directly into a clean zip
git archive --format=zip --output="../EventSphere-Management-v1.0.0-SourceCode.zip" HEAD
```

### 2.3 Cross-Platform Bash (Linux / macOS / Git Bash)
```bash
zip -r ../EventSphere-Management-v1.0.0-Submission.zip . \
  -x "**/node_modules/*" \
  -x "**/.env" \
  -x "**/.env.*" \
  -x "**/dist/*" \
  -x "**/coverage/*" \
  -x "**/.git/*" \
  -x "**/.DS_Store"
```

---

## 3. Deliverables Checklist (D1 – D6)

| # | Deliverable | Description | Verification Status | Artifact Reference |
| :---: | :--- | :--- | :---: | :--- |
| **D1** | **Working Application** | Fully functional 3-role platform (Admin/Organizer, Exhibitor, Attendee) with native Node.js backend, React frontend, and Socket.IO. | ✅ **Verified** | Local API `http://localhost:5000`<br>Client `http://localhost:5173` |
| **D2** | **Complete Source Code** | Modular, well-architected codebase conforming to ESLint, clean code conventions, and zero Express dependencies. | ✅ **Verified** | Monorepo root `/client` & `/server`<br>GitHub Repository: [Event-Sphere-Management-Project](https://github.com/MuhammadSiddiq-Tech/Event-Sphere-Management-Project) |
| **D3** | **Full Documentation** | Comprehensive documentation covering Architecture, PRD, Design System, Engineering Rules, Tasks, Memory, User Guides, and Developer Guide. | ✅ **Verified** | `/docs/user-guide/admin-guide.md`<br>`/docs/user-guide/exhibitor-guide.md`<br>`/docs/user-guide/attendee-guide.md`<br>`/docs/developer-guide/README.md`<br>`architecture.md`, `design.md`, `prd.md` |
| **D4** | **Demo Video** | 8:30 comprehensive walkthrough video covering all 3 user journeys and real-time updates. | 🔄 **Script Ready** | Script: `docs/demo/video-script.md`<br>Video Link: `[PLACEHOLDER: Insert YouTube/Google Drive Link Here]` |
| **D5** | **Test Reports** | 100% test pass rate across all suites: 510 Jest backend tests + 134 Vitest frontend tests (644/644 total). | ✅ **Verified** | Jest test suites: 100% pass<br>Vitest test suites: 100% pass |
| **D6** | **Submission Package** | Clean packaging with submission checklist, setup instructions, seed credentials, and evaluation guide. | ✅ **Verified** | `docs/submission/submission-checklist.md`<br>`README.md` (Quick Start & Credentials) |

---

## 4. Evaluation Credentials & Quick Access

For the evaluation committee, the database can be initialized with one command (`npm run seed`), providing pre-configured test personas:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin / Organizer** | `admin@eventsphere.test` | `Admin@1234` | Full platform control, expo creation, floor plan editor, exhibitor approval, analytics. |
| **Exhibitor** | `exhibitor@eventsphere.test` | `Exhibitor@1234` | Company profile, expo participation, booth reservation, organizer & neighbor messaging. |
| **Attendee** | `attendee@eventsphere.test` | `Attendee@1234` | Expo registration, digital pass, multi-track agenda bookmarks, session feedback. |

**Live Deployment URL:**  
`[PLACEHOLDER: Insert Live Deployed URL (e.g. Render / Netlify / Vercel) if hosted]`

---

## 5. Final Pre-Submission Verification Checklist

Perform these final checks before submitting the package to the eProject portal:

- [x] **No hardcoded secrets:** Verify no `.env` files, JWT secrets, or live database credentials are included in the archive.
- [x] **Fresh Install Test:** Cloned/unzipped archive in an isolated folder, executed `npm install`, and confirmed clean resolution.
- [x] **Database Seed Idempotency:** Verified `npm run seed` runs without errors on both fresh and populated MongoDB databases.
- [x] **Test Verification:**
  - Ran `npm run test:server` — all 510 Jest tests pass.
  - Ran `npm run test:client` — all 134 Vitest tests pass.
- [x] **Production Build:** Ran `npm run build -w client` — builds production bundle cleanly with zero linting or bundling errors.
- [x] **Documentation Integrity:** All markdown relative links in `README.md` and `/docs` resolve to valid existing files.
- [x] **Git Repository State:** `main` branch committed and synced with GitHub remote, tagged `v1.0.0`.
- [x] **Archive Size:** Confirmed zip package without `node_modules` is lightweight (< 15 MB).
