# SautiLink Sticker Engine

First-party animated sticker provider for the **SautiLink ecosystem**. One independent API can serve Web, Android, Chats, Comments, and Rooms. This repository contains the initial **development implementation**, not a deployed service.

## Built in the foundation
- Read-only catalog API for sticker packs, stickers, search, categories, licenses, and health
- Eight original animated SautiLink SVG reactions (fully local, no external provider request)
- iOS-inspired, responsive sticker explorer and picker demo
- Client-side favorites/recent list in the picker demo
- Curated importer for Google's Noto animated WebP assets, downloaded and stored locally with attribution + SHA-256
- Zero runtime npm dependencies; Node 22+ for local development
- Optional Cloudflare Worker adapter; **no Cloudflare project, R2, DNS, or deployment is connected yet**

## Local development

Run with Node.js 22+:

    npm run validate
    npm test
    npm run dev

Open http://localhost:8787. The local preview uses no cloud service.

## Import Noto stickers to local storage

    npm run import:noto
    npm run validate
    npm test

For a small trial: npm run import:noto -- --limit=4

The importer downloads curated 512px animated WebP from Google's official fonts.gstatic.com host and saves them to public/assets/noto. Assets are served by the **SautiLink API's own origin** at runtime. Review data/catalog.json and commit imported files only after attribution/license review. Do not import undocumented third-party sticker packs.

## API
- GET /api/v1/health
- GET /api/v1/packs
- GET /api/v1/packs/:id
- GET /api/v1/stickers?q=upendo&category=love&pack=sautilink-originals&limit=20&cursor=0
- GET /api/v1/stickers/:id
- GET /api/v1/categories
- GET /api/v1/licenses
- GET /assets/original/sl-love.svg

The response includes a stable sticker id, pack id, category, license, and an asset URL. Chats, comments and Rooms should persist **sticker_id** and resolve the asset from the API, not trust arbitrary media URLs sent by clients.

## Boundaries
No user account authorization, uploads, private favorites sync, moderation queue, anti-abuse throttling, persistent database, or production deployment is in this version. Do not expose a write API until authentication, quotas, moderation, storage validation, and content licensing are implemented. Favorite/recent features in this demo use localStorage, not server sync.

## Legal and supply chain
Original starter artwork is project artwork for SautiLink Corporation. Imported Noto animated emoji artwork is © Google LLC under **CC BY 4.0**; retain attribution and source reference. Importing assets does not transfer copyright or trademark ownership. See ATTRIBUTION.md and SECURITY.md.

## Planned Cloudflare connection
After code review and approval, configure Workers Assets, R2 and a catalog database, the domain, CORS allowlist and release pipeline. No secrets belong in GitHub. See docs/INTEGRATION.md for app integration; ask before connecting Cloudflare.
