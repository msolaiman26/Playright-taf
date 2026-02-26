# Add New Employee Flow — User Stories

**Module:** Personal Information Management (PIM)
**Version:** 1.0

---

### US-01: Navigate to Add Employee Form
**As a** System Admin (HR),
**I want to** navigate to the "Add Employee" tab within the PIM module,
**So that** I can access the form to onboard new employees into the system.

**Acceptance Criteria:**
* **AC1:** The PIM module is accessible from the main side navigation menu.
* **AC2:** The "Add Employee" tab is visible in the top navigation of the PIM module.
* **AC3:** Only authenticated System Admin users can access Add Employee; unauthenticated users are redirected to the login page.

---

### US-02: View and Override Auto-Generated Employee ID
**As a** System Admin (HR),
**I want to** see an auto-generated Employee ID when the form loads and optionally override it,
**So that** every employee record has a unique identifier without manual effort.

**Acceptance Criteria:**
* **AC1:** The Employee ID field is pre-populated with an auto-generated numeric value when the Add Employee form loads.
* **AC2:** The Admin can clear and override the auto-generated Employee ID with a custom value.
* **AC3:** Employee ID is a mandatory field; leaving it empty prevents save and shows a "Required" message.

---

### US-03: Fill in Mandatory Employee Details
**As a** System Admin (HR),
**I want to** fill in the First Name, Last Name, and Employee ID fields on the Add Employee form,
**So that** a valid and uniquely identified employee record can be created.

**Acceptance Criteria:**
* **AC1:** The form displays First Name, Middle Name, Last Name, and Employee ID input fields.
* **AC2:** First Name, Last Name, and Employee ID are mandatory; the form cannot be saved without them.
* **AC3:** Middle Name and Profile Picture are optional and can be left blank without affecting save.

---

### US-04: Validate Mandatory Fields on Save
**As a** System Admin (HR),
**I want to** see a validation error for each empty mandatory field when I click Save,
**So that** I am prevented from creating incomplete employee records.

**Acceptance Criteria:**
* **AC1:** If First Name is empty when Save is clicked, a red "Required" message appears beneath First Name and the record is not saved.
* **AC2:** If Last Name is empty when Save is clicked, a red "Required" message appears beneath Last Name and the record is not saved.
* **AC3:** If Employee ID is empty when Save is clicked, a red "Required" message appears beneath Employee ID and the record is not saved.

---

### US-05: Successfully Add a New Employee
**As a** System Admin (HR),
**I want to** save a new employee record after filling in all mandatory fields,
**So that** the employee is added to the system database and immediately accessible.

**Acceptance Criteria:**
* **AC1:** Clicking Save with all mandatory fields filled creates the employee record in the database.
* **AC2:** A temporary green toast notification containing "Successfully Saved" appears after a successful save.
* **AC3:** The system automatically navigates the user to the "Personal Details" view of the newly created employee (URL contains `viewPersonalDetails`).

---

### US-06: Cancel Employee Creation
**As a** System Admin (HR),
**I want to** cancel the Add Employee form,
**So that** I can discard entered data without creating a record.

**Acceptance Criteria:**
* **AC1:** A "Cancel" button is visible next to the Save button on the Add Employee form.
* **AC2:** Clicking "Cancel" discards all entered data without saving to the database.
* **AC3:** After clicking "Cancel", the user is routed to the Employee List view (URL contains `viewEmployeeList`).
