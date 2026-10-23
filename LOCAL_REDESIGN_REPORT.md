# Rylixs local redesign — 23 October 2026

The storefront was updated against the four user references. Sample and existing images are retained as requested. No cloud redeployment or Android rebuild was performed.

## Changes
- Shared header (brand, notifications, bag, menu) and Home / Shop / Wishlist / My Orders / Profile navigation.
- Simplified home: search, banner, categories and new arrivals. Removed shipping/returns blocks and preview photography footer.
- Customer orders only, with order items and status tracking. Removed sample-order controls.
- Reference-inspired profile with optional photo uploads, editable personal details and saved addresses; no payment menu.
- Guest add-to-cart and sign-in return to checkout; Google configuration deferred. Explicit preview sign-in remains available locally.
- Product gallery, feature icons, stacked purchase actions, details, real reviews and related products.
- Checkout contact and address icons with existing validation and server-authoritative order review.
- Animated story page, WhatsApp contact page, dedicated offers and launch-countdown lookbook.
- Admin page banners, lookbook edition creation/editing/publication/deletion, images, UTC launch times and editorial text settings.

## Verification
- Production build and lint passed.
- 41 backend tests passed, including profile metadata validation and lookbook publication.
- 58 HTTP integration checks passed, including photo uploads, authentication, checkout, ownership and admin access.
- Browser layout checks at 390px and 1440px across shop, wishlist, orders, profile, checkout, lookbook, story, contact, offers and product pages showed no horizontal overflow at observation.
- Mobile home and checkout visually inspected. Shared menu and profile edit controls inspected.
- API checks used an isolated disposable database; no WhatsApp message was sent.

## Local preview
Run START_RYLIXS.cmd; open http://127.0.0.1:3100/.
The launcher uses data/preview.sqlite. Sample lookbook entries can be changed under /admin/lookbook; banners under /admin/page-banners; page text under /admin/settings.
The local build is .next-local because the older .next output contained restricted directories. Set RYLIXS_BUILD_DIR=.next-local when building this local variant.

Real Google login, public deployment validation and real-device performance testing remain deferred. The styling follows the supplied layouts with a dark Arial-based theme; it does not bundle Amazon's proprietary font or claim pixel-identical assets.
