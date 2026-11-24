# Android Integration Contract (Kotlin / Jetpack Compose)

Use the same first-party catalog API consumed by the Web picker. The Android client must display animated WebP through an image renderer with actual animated-WebP support. The eight SautiLink Original animated SVG files are optimized for Web and need Android-compatible renditions before inclusion in native picker.

Read-only endpoints:
- GET /api/v1/packs
- GET /api/v1/categories
- GET /api/v1/stickers?q=furaha&limit=40
- GET /api/v1/stickers/{id}
- GET /api/v1/stickers?ids=sl-love,sl-happy
- GET /api/v1/stickers/{id}/related

Example persisted message model:

    @kotlinx.serialization.Serializable
    data class StickerMessage(
        val type: String = "sticker",
        val sticker_id: String,
        val pack_id: String
    )

Client flow:
1. Load sticker packs and categories from Sticker Engine using HTTPS.
2. Display search and paginated stickers; cache metadata/assets according to HTTP cache headers.
3. On selection send only sticker_id and pack_id through SautiLink's existing authenticated message or comment endpoint.
4. On receive, resolve the sticker from the API; handle revoked/missing assets gracefully, and enforce maximum rendering dimensions.
5. Save per-user favorites/recents via the authenticated application's own APIs once they are implemented. Current browser demo favorites are device-only.

Never put service-role tokens, database credentials or Cloudflare credentials in Android code.

## Motion Emoji v0.3

`format: lottie` identifies first-party vector animation JSON in `/assets/vector/{id}.json`. Android can integrate a compatible Lottie Compose renderer, verifying assets' HTTPS origin, file bounds, animation safety and offline handling. Inline messages can store a plain-text token like `:slv-heart:`; resolve it via the `GET /api/v1/emoji-map` allowlist. Support reduced-motion settings and limit concurrent animations. TGS is an *offline import format*, not an arbitrary live remote URL to be rendered. Telegram artwork licensing remains independent.
