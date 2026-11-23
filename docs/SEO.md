# SautiLink Sticker Engine — Search & Discoverability

## Canonical domain

The Cloudflare dashboard shows both `stickers.sautilink.com` and `www.stickers.sautilink.com` configured as production custom domains on this Worker.
PUBLIC_SITE_URL, homepage/credits canonicals, OG URLs and sitemap are intentionally aligned to this active hostname.
The canonical URLs have now been updated to `stickers.sautilink.com`. Check actual HTTP/TLS responses after deployment; configure a 301 redirect for the `www.stickers.sautilink.com` alias so each public URL has only one primary host.

## Crawlable content

- Homepage: pre-rendered HTML links for all packs, unique title and description, Open Graph, Twitter cards and Organization/WebSite/CollectionPage JSON-LD.
- Packs: GET /packs/{id} produces complete server-rendered sticker links, unique title/description/canonical/attribution and ItemList structured data.
- Stickers: GET /stickers/{id} produces an HTML detail page with its own title, description, animated image, parent pack, licensing and related stickers.
- Sitemap: GET /sitemap.xml includes homepage, credits, all active packs and every active sticker. Last modified comes from catalog.updated_at.
- Robots: GET /robots.txt advertises the sitemap and disallows API and demo endpoints.
- Error pages: unknown pack/sticker IDs return HTTP 404 and X-Robots-Tag noindex; nonproduction embed demo is noindex.
- SEO pages are readable without JavaScript. Sticker Studio's dynamic picker remains interactive with JS; fallback links are visible.

## Browser/UI

The shared visual tokens mirror SautiLink Pilot: Inter from Google Fonts with system fallback, neutral surfaces, blue actions and light/dark support. The official SautiLink logo is referenced from sautilink.com/logo.png. Workers Static Assets supplies cache and security headers, and embed module scripts have CORS to support first-party integrations.

## Production ownership steps

1. Open the live homepage, random pack page, sticker page, /robots.txt and /sitemap.xml and verify HTTP 200, canonical, HTML and image output.
2. Verify the domain/property in Google Search Console and Bing Webmaster Tools using authorized account access (DNS or approved ownership verification).
3. Submit the live sitemap URL to both; use URL Inspection and check crawl reports for invalid canonicals and 404 errors.
4. Use Google's Rich Results Test and Schema Markup Validator for representative pages; valid JSON-LD does not guarantee rich results.
5. Test Search Console performance, web vitals and Lighthouse using real networks/devices; fix measured bottlenecks.
6. Confirm new canonical URLs on the live site and prevent competing duplicate hosts.

Optional IndexNow automation needs site ownership verification and a validated IndexNow key. The key cannot be invented. No search engine guarantees instantaneous indexing or top rankings.

## Run the repeatable audits

npm run validate
npm test
npm run smoke
npm run check:ui
npm run seo:audit

The checks validate routes and metadata, not rankings. The public-domain setting must be reviewed before changing production host.
