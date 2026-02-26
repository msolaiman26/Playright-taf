# Add New Employee Flow — Test Cases

**Module:** Personal Information Management (PIM)
**Version:** 1.0

---

### Story: US-01
**Test Case ID:** TC-01.1: Navigate to PIM Module from Main Navigation
**Type:** Positive
**Preconditions:** User is logged in as System Admin (Admin/admin123) at the OrangeHRM dashboard.
**Steps:**
1. Click "PIM" in the left side navigation menu.
**Expected Result:** The PIM module page loads; the "Employee List" tab is visible and active.

---

### Story: US-01
**Test Case ID:** TC-01.2: Access Add Employee Tab
**Type:** Positive
**Preconditions:** User is on the PIM module page.
**Steps:**
1. Click the "Add Employee" tab in the PIM top navigation bar.
**Expected Result:** The Add Employee form loads and the URL contains `/pim/addEmployee`.

---

### Story: US-02
**Test Case ID:** TC-02.1: Employee ID is Auto-Generated on Form Load
**Type:** Positive
**Preconditions:** User is logged in and navigated to `https://opensource-demo.orangehrmlive.com/web/index.php/pim/addEmployee`.
**Steps:**
1. Observe the "Employee Id" field on the Add Employee form.
**Expected Result:** The "Employee Id" field is pre-populated with a non-empty numeric value.

---

### Story: US-02
**Test Case ID:** TC-02.2: Admin Can Override Auto-Generated Employee ID
**Type:** Positive
**Preconditions:** User is on the Add Employee form.
**Steps:**
1. Clear the "Employee Id" field.
2. Type "99999" into the "Employee Id" field.
**Expected Result:** The "Employee Id" field displays "99999".

---

### Story: US-04
**Test Case ID:** TC-04.1: Save with Empty First Name Shows Required Message
**Type:** Negative
**Preconditions:** User is on the Add Employee form. Last Name is filled; First Name is empty.
**Steps:**
1. Leave the "First Name" field empty.
2. Enter "ValidationLast" in the "Last Name" field.
3. Click the "Save" button.
**Expected Result:** A red "Required" validation message appears beneath the First Name field; no employee record is created.

---

### Story: US-04
**Test Case ID:** TC-04.2: Save with Empty Last Name Shows Required Message
**Type:** Negative
**Preconditions:** User is on the Add Employee form. First Name is filled; Last Name is empty.
**Steps:**
1. Enter "ValidationFirst" in the "First Name" field.
2. Leave the "Last Name" field empty.
3. Click the "Save" button.
**Expected Result:** A red "Required" validation message appears beneath the Last Name field; no employee record is created.

---

### Story: US-04
**Test Case ID:** TC-04.3: Save with Empty Employee ID Shows Required Message
**Type:** Negative
**Preconditions:** User is on the Add Employee form. First Name and Last Name are filled; Employee ID is cleared.
**Steps:**
1. Enter "ValidationFirst" in the "First Name" field.
2. Enter "ValidationLast" in the "Last Name" field.
3. Select all text in the "Employee Id" field and delete it.
4. Click the "Save" button.
**Expected Result:** A red "Required" validation message appears beneath the Employee Id field; no employee record is created.

---

### Story: US-05
**Test Case ID:** TC-05.1: Successful Save with Mandatory Fields Only
**Type:** Positive
**Preconditions:** User is on the Add Employee form.
**Steps:**
1. Enter "AutoTest" in the "First Name" field.
2. Enter "PipelineUser" in the "Last Name" field.
3. Verify the "Employee Id" field is auto-populated.
4. Click the "Save" button.
**Expected Result:** A green toast notification displays "Successfully Saved"; the URL changes to contain `viewPersonalDetails`.

---

### Story: US-05
**Test Case ID:** TC-05.2: Successful Save with All Fields Including Middle Name
**Type:** Positive
**Preconditions:** User is on the Add Employee form.
**Steps:**
1. Enter "AutoFull" in the "First Name" field.
2. Enter "M" in the "Middle Name" field.
3. Enter "PipelineUser" in the "Last Name" field.
4. Click the "Save" button.
**Expected Result:** A green toast notification displays "Successfully Saved"; the URL changes to contain `viewPersonalDetails`.

---

### Story: US-06
**Test Case ID:** TC-06.1: Cancel Discards Data and Routes to Employee List
**Type:** Negative
**Preconditions:** User is on the Add Employee form with some data entered.
**Steps:**
1. Enter "CancelTest" in the "First Name" field.
2. Enter "User" in the "Last Name" field.
3. Click the "Cancel" button.
**Expected Result:** The user is routed to the Employee List view (URL contains `viewEmployeeList`); no employee record named "CancelTest" is created.
