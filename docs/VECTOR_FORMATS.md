# SautiLink Motion Engine — Vector / TGS v0.3

Implemented: eight original animated Lottie JSON assets in SautiLink Motion Originals. Vector art is played by self-hosted lottie-web light canvas (MIT, upstream commit bede03d25d232826e0c9dca1733d542d8a7754fb).

Motion Emoji Lab: /emoji-lab.html. Includes inline emoji in message text via tokens such as :slv-heart:, accessibility and user-controlled Lite Mode. It is a demo only, not real messaging integration.

API endpoints: GET /api/v1/capabilities and GET /api/v1/emoji-map. Existing sticker message payload remains {type:'sticker',sticker_id,pack_id}.

Telegram .tgs format is gzip-compressed Lottie JSON. SautiLink supports an offline TGS importer for rights-reviewed artwork. No Telegram/Telemoji third-party artwork is bundled. Telegram specifications require 512x512 and <=3 second animation; first-party Lottie policy permits up to five seconds and 512x512.

Import a locally held, reviewed TGS:
1. Review legal rights including redistribution, commercial use and attribution.
2. Prepare rights.json with asset_id, rights_confirmed:true, copyright_owner, license and source_url (HTTPS). The declaration alone is not legal proof.
3. Run npm run import:tgs -- --input=path/to/art.tgs --id=slv-unique-asset --rights=path/to/rights.json
4. Review JSON, license and asset. Submit a separate catalog PR. The importer deliberately does not automatically publish any asset or upload it to Cloudflare.

Renderer policy: first-party vector asset origin and path checks, no images, text, fonts, masks, expressions, scripts, external URLs or other Lottie layers. JSON bound to 512KB, dimensions <=512, FPS <=60, finite durations, shape complexity caps. Static asset cross-origin access supports SautiLink clients. Reduced-motion preference and Lite Mode disable animation.

Not implemented: public uploads, server favorites sync, database moderation, Telegram artwork redistribution, Android native player integration, or production chat/comment/Room changes.
