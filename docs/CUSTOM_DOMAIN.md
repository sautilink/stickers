# Canonical domain: SautiLink Stickers

Primary public hostname: **https://stickers.sautilink.com/**.

Cloudflare dashboard lists both production custom domains for `sautilink-stickers`:
- `stickers.sautilink.com` — primary/canonical
- `www.stickers.sautilink.com` — alias requiring redirect

The former `workers.dev` hostname remains available for compatibility while older links are reviewed. All indexable pages, the sitemap and Open Graph metadata now use the primary host. The user can choose to turn off workers.dev later after verifying that no client depends on it.

## Cloudflare dashboard redirect rule (not configured automatically)

In Cloudflare zone **sautilink.com**, visit **Rules → Redirect Rules → Create rule**.
- Rule name: `stickers-www-to-primary`
- Match: **Hostname equals** `www.stickers.sautilink.com`
- Dynamic target expression: `concat("https://stickers.sautilink.com", http.request.uri.path)`
- Status: **301 Permanent**
- Preserve query string: **On**

Keep the condition exact so other SautiLink subdomains are unaffected. Do not create a duplicate rule if one already handles this redirect.

## Verification after Cloudflare deployment

- Open `https://stickers.sautilink.com/`; expect HTTP 200 with self-referencing canonical
- Open `https://stickers.sautilink.com/robots.txt`; expect the official sitemap URL
- Open `https://stickers.sautilink.com/sitemap.xml`; expect unique canonical URLs
- Open `https://stickers.sautilink.com/packs/sautilink-originals` and `/stickers/sl-love`; expect HTML page details
- After redirect rule, `https://www.stickers.sautilink.com/stickers/sl-love?src=test` should respond 301 to `https://stickers.sautilink.com/stickers/sl-love?src=test`
- Submit primary sitemap to Google Search Console and Bing Webmaster Tools when domain ownership is verified

Dashboard registration alone does not prove live TLS, HTTP responses or search indexing. A canonical tag is a hint, not a guarantee of ranking.
