# User Stories — Add New Employee
**Feature:** Add Employee Flow | **Module:** PIM | **System:** OrangeHRM
**Derived from:** OrangeHRM_Add_Employee_BRD.doc v1.0

---

### US-01: Access the Add Employee Form
**As a** System Admin (HR),
**I want to** navigate to the Add Employee form via the PIM module,
**So that** I can access the employee onboarding functionality in a role-restricted area.

**Acceptance Criteria:**
* **AC1:** A System Admin who is authenticated can navigate to PIM → Add Employee and the form is displayed.
* **AC2:** The form contains: First Name (mandatory), Middle Name (optional), Last Name (mandatory), Employee Id (auto-generated, mandatory), Profile Picture (optional), Create Login Details toggle.
* **AC3:** The "Save" button and "Cancel" button are both visible on the form at all times.

---

### US-02: Successfully Add a New Employee
**As a** System Admin (HR),
**I want to** fill in the mandatory employee details and submit the form,
**So that** a new employee record is saved to the database and onboarding is confirmed.

**Acceptance Criteria:**
* **AC1:** Filling in First Name, Last Name, and a valid Employee Id then clicking "Save" persists the record.
* **AC2:** After a successful save, a green toast notification containing "Successfully Saved" appears at the bottom of the screen.
* **AC3:** After saving, the system redirects the Admin to the Personal Details view of the new employee (URL contains `viewPersonalDetails`).

---

### US-03: Override Auto-Generated Employee Id
**As a** System Admin (HR),
**I want to** manually override the auto-generated Employee Id before saving,
**So that** I can assign a specific ID that matches company conventions.

**Acceptance Criteria:**
* **AC1:** The Employee Id field is pre-populated with an auto-generated numerical value on form load.
* **AC2:** The Admin can clear the auto-generated value and type a custom ID.
* **AC3:** Saving with the custom ID creates the record using that ID and the Personal Details page reflects it.

---

### US-04: Validate Mandatory Fields on Save
**As a** System Admin (HR),
**I want to** receive clear in-line validation messages when I attempt to save with empty mandatory fields,
**So that** data integrity is maintained and I know which fields require attention.

**Acceptance Criteria:**
* **AC1:** Clicking "Save" with First Name empty prevents record creation and shows a red "Required" message beneath the First Name field.
* **AC2:** Clicking "Save" with Last Name empty prevents record creation and shows a red "Required" message beneath the Last Name field.
* **AC3:** Clicking "Save" with all mandatory fields empty simultaneously shows "Required" messages beneath each empty mandatory field.

---

### US-05: Cancel Employee Creation
**As a** System Admin (HR),
**I want to** cancel the Add Employee form without saving,
**So that** I can discard accidentally entered data and return to the Employee List without creating a partial record.

**Acceptance Criteria:**
* **AC1:** A "Cancel" button is visible next to the "Save" button at all times.
* **AC2:** Clicking "Cancel" discards all entered data — no employee record is created.
* **AC3:** After clicking "Cancel", the user is routed to the Employee List view (URL contains `viewEmployeeList`).
