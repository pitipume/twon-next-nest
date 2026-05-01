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

## POST /api/auth/logout

Requires: `Authorization: Bearer {accessToken}`

**Success (200):**
```json
{ "code": "A001", "status": "success", "data": null }
```
Clears `refresh_token` cookie. Revokes token in DB.
