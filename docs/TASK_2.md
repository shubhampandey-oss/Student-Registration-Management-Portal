# Task 2 — Level 1: Inline Styles, Basic Interaction, and Server-Side Validation

## 1. Task Title and Level
**Task 2 — Level 1**  
Cognifyz Technologies Full Stack Development Internship

---

## 2. Objective
Enhance the Student Registration Portal by introducing rich interactive controls, inline styling feedback, real-time client-side validation, and rigorous server-side validation. Expand the data model with Date of Birth, Gender, Year of Study, and LinkedIn Profile URL, while demonstrating the critical architectural distinction between client-side user experience (UX) and server-side security.

---

## 3. Requirements from the Cognifyz PDF
- ✅ Incorporate interactive elements and inline/stateful styling to enhance visual presentation.
- ✅ Implement client-side JavaScript validation for real-time feedback as users fill the form.
- ✅ Implement robust server-side validation that verifies data independently before storage.
- ✅ Add additional form controls (date picker, radio pill buttons, dropdowns, URL inputs).
- ✅ Display inline visual feedback (green/red glow borders, error messages, dynamic age calculation).
- ✅ Maintain backward compatibility and write comprehensive automated tests.

---

## 4. Architectural Deep Dive: Client-Side vs Server-Side Validation

A fundamental principle of full-stack engineering is:

> **"Client-side validation is for User Experience (UX); Server-side validation is for Security and Data Integrity."**

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                              │
│  - Instant feedback on blur/input                                      │
│  - Prevents accidental submission mistakes                             │
│  - Computes live values (e.g. age badge)                               │
│  - CAN BE BYPASSED (disable JS, DevTools, curl, Postman, scripts)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP POST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          SERVER (Node.js/Express)                      │
│  - ULTIMATE SOURCE OF TRUTH                                            │
│  - Re-checks every single field and data constraint                    │
│  - Sanitizes inputs against XSS and malicious injection                │
│  - CANNOT BE BYPASSED by client tampering                              │
└────────────────────────────────────────────────────────────────────────┘
```

### Why client-side validation alone is NEVER enough:
1. **JavaScript Can Be Disabled**: Any user can disable JavaScript in their browser settings with two clicks. If validation only exists in `main.js`, arbitrary data would flow straight into your database.
2. **Direct HTTP Requests**: Attackers and automated bots don't use browsers — they use tools like `curl`, Postman, Python `requests`, or automated vulnerability scanners, completely skipping the front-end code.
3. **DOM Tampering**: Any user can open Chrome DevTools, remove the `required` or `pattern` attributes, edit `<input type="date">` to text, or alter radio button values before clicking Submit.
4. **Data Integrity & Consistency**: The server is where business rules must be guaranteed (e.g., age >= 16 years, valid registered courses).

---

## 5. Form Fields & Validation Rules Matrix

| Field | Type & Element | Client-Side Rule (UX) | Server-Side Rule (Security) | Error Message |
|---|---|---|---|---|
| `name` | Text `<input>` | Required, 2–100 chars, regex `^[a-zA-Z\s'-]+$` | Required, trimmed, 2–100 chars, strictly letters/spaces/hyphens/apostrophes | "Name can only contain letters, spaces, hyphens, and apostrophes." |
| `email` | Email `<input>` | Required, regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` | Required, trimmed, max 254 chars, regex validated, lowercased | "Please enter a valid email address." |
| `dob` | Date `<input>` | Required, ISO format, age >= 16 & <= 100, not future | Required, parses YYYY-MM-DD, age >= 16 & <= 100, rejects future dates | "Student must be at least 16 years old to register." |
| `gender` | Radio Pills | Required, one option selected | Required, must match `['Male', 'Female', 'Other', 'Prefer not to say']` | "Please select a valid gender option." |
| `course` | `<select>` | Required, must select a non-empty option | Required, strictly validated against whitelist of 8 approved courses | "Please select a valid course from the list." |
| `year` | `<select>` | Required, must select a valid year | Required, must match `['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate']` | "Please select a valid year of study." |
| `phone` | Tel `<input>` | Required, digits between 7 and 15 | Required, strips formatting chars, enforces 7–15 digit count | "Phone number must be between 7 and 15 digits." |
| `linkedin` | URL `<input>` | Optional. If typed: http/https and contains `linkedin.com` | Optional. If provided: max 200 chars, valid URL protocol, must contain `linkedin.com` | "Please provide a valid LinkedIn URL (must contain linkedin.com)." |
| `message` | `<textarea>` | Optional, max 500 chars (live counter) | Optional, max 500 characters | "Message must be 500 characters or fewer." |

---

## 6. Features Implemented in Task 2

1. **Extended Registration Schema**:
   - `dob`: Date of Birth with live age calculation.
   - `gender`: Interactive radio pill buttons.
   - `year`: Year of Study dropdown.
   - `linkedin`: Optional verified LinkedIn profile URL.
   - Grouped logically into 3 visual form sections: *Personal Information*, *Academic Details*, and *Contact & Profiles*.

2. **Real-Time Client-Side Validation (`public/js/main.js`)**:
   - Event listeners for `blur` (immediate feedback on leaving field).
   - Event listeners for `input` / `change` (instant recovery feedback once valid).
   - Dynamic class toggling: `.is-invalid` (red border + glow) and `.is-valid` (green border + glow).
   - Accessible keyboard focus: on form submission attempt with invalid fields, the first invalid input is smoothly scrolled to and focused (`firstInvalidEl.focus()`).

3. **Dynamic Age Calculator**:
   - As the user picks or types a date in the Date of Birth field, JavaScript calculates the exact age in completed years.
   - Updates the `#ageBadge` element in real time:
     - Age < 16: Displays red warning `"<age> yrs (Must be ≥16)"`.
     - Valid age: Displays green badge `"<age> years old"`.
     - Future date: Displays red warning `"Future date!"`.

4. **Interactive Radio Pill Buttons**:
   - Pill-styled labels wrapping hidden `<input type="radio">` controls.
   - Seamless click toggle adding glowing purple border and background highlight (`.cp-pill-radio.active`).

5. **Enhanced Student Profiles & Student Cards**:
   - `student-detail.ejs`: Displays Student ID, Academic Level with year badge (`Computer Science • 3rd Year`), Date of Birth with calculated age in parentheses, Gender, Phone, Email, and a clickable LinkedIn link with external arrow icon.
   - `students-list.ejs`: Updated student card header to show the Year of Study alongside the course.

---

## 7. Files Modified or Created

```
src/
  utils/
    validation.js           ← Added validateStudentTask2, calculateAge, VALID_GENDERS, VALID_YEARS
  controllers/
    student.controller.js   ← Updated postRegister with Task 2 attributes & validation

views/
  pages/
    register.ejs            ← 3-section layout, DOB, Gender pills, Year, LinkedIn, error containers
    student-detail.ejs      ← Display DOB, age, gender, year, LinkedIn link
    students-list.ejs       ← Display Year on student cards

public/
  css/style.css             ← Pill radio styles, section headers, age badge, validation glow states
  js/main.js                ← Client-side validator, live age calculator, radio pill toggler

tests/
  task1.test.js             ← 19 passing tests (verified backward compatibility)
  task2.test.js             ← 15 automated tests for Task 2

docs/
  TASK_2.md                 ← Comprehensive documentation (this file)
  LEVEL_1/README.md         ← Updated level summary
```

---

## 8. How to Run and Verify

### Running the Application
```powershell
# Navigate to project folder
cd "c:\Users\shubh\OneDrive\Desktop\Cognifyz"

# Start development server
npm run dev
```

Open your browser at:
- **Registration Form:** http://localhost:3000/students/register
- **Students Directory:** http://localhost:3000/students
- **Home Dashboard:** http://localhost:3000/

### Running Automated Tests
```powershell
# Run Task 2 tests only
node --test tests/task2.test.js

# Run entire test suite (Task 1 + Task 2)
npm test
```

---

## 9. Automated Testing Results

All 34 automated tests across Task 1 and Task 2 pass with 100% success:

```
> cognifyz-student-portal@1.0.0 test
> node --test tests/**/*.test.js

▶ Task 1 — Express Server and EJS Rendering
  ✔ GET / — home page returns 200 (40.57ms)
  ✔ GET /students/register — form page returns 200 (7.33ms)
  ✔ GET /students — list page returns 200 (4.79ms)
  ✔ POST /students/register — valid data redirects to profile (15.42ms)
  ✔ GET profile after valid submission — shows success message (29.00ms)
  ✔ POST /students/register — empty form returns 422 with errors (7.11ms)
  ✔ POST /students/register — bad email returns 422 with email error (5.20ms)
  ✔ POST /students/register — invalid course value returns 422 (10.43ms)
  ✔ GET /nonexistent — returns 404 page (5.37ms)
  ✔ GET /students/99999 — returns 404 for unknown student (4.38ms)
✔ Task 1 — Express Server and EJS Rendering (333.51ms)
▶ Task 1 — Server-side Validation Logic
  ✔ validates successfully with all correct fields (0.18ms)
  ✔ rejects empty name (0.13ms)
  ✔ rejects name shorter than 2 chars (0.09ms)
  ✔ rejects name with digits (0.09ms)
  ✔ rejects invalid email format (0.09ms)
  ✔ rejects invalid course (0.07ms)
  ✔ rejects phone too short (0.07ms)
  ✔ rejects message longer than 500 chars (0.11ms)
  ✔ accepts optional empty message (0.09ms)
✔ Task 1 — Server-side Validation Logic (1.23ms)

▶ Task 2 — Extended Fields, Validation & Profile Features
  ✔ GET /students/register — contains Task 2 extended fields (46.95ms)
  ✔ POST /students/register — valid Task 2 submission redirects to profile (32.32ms)
  ✔ POST /students/register — rejects submission when DOB is under 16 (8.49ms)
  ✔ POST /students/register — rejects invalid LinkedIn URL (6.17ms)
  ✔ GET /students — lists students with academic details (5.45ms)
✔ Task 2 — Extended Fields, Validation & Profile Features (309.84ms)
▶ Task 2 — Age Calculation Helper
  ✔ calculates correct completed age (0.24ms)
  ✔ returns null for invalid date string (0.13ms)
✔ Task 2 — Age Calculation Helper (0.58ms)
▶ Task 2 — Server-side Validation Unit Rules
  ✔ passes with all valid Task 2 fields (0.28ms)
  ✔ rejects missing dob on Task 2 form (0.23ms)
  ✔ rejects future dob (0.21ms)
  ✔ rejects age over 100 (0.14ms)
  ✔ rejects invalid gender option (0.15ms)
  ✔ rejects invalid year of study (0.14ms)
  ✔ accepts empty linkedin url (optional field) (0.10ms)
  ✔ rejects non-linkedin url (0.12ms)
✔ Task 2 — Server-side Validation Unit Rules (1.72ms)

ℹ tests 34
ℹ suites 5
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ duration_ms 556.55ms
```

---

## 10. Key Learning Outcomes
1. **Defense-in-Depth Form Architecture**: Combining real-time front-end feedback with non-negotiable server-side boundary validation.
2. **Accessible Form Feedback**: Using `aria-describedby`, `role="alert"`, and JavaScript `.focus()` to assist users who rely on screen readers or keyboard navigation.
3. **Date Mathematics in JavaScript**: Computing completed years accurately while properly accounting for birth month and birth day relative to the current calendar date.
4. **Custom Interactive Controls**: Creating accessible, pill-style radio button groups that function cleanly with native keyboard navigation while offering high-end custom visuals.
5. **Backward Compatibility**: Safely evolving validation routines (`validateStudentTask2` extending `validateStudentTask1`) without breaking legacy payloads or existing test suites.

---

## 11. Common Pitfalls & Solutions

- **Pitfall**: Calculating age simply by `currentYear - birthYear`.  
  *Issue*: If a student was born on December 31, 2004 and today is January 15, 2024, `2024 - 2004 = 20`, but the student has not yet reached their 20th birthday; they are still 19.  
  *Solution*: Compare month and date (`if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;`).

- **Pitfall**: Relying on HTML5 `required` attribute without server validation.  
  *Issue*: Anyone can right-click, inspect element, delete `required`, and submit empty values.  
  *Solution*: Validate strictly on the server in `src/utils/validation.js` and return HTTP 422 with field-specific errors.

---

## 12. Next Steps (Task 3 Preview)
In **Task 3 (Level 2: Responsive Design and Layouts)**, we will:
- Polish responsive breakpoints across mobile, tablet, and ultra-wide screens.
- Enhance animations and smooth transition states.
- Introduce interactive filters or search on the students directory.
