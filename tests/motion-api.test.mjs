import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createEngine} from "../src/engine.mjs";
const catalog=JSON.parse(await readFile(new URL("../data/catalog.json",import.meta.url),"utf8"));
const app=createEngine(catalog,{allowedOrigins:["https://sautilink.com"]});
const api=async p=>(await app.fetch(new Request("https://stickers.sautilink.com"+p))).json();
test("eight original SautiLink vector emoji in a featured pack",async()=>{
 const r=await api("/api/v1/stickers?pack=sautilink-motion-originals&limit=40");
 assert.equal(r.data.length,8);assert.ok(r.data.every(s=>s.format==="lottie"&&s.inline_emoji===true));
});
test("vector capabilities and inline emoji discovery",async()=>{
 const c=await api("/api/v1/capabilities");
 assert.ok(c.data.formats.includes("lottie"));assert.equal(c.data.tgs_import,true);
 assert.equal(c.data.requires_artwork_rights_review,true);
 const m=await api("/api/v1/emoji-map");assert.equal(m.data.length,8);
 assert.ok(m.data.every(s=>s.id.startsWith("slv-")&&s.asset_url.endsWith(".json")));
});
test("pack cover metadata provides safe vector fallback",async()=>{
 const r=await api("/api/v1/packs");const p=r.data.find(x=>x.id==="sautilink-motion-originals");
 assert.equal(p.cover_format,"lottie");assert.equal(p.cover_emoji,"💗");
});
test("format stats count all sticker types",async()=>{
 const r=await api("/api/v1/stats");assert.equal(r.data.formats.lottie,8);
 assert.equal(Object.values(r.data.formats).reduce((a,b)=>a+b,0),catalog.stickers.length);
});
