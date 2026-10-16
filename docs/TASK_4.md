# Task 4 — Level 2: Dynamic DOM Manipulation and Interactive Features

## 1. Task Title and Level
**Task 4 — Level 2**  
Cognifyz Technologies Full Stack Development Internship

---

## 2. Objective
Incorporate rich dynamic DOM manipulation, real-time client-side interactivity, and secure credential management into the Student Portal. Build an interactive Password Strength Meter with a live 6-point security checklist, password visibility toggles, dynamic conditional form sections (Campus Hostel Allocation and Merit Scholarship Application), an accessible pre-submission review modal, and robust server-side password hashing using **bcrypt**.

---

## 3. Requirements from the Cognifyz PDF
- ✅ Implement dynamic DOM manipulation to alter content based on user interaction.
- ✅ Create an interactive Password Strength Meter with visual progress bar and real-time validation checks.
- ✅ Implement conditional form elements that reveal/hide sub-sections based on user choices.
- ✅ Securely hash passwords before saving (never store plaintext credentials).
- ✅ Implement a pre-submission review confirmation modal for enhanced UX.
- ✅ Write comprehensive automated tests and maintain backward compatibility.

---

## 4. Architectural Highlights & Features Implemented

### 1. Real-Time Password Strength Meter
Implemented in [`public/js/main.js`](file:///c:/Users/shubh/OneDrive/Desktop/Cognifyz/public/js/main.js) and [`src/utils/validation.js`](file:///c:/Users/shubh/OneDrive/Desktop/Cognifyz/src/utils/validation.js):
- Evaluates password complexity dynamically as the user types across five security criteria:
  1. Minimum 8 characters
  2. At least one uppercase letter (`A-Z`)
  3. At least one lowercase letter (`a-z`)
  4. At least one digit (`0-9`)
  5. At least one special symbol (`!@#$%^&*`)
  6. Password confirmation matching
- **Visual Progress Bar**: Animates dynamically with distinct color states:
  - Score 1: 20% (Red - *Very Weak*)
  - Score 2: 40% (Orange - *Weak*)
  - Score 3: 60% (Cyan - *Medium*)
  - Score 4: 80% (Blue - *Strong*)
  - Score 5: 100% (Green - *Very Strong*)
- **Interactive Checklist**: Real-time icons toggle from gray circles (`bi-circle`) to glowing green checkmarks (`bi-check-circle-fill`) with smooth transitions.

### 2. Password Visibility Toggles
- Custom toggle buttons (`#togglePasswordBtn` and `#toggleConfirmPasswordBtn`) allowing users to inspect what they type.
- Switches `<input>` between `type="password"` and `type="text"` while flipping the eye icon between `bi-eye` and `bi-eye-slash`.

### 3. Conditional Form Fields (Dynamic Sub-Forms)
- **Hostel / Campus Accommodation**: Controlled by `#requiresHostelToggle`. When toggled ON, the `#hostelDetailsContainer` smoothly appears, requesting Room Preference (`Single`, `Double`, `Triple`, `Suite`), Dietary Preference (`Vegetarian`, `Non-Vegetarian`, `Vegan`), and Emergency Contact Person & Phone number.
- **Merit Scholarship Application**: Controlled by `#appliesScholarshipToggle`. When toggled ON, the `#scholarshipDetailsContainer` appears, requesting Previous Academic Score (CGPA or %) and Annual Family Income Bracket.

### 4. Enterprise Password Hashing with Bcrypt
- In [`src/controllers/student.controller.js`](file:///c:/Users/shubh/OneDrive/Desktop/Cognifyz/src/controllers/student.controller.js), incoming passwords are automatically hashed with `await bcrypt.hash(password, 10)` before storage.
- Plaintext passwords are never stored in memory or databases, and never rendered into any template or response.

### 5. Pre-Submission Review Modal
- When users click `"Review & Submit Registration"`, client-side validation runs first.
- If valid, a Bootstrap 5 review modal pops up presenting a structured summary of their details (Name, Email, Academic level, Phone, Hostel status, and Scholarship status).
- Users can click `"Make Changes"` to continue editing or `"Confirm & Register"` to proceed with submission.

---

## 5. Form Fields & Validation Rules Matrix (Task 4 Additions)

| Field | Type & Element | Client-Side Rule (UX) | Server-Side Rule (Security) | Error Message |
|---|---|---|---|---|
| `password` | Password `<input>` | Required, min 8 chars, 1 upper, 1 lower, 1 digit, 1 symbol | Required, min 8 chars, all 4 complexity character classes enforced | "Password must contain uppercase, lowercase, number, and special character." |
| `confirmPassword` | Password `<input>` | Required, strictly equal to `password` | Required, must match `password` | "Passwords do not match." |
| `roomType` | `<select>` (conditional) | Required if hostel checked | Required if hostel checked, must be in whitelist | "Please select a valid room preference." |
| `dietary` | `<select>` (conditional) | Required if hostel checked | Required if hostel checked, must be in whitelist | "Please select your dietary preference." |
| `emergencyContact` | Text `<input>` (conditional) | Required if hostel checked, min 2 chars | Required if hostel checked, 2–100 chars | "Emergency contact person name is required (min 2 characters)." |
| `emergencyPhone` | Tel `<input>` (conditional) | Required if hostel checked, 7–15 digits | Required if hostel checked, 7–15 digits | "Emergency phone must be a valid number between 7 and 15 digits." |
| `prevGpa` | Text `<input>` (conditional) | Required if scholarship checked, valid number | Required if scholarship checked, >= 6.0 CGPA or >= 60% | "Minimum 6.0 CGPA or 60% required to apply for merit scholarships." |
| `annualIncome` | `<select>` (conditional) | Required if scholarship checked | Required if scholarship checked, must match income brackets | "Please select your annual family income bracket." |

---

## 6. Files Created or Modified

```
src/
  utils/
    validation.js           ← Added evaluatePasswordStrength, validateStudentTask4, VALID_ROOM_TYPES, VALID_DIETARY, VALID_INCOME_BRACKETS
  controllers/
    student.controller.js   ← Integrated bcrypt password hashing & conditional fields persistence

views/
  pages/
    register.ejs            ← Added Password Meter, Checklist, Visibility toggles, Hostel & Scholarship sub-forms, Review modal
    student-detail.ejs      ← Added Bcrypt Account badge, Hostel card, Scholarship card

public/
  css/style.css             ← Password progress bar, checklist classes, toggle buttons, modal dark theme
  js/main.js                ← Password strength engine, eye toggles, conditional DOM revealers, review modal handler

tests/
  task1.test.js             ← 19 passing tests (verified)
  task2.test.js             ← 15 passing tests (verified)
  task3.test.js             ← 10 passing tests (verified)
  task4.test.js             ← 8 automated tests for Task 4

docs/
  TASK_4.md                 ← Comprehensive documentation (this file)
  LEVEL_2/README.md         ← Updated Level 2 summary
```

---

## 7. How to Run and Verify

```powershell
# Navigate to project folder
cd "c:\Users\shubh\OneDrive\Desktop\Cognifyz"

# Run all 52 automated tests
npm test

# Run Task 4 tests specifically
node --test tests/task4.test.js

# Start development server
npm run dev
```

Open http://localhost:3000/students/register in your browser:
1. Type `Secret@123` into the Password field and watch the progress bar and checklist update dynamically.
2. Click the eye icon to inspect your password.
3. Toggle the Hostel Accommodation switch ON and fill in the revealed room and emergency details.
4. Toggle the Merit Scholarship switch ON and enter your CGPA.
5. Click `"Review & Submit Registration"` to trigger the confirmation modal and submit!

---

## 8. Automated Testing Results

All 52 automated tests across all four tasks pass:

```
> cognifyz-student-portal@1.0.0 test
> node --test tests/**/*.test.js

✔ Task 1 — Express Server and EJS Rendering (10 tests)
✔ Task 1 — Server-side Validation Logic (9 tests)
✔ Task 2 — Extended Fields, Validation & Profile Features (5 tests)
✔ Task 2 — Age Calculation Helper (2 tests)
✔ Task 2 — Server-side Validation Unit Rules (8 tests)
✔ Task 3 — Responsive Design, Search/Filter & Layout Polish (10 tests)
✔ Task 4 — Dynamic DOM, Password Security & Conditional Forms (6 tests)
✔ Task 4 — evaluatePasswordStrength Unit Tests (2 tests)

ℹ tests 52 | suites 8 | pass 52 | fail 0
ℹ duration_ms 692.35ms
```

---

## 9. Key Learnings & Common Pitfalls

- **Pitfall**: Validating conditional sub-fields even when the parent toggle switch is OFF.  
  *Solution*: Check `hasHostel` and `hasScholarship` flags first, validating sub-fields only when the respective service is enabled.
- **Pitfall**: Storing plaintext passwords alongside hashes.  
  *Solution*: Only store `passwordHash: await bcrypt.hash(password, 10)`, never storing the plaintext `password` property.
- **Pitfall**: Password visibility toggle changing input type to text but leaving form submission broken.  
  *Solution*: Both `type="password"` and `type="text"` transmit standard values in form submissions, but resetting to password before submission maintains security.

---

## 10. Next Steps (Task 5 Preview)
In **Task 5 (Level 3: RESTful API and Front-End Integration)**, we will:
- Build complete RESTful JSON endpoints (`GET /api/v1/students`, `POST /api/v1/students`, `GET /api/v1/students/:id`, `PUT /api/v1/students/:id`, `DELETE /api/v1/students/:id`).
- Add client-side `fetch()` integration with asynchronous UI updates.
- Create interactive API documentation and testing tools.
