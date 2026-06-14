# API Contract — Admin

Base path: `/api/admin`

Default auth: `MERCHANT` or `ADMIN` role required (unless marked `[ADMIN only]`).

Upload flow uses presigned R2 URLs — client uploads files directly to Cloudflare R2, then calls the confirm endpoint with the resulting R2 key.

---

## POST /api/admin/ebooks/upload-urls

Get presigned PUT URLs for direct R2 upload (PDF + cover).

**Auth:** MERCHANT or ADMIN

**Success (200):**
```json
{
  "pdf":   { "url": "https://r2.../signed-put-url", "key": "ebooks/{id}/ebook.pdf" },
  "cover": { "url": "https://r2.../signed-put-url", "key": "ebooks/{id}/cover.webp" }
}
```

Client PUTs the PDF to `pdf.url` and the cover image to `cover.url` directly. URLs expire in 15 minutes.

---

## POST /api/admin/ebooks

Confirm ebook upload after files are in R2. Creates MongoDB doc + Prisma product record.

**Auth:** MERCHANT or ADMIN

**Request body (JSON):**

| Field | Type | Notes |
|---|---|---|
| `title` | string | Required |
| `author` | string | Required |
| `description` | string | Optional |
| `priceTHB` | number | Required |
| `language` | string | Default: "th" |
| `categories` | string | Comma-separated e.g. "fiction,romance" |
| `tags` | string | Comma-separated |
| `previewPages` | number | Default: 0 — pages visible without purchase |
| `pdfKey` | string | Required — R2 key from upload-urls step |
| `coverKey` | string | Optional — R2 key from upload-urls step |
| `totalPages` | number | Parsed client-side via pdfjs-dist |

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": { "productId": "uuid", "mongoId": "mongo-id" }
}
```

Product starts as **unpublished**. Must publish separately.

---

## POST /api/admin/tarot-decks/upload-urls

Get presigned PUT URLs for direct R2 upload (ZIP + cover + card back).

**Auth:** MERCHANT or ADMIN

**Success (200):**
```json
{
  "zip":   { "url": "https://r2.../signed-put-url", "key": "tarot/uploads/{id}.zip" },
  "cover": { "url": "https://r2.../signed-put-url", "key": "tarot/{id}/cover.webp" },
  "back":  { "url": "https://r2.../signed-put-url", "key": "tarot/{id}/back.webp" }
}
```

---

## POST /api/admin/tarot-decks

Confirm tarot deck upload. Backend downloads ZIP from R2, extracts images, converts to WebP, uploads each card, then deletes the ZIP.

**Auth:** MERCHANT or ADMIN

**Request body (JSON):**

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required |
| `description` | string | Optional |
| `priceTHB` | number | Required |
| `zipKey` | string | Required — R2 key of uploaded ZIP |
| `coverKey` | string | Optional |
| `backKey` | string | Optional |

ZIP naming convention: `00_the_fool.webp`, `01_the_magician.webp`, ...
All card images converted to WebP 400×700 on processing.

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": { "productId": "uuid", "mongoId": "mongo-id", "cardCount": 78 }
}
```

---

## GET /api/admin/products

List products. ADMIN sees all; MERCHANT sees only their own.

**Auth:** MERCHANT or ADMIN

**Success (200):**
```json
[
  {
    "id": "uuid",
    "productType": "EBOOK",
    "title": "The Art of Tarot",
    "priceTHB": 299,
    "isPublished": false,
    "createdAt": "2025-04-01T00:00:00.000Z",
    "uploader": { "id": "uuid", "displayName": "Poom" }
  }
]
```

---

## DELETE /api/admin/products/:id

Delete a draft (unpublished) product. MERCHANT can only delete their own.

**Auth:** MERCHANT or ADMIN

**Errors:**
- `404` — not found (or MERCHANT doesn't own it)
- `400` — product is published (must unpublish first)

---

## PATCH /api/admin/products/:id/publish

Publish a product. Mirrors `isPublished = true` to both PostgreSQL and MongoDB. MERCHANT can only publish their own.

**Auth:** MERCHANT or ADMIN

**Success (200):** Updated product record.

---

## PATCH /api/admin/products/:id/unpublish

Unpublish a product. Mirrors `isPublished = false`. MERCHANT can only unpublish their own.

**Auth:** MERCHANT or ADMIN

**Success (200):** Updated product record.

---

## GET /api/admin/merchant-earnings

Earnings aggregated from completed orders. ADMIN sees all merchants; MERCHANT sees their own only.

**Auth:** MERCHANT or ADMIN

**Success (200):**
```json
{
  "data": [
    {
      "merchantId": "uuid",
      "displayName": "Poom",
      "email": "poom@example.com",
      "itemCount": 12,
      "grossTHB": 3588,
      "commissionTHB": 358.80,
      "netTHB": 3229.20
    }
  ]
}
```

---

## GET /api/admin/payment-config `[ADMIN only]`

Get current payment config (bank details + QR). `qrImageKey` is replaced with a signed `qrImageUrl` (1hr).

**Auth:** ADMIN

---

## PUT /api/admin/payment-config `[ADMIN only]`

Set bank details and commission rate.

**Auth:** ADMIN

**Request body:**
```json
{
  "bankName": "กสิกรไทย",
  "accountName": "ชื่อบัญชี",
  "accountNumber": "xxx-x-xxxxx-x",
  "commissionRate": 0.15
}
```

`commissionRate` is 0–1 (e.g. 0.15 = 15%). Stored as `Decimal(5,4)`. Applied to all payments approved after this update.

**Success (200):** Updated PaymentConfig record.

---

## POST /api/admin/payment-config/qr `[ADMIN only]`

Upload PromptPay QR image. Converted to WebP 400×400 and stored at `payment-config/qr.webp`.

**Auth:** ADMIN

**Request:** `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `file` | image | JPEG / PNG / WebP |

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": { "qrImageKey": "payment-config/qr.webp" }
}
```

---

## GET /api/admin/users/search?email=xxx `[ADMIN only]`

Find a user by exact email.

**Auth:** ADMIN

**Success (200):**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "Name",
    "role": "CUSTOMER",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

Returns `failure` (not 404) if not found.

---

## PATCH /api/admin/users/role `[ADMIN only]`

Change a user's role.

**Auth:** ADMIN

**Request body:**
```json
{ "userId": "uuid", "role": "MERCHANT" }
```

Valid roles: `CUSTOMER`, `PREMIUM`, `MERCHANT`, `ADMIN`

**Errors:**
- `400` — cannot change your own role
