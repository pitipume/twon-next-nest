# API Contract — Payment

Base path: `/api/payment`

All endpoints require: `Authorization: Bearer {accessToken}`

---

## POST /api/payment/slip

Customer uploads payment slip after bank transfer.

**Request:** `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `file` | image | JPEG / PNG / WebP, max 5MB |
| `orderId` | string (UUID) | The order being paid |
| `transferredAt` | string (ISO date) | When the customer made the transfer |
| `note` | string | Optional — e.g. "transferred via mobile banking" |

**Success (200):**
```json
{ "code": "A001", "status": "success", "data": null }
```

Order status changes: `PENDING → WAITING_APPROVAL`

Sends email (best-effort, never fails the request): "payment received, please wait" to the customer, and "new payment awaiting approval" to every `ADMIN` plus any `MERCHANT`(s) who uploaded a product in the order.

**Errors:**
- `A409` — order is not in PENDING status
- `A002` — invalid file type or file too large

---

## POST /api/payment/orders/:orderId/approve

Admin approves payment. Grants library access automatically.

Requires: `ADMIN` or `SUPER_ADMIN` role

**Success (200):**
```json
{ "code": "A001", "status": "success", "data": null }
```

Order status changes: `WAITING_APPROVAL → COMPLETED`
Payment status changes: `WAITING_APPROVAL → APPROVED`
LibraryItems created for all products in the order.

Sends email (best-effort) to the customer: "your payment was approved, start reading."

**Errors:**
- `A409` — order is not in WAITING_APPROVAL status

---

## POST /api/payment/orders/:orderId/reject

Admin rejects payment with a reason.

Requires: `ADMIN` or `SUPER_ADMIN` role

**Request body:**
```json
{ "reason": "Transfer amount does not match order total." }
```

**Success (200):**
```json
{ "code": "A001", "status": "success", "data": null }
```

Order status changes: `WAITING_APPROVAL → REJECTED`

Sends email (best-effort) to the customer with the rejection reason.

---

## GET /api/payment/orders/pending

Admin gets all orders waiting for approval, oldest first.

Requires: `ADMIN` or `SUPER_ADMIN` role

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
      "user": {
        "id": "uuid",
        "email": "customer@example.com",
        "displayName": "Poom"
      },
      "orderItems": [
        {
          "productId": "uuid",
          "priceTHB": 299,
          "product": { "title": "The Art of Tarot", "productType": "EBOOK" }
        }
      ],
      "payment": {
        "status": "WAITING_APPROVAL",
        "amountTHB": 299,
        "transferredAt": "2025-04-01T14:30:00.000Z",
        "note": "transferred via mobile banking",
        "slipUrl": "https://r2.dev/signed..."
      }
    }
  ]
}
```

Notes:
- `slipUrl` is a signed URL valid for **1 hour**
- Sorted oldest first so admin handles longest-waiting orders first
