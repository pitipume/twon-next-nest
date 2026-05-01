# API Contract — Admin

Base path: `/api/admin`

All endpoints require: `ADMIN` or `SUPER_ADMIN` role

---

## GET /api/admin/products `[Planned — not yet in controller]`

List all products — including unpublished. For the admin product management page.

**Query params:**
| Param | Values | Notes |
|---|---|---|
| `type` | `ebook` / `tarot_deck` | Optional — omit for all |
| `published` | `true` / `false` | Optional — omit for all |

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "productType": "EBOOK",
      "title": "The Art of Tarot",
      "priceTHB": 299,
      "isPublished": false,
      "createdAt": "2025-04-01T00:00:00.000Z"
    }
  ]
}
```

---

## POST /api/admin/ebooks

Upload a new ebook.

**Request:** `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `pdf` | file | Required — PDF file |
| `cover` | file | Optional — cover image (any format, converted to WebP 400×600) |
| `title` | string | Required |
| `author` | string | Required |
| `description` | string | Required |
| `priceTHB` | number | Required |
| `language` | string | Default: "th" |
| `categories` | string | Comma-separated e.g. "fiction,romance" |
| `tags` | string | Comma-separated |
| `previewPages` | number | Default: 0 |

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": { "productId": "uuid", "mongoId": "mongo-id" }
}
```

Product starts as **unpublished**. Admin must publish separately.

---

## POST /api/admin/tarot-decks

Upload a new tarot deck.

**Request:** `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `zip` | file | Required — ZIP of card images |
| `cover` | file | Optional — deck cover image |
| `back` | file | Optional — card back image |
| `name` | string | Required |
| `description` | string | Required |
| `priceTHB` | number | Required |

ZIP naming convention: `00_the_fool.webp`, `01_the_magician.webp`, ...
All images converted to WebP 400×700 on upload.

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": { "productId": "uuid", "mongoId": "mongo-id", "cardCount": 78 }
}
```

---

## PATCH /api/admin/products/:id/publish

Publish a product. Sets `isPublished = true` in both PostgreSQL and MongoDB.

**Success (200):** Updated product record.

---

## PATCH /api/admin/products/:id/unpublish

Unpublish a product. Sets `isPublished = false` in both PostgreSQL and MongoDB.

**Success (200):** Updated product record.

---

## PUT /api/admin/payment-config

Set bank details shown at checkout.

**Request body:**
```json
{
  "bankName": "กสิกรไทย",
  "accountName": "ชื่อบัญชี",
  "accountNumber": "xxx-x-xxxxx-x"
}
```

**Success (200):** Updated PaymentConfig record.

---

## POST /api/admin/payment-config/qr

Upload PromptPay QR image.

**Request:** `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `file` | image | JPEG / PNG / WebP — converted to WebP 400×400 |

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": { "qrImageKey": "payment-config/qr.webp" }
}
```
