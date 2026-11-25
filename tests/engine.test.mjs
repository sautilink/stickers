import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createEngine,validateCatalog} from "../src/engine.mjs";
import {originalSvg,originalIds} from "../src/art.mjs";
const c=JSON.parse(await readFile(new URL("../data/catalog.json",import.meta.url),"utf8"));
const app=createEngine(c,{allowedOrigins:["https://sautilink.com"]});
const get=(p,init={})=>app.fetch(new Request("https://stickers.example"+p,init));
test("catalog",()=>assert.equal(validateCatalog(c),true));
test("compact artwork keeps original URLs and rejects unverified previews",async()=>{
 const sticker=c.stickers.find(s=>s.preview_path);assert.ok(sticker);
 const data=(await (await get('/api/v1/stickers/'+sticker.id)).json()).data;
 assert.equal(new URL(data.asset_url).pathname,sticker.asset_path);
 assert.equal(new URL(data.preview_url).pathname,sticker.preview_path);
 const invalid=structuredClone(c);invalid.stickers.find(s=>s.id===sticker.id).preview_source_sha256='0'.repeat(64);
 assert.throws(()=>validateCatalog(invalid),/Invalid sticker preview/);
});
test("health",async()=>assert.equal((await (await get("/health")).json()).status,"ok"));
test("safe animated originals",async()=>{for(const id of originalIds){const svg=originalSvg(id);assert.match(svg,/^<svg/);assert.doesNotMatch(svg,/<script|onload=|xlink:href=/i);assert.equal((await get("/assets/original/"+id+".svg")).status,200);}});
test("packs have covers",async()=>{const r=await (await get("/api/v1/packs")).json();assert.ok(r.data.length>=1);assert.ok(r.data.find(p=>p.id==="sautilink-originals").cover_url.includes("sl-happy"));});
test("pack detail works",async()=>{const r=await get("/api/v1/packs/sautilink-originals");assert.equal(r.status,200);const d=await r.json();assert.equal(d.data.stickers.length,8);});
test("English and Swahili search",async()=>{assert.equal((await (await get("/api/v1/stickers?q=love")).json()).data[0].id,"sl-love");assert.equal((await (await get("/api/v1/stickers?q=upendo")).json()).data[0].id,"sl-love");});
test("pagination and validation",async()=>{const r=await (await get("/api/v1/stickers?limit=2")).json();assert.equal(r.data.length,2);assert.equal(r.pagination.next_cursor,"2");assert.equal((await get("/api/v1/stickers?cursor=-1")).status,400);});
test("routes",async()=>{assert.equal((await get("/api/v1/stickers/missing")).status,404);assert.equal((await get("/api/v1/stickers",{method:"POST"})).status,405);});
test("CORS allowlist",async()=>{assert.equal((await get("/api/v1/stickers",{headers:{origin:"https://sautilink.com"}})).headers.get("access-control-allow-origin"),"https://sautilink.com");assert.equal((await get("/api/v1/stickers",{headers:{origin:"https://evil.test"}})).headers.get("access-control-allow-origin"),null);assert.equal((await get("/api/v1/stickers",{method:"OPTIONS",headers:{origin:"https://evil.test"}})).status,403);});

test("cached metadata supports conditional requests without sharing CORS permission",async()=>{
 const first=await get("/api/v1/stickers?q=love&limit=10",{headers:{origin:"https://sautilink.com"}});
 const etag=first.headers.get("etag");assert.match(etag,/^"[a-f0-9]{64}"$/);
 const body=await first.json();assert.ok(body.data.length>0);
 const unchanged=await get("/api/v1/stickers?q=love&limit=10",{headers:{origin:"https://evil.test","if-none-match":etag}});
 assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),"");
 assert.equal((await get("/api/v1/stickers?q=love&limit=10",{headers:{"if-none-match":"W/"+etag}})).status,304);
 assert.equal(unchanged.headers.get("access-control-allow-origin"),null);
 const head=await get("/api/v1/stickers?q=love&limit=10",{method:"HEAD"});
 assert.equal(head.headers.get("etag"),etag);assert.equal(await head.text(),"");
});
