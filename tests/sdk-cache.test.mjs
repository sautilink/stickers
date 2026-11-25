import test from "node:test";
import assert from "node:assert/strict";
import {createStickerClient} from "../public/sdk.js";
test("concurrent SDK queries share one request and callers cannot mutate cached data",async()=>{
 let calls=0;const client=createStickerClient("https://stickers.sautilink.com",async()=>{
  calls++;await Promise.resolve();return new Response(JSON.stringify({data:[{id:"test"}]}));
 });
 const [a,b]=await Promise.all([client.packs(),client.packs()]);
 a.data[0].id="changed";assert.equal(b.data[0].id,"test");
 assert.equal((await client.packs()).data[0].id,"test");assert.equal(calls,1);
});
test("random API bypasses SDK cache and failed requests can retry",async()=>{
 let calls=0;const client=createStickerClient("https://stickers.sautilink.com",async()=>{
  calls++;return calls===1?new Response(JSON.stringify({error:{message:"unavailable"}}),{status:503}):new Response(JSON.stringify({data:[]}));
 });
 await assert.rejects(client.packs());await client.packs();
 await client.random();await client.random();assert.equal(calls,4);
});
