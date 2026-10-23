# Cognifyz Technologies — Full Stack Development Internship
## Student Registration and Management Portal (Enterprise Edition)

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.19-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20(sql.js)-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Bootstrap](https://img.shields.io/badge/UI-Bootstrap%205-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Tests](https://img.shields.io/badge/Automated%20Tests-93%20Passing%20(0%20Fails)-success)](https://nodejs.org/api/test.html)
[![Security](https://img.shields.io/badge/Security-Helmet%20%7C%20Rate%20Limit%20%7C%20XSS-blue)](https://helmetjs.github.io/)

A complete, production-ready full-stack web application designed and built for the **Cognifyz Technologies Full Stack Web Development Internship**. Evolving through all **8 internship tasks** across **4 progressive levels**, this portal combines server-side EJS rendering, modern glassmorphism design, decoupled RESTful APIs, pure-JavaScript SQLite database persistence, bcrypt encryption, session management, multi-tier DDoS defenses, micro-caching, and automated background tasks (`node-cron`).

---

## 📋 Internship Progression & Task Roadmap

| Level | Task | Title | Description | Status | Test Coverage |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Level 1** | **Task 1** | Express Server & EJS Forms | Server setup, EJS views, Morgan logging, server validation | ✅ **Completed** | 19 Tests |
| **Level 1** | **Task 2** | Client Validation & Extended Fields | DOB age calculator, gender pills, study years, LinkedIn URL validation | ✅ **Completed** | 15 Tests |
| **Level 2** | **Task 3** | Responsive Grid & Live Filters | 4-tier grid, instant client-side search, course/year filters, back-to-top | ✅ **Completed** | 10 Tests |
| **Level 2** | **Task 4** | Password Security & Dynamic DOM | 6-rule password strength meter, visibility toggles, conditional hostel/scholarship forms | ✅ **Completed** | 8 Tests |
| **Level 3** | **Task 5** | RESTful API & Front-End Integration | Full CRUD JSON API, fetch() asynchronous student deletion, interactive API explorer | ✅ **Completed** | 12 Tests |
| **Level 3** | **Task 6** | Database Integration & User Auth | Pure-JS SQLite (`sql.js`), bcrypt encryption, session management, RBAC route guards | ✅ **Completed** | 12 Tests |
| **Level 4** | **Task 7** | Security Hardening & Caching | Helmet HTTP headers, CORS, multi-tier rate limiting (429), XSS sanitization, node-cache | ✅ **Completed** | 9 Tests |
| **Level 4** | **Task 8** | Background Tasks & Production Health | Scheduled cron jobs, automated SQLite backups, backup rotation, system health API | ✅ **Completed** | 8 Tests |

**Total Automated Tests:** **93 Passed** across **12 Test Suites (0 Failures, 100% Reliability)**.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm (bundled with Node.js)
- **Zero Native Build Dependencies**: Powered by pure JavaScript and WebAssembly (`sql.js`), eliminating `node-gyp` or C++ build tools on Windows.

### 2. Installation
```powershell
# 1. Clone or navigate to the project directory
cd "c:\Users\shubh\OneDrive\Desktop\Cognifyz"

# 2. Install dependencies
npm install

# 3. Create .env from template (if not already present)
cp .env.example .env
```

### 3. Running the Portal
```powershell
# Development mode (live reload via nodemon)
npm run dev

# Production mode
npm start

# Run all 93 automated unit & integration tests
npm test

# Trigger manual SQLite database backup
npm run backup
```

Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Pre-Seeded Demo Accounts

For evaluator convenience, the portal automatically seeds demo accounts with interactive **Quick-Fill buttons** on the sign-in page:

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@cognifyz.com` | `Admin@12345` | Full CRUD access, Admin Console, User Directory, Backup Triggers |
| **Student** | `student@cognifyz.com` | `Student@12345` | Standard student access, Student Directory, Personal Dashboard |

---

## 🏛️ Architecture & Key Technologies

```
cognifyz-student-portal/
├── data/                      # Persistent SQLite database & backup archives
│   ├── students.sqlite        # Active SQLite database (sql.js / WebAssembly)
│   └── backups/               # Automated timestamped backup snapshots (max 5)
├── docs/                      # Comprehensive task documentation
│   ├── TASK_1.md - TASK_8.md  # Detailed documentation for every internship task
│   ├── LEVEL_1/ - LEVEL_4/    # High-level level summaries
├── public/                    # Static assets
│   ├── css/style.css          # Curated design tokens, glassmorphism, responsive grid
│   └── js/main.js             # Client validation, password meter, fetch() CRUD, API runner
├── scripts/
│   └── backup.js              # On-demand CLI database backup runner (npm run backup)
├── src/
│   ├── app.js                 # Express server configuration, middleware chain, route mounts
│   ├── controllers/           # MVC Controllers (Web, API, Auth)
│   ├── middleware/            # Security (Helmet/CORS), Rate Limiting, Sanitization, Auth Guards
│   ├── models/                # SQLite Database manager (db.js), student store, user store
│   ├── routes/                # Route definitions (Web, Students, Auth, REST API)
│   ├── services/              # In-memory Caching (node-cache), Background Tasks (node-cron)
│   └── utils/validation.js    # Centralized validation rules, age calculator, password strength
├── tests/                     # Automated test suites for Tasks 1 through 8 (Ports 3099-3092)
└── views/                     # EJS templates & reusable partials
    ├── pages/                 # Home, Register, Students, Detail, Login, Signup, Docs, Security
    └── partials/              # Head, Navbar, Footer, Flash alerts
```

---

## 🌐 RESTful API Reference Catalog

The portal includes an interactive developer playground at **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**.

| HTTP Verb | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/docs` | Interactive API explorer & live testing console | `200 OK` |
| `GET` | `/api/v1/health` | System health, memory telemetry & uptime | `200 OK` |
| `GET` | `/api/v1/students` | List students with query filtering (`q`, `course`, `year`), pagination & caching (`X-Cache`) | `200 OK` |
| `GET` | `/api/v1/students/:id` | Retrieve specific student profile | `200 OK` / `404 Not Found` |
| `POST` | `/api/v1/students` | Create new student record with server validation | `201 Created` / `422 Unprocessable` |
| `PUT` | `/api/v1/students/:id` | Update existing student attributes | `200 OK` / `404 Not Found` |
| `DELETE` | `/api/v1/students/:id` | Asynchronous delete student record | `200 OK` / `404 Not Found` |
| `GET` | `/api/v1/cron/backups` | View database backup archives | `200 OK` |
| `POST` | `/api/v1/cron/backup` | Trigger programmatic database backup | `201 Created` |

---

## 🛡️ Security & Performance Features

- **Helmet HTTP Hardening**: Restricts script/style execution via Content Security Policy (CSP), blocks clickjacking framing (`SAMEORIGIN`), prevents MIME-sniffing (`nosniff`), and conceals server headers.
- **DDoS & Brute-Force Rate Limiting**: Multi-tiered rate limiters protecting global routes (250 req / 15m), auth routes (10 attempts / 15m), and API routes (120 req / 15m).
- **XSS Sanitization**: Recursive request cleaner stripping malicious script tags and inline handlers while preserving passwords.
- **In-Memory Caching (`node-cache`)**: Response caching on `GET /api/v1/students` with real-time `X-Cache: HIT / MISS` headers and automatic write-invalidation.
- **Background Cron Automation (`node-cron`)**: Scheduled 2:00 AM database snapshots with rolling rotation policy (maximum 5 backups retained) and hourly cache hygiene checks.

---

## 🧪 Automated Test Execution

Every task is validated through automated tests running on dedicated, conflict-free test ports:
```powershell
npm test
```

Output:
```text
ℹ tests 93
ℹ suites 12
ℹ pass 93
ℹ fail 0
ℹ duration_ms 1237ms
```

---

## 📚 Detailed Task Documentation

- [Task 1: Express Server & EJS Forms](docs/TASK_1.md)
- [Task 2: Client Validation & Extended Fields](docs/TASK_2.md)
- [Task 3: Responsive Grid & Live Filters](docs/TASK_3.md)
- [Task 4: Password Security & Dynamic DOM](docs/TASK_4.md)
- [Task 5: RESTful API & Front-End Integration](docs/TASK_5.md)
- [Task 6: Database Integration & User Authentication](docs/TASK_6.md)
- [Task 7: Security Hardening & Performance Caching](docs/TASK_7.md)
- [Task 8: Background Tasks & Production Health](docs/TASK_8.md)

---

## 📜 License & Acknowledgements
- **Developer:** Cognifyz Technologies Full Stack Web Development Intern
- **Program:** Cognifyz Technologies Internship Program
- **License:** MIT License
