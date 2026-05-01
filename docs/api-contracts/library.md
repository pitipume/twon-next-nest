# API Contract — Library

Base path: `/api/library`

All endpoints require: `Authorization: Bearer {accessToken}`

> **Note:** NestJS routes use plural forms: `/ebooks/` and `/tarot-decks/`

---

## GET /api/library

Get all purchased items for the logged-in user.

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": [
    {
      "productId": "uuid",
      "productType": "EBOOK",
      "title": "The Art of Tarot",
      "grantedAt": "2025-04-01T00:00:00.000Z"
    }
  ]
}
```

> Response is flat — no nested `product` object. `productType` and `title` are included directly.

---

## GET /api/library/ebooks/:productId/session

Start an ebook reading session. Returns a signed PDF URL.

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": {
    "signedUrl": "https://r2.dev/signed-url...",
    "currentPage": 12,
    "totalPages": 240,
    "percentComplete": 5,
    "bookmarks": [],
    "sessionExpiresIn": 7200
  }
}
```

Notes:
- `signedUrl` is valid for **2 hours** (`sessionExpiresIn` = 7200 seconds)
- `currentPage` is the last saved reading position (1 if never opened)
- `percentComplete` is 0 if no progress saved yet
- `signedUrl` is never a raw R2 URL — always signed

**Errors:**
- `A404` — user does not own this product or product not found

---

## POST /api/library/ebooks/:productId/progress

Save reading progress.

**Request body:**
```json
{ "currentPage": 42, "totalPages": 240 }
```

**Success (200):**
```json
{ "code": "A001", "status": "success", "data": null }
```

---

## GET /api/library/tarot-decks/:productId/session

Start a tarot session. Returns signed URLs for all card images.

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": {
    "deckId": "mongo-object-id",
    "deckName": "Classic Rider Waite",
    "cardCount": 78,
    "backImageUrl": "https://r2.dev/signed...",
    "sessionExpiresIn": 3600,
    "cards": [
      {
        "cardNumber": 0,
        "name": "The Fool",
        "nameTh": "คนโง่",
        "suit": "major",
        "imageUrl": "https://r2.dev/signed...",
        "uprightMeaning": "New beginnings...",
        "reversedMeaning": "Recklessness...",
        "keywords": ["beginnings", "innocence", "spontaneity"]
      }
    ]
  }
}
```

Notes:
- `imageUrl` is a signed URL valid for **1 hour** (`sessionExpiresIn` = 3600 seconds)
- `imageKey` (R2 key) is **never** included in the response
- `nameTh` is the Thai name of the card (optional — may be empty string)
- `deckId` is the MongoDB `_id` of the deck

**Errors:**
- `A404` — user does not own this product
