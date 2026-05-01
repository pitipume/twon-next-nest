# User Roles

## Roles

| Role | Description |
|---|---|
| `GUEST` | Not logged in — can browse catalog only |
| `CUSTOMER` | Logged in — can buy, read/use purchased content |
| `PREMIUM` | Future — can download ebooks |
| `ADMIN` | Can upload content, manage users, approve payments, view analytics |
| `SUPER_ADMIN` | Full system access |

## What each role can do

### GUEST
- Browse catalog (published products only)
- View product detail pages
- Cannot buy, cannot access library

### CUSTOMER
- Everything GUEST can do
- Buy products (create orders, upload payment slip)
- Access library (items they have purchased)
- Read ebooks in-browser
- Use tarot decks in-browser (shuffle, draw, spread)
- View own order history

### PREMIUM (future)
- Everything CUSTOMER can do
- Download purchased ebooks as PDF

### ADMIN
- Everything CUSTOMER can do
- Upload ebooks (PDF + cover image)
- Upload tarot decks (ZIP of card images + cover + back)
- Publish / unpublish products
- View pending payment orders
- Approve payment → grants library access to customer
- Reject payment with reason
- Set bank name, account number, PromptPay QR image

### SUPER_ADMIN
- Everything ADMIN can do
- Manage admin users
- Full system access

## Role assignment

- New registrations default to `CUSTOMER`
- `ADMIN` must be manually set via database (Prisma Studio) or by `SUPER_ADMIN`
- Only one `SUPER_ADMIN` — set manually on first deploy
