# Infrastructure — File Storage (Cloudflare R2)

## Bucket structure

All files live in one bucket: `twon`

```
twon/
├── ebooks/
│   └── {mongoId}/
│       ├── ebook.pdf          ← the actual PDF (never URL-exposed directly)
│       └── cover.webp         ← cover image (400×600)
├── tarot/
│   └── {mongoId}/
│       ├── cover.webp         ← deck cover (400×600)
│       ├── back.webp          ← card back image (400×700)
│       └── cards/
│           ├── 0.webp         ← card 0 (400×700)
│           ├── 1.webp         ← card 1
│           └── ...
├── slips/
│   └── {orderId}/
│       └── slip.jpg           ← customer payment slip
└── payment-config/
    └── qr.webp                ← admin PromptPay QR image
```

## Key naming helpers (used in backend)

```
ebookFile(mongoId)     → ebooks/{mongoId}/ebook.pdf
ebookCover(mongoId)    → ebooks/{mongoId}/cover.webp
tarotCard(mongoId, i)  → tarot/{mongoId}/cards/{i}.webp
tarotCover(mongoId)    → tarot/{mongoId}/cover.webp
tarotBack(mongoId)     → tarot/{mongoId}/back.webp
```

## Signed URL rules

| Content | URL lifetime | Notes |
|---|---|---|
| PDF (ebook session) | 2 hours | Generated fresh each session |
| Tarot card images | 1 hour | All cards signed at session start |
| Card back image | 1 hour | Same session as cards |
| Cover images | 1 year | Safe to cache — content never changes |
| Payment slip | 1 hour | Admin review only |
| PromptPay QR | 30 minutes | Shown at checkout |

## Security rules

- **Never expose raw R2 URLs** to the client
- **Never include `imageKey` or `fileKey`** in any API response
- **Only the backend generates signed URLs** — frontend never calls R2 directly
- **Signed URLs are single-use conceptually** — don't share them, they expire
