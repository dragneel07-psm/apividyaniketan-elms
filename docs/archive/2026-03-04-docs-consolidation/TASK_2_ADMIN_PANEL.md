# 🎯 Task 2: Admin Panel - Student Management Testing

## 📋 Objective
Test the Admin Panel's student management features as specified in `SPRINT3-VERIFICATION.md`.

---

## 🧪 Test Plan

### Preparation
- **Login**: `http://localhost:3000/login`
- **Email**: `school_admin@demo.com` (or `admin@demo.com`)
- **Password**: `admin123`

---

## Test Scenarios

### ✅ Scenario 1: View Student List
**Steps**:
1. Navigate to **Academic > Students**
2. Verify students list loads
3. Check for "Student Test" in the list

**Expected Results**:
- Page loads without errors
- Student list displays
- At least 1 student shown (Test Student)
- Columns show: Name, Email, Class, Section, Actions

**Status**: ⏳ **To Be Tested**

---

### ✅ Scenario 2: Create New Student
**Steps**:
1. Click **"Add Student"** button
2. Fill in form:
   - First Name: `New`
   - Last Name: `Student`
   - Email: `verifystudent@demo.com`
   - Password: `password123`
   - Class: `Grade 10`
   - Section: `A`
3. Click **Submit**

**Expected Results**:
- Form validates correctly
- Student created successfully
- Success message displayed
- New student appears in list

**Status**: ⏳ **To Be Tested**

---

### ✅ Scenario 3: Edit Student
**Steps**:
1. Find the newly created student
2. Click **Edit** button
3. Change **Learning Style** to "Auditory"
4. Save changes

**Expected Results**:
- Edit dialog opens with current data
- Changes save successfully
- Updated data reflects in list

**Status**: ⏳ **To Be Tested**

---

### ✅ Scenario 4: Delete Student
**Steps**:
1. Find the test student
2. Click **Delete** button
3. Confirm deletion

**Expected Results**:
- Confirmation dialog appears
- Student deleted successfully
- Student removed from list

**Status**: ⏳ **To Be Tested**

---

## 🔍 Backend APIs to Verify

Before testing, let's verify these endpoints work:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/academic/students/` | GET | List all students |
| `/api/academic/students/` | POST | Create student |
| `/api/academic/students/{id}/` | GET | Get student details |
| `/api/academic/students/{id}/` | PATCH | Update student |
| `/api/academic/students/{id}/` | DELETE | Delete student |
| `/api/academic/classes/` | GET | Get class options |
| `/api/academic/sections/` | GET | Get section options |

---

## 🛠️ Verification Script

Let me create a script to test admin APIs first...
