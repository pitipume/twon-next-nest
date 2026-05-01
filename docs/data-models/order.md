# Data Model — Orders & Payments

## Order (PostgreSQL — Prisma)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key → User |
| `status` | enum | See status flow below |
| `totalTHB` | decimal(10,2) | Sum of all order items |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### OrderStatus flow

```
PENDING → WAITING_APPROVAL → COMPLETED
                           ↘ REJECTED
                           ↘ REFUNDED (future)
```

| Status | Meaning |
|---|---|
| `PENDING` | Order created, customer has not uploaded slip yet |
| `WAITING_APPROVAL` | Slip uploaded, waiting for admin to check |
| `COMPLETED` | Admin approved — library access granted |
| `REJECTED` | Admin rejected (wrong amount, fake slip, etc.) |
| `REFUNDED` | Future use |

## OrderItem (PostgreSQL — Prisma)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `orderId` | UUID | Foreign key → Order |
| `productId` | UUID | Foreign key → Product |
| `priceTHB` | decimal(10,2) | Snapshot of price at time of purchase |
| `createdAt` | datetime | |

## Payment (PostgreSQL — Prisma)

One payment per order.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `orderId` | UUID | Unique foreign key → Order |
| `amountTHB` | decimal(10,2) | Must match order total |
| `status` | enum | See PaymentStatus below |
| `slipImageKey` | string? | R2 key of uploaded slip image |
| `transferredAt` | datetime? | Time customer reported the transfer |
| `note` | string? | Optional note from customer |
| `approvedBy` | string? | Admin userId who approved/rejected |
| `approvedAt` | datetime? | When admin took action |
| `rejectionReason` | string? | Filled when admin rejects |
| `createdAt` | datetime | |
| `updatedAt` | datetime | |

### PaymentStatus

| Status | Meaning |
|---|---|
| `PENDING` | Waiting for slip upload |
| `WAITING_APPROVAL` | Slip uploaded, admin hasn't checked |
| `APPROVED` | Admin approved |
| `REJECTED` | Admin rejected |

## PaymentConfig (PostgreSQL — Prisma, singleton)

One row only, `id = "singleton"`. Admin updates it, never inserts.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Always `"singleton"` |
| `bankName` | string | e.g. "กสิกรไทย" |
| `accountName` | string | Account holder name |
| `accountNumber` | string | e.g. "xxx-x-xxxxx-x" |
| `qrImageKey` | string | R2 key for PromptPay QR image |
| `updatedAt` | datetime | |
