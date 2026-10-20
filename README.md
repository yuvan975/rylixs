# RYLIXS

A persistent fashion storefront and private management area, upgraded from the supplied Next.js project. Customers browse, select variants, save a bag/wishlist, sign in, enter delivery details, review server-calculated totals and create an order before opening WhatsApp. No payment gateway is installed.

## Run locally

Requires Node.js 24+ and pnpm. Use a persistent local disk; this is not an ephemeral/serverless deployment.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
# Set your private admin email and a password of at least 12 characters in .env.local.
pnpm admin:create
pnpm dev
```

If `.env.local` already exists, preserve it. A local owner account is provisioned during this delivery; its credentials are stored only in that ignored file. The original archive remains unchanged at `D:\softwares\rylixs.zip`.

Customer: `/`. Private management: `/admin/login`. No customer navigation exposes administration. Public registration always creates a customer; there is no role selector.

## Configure the real business

Sign in to management and complete:

1. **Settings:** business WhatsApp number (country code + digits, no `+`), delivery charge, optional free-delivery threshold, contact information and social profile.
2. **Categories:** create active categories and upload photographs.
3. **Products:** real name, slug, unique SKU, category, description, price, images and one stock row for each size/colour combination. Leave size/colour blank only for products without that option. Activate when ready.
4. **Homepage:** hero and collection images, copy, destinations and visibility. Featured/new-arrival flags are on the product editor.

The supplied catalogue was explicitly placeholder data and had no real stock counts. It is retained in `lib/products.js` for reference but never used as live inventory. Production starts with an empty catalogue. Uploaded images are decoded, resized to at most 1600 × 2000, converted to WebP and served through `/api/media/...`.

## Ordering and inventory

- Sign-in is required to place and retrieve orders. Browsing, cart and wishlist work without login.
- The server looks up every product and variant. Client prices, totals, stock, user IDs and roles are ignored.
- Review returns a fingerprint of current prices and delivery. Changes require a fresh review before order creation.
- SQLite `BEGIN IMMEDIATE` makes stock reservation and order insertion atomic. Duplicate variant lines are aggregated. Duplicate submissions with the same request key return the existing order.
- Admin edits use version checks to prevent stale stock overwrites. Variants belonging to open orders cannot be removed.
- Pending orders reserve stock. Cancellation restores it exactly once. Pending reservations do not automatically expire; review and cancel abandoned requests in administration.
- Order items keep immutable names, images, prices and chosen options. Status history records each sequential stage. Delivered/cancelled orders are closed.
- A successful database write produces an encoded `wa.me` link. The customer must press Send in WhatsApp. If automatic opening is blocked, the confirmation page has an explicit Open WhatsApp button.
- Click-to-chat cannot verify message sending/delivery. Status remains **Awaiting customer send** until the store confirms the order; no fabricated “WhatsApp sent” or payment success is shown.

## Storage and deployment

Default database: `data/rylixs.sqlite`. Set `RYLIXS_DB_PATH` to an absolute path if needed. Uploaded media: `public/uploads/`. Back up both. Use SQLite's backup facility or stop the service before copying database files, since WAL files can contain recent writes. Keep the database outside the public directory.

```powershell
pnpm build
pnpm start
```

Set `RYLIXS_SITE_URL` to your public HTTPS origin for metadata and the sitemap. Run behind HTTPS with an origin-preserving proxy, restrict request sizes at the proxy, and persist the database/uploads across restarts. Cookies are HTTP-only, SameSite=Lax and Secure in production. `RYLIXS_INSECURE_LOCAL_HTTP=true` is only a process override for local production-build testing; do not set it on a public host. The local preview binds to loopback only.

This implementation targets a single persistent application host. Catalogue and admin records are fetched in a single request with paginated display. Large-scale catalogue/operations deployments should add database-level query pagination and an external database/media store before scaling to multiple hosts. Email verification, password recovery, transactional email and WhatsApp Business API delivery receipts are not included; none existed in the archive.

## Validation

```powershell
pnpm lint
pnpm test
pnpm build
pnpm audit --prod
```

Integration tests must use the isolated verification database, never a live store:

```powershell
$env:RYLIXS_DB_PATH="$PWD\verification\e2e.sqlite"
node scripts/seed-test.mjs
$env:RYLIXS_INSECURE_LOCAL_HTTP="true"
pnpm start --hostname 127.0.0.1 --port 3100
# In a second shell, with the server running:
node tests/api-check.mjs
node tests/admin-check.mjs
```

The test seed refuses a database path outside a `verification` path. Test accounts and catalogue are explicitly synthetic. Never seed them into production. No actual WhatsApp message is sent by the tests. See `IMPLEMENTATION_REPORT.md` for the verified results and remaining owner setup.

## Laptop shortcut

Double-click `START_RYLIXS.cmd` to launch the verified production build on `http://127.0.0.1:3100`. The server runs in the background and logs to `verification/local-server*.log`. The launcher uses your live database, not test fixtures. Configure the business through `/admin/login`; the private initial owner credentials are in `.env.local`.

