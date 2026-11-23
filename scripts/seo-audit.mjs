import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
import {createSeoPages} from "../src/seo-pages.mjs";
const root=new URL("../",import.meta.url);
const files={};
for(const filename of ["public/index.html","public/credits.html","public/embed-demo.html","public/pilot-theme.css","public/_headers","wrangler.jsonc","data/catalog.json"]){
 files[filename]=await readFile(new URL(filename,root),"utf8");
}
const config=JSON.parse(files["wrangler.jsonc"]),site=config.vars.PUBLIC_SITE_URL;
assert.equal(site,"https://stickers.sautilink.com","Canonical must use official domain");
const home=files["public/index.html"],credits=files["public/credits.html"],demo=files["public/embed-demo.html"];
for(const html of [home,credits]){
 assert.match(html,/<title>[^<]+<\/title>/);
 assert.match(html,/<meta name="description"/);
 assert.match(html,/<link rel="canonical" href="https:\/\//);
 assert.match(html,/<meta name="robots" content="index/);
 assert.match(html,/<meta property="og:title"/);
}
assert.ok(home.includes('href="'+site+'/'),'Homepage canonical must equal active public host');
for(const html of [home,credits]) assert.ok(!html.includes('dr-charles-services.workers.dev'),'Old host must not appear in public SEO metadata');
assert.match(home,/<script type="application\/ld\+json">/);
assert.match(home,/<link rel="stylesheet" href="\/pilot-theme.css"/);
assert.match(home,/<a href="\/packs\//);
assert.match(home,/https:\/\/sautilink.com\/logo.png/);
assert.match(demo,/<meta name="robots" content="noindex"/);
assert.match(files["public/_headers"],/X-Robots-Tag: noindex/);
const routes=config.assets.run_worker_first;
for(const route of ["/robots.txt","/sitemap.xml","/packs/*","/stickers/*"])assert.ok(routes.includes(route));
const catalog=JSON.parse(files["data/catalog.json"]);
const renderer=createSeoPages(catalog,{publicSiteUrl:site});
const response=renderer.fetch(new Request(site+"/sitemap.xml"));
const sitemap=await response.text();
assert.equal((sitemap.match(/<loc>/g)||[]).length,2+catalog.packs.length+catalog.stickers.length);
const unique=new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]));
assert.equal(unique.size,2+catalog.packs.length+catalog.stickers.length);
console.log("SEO audit OK:",unique.size,"canonical URLs,",catalog.packs.length,"packs,",catalog.stickers.length,"stickers.");
