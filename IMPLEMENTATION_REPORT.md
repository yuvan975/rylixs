# RYLIXS implementation report

Status: **Development implementation completed; local handover verified.**
Business launch: **Awaiting real catalogue, stock, WhatsApp number and production hosting configuration.**

## 1. Existing project

The supplied archive contained Next.js 14, React 18, Tailwind, Framer Motion, Lucide icons, localStorage cart/wishlist, brand graphics and clothing photography. Products were explicitly placeholders. Login, contact and checkout were frontend demonstrations, with no database, real authentication or administration. The original ZIP is unchanged.

## 2. Changes

Upgraded the existing Next.js application; retained its React/Tailwind architecture, cart/wishlist storage model and source assets. Replaced demo customer pages and checkout with connected screens. Removed payment form behavior from active routes. Upgraded Next.js to 15.5.24 and pinned patched PostCSS 8.5.28 after dependency audit findings. Existing unused components/catalogue remain available as source references but do not power active routes.

## 3. New functionality

Persistent catalogue, stock variants, password authentication, opaque sessions, saved addresses, authoritative checkout quotes, transactional orders, click-to-chat messages, order history, protected administration, optimized uploads, homepage settings, local launcher and repeatable test suites.

## 4. Customer screens

Home with short brand entrance, dynamic categories, new arrivals, featured collection; shop with search/suggestions/category/subcategory/size/colour/price/availability/discount filters and sorting; product gallery with swipe, sizes, colours, quantity, stock and care details; persistent bag and wishlist; sign-in/registration; account and saved addresses; customer details/order review/confirmation; order list and timeline; about/contact/error states. Responsive header and mobile bottom navigation contain no admin links.

## 5. Admin screens

Private `/admin/login`; server-protected dashboard, orders, products, categories, inventory, customers, homepage and business settings. Product/category creation, editing and deactivation; stock updates; searchable orders and sequential status updates; cancellation; image upload; banner and delivery configuration. Deactivation preserves historical records.

## 6. Database

SQLite with WAL, foreign keys, lock timeout, and tables for users, sessions, products, categories, settings, orders and login-rate-limit attempts. Variants live within product records; item snapshots and status history live within orders. No duplicate equivalent model layer. Live database: `data/rylixs.sqlite`; verification database is separate.

## 7. APIs

`/api/catalog`, `/api/health`, `/api/auth/*`, `/api/profile`, `/api/orders`, `/api/orders/quote`, `/api/orders/:id`, `/api/admin/data`, `/api/admin/products`, `/api/admin/categories`, `/api/admin/settings`, `/api/admin/orders/:id`, `/api/admin/upload`, `/api/media/:filename`.

## 8. WhatsApp

The backend commits an order before returning its encoded WhatsApp link. The confirmation page provides a retry/open button when browser popup restrictions prevent automatic opening. Messages include the order ID, customer details, item snapshots, quantities, prices and delivery address. No payment gateway, tokens or passwords are included. Sending and delivery cannot be verified through click-to-chat; confirmation must come from the store.

## 9. Security and correctness

Scrypt password hashes; hashed opaque sessions; HTTP-only cookies; SameSite and production Secure flags; server-side role and ownership checks; mutation-origin checks; bounded request bodies and validated uploads; image re-encoding; backend validation of products, quantities, addresses and stock. Atomic inventory reservation prevents overselling. Idempotency prevents duplicate submissions. Optimistic product versions prevent stale inventory edits. Price/delivery changes require another review. Cancellation restores reserved stock once. Open-order variants cannot be removed. Order price/name snapshots survive catalogue edits.

## 10. Verification

- 21/21 backend/origin regression tests passed.
- 30/30 authentication, order, authorization, upload and status API checks passed.
- 18/18 additional catalogue, inventory, settings and profile API checks passed, including simultaneous purchases of the final stock item and changed-price review.
- ESLint: no warnings or errors.
- Browser flow exercised: home → search → wishlist → product → required option validation → cart → sign-in return → delivery → review → saved order → WhatsApp link → admin visibility.
- The home page and order confirmation were checked at 360, 390, 414, 768, 1024, 1280, 1440 and 1920px without horizontal overflow. Browser test data is synthetic, isolated and never inserted into the live store.
- Dependency audit after patches: zero production advisories in the saved audit. This is a point-in-time result, not a guarantee against future advisories.
- No actual WhatsApp message or real purchase was sent.

## 11. Build and output

Production build succeeds. Local URL: `http://127.0.0.1:3100`. Private owner credentials are in ignored `.env.local`. Double-click `START_RYLIXS.cmd` to start the built app and open it on this laptop. The launcher binds only to 127.0.0.1 and uses the live database. The source directory is `D:\softwares\BM_app\rylixs`.

## 12. Remaining business setup and limits

Real product facts, stock, photography and the business WhatsApp number were not supplied. The live catalogue is intentionally empty; checkout cannot create orders until WhatsApp is configured. The owner must add these through administration and configure HTTPS hosting before public launch. Local credentials and test fixtures must not be published.

This build uses a single persistent host and disk. Catalogue/admin list pagination is currently presentation-side after loading data; large catalogues should add database-level pagination before expansion. There was no PWA or notification system to preserve. Email verification/recovery, multi-host scaling and WhatsApp delivery webhooks are outside this implementation. Pending orders reserve stock until manually cancelled; they do not expire automatically. Real-world WhatsApp receipt, fulfilment and public deployment have not been verified.



## Local sign-in correction
Fixed the localhost/127.0.0.1 mismatch caused by framework request URL normalization. Exact loopback aliases are accepted only in explicit local HTTP mode; configured HTTPS origins support reverse proxies. Missing origins, unrelated origins, wrong ports and cross-site browser requests remain blocked. Six regression tests cover the origin policy.

