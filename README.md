# SautiLink Sticker Engine

Independent animated sticker catalog, picker, and first-party provider for SautiLink Web, Android, Chats, Comments, and Rooms. **This is a development preview, not a production deployment.**

## Included
- Read-only pack, sticker, search, categories and attribution endpoints
- 8 original animated SautiLink SVG reactions
- Responsive picker demo with local favorites and recently-used stickers
- Curated Google Noto WebP importer (CC BY 4.0)
- Pinned 112-asset Minicons Animated WebP importer (MIT)
- Zero runtime npm dependencies; Node 22+ preview
- Optional Cloudflare Worker adapter, not deployed or connected

## Local development
    npm run validate
    npm test
    npm run smoke
    npm run dev

Visit http://localhost:8787

## Import licensed stickers to SautiLink's local catalog
    npm run import:noto
    npm run import:minicons
    npm run validate
    npm test

Try smaller batches: npm run import:noto -- --limit=4 and npm run import:minicons -- --limit=8. Importers fetch files at build time, validate WebP signatures and size bounds, compute SHA-256, and save files to public/assets/*. **No third-party API is contacted at request time.** Do not imply SautiLink owns third-party artwork. Retain attribution notices.

An asset-import workflow runs once on the development branch after the workflow is added, and may be manually dispatched later. CI verifies catalog integrity; do not merge until all checks pass.

## API
- GET /health or /api/v1/health
- GET /api/v1/packs
- GET /api/v1/packs/:id
- GET /api/v1/stickers?pack=&category=&q=upendo&cursor=0&limit=20
- GET /api/v1/stickers/:id
- GET /api/v1/categories
- GET /api/v1/licenses

All clients persist stable **sticker_id** + pack_id, then retrieve the sticker and licensed asset from the first-party API. Never accept arbitrary client-supplied asset URLs.

## Before production
No production database, authenticated favorites, uploads, moderation queue, anti-abuse limits, storage sync, or main SautiLink app integration has been deployed. Browser demo favorites/recents are stored only in the local device. Before production integrate auth, storage/R2, licensing audit, permissions, moderation, quota policy and media optimization.

## Cloudflare
No Cloudflare account, DNS, R2, Workers deployment, or database binding is connected. The optional src/worker.mjs adapter will be connected only after the next infrastructure configuration step and approval. See docs/INTEGRATION.md.

## Licensing
Starter original artwork is project artwork for SautiLink Corporation. Minicons is MIT, © Tanzim Siam, with full license in licenses/minicons-MIT.txt. Google Noto Animated Emoji is © Google LLC, CC BY 4.0. See ATTRIBUTION.md. The application's own source repository remains **UNLICENSED** (all rights reserved).
