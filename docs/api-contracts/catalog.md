# API Contract — Catalog

Base path: `/api/catalog`

Public endpoints — no auth required.

---

## GET /api/catalog

List all published products. Optionally filter by type. Paginated.

**Query params:**
| Param | Default | Notes |
|---|---|---|
| `type` | — | `ebook` or `tarot_deck` — omit for all |
| `page` | `1` | Page number |
| `limit` | `20` | Items per page |

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "mongoRefId": "mongo-id",
      "productType": "EBOOK",
      "title": "The Art of Tarot",
      "priceTHB": 299,
      "isPublished": true,
      "author": "Jane Doe",
      "description": "...",
      "coverImageUrl": "https://...",
      "language": "th",
      "categories": ["spirituality"],
      "tags": ["tarot", "beginner"]
    }
  ]
}
```

---

## GET /api/catalog/ebooks/:id

Get ebook detail (enriched with MongoDB metadata).

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": {
    "id": "uuid",
    "productType": "EBOOK",
    "title": "The Art of Tarot",
    "priceTHB": 299,
    "author": "Jane Doe",
    "description": "...",
    "coverImageUrl": "https://...",
    "totalPages": 240,
    "previewPages": 10,
    "language": "th",
    "categories": ["spirituality"],
    "tags": ["tarot", "beginner"]
  }
}
```

**Errors:**
- `A404` — ebook not found or not published

---

## GET /api/catalog/tarot-decks/:id

Get tarot deck detail (enriched with MongoDB metadata).

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": {
    "id": "uuid",
    "productType": "TAROT_DECK",
    "title": "Classic Rider Waite",
    "priceTHB": 499,
    "description": "...",
    "coverImageUrl": "https://...",
    "cardCount": 78
  }
}
```

**Errors:**
- `A404` — tarot deck not found or not published
