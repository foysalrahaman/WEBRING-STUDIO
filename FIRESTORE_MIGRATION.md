# WEBRING — Sanity → Firestore Migration

Status: **code connected, waiting on Firebase keys** (see "What only Sabbir can do").

## What was built

| Piece | File |
|---|---|
| Firebase init + feature flag | `lib/firebase/config.ts` |
| Firestore reads/writes (mirrors every GROQ query) | `lib/firebase/queries.ts` |
| Unified data source used by all pages | `lib/data.ts` |
| Dual-backend image helper (`_url` support) | `sanity/lib/image.ts` |
| Security rules | `firestore.rules`, `storage.rules` |
| One-shot data copy script | `scripts/migrate-sanity-to-firestore.mjs` |

Pages rewired to `lib/data.ts`: home, layout (maintenance toggle), portfolio
list + detail + sitemap, services, about, book, contact.
API routes `/api/book` and `/api/contact` now **dual-write**: Sanity (as
before) + Firestore `bookings`/`contacts` as soon as the keys exist.

## Safety design

- The site reads Firestore **only** when `NEXT_PUBLIC_USE_FIRESTORE=true`
  AND all Firebase keys are present. Until then it behaves exactly as
  before (Sanity), and even after the flip, any empty/error Firestore
  result falls back to Sanity per-query. The live site cannot go blank
  because of this migration.
- Sanity is **not** removed yet. Remove it only after Firestore has run
  live for a few days: delete `sanity/`, `sanity.config.ts`,
  `sanity.cli.ts`, the `(studio)` route, and the `sanity`/`next-sanity`
  packages, and drop the Sanity fallback branch in `lib/data.ts`.

## Collection mapping (actual schemas, incl. ones the original guide missed)

| Sanity type | Firestore |
|---|---|
| `siteSettings` | `content/siteSettings` (doc) |
| `homePage` | `content/homePage` (doc) — not present in Sanity today, homepage uses fallbacks |
| `availableDates` | `content/availableDates` (doc) |
| `portfolio` | `portfolio/{slug}` |
| `service` | `services/{slug}` |
| `pricing` | `pricing/{id}` |
| `testimonial` | `testimonials/{id}` |
| `teamMember` | `team/{id}` |
| `booking` (form writes) | `bookings/{auto-id}` |
| `contact` (form writes) | `contacts/{auto-id}` |

Images are stored as direct URL strings (`coverImageUrl`, `imageUrl`,
`photoUrl`, …). On migration they point at the existing Sanity CDN URLs,
so nothing needs re-uploading on day one; new uploads go to Firebase
Storage via `uploadImageFs()` in `lib/firebase/queries.ts`.

## Cutover checklist

1. Firebase Console: create project, enable Firestore + Storage.
2. Paste the `firebaseConfig` values into `.env.local` **and** into
   Vercel → Project → Settings → Environment Variables.
3. `node scripts/migrate-sanity-to-firestore.mjs --dry-run` (preview),
   then without `--dry-run` (writes 48 docs at last count).
4. Firebase Console → Firestore → Rules: paste `firestore.rules`, Publish.
   Same for Storage rules. (Run the migration BEFORE publishing the
   locked rules — migration writes need test-mode/open access.)
5. Set `NEXT_PUBLIC_USE_FIRESTORE=true` locally + on Vercel, redeploy.
6. Verify homepage, /portfolio, /book (dates load), submit a test
   booking + contact and confirm both appear in Firestore.

## Corrections to the guide this was based on

- Firebase Storage is **not** unlimited. Spark (free) plan: Firestore
  1 GiB storage, 50k reads / 20k writes per day; Storage 5 GB stored,
  1 GB/day downloads. Fine for this site today, but it is a cap.
- "Start in test mode" rules expire after 30 days and are public
  read/write until then — publish `firestore.rules` right after the
  migration instead of leaving test mode on.
- The guide's mapping missed `testimonial` and `teamMember`; both are
  migrated here.
