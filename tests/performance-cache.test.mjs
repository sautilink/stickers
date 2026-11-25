import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createEngine} from "../src/engine.mjs";
const catalog=JSON.parse(await readFile(new URL("../data/catalog.json",import.meta.url),"utf8"));
const host="https://stickers.sautilink.com";
const api=createEngine(catalog,{allowedOrigins:["https://sautilink.com","https://test.sautilink.com"]});
const get=(path,headers={},method="GET")=>api.fetch(new Request(host+path,{headers,method}));
test("cache reuses public JSON without leaking CORS between callers",async()=>{
 const path="/api/v1/stickers?limit=24";
 const a=await get(path,{origin:"https://sautilink.com"}),body=await a.text(),etag=a.headers.get("etag");
 assert.ok(etag);
 const b=await get(path,{origin:"https://test.sautilink.com"});
 assert.equal(await b.text(),body);assert.equal(b.headers.get("access-control-allow-origin"),"https://test.sautilink.com");
 const c=await get(path,{origin:"https://external.example","if-none-match":etag});
 assert.equal(c.status,304);assert.equal(await c.text(),"");assert.equal(c.headers.get("access-control-allow-origin"),null);
 assert.equal((await get(path,{},"HEAD")).status,200);
});
test("all catalog IDs reachable through indexed pack pagination",async()=>{
 const found=new Set();
 for(const pack of catalog.packs){
  let cursor="0";
  do{
   const r=await get("/api/v1/stickers?pack="+pack.id+"&limit=24&cursor="+cursor);
   assert.equal(r.status,200);const b=await r.json();
   for(const s of b.data){assert.equal(s.pack_id,pack.id);assert.ok(!found.has(s.id));found.add(s.id);}
   cursor=b.pagination.next_cursor;
  }while(cursor!==null);
 }
 assert.equal(found.size,catalog.stickers.length);
});
test("ID lookup preserves input order and filters",async()=>{
 const ids=catalog.stickers.slice(-5).reverse().map(s=>s.id);
 const r=await get("/api/v1/stickers?ids="+ids.join(",")+"&limit=60");
 assert.deepEqual((await r.json()).data.map(s=>s.id),ids);
});
test("health and random are never cached",async()=>{
 for(const p of ["/api/v1/health","/api/v1/stickers/random"]){
  const r=await get(p);assert.equal(r.headers.get("cache-control"),"no-store");assert.equal(r.headers.get("etag"),null);
 }
});
