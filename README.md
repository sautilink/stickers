# SautiLink Sticker Engine

First-party animated sticker service for SautiLink Web and Android. Version 0.2 adds a richer sticker library, embedded picker, bilingual interface and discovery API.

## Local development
Node 22 or newer:
    npm run validate
    npm test
    npm run smoke
    npm run check:ui
    npm run dev

## Features
- Animated sticker packs, dynamic filters, full-text search, suggestions, bulk favorites lookup, related and featured stickers.
- Sticker Studio with English and Kiswahili controls, dark mode, Lite mode, mobile layout and share links.
- SDK in public/sdk.js and standalone embeddable Web Component in public/embed.js.
- Integration preview in public/embed-demo.html. Use docs/WEB_EMBED.md and docs/ANDROID_CLIENT.md.
- Local client favorites and recent selections; cross-device sync is not yet supported.

## Artwork
Google Noto Animated Emoji is © Google LLC (CC BY 4.0). Minicons is © Tanzim Siam (MIT). Unicode 17 names are used under Unicode terms. Original starter art belongs to the SautiLink project. See ATTRIBUTION.md and /credits.html.

Import existing licensed assets at build time with npm run import:gallery; the live API does not call third-party sticker providers. Import tooling pins Google's emoji metadata commit and verifies downloaded WebP headers, size and SHA-256.

## API
- GET /api/v1/health, /api/v1/stats
- GET /api/v1/packs, /api/v1/packs/:id
- GET /api/v1/categories (legacy array of IDs) or ?with_counts=true for objects and counts
- GET /api/v1/stickers?q=&pack=&category=&sort=&limit=&cursor=
- GET /api/v1/stickers?ids=sl-love,sl-happy
- GET /api/v1/stickers/:id, /api/v1/stickers/:id/related
- GET /api/v1/stickers/random, /api/v1/suggestions, /api/v1/featured
- GET /api/v1/licenses

## Deployment and safety
Cloudflare Workers Static Assets and the Worker API are configured by wrangler.jsonc. Production deploys from main through the existing Cloudflare Git integration. Never commit access tokens. This repository's sample sticker picker does not send or persist real chat messages. Integrate sticker IDs through SautiLink's authenticated messaging endpoints only after app-level testing. New user-generated pack uploads and remote favorites require a moderated authenticated service and are not included yet.

Source code is all-rights-reserved. Third-party art remains subject to its original licenses.
