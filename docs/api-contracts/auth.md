# API Contract — Auth

Base path: `/api/auth`

All responses follow the standard envelope:
```json
{ "code": "A001", "status": "success", "data": {} }
{ "code": "A002", "status": "failure", "message": "..." }
```

---

## POST /api/auth/register/initiate

Start registration — generates OTP and sends to email.

> **Note:** Password is NOT sent here — it is sent at the verify step.

**Request body:**
```json
{
  "email": "user@example.com",
  "displayName": "Poom"
}
```

**Success (200):**
```json
{ "code": "A001", "status": "success", "data": null }
```

**Errors:**
- `A409` — email already registered

---

## POST /api/auth/register/verify

Verify OTP and create account. Password is set here.

**Request body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "password": "min8chars"
}
```

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "Poom",
      "role": "CUSTOMER"
    }
  }
}
```
Sets `refresh_token` HttpOnly cookie (7 days).

**Errors:**
- `A002` — invalid or expired OTP
- `A002` — too many attempts (locked 15 min)

---

## POST /api/auth/login

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": {
    "accessToken": "eyJ...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "Poom",
      "role": "CUSTOMER"
    }
  }
}
```
Sets `refresh_token` HttpOnly cookie.

**Errors:**
- `A401` — invalid credentials

---

## POST /api/auth/refresh

Uses `refresh_token` HttpOnly cookie. No request body needed.

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": {
    "accessToken": "eyJ..."
  }
}
```
Rotates and sets new `refresh_token` HttpOnly cookie.

**Errors:**
- `A401` — invalid or expired refresh token

---

## GET /api/auth/google

Redirects the browser to Google's OAuth consent screen. Gated by `FEATURE_GOOGLE_AUTH_ENABLED` — returns `404` when the flag is off.

---

## GET /api/auth/google/callback

Google redirects here after consent. Not called directly by the frontend.

Finds or creates the user (matches by `googleId`, then falls back to linking by `email` — Google-verified emails are trusted for auto-linking to an existing password account), issues tokens, sets the `refresh_token` HttpOnly cookie, then redirects the browser to:

- Success: `{FRONTEND_URL}/auth/google/callback?accessToken=eyJ...`
- Failure: `{FRONTEND_URL}/auth/login?error=google_auth_failed`

The frontend's `/auth/google/callback` page reads `accessToken` from the query string, stores it, and calls `GET /api/auth/me` to load the user.

Gated by `FEATURE_GOOGLE_AUTH_ENABLED` — returns `404` when the flag is off.

---

## POST /api/auth/logout

Requires: `Authorization: Bearer {accessToken}`

**Success (200):**
```json
{ "code": "A001", "status": "success", "data": null }
```
Clears `refresh_token` cookie. Revokes token in DB.
