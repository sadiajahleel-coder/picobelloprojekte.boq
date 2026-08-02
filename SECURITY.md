# Security Hardening — SquareMetre BOQ System

**Date:** 2026-05-08  
**Commit:** `6d14e63`  
**Scope:** 10 files changed across backend middleware, controllers, routes, and frontend

---

## What Was Already in Place (Before This Update)

| Area | Status |
|---|---|
| Password hashing (bcryptjs, 12 rounds) | ✅ |
| Separate JWT access + refresh secrets | ✅ |
| Rate limiting (auth / API / upload) | ✅ |
| CORS origin whitelist | ✅ |
| Helmet (CSP + HSTS with preload) | ✅ |
| Input validation (express-validator) | ✅ |
| Role-based access control (admin / staff) | ✅ |
| Immutable audit log | ✅ |
| S3 upload MIME whitelist + 10 MB cap | ✅ |
| Global error handler + Sentry integration | ✅ |
| `getUserStats` self-or-admin check | ✅ |
| `password` field `select: false` + stripped from `toJSON` | ✅ |

---

## Changes Made

### 1. Authentication

**File:** `backend/src/middleware/auth.js`

- Access token default expiry reduced from **24 hours → 15 minutes** (still configurable via `JWT_EXPIRES_IN`). A stolen token now has a tiny validity window.
- `authenticate()` no longer fetches the user with `.select('+password')` — the password hash was being loaded from the database on every single authenticated request, which was both wasteful and unnecessarily exposed the hash in memory.

**File:** `backend/src/controllers/authController.js`

- Failed login attempts now log the specific failure reason (`user_not_found`, `account_inactive`, `wrong_password`) to Winston — useful for anomaly detection without revealing anything to the caller.
- Both "user not found" and "account inactive" cases return the same `"Invalid credentials"` response, preventing user enumeration.

---

### 2. Authorization

**File:** `backend/src/middleware/rbac.js`

- Removed `required: roles` and `current: req.user.role` from the 403 error response. The old response told attackers exactly what role an account has and what role is needed. Now it only returns `"Insufficient permissions"`.

**File:** `backend/src/routes/auth.js`

- Added `param('id').isMongoId()` validation to all `:id` routes. Malformed IDs now return a clean 400 instead of a cryptic Mongoose CastError 500.

---

### 3. API Security — Versioning

**File:** `backend/src/index.js`

- All routes now mounted under `/api/v1`. The `/api` prefix is kept as a backward-compatibility alias so nothing breaks.
- Every request receives an `X-Request-ID` response header (UUID generated server-side, or forwarded from `X-Request-ID` if provided by the caller). This allows any log entry to be traced back to its originating request.

```
Before: /api/auth/login
After:  /api/v1/auth/login  (and /api/auth/login still works)
```

**File:** `frontend/src/lib/api.ts`

- `apiClient` base URL updated from `/api` → `/api/v1`.

---

### 4. Database Security — NoSQL Injection Protection

**File:** `backend/src/middleware/sanitize.js` *(new)*

- `mongoSanitize` middleware runs on every request. It recursively strips any key that starts with `$` or contains `.` from `req.body` and `req.query`.
- Blocks attacks like:
  ```json
  { "email": { "$gt": "" }, "password": { "$gt": "" } }
  ```
  which would otherwise match every user in MongoDB and bypass login.
- Applied globally in `index.js` before any route handler.

---

### 5. Input Validation

**File:** `backend/src/routes/auth.js`

- `param('id').isMongoId()` added to every route that takes a user ID.
- `body('rating').isFloat({ min: 0, max: 5 })` enforced at route level (was only checked in the controller).
- `body('comment').trim().notEmpty().isLength({ max: 1000 })` enforced at route level.
- Delete-account route validates that `confirmPhrase` equals `"DELETE MY ACCOUNT"` before the controller runs.

---

### 6. Rate Limiting

**File:** `backend/src/middleware/rateLimiter.js`

- `authLimiter` gains `skipSuccessfulRequests: true`. Previously a correct password counted against the 10-attempt budget. Now only failed attempts count — legitimate users are never locked out by their own successful logins.
- New `deletionLimiter`: **3 attempts per hour** applied to `DELETE /auth/account` and `DELETE /auth/users/:id`. Prevents brute-forcing the password confirmation on the deletion endpoint.

---

### 7. Environment Security — CORS

**File:** `backend/src/index.js`

- `localhost:3000` and `localhost:3001` are now **excluded from the allowed origins list in production** (`NODE_ENV === 'production'`). In production only the configured `FRONTEND_URL` environment variable is permitted.

```js
// Before
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',        // always present — bug
];

// After
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'];
```

---

### 8. Error Handling

**File:** `backend/src/middleware/errorHandler.js`

| Bug / Gap | Fix |
|---|---|
| `err.code === '11000'` (string) never matched MongoDB's numeric `11000` — duplicate key errors silently returned 500 | Changed to `err.code === 11000` (number) — now correctly returns 409 |
| `CastError` (invalid ObjectId in URL param) returned a 500 with internal Mongoose details | Now returns `400 Invalid ID format` |
| `JsonWebTokenError` / `TokenExpiredError` could bubble up as 500 if not caught in middleware | Now explicitly caught and returns 401 |
| Production 500 responses echoed the internal `err.message` | Generic `"Internal server error"` returned in production for status 500 |
| Stack traces logged even in production | Stack trace only included in log output in development |

---

### 9. Logging

**File:** `backend/src/controllers/authController.js`

New audit log entries created for actions that previously had none:

| Action constant | Trigger |
|---|---|
| `USER_PROFILE_UPDATED` | `PATCH /auth/profile` |
| `USER_PASSWORD_CHANGED` | `PATCH /auth/profile/password` |
| `USER_RATING_UPDATED` | `PATCH /auth/users/:id/rating` |
| `USER_ACCOUNT_DELETED` | `DELETE /auth/account` and `DELETE /auth/users/:id` |

Every error log entry now includes `requestId` for cross-referencing with the `X-Request-ID` response header.

---

### 10. App Store Requirements — Account Deletion & Data Portability

Required by Apple App Store, Google Play, GDPR, and CCPA.

#### New endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/auth/me/export` | Any authenticated user | Download JSON of all personal data |
| `DELETE` | `/api/v1/auth/account` | Any authenticated user | Permanently delete own account |
| `DELETE` | `/api/v1/auth/users/:id` | Admin only | Permanently delete any user's account |

#### What deletion does (in order)

1. Verifies the caller's password and (for self-deletion) the confirmation phrase `"DELETE MY ACCOUNT"`.
2. Creates a final `USER_ACCOUNT_DELETED` audit entry before the user record disappears.
3. Anonymises PII (`userEmail`, `userName`, `employeeId`) in all historical audit log entries for that user. Uses `AuditLog.collection.updateMany()` directly to bypass the Mongoose immutability hooks, which are intended to block accidental edits — not legitimate GDPR erasure.
4. Deletes all `EmployeeComment` documents that target or were authored by the user.
5. Hard-deletes the `User` document.

Product and defect records that reference the deleted user are intentionally kept — they are operational records, and their ObjectId references simply resolve to `null` after deletion.

#### Data export response shape

```json
{
  "exportedAt": "2026-05-08T00:00:00.000Z",
  "profile": {
    "employeeId": "EMP001",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "department": "Site Operations",
    "about": "...",
    "role": "staff",
    "createdAt": "...",
    "lastLogin": "...",
    "loginCount": 42
  },
  "activityLog": [
    { "action": "USER_LOGIN", "entityType": "user", "timestamp": "...", "ipAddress": "...", "details": {} }
  ],
  "managerComments": [
    { "comment": "Great work this quarter.", "authorName": "Admin", "createdAt": "..." }
  ]
}
```

#### Settings page UI

**File:** `frontend/src/app/(dashboard)/settings/page.tsx`

Added a **"Privacy & Data"** card with:
- **Export my data** button — downloads the JSON response as a `.json` file.
- **Delete account** button — opens a modal that requires both the user's current password and the exact phrase `DELETE MY ACCOUNT` before the confirm button becomes active. On success, clears session storage and redirects to `/login`.

---

## Files Changed

```
backend/src/middleware/sanitize.js        ← NEW
backend/src/middleware/auth.js
backend/src/middleware/errorHandler.js
backend/src/middleware/rateLimiter.js
backend/src/middleware/rbac.js
backend/src/controllers/authController.js
backend/src/routes/auth.js
backend/src/index.js
frontend/src/lib/api.ts
frontend/src/app/(dashboard)/settings/page.tsx
```

---

## Environment Variables

No new required variables. One default changed:

| Variable | Old default | New default | Notes |
|---|---|---|---|
| `JWT_EXPIRES_IN` | `24h` | `15m` | Set to a longer value in `.env` if needed |

Ensure `FRONTEND_URL` is set correctly on the backend Render service — it is now the **sole** allowed CORS origin in production.
