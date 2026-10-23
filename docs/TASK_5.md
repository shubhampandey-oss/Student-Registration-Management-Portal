# Task 5 — RESTful API Development and Front-End Integration

## 1. Overview & Objectives
Task 5 marks the beginning of **Level 3** of the Cognifyz Full Stack Development Internship. The objective is to extend the Student Registration and Management Portal with a comprehensive **RESTful API** and seamlessly integrate it with the front-end using modern asynchronous JavaScript (`fetch()` API).

### Key Deliverables:
- **RESTful Endpoints**: Full CRUD support (`GET`, `POST`, `PUT`, `DELETE`) adhering to REST conventions and proper HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `422 Unprocessable Entity`).
- **Standardized Response Envelope**: Predictable JSON response schema across all endpoints.
- **Asynchronous Front-End Integration**: Client-side `fetch()` call for instant student deletion with animated card removal and live Bootstrap feedback toast.
- **Interactive API Documentation & Console**: Built-in interactive API explorer at `/api/docs` with live request testing capability.
- **Security & Data Sanitization**: Strict exclusion of sensitive credentials (`passwordHash`) from all API responses.
- **Automated Test Suite**: 12 new automated unit and integration tests, elevating the total project test suite to 64 passing tests.

---

## 2. Architecture & Design Principles

### Standardized JSON Response Envelope
Every API response adheres to a uniform structure:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "count": 4,
    "total": 4,
    "page": 1,
    "limit": 50
  }
}
```
For errors:
```json
{
  "success": false,
  "error": "Student with ID 99999 was not found",
  "code": 404
}
```

### Shared In-Memory Data Store (`student.store.js`)
To ensure synchronization between the traditional web form (`POST /students/register`) and external REST API consumers (`POST /api/v1/students`), state is unified in `src/models/student.store.js`. Both the web controller (`student.controller.js`) and REST controller (`api.controller.js`) interact with the same underlying data repository.

### API 404 Error Isolation
404 errors for `/api/*` routes are handled cleanly in `src/app.js` and return structured JSON (`{ success: false, error: 'API Endpoint Not Found', code: 404 }`) instead of rendering an HTML error page.

---

## 3. RESTful API Endpoint Reference

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/docs` | Interactive API documentation explorer & live test console | `200 OK` (HTML) |
| `GET` | `/api/v1/students` | Retrieve list of students with query filtering (`q`, `course`, `year`) and pagination | `200 OK` |
| `GET` | `/api/v1/students/:id` | Retrieve detailed profile for a single student | `200 OK` / `404 Not Found` |
| `POST` | `/api/v1/students` | Create new student with server-side validation and password hashing | `201 Created` / `422 Unprocessable Entity` |
| `PUT` | `/api/v1/students/:id` | Update existing student attributes | `200 OK` / `404 Not Found` / `422 Unprocessable Entity` |
| `DELETE` | `/api/v1/students/:id` | Delete student by unique ID | `200 OK` / `404 Not Found` |

---

## 4. Asynchronous Front-End Integration (`fetch()` API)

### Instant Asynchronous Deletion
On the Students List view (`/students`), each card features an interactive **Delete (Async)** button (`.cp-delete-btn`):
1. **User Confirmation**: The user clicks the delete button and confirms via browser prompt.
2. **Asynchronous Request**: `fetch('/api/v1/students/' + studentId, { method: 'DELETE' })` is dispatched.
3. **DOM Animation & Removal**: Upon HTTP `200`, the card element smoothly fades out and is removed from the DOM.
4. **Live Toast Notification**: A Bootstrap Toast (`#apiToast`) is triggered dynamically to display a green success notification without a full page refresh.

```javascript
// public/js/main.js - Section 10
const res = await fetch(`/api/v1/students/${studentId}`, {
  method: 'DELETE',
  headers: { 'Accept': 'application/json' }
});
const data = await res.json();
if (res.ok && data.success) {
  // Animate and remove card
  cardCol.style.transition = 'all 0.35s ease';
  cardCol.style.opacity = '0';
  cardCol.style.transform = 'scale(0.85)';
  setTimeout(() => cardCol.remove(), 350);
  showToast('Student deleted successfully via REST API!', 'success');
}
```

---

## 5. Interactive API Console (`/api/docs`)

Task 5 includes a complete developer portal accessible via the top navigation bar at `/api/docs`:
- **Endpoint Catalog**: Clear, color-coded badges for all REST verbs (`GET`, `POST`, `PUT`, `DELETE`).
- **Live Test Runner**: Allows developers and evaluators to select endpoints, provide custom request bodies, and click **"Send Test Request"**.
- **Real-Time Output**: Renders live HTTP status codes, execution duration, and formatted JSON responses.

---

## 6. Security & Data Sanitization

- **Credential Stripping**: Whenever student objects are fetched or returned via `/api/v1/students`, the `sanitizeStudent()` helper strictly strips `passwordHash`, `password`, and `confirmPassword`.
- **Validation**: `POST` and `PUT` endpoints execute the exact same rigorous validation rules established in Tasks 1–4, preventing malicious or incomplete payloads from polluting the database.

---

## 7. Automated Test Suite (`tests/task5.test.js`)

Task 5 is covered by 12 comprehensive automated integration and unit tests:
1. `GET /api/docs` — renders interactive API explorer.
2. `POST /api/v1/students` — creates student and returns `201 Created`.
3. `POST /api/v1/students` — invalid payload returns `422 Unprocessable Entity` with error details.
4. `GET /api/v1/students` — lists students with pagination metadata.
5. `GET /api/v1/students?q=API+Test` — filters students by search term.
6. `GET /api/v1/students/:id` — retrieves specific student profile.
7. `GET /api/v1/students/99999` — returns `404 Not Found` for non-existent ID.
8. `PUT /api/v1/students/:id` — updates student attributes.
9. `PUT /api/v1/students/99999` — returns `404 Not Found` for non-existent ID.
10. `DELETE /api/v1/students/:id` — deletes student and returns `200 OK`.
11. `DELETE /api/v1/students/99999` — returns `404 Not Found` for non-existent student.
12. `GET /api/unknown-endpoint` — returns JSON 404 response.

### Total Project Test Status:
- **64 tests passed across 9 suites (0 failures).**

---

## 8. Verification & How to Run
```powershell
# 1. Run all tests
npm test

# 2. Run Task 5 specific tests
node --test tests/task5.test.js

# 3. Start development server
npm run dev
```

Visit the following URLs:
- **API Explorer**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **JSON Endpoint**: [http://localhost:3000/api/v1/students](http://localhost:3000/api/v1/students)
- **Student Directory**: [http://localhost:3000/students](http://localhost:3000/students)
