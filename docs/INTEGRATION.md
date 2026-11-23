# Integrating SautiLink Sticker Engine

The Sticker Engine is a standalone **read-only catalog API** in this foundation. Web and Android apps can use a single contract.

## API contract

GET /api/v1/stickers?q=asante&limit=20

Example message record:

    {
      "type": "sticker",
      "sticker_id": "sl-love",
      "pack_id": "sautilink-originals"
    }

The sender saves stable IDs to existing message/comment/Room records; the receiving client resolves the sticker using GET /api/v1/stickers/:id. Do not accept arbitrary asset URLs as user-provided sticker messages. License notices must remain accessible, and disabled/taken-down sticker IDs should display a safe placeholder.

## Web picker demo

The standalone web demo fires a CustomEvent on window:

    window.addEventListener("sautilink:sticker-selected", (event) => {
      const { id, pack_id } = event.detail;
      // Send a validated sticker message through the app's own authenticated backend.
    });

This event is a demo contract; it does not send messages by itself. Wire it only after app API and authorization review.

## Android / Kotlin

Fetch packs/stickers as JSON; support animated WebP on a compatible image pipeline and an appropriate vector animation renderer for Lottie. SVG animations in the initial demo are intended for Web; Android should use native-compatible WebP or Lottie variants.

## Cloudflare step (NOT CONNECTED)

The code contains src/worker.mjs as an adapter for eventual Workers + static Assets. When ready:
1. Pick service and route/domain, and confirm account/zone.
2. Provision asset hosting (Workers Assets and/or R2), update asset routing, and confirm maximum file size.
3. Pick persistent catalog/user-favorites data store; design auth and RLS before adding any writes.
4. Configure the allowed origin list, anti-abuse limits, caching, observability and rollback.
5. Run CI and staging E2E tests before production.

No Cloudflare account configuration, DNS change, deployment, or SautiLink main-app integration is performed by this repository alone.
