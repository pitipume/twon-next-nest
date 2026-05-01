# Data Model — User & Auth

## User (PostgreSQL — Prisma)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | string | Unique |
| `displayName` | string | Shown in UI |
| `passwordHash` | string | bcrypt hashed |
| `role` | enum | GUEST / CUSTOMER / PREMIUM / ADMIN / SUPER_ADMIN |
| `isEmailVerified` | boolean | Set to true after OTP verification |
| `isActive` | boolean | Soft disable without deleting |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

## RefreshToken (PostgreSQL — Prisma)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key → User |
| `tokenHash` | string | SHA-256 hash of the actual token |
| `expiresAt` | datetime | 7 days from creation |
| `revokedAt` | datetime? | Set on logout or rotation |
| `createdAt` | datetime | |

## OTP (Redis only — not persisted in SQL)

| Key pattern | Value | TTL |
|---|---|---|
| `otp:{email}` | SHA-256 hash of 6-digit code | 5 minutes |
| `otp:attempts:{email}` | attempt count (max 3) | 5 minutes |
| `otp:lockout:{email}` | "locked" string | 15 minutes |

## Notes

- Refresh token is rotated on every use — old one is revoked, new one issued
- OTP is never stored in plain text — only the SHA-256 hash
- User is created only after OTP is verified — not on initiate step
