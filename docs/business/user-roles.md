# User Roles

## Roles

| Role | Description |
|---|---|
| `GUEST` | Not logged in — can browse catalog and free previews only |
| `CUSTOMER` | Logged in — can buy, read/use purchased content |
| `PREMIUM` | Future — can download ebooks |
| `MERCHANT` | Seller — can upload and manage their own content, view their own earnings |
| `ADMIN` | Full platform access — upload content, manage all users, approve payments, view all earnings |

## What each role can do

### GUEST
- Browse catalog (published products only)
- View product detail pages
- Read free preview pages (if `previewPages > 0` on the product)
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

### MERCHANT
- Everything CUSTOMER can do
- Upload ebooks and tarot decks (via presigned R2 URLs)
- Publish / unpublish / delete **their own** products
- View their own earnings (gross / commission / net)
- UI: sees "My Store" section in nav → `/store`

### ADMIN
- Everything MERCHANT can do (including upload and manage their own content)
- View **all** products across all merchants
- Publish / unpublish / delete **any** product
- View pending payment orders across all customers
- Approve or reject payment slips → grants library access on approval
- Set bank name, account number, PromptPay QR image, commission rate
- View all merchant earnings (platform-wide payout overview)
- Search users by email and change their role
- UI: sees both "My Store" (`/store`) and "Admin" (`/admin`) in nav

## Role assignment

- New registrations default to `CUSTOMER`
- Role can be changed by ADMIN via the Users page (`/admin/users`) — search by email, then set role
- ADMIN role must be bootstrapped manually via Prisma Studio on first deploy (no self-promotion)

## UI navigation by role

| Role | Nav items |
|---|---|
| CUSTOMER / PREMIUM | Catalog, My Library, Profile |
| MERCHANT | Catalog, My Library, Profile, **My Store** |
| ADMIN | Catalog, My Library, Profile, **My Store**, **Admin** |

**My Store** (`/store`) — seller tools: Upload content, My products, My earnings

**Admin** (`/admin`) — platform tools: Pending payments, Payment config, Users
