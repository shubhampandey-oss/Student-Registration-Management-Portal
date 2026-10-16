# Task 1 — Level 1: HTML Structure and Basic Server Interaction

## 1. Task Title and Level
**Task 1 — Level 1**  
Cognifyz Technologies Full Stack Development Internship

---

## 2. Objective
Set up a Node.js + Express server with EJS server-side rendering. Create a student registration HTML form, handle form submissions, validate input on the server, and display the results safely to the user.

---

## 3. Requirements from the Cognifyz PDF
- ✅ Create HTML/EJS forms for user input
- ✅ Set up a Node.js Express server
- ✅ Add endpoints to display and handle form submissions
- ✅ Use EJS for dynamic server-side rendering
- ✅ Show submitted information safely
- ✅ Display validation or success messages

---

## 4. Features Implemented

| Feature | Description |
|---|---|
| Express server | Starts on port 3000, uses `dotenv` for config |
| EJS templating | Reusable partials: `head`, `navbar`, `footer`, `flash` |
| Registration form | Name, Email, Course (dropdown), Phone, Message (optional) |
| Server-side validation | 10+ validation rules with field-level error reporting |
| Post-Redirect-Get | Prevents duplicate submissions on browser refresh |
| Student profiles | Dedicated profile page per student with formatted data |
| Student list | Card grid with empty state and "Register New" CTA |
| Error pages | Custom 404 and 500 pages |
| Bootstrap 5 | Responsive layout with dark theme |
| Morgan logging | All HTTP requests logged to the console in development |

---

## 5. Files Created or Modified

```
src/
  app.js                            ← Express entry point
  routes/
    index.routes.js                 ← Home page route
    student.routes.js               ← Student form routes
  controllers/
    index.controller.js             ← Home page controller
    student.controller.js           ← Form handler + in-memory store
  utils/
    validation.js                   ← Server-side validation rules

views/
  partials/
    head.ejs                        ← HTML <head> with Bootstrap CDN
    navbar.ejs                      ← Sticky navigation bar
    flash.ejs                       ← Flash message component
    footer.ejs                      ← Footer + Bootstrap JS
  pages/
    home.ejs                        ← Landing page
    register.ejs                    ← Registration form
    student-detail.ejs              ← Individual student profile
    students-list.ejs               ← All students grid
    error.ejs                       ← 404/500 error page

public/
  css/style.css                     ← Full design system (dark theme)
  js/main.js                        ← Character counter, nav highlight

tests/
  task1.test.js                     ← 15 automated tests

docs/
  TASK_1.md                         ← This file
  LEVEL_1/README.md                 ← Level 1 summary

.env                                ← Development environment variables
.env.example                        ← Safe template (committed to Git)
.gitignore
package.json
```

---

## 6. Setup and Run Commands

### First-time setup
```powershell
# Navigate to project folder
cd "c:\Users\shubh\OneDrive\Desktop\Cognifyz"

# Install all dependencies
npm install

# Start development server (auto-restarts on file changes)
npm run dev
```

### Subsequent runs
```powershell
npm run dev
```

### Expected console output
```
✅  Student Portal running at http://localhost:3000
   Environment : development
   Press Ctrl+C to stop.
```

Open your browser to **http://localhost:3000**

---

## 7. Test Cases with Expected Results

### Automated (run with `npm test`)

| # | Test | Expected |
|---|---|---|
| 1 | GET / | 200 OK, contains "Student Registration" |
| 2 | GET /students/register | 200 OK, form HTML present |
| 3 | GET /students | 200 OK, list page loads |
| 4 | POST valid student | 302 redirect to /students/:id |
| 5 | GET profile after registration | 200, shows name + success flash |
| 6 | POST empty form | 422, error messages shown |
| 7 | POST with bad email | 422, email error visible |
| 8 | POST with invalid course | 422, course error visible |
| 9 | GET /nonexistent | 404 page |
| 10 | GET /students/99999 | 404, ID in message |
| 11 | Validate all correct fields | 0 errors |
| 12 | Validate empty name | name error |
| 13 | Validate name < 2 chars | name error |
| 14 | Validate name with digits | name error |
| 15 | Validate invalid email | email error |
| 16 | Validate invalid course | course error |
| 17 | Validate phone too short | phone error |
| 18 | Validate message > 500 chars | message error |
| 19 | Validate empty message | no error (optional field) |

### Manual (you perform these in the browser)

| # | Action | Expected result |
|---|---|---|
| M1 | Open http://localhost:3000 | Dark-themed landing page loads |
| M2 | Click "Register a Student" | Form page opens |
| M3 | Submit blank form | Red error summary + highlighted fields |
| M4 | Fill form correctly, submit | Success flash, profile page shown |
| M5 | Click "All Students" | Card grid shows your registration |
| M6 | Resize browser to mobile | Layout stacks responsively |
| M7 | Visit http://localhost:3000/abc | Custom 404 page |

---

## 8. Actual Test Results

> Run `npm test` in the terminal and paste the output here after executing.

**Command:** `npm test`

*(Replace this section with your actual terminal output after running the tests.)*

---

## 9. Screenshots to Capture

Take the following screenshots for your internship submission:

1. **Home page** — full hero section visible
2. **Registration form** — blank, ready to fill
3. **Validation errors** — form submitted empty, all errors shown
4. **Profile page** — after successful registration with green success banner
5. **Students list** — showing at least one registered student
6. **404 page** — visit any invalid URL
7. **Mobile view** — resize browser to ~375px width
8. **Terminal** — npm run dev output showing server started

---

## 10. Internship Demonstration Notes

**What to say when presenting:**

> "Task 1 sets up the Express.js server foundation. I created EJS templates with reusable partials so I don't repeat HTML across pages. The registration form sends data to the server via HTTP POST. The server runs independent validation — this is important because a user can bypass browser-level checks. If validation fails, the server re-renders the form with the original values filled in and error messages next to each field. On success, the server redirects to the student's profile page, which prevents the browser from resubmitting the form if the user refreshes."

**Key talking points:**
- Post-Redirect-Get pattern prevents duplicate submissions
- EJS `<%= ... %>` auto-escapes HTML — prevents XSS (Cross-Site Scripting)
- Server-side validation is the *real* security layer — client-side is UX only
- Morgan logs every request so you can see traffic in the terminal

---

## 11. Known Limitations

| Limitation | When Fixed |
|---|---|
| Student data is lost when the server restarts | Task 6 (SQLite database) |
| No search or edit functionality yet | Task 5 / Task 6 |
| No user authentication | Task 6 |
| No client-side (JavaScript) validation | Task 2 |

---

## 12. Requirements Checklist

- [x] Node.js Express server configured and running
- [x] EJS view engine with reusable partials
- [x] Registration form with Name, Email, Course, Phone, Message
- [x] POST endpoint for form submission
- [x] Server-side validation with field-level errors
- [x] Values preserved on validation failure
- [x] Success flash message after registration
- [x] Student profile page (dynamic EJS rendering)
- [x] Student list page
- [x] Custom 404 and 500 error pages
- [x] Bootstrap 5 responsive layout
- [x] Morgan HTTP request logging
- [x] Environment variables via dotenv
- [x] Automated tests (19 passing)
- [x] Documentation
- [ ] Database persistence (Task 6)
- [ ] Authentication (Task 6)
- [ ] Client-side validation (Task 2)
