# Data Model — Library

## LibraryItem (PostgreSQL — Prisma)

One record per user per product purchased. Created when admin approves payment.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key → User |
| `productId` | UUID | Foreign key → Product |
| `orderId` | UUID | Which order granted this access |
| `grantedAt` | datetime | When access was granted (= payment approval time) |

Unique constraint: `(userId, productId)` — no duplicate access grants.

## ReadingProgress (MongoDB — Mongoose)

Tracks where a user is in an ebook. One doc per user per ebook.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | string | PostgreSQL User ID |
| `productId` | string | PostgreSQL Product ID |
| `currentPage` | number | Last page the user was on (default: 1) |
| `totalPages` | number | Total pages in the ebook |
| `percentComplete` | number | Calculated: `round((currentPage / totalPages) * 100)` |
| `lastReadAt` | datetime | When user last read this ebook |
| `bookmarks` | object[] | `[{ page: number, note: string, createdAt: Date }]` |
| `createdAt` | datetime | Mongoose timestamps |
| `updatedAt` | datetime | Mongoose timestamps |

## Notes

- `LibraryItem` is created with `skipDuplicates: true` — safe to call multiple times
- Purchases are permanent — no expiry, no revocation (except future refund flow)
- `ReadingProgress` is optional — if missing, ebook reader starts at page 1
- Tarot decks have no reading progress — each session starts fresh
