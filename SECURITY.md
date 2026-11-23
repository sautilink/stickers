# Security boundary

Development version: public read-only API; **no production deployments or privileged routes**.

- Do not add admin tokens, database credentials, API keys, or service-role keys to Git.
- Sticker IDs and pack IDs are stable, validated identifiers; consumers must not trust client-supplied asset URLs.
- Any future upload pipeline needs server-side authentication, MIME *and* magic-byte checks, size/frame limits, license declarations, abuse scanning, review, audit logs, and a takedown process.
- Imported remote resources are fetched only from curated, code-defined official URLs and have a 4 MB size limit and 15-second timeout.
- Before production: rate limiting, logging without personal data, CDN caching, strict CORS, asset CSP, database RLS/authorization, and automated abuse monitoring.
- The repository is currently public. Keep implementation secrets and infrastructure configuration out of this repository; consider changing repo visibility before production.
