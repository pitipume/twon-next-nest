# Data Model — Products

## Product (PostgreSQL — Prisma)

The "pricing and catalog" record. Links to MongoDB for full metadata.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `mongoRefId` | string | Unique — ID of the MongoDB doc |
| `productType` | enum | EBOOK / TAROT_DECK |
| `title` | string | Duplicated from MongoDB for fast SQL queries |
| `priceTHB` | decimal(10,2) | Price in Thai Baht |
| `isPublished` | boolean | Must be true for customers to see it |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

## Ebook (MongoDB — Mongoose)

Full metadata for an ebook. Referenced by `Product.mongoRefId`.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | MongoDB primary key = `Product.mongoRefId` |
| `postgresProductId` | string | Back-reference to `Product.id` |
| `title` | string | |
| `author` | string | |
| `description` | string | |
| `coverImageUrl` | string | Signed URL (long-lived, 1 year) |
| `fileKey` | string | R2 storage key — never exposed to client |
| `totalPages` | number | |
| `previewPages` | number | How many pages guests/non-buyers can see |
| `language` | string | e.g. "th", "en" |
| `categories` | string[] | e.g. ["fiction", "romance"] |
| `tags` | string[] | |
| `isPublished` | boolean | Mirrors PostgreSQL — kept in sync |
| `publishedAt` | datetime? | Set when first published |
| `createdBy` | string | Admin user ID |

## TarotDeck (MongoDB — Mongoose)

Full metadata for a tarot deck. Referenced by `Product.mongoRefId`.

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | MongoDB primary key = `Product.mongoRefId` |
| `postgresProductId` | string | Back-reference to `Product.id` |
| `name` | string | |
| `description` | string | |
| `coverImageUrl` | string | Signed URL (long-lived) |
| `backImageKey` | string | R2 key for card back image — never exposed |
| `cardCount` | number | Typically 78 |
| `isPublished` | boolean | Mirrors PostgreSQL |
| `publishedAt` | datetime? | |
| `createdBy` | string | Admin user ID |
| `cards` | Card[] | Embedded array — see below |

## Card (embedded in TarotDeck)

| Field | Type | Notes |
|---|---|---|
| `cardNumber` | number | 0-indexed, matches filename order |
| `name` | string | e.g. "The Fool" — parsed from filename |
| `nameTh` | string? | Thai name — optional, can be empty |
| `imageKey` | string | R2 storage key — never exposed to client |
| `uprightMeaning` | string | Can be empty initially |
| `reversedMeaning` | string | Can be empty initially |
| `keywords` | string[] | e.g. ["new beginnings", "innocence"] |
| `suit` | string | "major", "wands", "cups", "swords", "pentacles" |

## Notes

- `fileKey` and `imageKey` are R2 storage keys — backend converts to signed URLs before sending to client
- `coverImageUrl` is a long-lived signed URL (1 year) — safe to cache
- When admin publishes a product, `isPublished` must be set in BOTH PostgreSQL and MongoDB
