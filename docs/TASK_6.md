# Task 6 — Database Integration and User Authentication

## 1. Overview & Objectives
Task 6 completes **Level 3** of the Cognifyz Technologies Full Stack Development Internship. This task transitions the portal from in-memory state into a robust, persistent full-stack architecture featuring a **pure-JavaScript SQLite database**, **session-based user authentication**, **bcrypt password encryption**, and **role-based access control (RBAC)**.

### Key Deliverables:
- **Database Persistence**: Integrated SQLite via `sql.js` (WebAssembly/Pure JS) with automatic file persistence to `data/students.sqlite`.
- **Database Schema & Migrations**: Defined and auto-migrated `students` and `users` tables with auto-increment IDs, timestamp tracking, and unique constraints.
- **Password Security**: Bcrypt encryption (10 salt rounds) for all user accounts with automatic sanitization to prevent hash exposure in views and APIs.
- **Session Management**: Configured `express-session` with session-based flash messaging and 24-hour cookie lifecycles.
- **Authentication Flows**: Full user registration (`/auth/register`), sign in (`/auth/login`), sign out (`/auth/logout`), and session state endpoint (`/auth/me`).
- **Route Guards & RBAC**: Implemented `requireAuth` and `requireAdmin` middleware protecting user dashboards and administrator consoles.
- **Automated Test Suite**: 12 new automated tests in `tests/task6.test.js`, bringing the project total to **76 passing tests across 10 test suites (0 failures)**.

---

## 2. Database Architecture & Schema

### Technology Decision: `sql.js` (WebAssembly SQLite)
To strictly avoid native C++ compilation dependencies (e.g., `node-gyp`, Visual Studio Build Tools, or Python build errors on Windows), SQLite is implemented using `sql.js`. The database executes in WebAssembly/JavaScript and persists binary state to `data/students.sqlite`.

### Schema Definitions

#### `users` Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  createdAt TEXT NOT NULL
);
```

#### `students` Table
```sql
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  course TEXT NOT NULL,
  message TEXT,
  dob TEXT NOT NULL,
  age INTEGER,
  gender TEXT NOT NULL,
  year TEXT NOT NULL,
  linkedin TEXT,
  skills TEXT,
  hostelRequired INTEGER DEFAULT 0,
  hostelRoomType TEXT,
  hostelEmergencyPhone TEXT,
  scholarshipCategory TEXT,
  scholarshipScore REAL,
  passwordHash TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
);
```

---

## 3. Pre-Seeded Demo Accounts

For evaluator convenience and automated testing, the database automatically pre-seeds default credentials if the database is fresh:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@cognifyz.com` | `Admin@12345` | Full access, user directory, admin console |
| **Student** | `student@cognifyz.com` | `Student@12345` | Standard portal access, profile dashboard |

*Note: The login view (`/auth/login`) includes interactive **Quick-Fill Demo** buttons for instant one-click login testing.*

---

## 4. Authentication Architecture & Session Lifecycle

### Session Configuration (`src/app.js`)
```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'cognifyz-internship-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

### Authentication Endpoints
- `GET /auth/login` — Renders login card with floating inputs, password reveal toggle, and quick-fill demo buttons.
- `POST /auth/login` — Verifies email and compares bcrypt hash. Sets `req.session.user` on success and redirects to target URL.
- `GET /auth/register` — Renders account creation form with real-time password strength meter and role selector (`student` or `admin`).
- `POST /auth/register` — Validates format, checks for duplicate email, hashes password, saves to SQLite, and automatically initializes session.
- `GET /auth/logout` — Destroys session, clears session cookie (`connect.sid`), and redirects to home page.
- `GET /auth/me` — JSON endpoint returning `{ authenticated: true/false, user: ... }`.

---

## 5. Route Guards & Access Control Middleware

Located in `src/middleware/auth.middleware.js`:

1. **`attachCurrentUser`**: Runs on every request to expose `res.locals.currentUser = req.session.user || null` to all EJS templates and navbars.
2. **`requireAuth`**: Ensures user is signed in. If unauthenticated:
   - For web requests: Redirects to `/auth/login?returnUrl=...` with a warning flash message.
   - For REST API requests: Returns HTTP `401 Unauthorized`.
3. **`requireAdmin`**: Ensures `currentUser.role === 'admin'`. If forbidden:
   - For web requests: Redirects to `/students` with an access denied flash message.
   - For REST API requests: Returns HTTP `403 Forbidden`.
4. **`redirectIfAuthenticated`**: Automatically redirects signed-in users away from `/auth/login` and `/auth/register` directly into `/students`.

---

## 6. Protected Interfaces

- **User Dashboard (`/auth/dashboard`)**: Displays session identity, assigned role badge, user ID, and database engine status.
- **Administrator Console (`/auth/admin`)**: Restricted strictly to admin users; renders a live table of all registered users in the SQLite database.
- **Adaptive Navbar (`views/partials/navbar.ejs`)**:
  - Unauthenticated: Displays **Sign In** and **Sign Up** links.
  - Authenticated: Renders an active user pill with role badge (`ADMIN` or `STUDENT`) and dropdown menu with sign-out action.

---

## 7. Automated Test Suite (`tests/task6.test.js`)

Task 6 includes 12 automated unit and integration tests executing on dedicated test port `3094`:
1. SQLite initialization & seed data verification.
2. `userStore.authenticate` with valid/invalid passwords.
3. `userStore.create` bcrypt hashing & duplicate email prevention.
4. `GET /auth/login` form rendering.
5. `GET /auth/register` form rendering.
6. `POST /auth/login` invalid credentials returns 401.
7. `POST /auth/login` valid credentials creates session cookie & redirects.
8. `GET /auth/me` verifies session state JSON.
9. `GET /auth/dashboard` redirects unauthenticated requests (302).
10. `GET /auth/dashboard` succeeds for authenticated sessions (200).
11. `GET /auth/admin` rejects students and grants administrators (RBAC).
12. `GET /auth/logout` destroys session and redirects.

### Full Test Suite Status:
- **76 tests passing across 10 test suites (0 failures).**

---

## 8. How to Run & Verify

```powershell
# Run Task 6 tests
node --test tests/task6.test.js

# Run entire 76-test suite
npm test

# Launch development server
npm run dev
```

Visit the following URLs:
- **Sign In**: [http://localhost:3000/auth/login](http://localhost:3000/auth/login)
- **Sign Up**: [http://localhost:3000/auth/register](http://localhost:3000/auth/register)
- **User Dashboard (Protected)**: [http://localhost:3000/auth/dashboard](http://localhost:3000/auth/dashboard)
- **Admin Console (Admin Only)**: [http://localhost:3000/auth/admin](http://localhost:3000/auth/admin)
- **Session State API**: [http://localhost:3000/auth/me](http://localhost:3000/auth/me)
