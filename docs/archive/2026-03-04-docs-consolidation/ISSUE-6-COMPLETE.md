# Issue #6: Frontend Protected Route Middleware - COMPLETE

**Status**: ✅ Done
**PR**: [#14](https://github.com/manyal12345/E-LearningWebApp/pull/14)
**Merged**: Yes

## ✅ Acceptance Criteria verified
- [x] Middleware checks `access_token` cookie
- [x] Redirects to `/login` if missing
- [x] Uses `jose` for Edge-compatible JWT decoding
- [x] Implements Role-Based access (`/admin` vs `/student`)
- [x] Handles root `/` redirection to role-specific dashboards

## 🛠️ Implementation Details
- **File**: `frontend/middleware.ts`
- **Tech**: Next.js Middleware (Edge Runtime)

## 🚀 Next Steps
Recommended: **Issue #8: User Profile Management** - Allow users to view/edit their profile.
