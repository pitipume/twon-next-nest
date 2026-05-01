# Core Business Rules

These rules apply to ALL implementations regardless of tech stack.

---

## Content Access

1. **Ebooks cannot be downloaded** unless user has `PREMIUM` role (future feature)
2. **PDF access** is served via short-lived signed URLs — generated fresh per reading session
3. **Signed URLs expire** — 2 hours for ebook sessions, 1 hour for tarot sessions
4. **Raw storage URLs are never exposed** to the client — always backend-generated signed URLs
5. **Tarot card image keys** are never sent to the client — only signed URLs

## Authentication

6. **OTP is 6 digits**, cryptographically random
7. **OTP expires in 5 minutes** — stored as SHA-256 hash in Redis
8. **Max 3 OTP attempts** before 15-minute lockout
9. **Access token** lifetime: 15 minutes (JWT)
10. **Refresh token** lifetime: 7 days — stored as SHA-256 hash in DB, rotated on every use
11. **Refresh token** sent/received via HttpOnly cookie only — never in response body
12. **Logout** revokes the refresh token in DB

## Payments

13. **Payment flow** is strictly: `PENDING → WAITING_APPROVAL → COMPLETED` (or `REJECTED`)
    - `PENDING` — order created, customer has not uploaded slip yet
    - `WAITING_APPROVAL` — customer uploaded slip, waiting for admin
    - `COMPLETED` — admin approved, library access granted
    - `REJECTED` — admin rejected (wrong amount, fake slip, etc.)
14. **Library access is granted automatically** when admin approves — no manual step
15. **Purchases are permanent** — no expiry on purchased library items
16. **Duplicate purchases are prevented** — `skipDuplicates` on library item creation
17. **Payment config** (bank name, account number, QR image) is a singleton record — one row, always updated not inserted

## Content Upload

18. **Tarot decks are uploaded as ZIP** — naming convention: `00_the_fool.webp`, `01_the_magician.webp`
19. **All images converted to WebP** on upload — covers (400×600), card images (400×700), QR (400×400)
20. **PDFs are stored as-is** in R2 — no conversion
21. **Products start as unpublished** — admin must explicitly publish after upload
22. **Publishing mirrors to both PostgreSQL and MongoDB** — both must stay in sync

## Reading Progress

23. **Reading progress is saved per user per ebook** (page number)
24. **Progress is returned** with the ebook session so reader resumes where user left off
