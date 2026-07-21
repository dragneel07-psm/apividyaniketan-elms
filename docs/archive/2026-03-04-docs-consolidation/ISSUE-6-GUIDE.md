# Issue #6: Frontend Protected Route Middleware - Development Guide

**Branch**: `feature/6-protected-route-middleware`  
**Story Points**: 3  
**Estimated Time**: 2 hours

---

## 📋 Task Overview

Implement Next.js Middleware to protect sensitive routes (`/student`, `/teacher`, `/admin`) from unauthorized access.

### User Story
**As a** developer  
**I want** to protect routes that require authentication  
**So that** unauthorized users cannot access them

---

## ✅ Acceptance Criteria

- [ ] `middleware.ts` created in root (or `src/`)
- [ ] Logic checks for `access_token` cookie
- [ ] Redirects to `/login` if token missing on protected routes
- [ ] Public routes (`/login`, `/register`) remain accessible
- [ ] Role-based protection (e.g., Student cannot access `/admin`)
- [ ] Tenant subdomain check (Optional/Bonus for SaaS)

---

## 🛠️ Implementation Steps

### Step 1: Install Dependencies

`npm install jose` (Lightweight JWT library for Edge compatibility)

### Step 2: Create Middleware

**File**: `frontend/middleware.ts`

- Define `protectedRoutes` and `publicRoutes`.
- Logic:
  ```typescript
  import { NextResponse } from 'next/server'
  import type { NextRequest } from 'next/server'
  import { jwtVerify } from 'jose'

  export async function middleware(request: NextRequest) {
      // 1. Check Public Routes
      // 2. Get Cookie 'access_token'
      // 3. Verify Token
      // 4. Check Role
      // 5. Redirect if needed
  }
  ```

### Step 3: Update Auth Library (Optional)

Ensure `lib/auth.ts` sets the cookie path to `/` and consistency. (Already done in Issue #5).

### Step 4: Verify

- Navigate to `/student` without login -> Should go to `/login`.
- Login as Student -> Should go to `/student`.
- Try to access `/admin` as Student -> Should go to `/unauthorized` or `/student`.

---

## 🔄 Execution Plan

1.  Install `jose`.
2.  Implement `middleware.ts`.
3.  Create `/unauthorized` page (if not exists).
4.  Manual Verification.
