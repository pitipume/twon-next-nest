# API Contract — Store

Base path: `/api/store`

All endpoints require: `Authorization: Bearer {accessToken}`

---

## POST /api/store/orders

Create a new order for one or more products.

**Request body:**
```json
{
  "productIds": ["uuid-1", "uuid-2"]
}
```

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": {
    "orderId": "order-uuid",
    "totalTHB": 598,
    "items": [
      { "productId": "uuid-1", "title": "The Art of Tarot", "priceTHB": 299 },
      { "productId": "uuid-2", "title": "Rider Waite Deck", "priceTHB": 299 }
    ],
    "payment": {
      "bankName": "กสิกรไทย",
      "accountName": "ชื่อบัญชี",
      "accountNumber": "xxx-x-xxxxx-x",
      "qrImageUrl": "https://r2.dev/signed..."
    }
  }
}
```

Notes:
- `payment` is the checkout info (bank + QR) — returned immediately so frontend can show it
- `payment` is `null` if admin has not configured payment yet
- `payment.qrImageUrl` is a signed URL valid for **30 minutes**

**Errors:**
- `A002` — one or more products already owned by this user
- `A002` — one or more products already have a pending/awaiting-approval order for this user (prevents duplicate purchases)
- `A404` — one or more products not found or not published

---

## GET /api/store/orders/:orderId

Get order detail including checkout info (bank QR, account number).

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": {
    "id": "order-uuid",
    "status": "PENDING",
    "totalTHB": 299,
    "createdAt": "2025-04-01T00:00:00.000Z",
    "orderItems": [
      {
        "id": "uuid",
        "productId": "uuid",
        "priceTHB": 299,
        "product": { "title": "The Art of Tarot", "productType": "EBOOK" }
      }
    ],
    "payment": {
      "id": "uuid",
      "status": "PENDING",
      "amountTHB": 299
    },
    "checkoutInfo": {
      "bankName": "กสิกรไทย",
      "accountName": "ชื่อบัญชี",
      "accountNumber": "xxx-x-xxxxx-x",
      "qrImageUrl": "https://r2.dev/signed..."
    }
  }
}
```

Notes:
- `checkoutInfo` is null if admin has not configured payment yet
- `checkoutInfo.qrImageUrl` is a signed URL valid for **30 minutes**

**Errors:**
- `A404` — order not found or does not belong to this user

---

## GET /api/store/orders

Get all orders for the logged-in user, newest first — every status, including `PENDING`/`WAITING_APPROVAL`. The frontend library page uses this to show a "pending approval" section separate from owned content.

**Success (200):**
```json
{
  "code": "A001",
  "status": "success",
  "data": [
    {
      "id": "order-uuid",
      "status": "WAITING_APPROVAL",
      "totalTHB": 299,
      "createdAt": "2025-04-01T00:00:00.000Z",
      "orderItems": [
        {
          "productId": "uuid",
          "priceTHB": 299,
          "product": { "title": "The Art of Tarot", "productType": "EBOOK" }
        }
      ],
      "payment": { "id": "uuid", "status": "WAITING_APPROVAL", "amountTHB": 299 }
    }
  ]
}
```

Note: `POST /api/store/orders` also now rejects with `A002` if the user already has a `PENDING`/`WAITING_APPROVAL` order for any of the requested products (previously only checked already-owned products) — see error list above.
