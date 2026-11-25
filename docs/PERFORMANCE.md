# Performance release — optimized media
The original artwork and asset URLs remain unchanged. Build-time animated WebP previews are generated at 160px for larger WebP assets, only retained if they preserve frame count and are smaller. Sticker Studio uses these for grid and pack covers; details and share links still use original assets. When a preview is absent or fails, the original is used. The committed empty manifest is safe for deployments without the media step.
Cloudflare Workers Builds currently ignores Wrangler custom-build configuration; set the existing Worker **Build command** to:
    npm install --no-package-lock --no-audit --no-fund && npm run build:media
Keep Deploy command:
    npx wrangler deploy
No DNS, database, SEO, or other repository changes needed. The original sticker artwork is never overwritten.
CI validates and decodes WebP inputs, generates preview variants, checks API cache behavior, and exercises the Studio in Chromium. CI does not establish public endpoint latency or device/browser compatibility beyond its test environment.
