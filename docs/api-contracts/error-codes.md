# API Response Codes

All responses follow this envelope:
```json
{ "code": "A001", "status": "success|failure", "message": "...", "data": {} }
```

---

## Code Reference

| Code | Status | HTTP | Meaning |
|---|---|---|---|
| `A001` | `success` | 200 | Request succeeded |
| `A002` | `failure` | 400 | Validation error or bad request |
| `A401` | `invalid_credentials` | 200 | Invalid email/password or expired token |
| `A404` | `not_found` | 200 | Resource not found |
| `A409` | `conflict` | 200 | Conflict — e.g. duplicate purchase, wrong status |

> **Note:** All responses return HTTP 200. The business outcome lives in `code` + `status`, not the HTTP status code. This is by design — see `apps/api/src/common/response/api-response.ts`.

---

## Examples

**Success:**
```json
{ "code": "A001", "status": "success", "data": { "accessToken": "eyJ..." } }
```

**Validation error:**
```json
{ "code": "A002", "status": "failure", "message": "Invalid or expired OTP." }
```

**Not found:**
```json
{ "code": "A404", "status": "not_found", "message": "Not found" }
```

**Conflict:**
```json
{ "code": "A409", "status": "conflict", "message": "You already own this product." }
```

**Invalid credentials:**
```json
{ "code": "A401", "status": "invalid_credentials", "message": "Invalid email or password" }
```
