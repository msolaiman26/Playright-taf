# Manual Test Cases — Add New Employee
**Feature:** Add Employee Flow | **Module:** PIM | **System:** OrangeHRM
**Derived from:** Add_Employee_UserStories.md

---

### Story: US-01

---

**Test Case ID:** TC-01.1: Navigate to Add Employee Form as System Admin
**Type:** Positive
**Preconditions:** User is logged in as System Admin (username: Admin, password: admin123) and is on the Dashboard.
**Steps:**
1. Navigate to `https://opensource-demo.orangehrmlive.com/web/index.php/pim/addEmployee`.
2. Observe the Add Employee form.
**Expected Result:** URL contains `/pim/addEmployee`. First Name, Middle Name, Last Name, Employee Id fields are visible. Save and Cancel buttons are visible.

---

**Test Case ID:** TC-01.2: Verify Employee Id is Auto-Populated on Form Load
**Type:** Positive
**Preconditions:** User is logged in as Admin and has just navigated to the Add Employee form.
**Steps:**
1. Observe the "Employee Id" input field immediately after the form loads.
**Expected Result:** The "Employee Id" field is not empty — it contains a numerical value.

---

### Story: US-02

---

**Test Case ID:** TC-02.1: Add Employee with Mandatory Fields Only — Success Toast and Redirect
**Type:** Positive
**Preconditions:** User is logged in as Admin and is on the Add Employee form.
**Steps:**
1. Enter "John" into the "First Name" field.
2. Leave "Middle Name" empty.
3. Enter "Doe" into the "Last Name" field.
4. Leave "Employee Id" as the auto-generated value.
5. Click the "Save" button.
**Expected Result:** Green toast notification appears containing "Successfully Saved". URL changes to contain `viewPersonalDetails`.

---

**Test Case ID:** TC-02.2: Add Employee Including Optional Middle Name
**Type:** Positive
**Preconditions:** User is logged in as Admin and is on the Add Employee form.
**Steps:**
1. Enter "Jane" into the "First Name" field.
2. Enter "Marie" into the "Middle Name" field.
3. Enter "Smith" into the "Last Name" field.
4. Click the "Save" button.
**Expected Result:** Green "Successfully Saved" toast appears. URL changes to contain `viewPersonalDetails`.

---

**Test Case ID:** TC-02.3: Verify Redirect to Personal Details After Save
**Type:** Positive
**Preconditions:** User is logged in as Admin and is on the Add Employee form.
**Steps:**
1. Enter "Alice" into the "First Name" field.
2. Enter "Walker" into the "Last Name" field.
3. Click the "Save" button.
**Expected Result:** URL contains `viewPersonalDetails/empNumber/` followed by a numeric ID.

---

### Story: US-03

---

**Test Case ID:** TC-03.1: Override Employee Id and Save Successfully
**Type:** Positive
**Preconditions:** User is logged in as Admin and is on the Add Employee form.
**Steps:**
1. Enter "Bob" into the "First Name" field.
2. Enter "Taylor" into the "Last Name" field.
3. Clear the "Employee Id" field and type "EMP9999".
4. Click the "Save" button.
**Expected Result:** Green "Successfully Saved" toast appears. URL changes to contain `viewPersonalDetails`.

---

### Story: US-04

---

**Test Case ID:** TC-04.1: Save with Empty First Name — Required Validation
**Type:** Negative
**Preconditions:** User is logged in as Admin and is on the Add Employee form.
**Steps:**
1. Leave "First Name" empty.
2. Enter "Williams" into "Last Name".
3. Click the "Save" button.
**Expected Result:** Form does not submit. Red "Required" message appears beneath the First Name field. URL remains `/pim/addEmployee`.

---

**Test Case ID:** TC-04.2: Save with Empty Last Name — Required Validation
**Type:** Negative
**Preconditions:** User is logged in as Admin and is on the Add Employee form.
**Steps:**
1. Enter "Chris" into "First Name".
2. Leave "Last Name" empty.
3. Click the "Save" button.
**Expected Result:** Form does not submit. Red "Required" message appears beneath the Last Name field. URL remains `/pim/addEmployee`.

---

**Test Case ID:** TC-04.3: Save with All Mandatory Fields Empty — All Required Validations
**Type:** Negative / Boundary
**Preconditions:** User is logged in as Admin and is on the Add Employee form. Employee Id has been cleared.
**Steps:**
1. Ensure "First Name" is empty.
2. Ensure "Last Name" is empty.
3. Clear the "Employee Id" field.
4. Click the "Save" button.
**Expected Result:** "Required" messages appear beneath First Name, Last Name, and Employee Id simultaneously. URL remains `/pim/addEmployee`.

---

### Story: US-05

---

**Test Case ID:** TC-05.1: Cancel with Data Entered — Routes to Employee List
**Type:** Positive
**Preconditions:** User is logged in as Admin and is on the Add Employee form.
**Steps:**
1. Enter "Cancel" into "First Name".
2. Enter "Test" into "Last Name".
3. Click the "Cancel" button.
**Expected Result:** URL changes to contain `viewEmployeeList`.

---

**Test Case ID:** TC-05.2: Cancel with Empty Form — Routes to Employee List
**Type:** Positive
**Preconditions:** User is logged in as Admin and is on the Add Employee form. No data entered.
**Steps:**
1. Click "Cancel" without entering any data.
**Expected Result:** URL changes to contain `viewEmployeeList`.
