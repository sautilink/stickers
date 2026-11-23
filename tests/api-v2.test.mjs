import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createEngine,validateCatalog} from "../src/engine.mjs";
import {createStickerClient,createStickerMessage} from "../public/sdk.js";
const catalog=JSON.parse(await readFile(new URL("../data/catalog.json",import.meta.url),"utf8"));
const api=createEngine(catalog,{allowedOrigins:["https://sautilink.com"]});
const get=async(p,init)=>api.fetch(new Request("https://stickers.example"+p,init));
test("catalog pack covers and asset paths valid",()=>assert.equal(validateCatalog(catalog),true));
test("stats match catalog",async()=>{
 const {data}=await(await get("/api/v1/stats")).json();
 assert.equal(data.stickers,catalog.stickers.length);assert.equal(data.packs,catalog.packs.length);
 assert.equal(Object.values(data.categories).reduce((a,b)=>a+b,0),catalog.stickers.length);
});
test("category counts",async()=>{
 const {data}=await(await get("/api/v1/categories?with_counts=true")).json();
 assert.ok(data.length>1);assert.equal(data.reduce((n,c)=>n+c.count,0),catalog.stickers.length);
 const legacy=await(await get("/api/v1/categories")).json();assert.ok(legacy.data.every(x=>typeof x==="string"));
});
test("bulk sticker lookup preserves client favorites order",async()=>{
 const {data}=await(await get("/api/v1/stickers?ids=sl-love,sl-happy,sl-cool")).json();
 assert.deepEqual(data.map(s=>s.id),["sl-love","sl-happy","sl-cool"]);
});
test("bulk lookup checks ids limits",async()=>{
 assert.equal((await get("/api/v1/stickers?ids=bad!,sl-happy")).status,400);
 assert.equal((await get("/api/v1/stickers?ids="+Array(90).fill("sl-love").join(","))).status,400);
});
test("sort modes, newest and alphabetical",async()=>{
 const a=await(await get("/api/v1/stickers?sort=name&limit=60")).json();
 const b=await(await get("/api/v1/stickers?sort=newest&limit=60")).json();
 assert.ok(a.data[0].title.localeCompare(a.data[1].title)<=0);
 assert.ok(b.data[0].sort_order>=b.data[1].sort_order);
 assert.equal((await get("/api/v1/stickers?sort=invalid")).status,400);
});
test("featured, related, random and suggestions",async()=>{
 const featured=await(await get("/api/v1/featured")).json();assert.ok(featured.data.length>=8);
 const related=await(await get("/api/v1/stickers/sl-love/related")).json();assert.ok(related.data.length>0);
 const random=await(await get("/api/v1/stickers/random")).json();assert.ok(random.data.id);
 assert.equal((await get("/api/v1/stickers/random")).headers.get("cache-control"),"no-store");
 const suggest=await(await get("/api/v1/suggestions?q=lo")).json();assert.ok(suggest.data.length);
});
test("client SDK and sticker message payload",async()=>{
 const fetcher=url=>get(new URL(url).pathname+new URL(url).search);
 const client=createStickerClient("https://stickers.example",fetcher);
 assert.equal((await client.sticker("sl-love")).data.id,"sl-love");
 const message=createStickerMessage((await client.sticker("sl-love")).data);
 assert.deepEqual(message,{type:"sticker",sticker_id:"sl-love",pack_id:"sautilink-originals"});
 assert.throws(()=>createStickerMessage({id:"bad!"}),TypeError);
 assert.throws(()=>createStickerClient("http://untrusted.example",fetcher),TypeError);
});
