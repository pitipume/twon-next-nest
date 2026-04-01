# Product Scope

## Vision

A dual-platform commerce site where customers can buy and consume digital content:
1. **Ebooks** — read in-browser (no download unless premium)
2. **Tarot Card Decks** — shuffle, draw, and spread cards in-browser with smooth animation

This is an untapped niche: ebook platforms exist, tarot apps exist, but **a unified platform combining commerce + in-browser tarot shuffling** is new territory.

Father's physical tarot business: ~2M THB in 4 years. This platform digitizes and scales that.

---

## Target Users

| Segment | Who | What they want |
|---|---|---|
| Gen Z | 18–27, mobile-first, visual | Fast, beautiful, Instagram-worthy experience |
| Gen Y (Millennials) | 28–42, works on desktop too | Reliable, clean, works everywhere |
| Gen X + Baby Boomers | 43+, some not tech-savvy | Simple, clear labels, forgiving UI |

Design for Gen Z aesthetics, but ensure usability for all ages. No jargon. Big tap targets on mobile.

---

## Platform 1: Ebook Shop

### Customer Journey
```
Browse catalog (no login required)
→ View ebook detail + preview (first N pages free)
→ Register / Login
→ Buy (Stripe card or PromptPay QR)
→ Access library
→ Read in-browser (smooth PDF viewer)
→ Progress auto-saved, resume anytime
```

### Features
- Catalog with categories, tags, search
- Free preview (configurable pages per book)
- Buy with Stripe or PromptPay QR
- In-browser PDF reader (mobile + desktop)
  - No right-click / no download button
  - Signed URLs expire (cannot share link)
  - Page memory (resume where you left off)
  - Bookmarks
- Library page — all owned ebooks

### Admin Features
- Upload ebook (PDF file)
- Set title, author, description, cover image, categories, price, preview page count
- Publish / unpublish
- View sales analytics per ebook

---

## Platform 2: E-Tarot Card Shop

### Customer Journey
```
Browse decks (no login required)
→ View deck detail + card previews (show sample cards)
→ Register / Login
→ Buy deck
→ Access in library
→ Open deck → shuffle → draw cards → view spread
```

### Features
- Deck catalog with previews (show 3-5 sample cards)
- Buy deck (same payment flow as ebooks)
- In-browser tarot experience:
  - **Shuffle animation** — smooth card shuffle (GSAP)
  - **Spread layouts** — Single card, 3-card, Celtic Cross (10-card)
  - **Card reveal** — tap/click to flip card
  - **Reversed cards** — random chance (upside-down meaning)
  - **Card detail** — show card name, upright/reversed meaning
  - Works on mobile and desktop
- Library — all owned decks

### Admin Features
- Upload new deck via ZIP file
  - ZIP contains card images named: `00_the_fool.webp`, `01_the_magician.webp`...
  - Backend extracts, stores each card in R2, creates MongoDB deck document
- Set deck name, description, cover, price, card count
- Add card meanings (upright + reversed) per card
- Publish / unpublish

---

## User Roles

| Role | Register | Buy | Read/Shuffle | Download | Upload | Manage Users |
|---|---|---|---|---|---|---|
| `guest` | — | — | Browse only | — | — | — |
| `customer` | ✅ | ✅ | ✅ (owned) | — | — | — |
| `premium` | ✅ | ✅ | ✅ | ✅ (ebooks) | — | — |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | Partial |
| `superadmin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Payment Flow

### Stripe (Credit/Debit Card)
1. User selects product → checkout
2. Backend creates order (PENDING) + Stripe PaymentIntent
3. Frontend renders Stripe Elements (card input)
4. User pays → Stripe processes
5. Stripe sends webhook to `/api/payments/webhook/stripe`
6. Backend validates signature → order COMPLETED → library item created
7. Frontend notified via WebSocket → redirect to library

### Omise PromptPay QR
1. User selects product → checkout → selects PromptPay
2. Backend creates order + Omise charge → returns QR code image
3. Frontend displays QR code (30-minute expiry)
4. User scans with banking app → pays
5. Omise sends webhook to `/api/payments/webhook/omise`
6. Same backend flow → order COMPLETED → library item created

---

## Content Protection Strategy

### PDF Ebooks
- Stored in Cloudflare R2 (private — no public URL)
- Backend generates signed URL per reading session (2-hour expiry)
- PDF.js configured: `disableDownload: true`, `disablePrint: true`
- Right-click disabled on viewer
- Cannot share URL (expires)
- Future: server-side watermark with username on each page

### Tarot Card Images
- Stored in Cloudflare R2 (private)
- Backend generates signed URLs for all cards in owned deck (1-hour expiry)
- Images loaded into browser memory — no local save from normal browsing
- Future: low-res preview for non-owners, high-res only after purchase

---

## MVP Scope (What to Build First)

Phase 1 (MVP):
- [x] Auth (register with OTP, login, JWT)
- [x] Ebook catalog + detail page
- [x] Buy ebook (Stripe only first)
- [x] Read ebook in browser
- [x] Tarot deck catalog + detail page
- [x] Buy tarot deck
- [x] Shuffle + single card draw
- [x] Admin: upload ebook, upload tarot deck

Phase 2:
- [ ] PromptPay QR payment
- [ ] 3-card and Celtic Cross spreads
- [ ] Bookmarks + reading notes
- [ ] Premium role + download
- [ ] Email order receipts

Phase 3:
- [ ] Search + filters
- [ ] Reviews / ratings
- [ ] Wishlist
- [ ] Discount codes
- [ ] Analytics dashboard for admin
- [ ] Mobile app (Capacitor)
