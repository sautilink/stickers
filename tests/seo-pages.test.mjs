import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createSeoPages} from "../src/seo-pages.mjs";

const catalog=JSON.parse(await readFile(new URL("../data/catalog.json",import.meta.url),"utf8"));
const site="https://stickers.sautilink.com";
const renderer=createSeoPages(catalog,{publicSiteUrl:site});
const fetchPath=(path,method="GET")=>renderer.fetch(new Request(site+path,{method}));
const locs=xml=>[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);

test("sitemap includes canonical homepage, credits, all packs, all stickers",async()=>{
 const response=await fetchPath("/sitemap.xml");
 assert.equal(response.status,200);
 assert.match(response.headers.get("content-type"),/application\/xml/);
 const links=locs(await response.text());
 assert.equal(links.length,2+catalog.packs.length+catalog.stickers.length);
 assert.equal(new Set(links).size,links.length);
 assert.ok(links.includes(site+"/packs/sautilink-originals"));
 assert.ok(links.includes(site+"/stickers/sl-love"));
 assert.ok(links.every(x=>x.startsWith(site+"/")));
});
test("robots supports indexing public pages and points to correct sitemap",async()=>{
 const response=await fetchPath("/robots.txt");
 const txt=await response.text();
 assert.equal(response.status,200);
 assert.match(txt,/User-agent: \*/);
 assert.match(txt,/Disallow: \/api\//);
 assert.ok(txt.includes(site+"/sitemap.xml"));
});
test("pack pages render accessible server-side links, meta and structured data",async()=>{
 const res=await fetchPath("/packs/sautilink-originals");
 assert.equal(res.status,200);
 const html=await res.text();
 assert.match(html,/<h1>SautiLink Originals<\/h1>/);
 assert.match(html,/<a class="sticker-card" href="\/stickers\/sl-happy"/);
 assert.match(html,/<link rel="canonical" href="https:\/\/sautilink-stickers/);
 assert.match(html,/<meta name="description"/);
 assert.match(html,/<script type="application\/ld\+json">/);
 assert.match(html,/font.*Inter/);
 assert.match(html,/"@type":"ItemList"/);
});
test("sticker detail pages have unique title and accessible image",async()=>{
 const a=await(await fetchPath("/stickers/sl-happy")).text();
 const b=await(await fetchPath("/stickers/sl-love")).text();
 assert.match(a,/<h1>Happy<\/h1>/);
 assert.match(b,/<h1>Love<\/h1>/);
 assert.notEqual(a.match(/<title>(.*?)<\/title>/)?.[1],b.match(/<title>(.*?)<\/title>/)?.[1]);
 assert.match(b,/alt="Love animated sticker"/);
 assert.match(b,/\/packs\/sautilink-originals/);
 assert.match(b,/"@type":"ImageObject"/);
});
test("unknown pages return real 404 and noindex",async()=>{
 const missing=await fetchPath("/packs/missing");
 assert.equal(missing.status,404);
 assert.match(missing.headers.get("x-robots-tag"),/noindex/);
 const missingSticker=await fetchPath("/stickers/missing");
 assert.equal(missingSticker.status,404);
});
test("HEAD returns no body and sitemap includes advertised status",async()=>{
 const head=await fetchPath("/stickers/sl-love","HEAD");
 assert.equal(head.status,200);assert.equal(await head.text(),"");
 const rss=await fetchPath("/sitemap.xml","HEAD");assert.equal(rss.status,200);
 assert.equal(await rss.text(),"");
});
test("site base can switch to verified custom host without rewriting URLs by hand",async()=>{
 const alt=createSeoPages(catalog,{publicSiteUrl:"https://stickers.sautilink.com"});
 const r=alt.fetch(new Request("https://workers.dev/sitemap.xml"));
 assert.match(await r.text(),/https:\/\/stickers.sautilink.com\/packs\//);
});
