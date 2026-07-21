# Issue #5: Login/Register UI - Development Guide

**Branch**: `feature/5-login-register-ui`  
**Story Points**: 5  
**Estimated Time**: 4-6 hours

---

## 📋 Task Overview

Create responsive, user-friendly Login and Registration pages using Next.js, Tailwind CSS, and Shadcn UI components. Integrate with the backend API.

### User Story
**As a** user  
**I want** an intuitive login and registration interface  
**So that** I can easily access the platform

---

## ✅ Acceptance Criteria

- [ ] Login page created (`/login`)
- [ ] Registration page created (`/register`)
- [ ] Client-side form validation (email format, password min length)
- [ ] Error messages displayed clearly
- [ ] Loading states (spinner/disabled buttons)
- [ ] Successful login redirects to dashboard
- [ ] Successful registration auto-logs in OR redirects to login
- [ ] Mobile-friendly responsive design

---

## 🛠️ Implementation Steps

### Step 1: Verify Dependencies

Ensure we have the required libraries:
```bash
npm install react-hook-form @hookform/resolvers zod axios clsx tailwind-merge
npm install lucide-react
```

### Step 2: Set Up UI Components (Shadcn UI)

If not fully installed, we need basic components:
- Application Shell / Layout (if needed)
- `Button`
- `Input`
- `Label`
- `Card`
- `Form` (from shadcn methods)
- `Toast` (Sonner or similar)

### Step 3: Create API Service

Create `frontend/services/auth.ts`:
- `login(credentials)`
- `register(userData)`
- `logout()`
- Helper to manage tokens (localStorage/Cookies)

### Step 4: Create Login Page (`frontend/app/login/page.tsx`)

- Use `zod` for schema:
  ```typescript
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
  })
  ```
- Use `react-hook-form`
- Handle API errors (401, 500)

### Step 5: Create Registration Page (`frontend/app/register/page.tsx`)

- Schema with `confirmPassword` and `role` (optional default)
- Fields: First Name, Last Name, Email, Password, Confirm Password
- Handle API errors (duplicate email)

### Step 6: Test & Polish

- Verify responsive layout
- Check tab order and accessibility
- Verify redirection after success

---

## 🎨 Design Guidelines

- **Style**: Clean, modern, professional (EdTech)
- **Colors**: Use primary brand colors (likely Blue/Indigo)
- **Layout**: Centered card on desktop, full width on mobile
- **Feedback**: Use Toast notifications for success/error

---

## 🔄 Execution Plan

1.  Check existing `frontend` structure.
2.  Install missing dependencies.
3.  Generate Shadcn components (if missing).
4.  Implement `auth` service.
5.  Build Login Page.
6.  Build Register Page.
7.  Manual Verification.
