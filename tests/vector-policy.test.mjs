import test from "node:test";
import assert from "node:assert/strict";
import {gzipSync} from "node:zlib";
import {readFile} from "node:fs/promises";
import {validateVectorAnimation} from "../src/vector-policy.mjs";
import {decodeTgs} from "../scripts/import-tgs.mjs";
const original=JSON.parse(await readFile(new URL("../public/assets/vector/slv-heart.json",import.meta.url),"utf8"));
test("SautiLink Lottie original passes safe shape policy",()=>assert.equal(validateVectorAnimation(original),true));
test("TGS decoder accepts valid in-house 512x512 animation",()=>{
 const source=structuredClone(original);source.w=512;source.h=512;
 const tgs=gzipSync(Buffer.from(JSON.stringify(source)));
 assert.deepEqual(decodeTgs(tgs),source);
});
test("TGS rejects corrupt gzip or oversize duration",()=>{
 assert.throws(()=>decodeTgs(Buffer.from("invalid data")));
 const source=structuredClone(original);source.w=512;source.h=512;source.op=200;
 assert.throws(()=>decodeTgs(gzipSync(Buffer.from(JSON.stringify(source)))),/duration/);
});
test("vector rejects external assets and external links",()=>{
 const source=structuredClone(original);source.assets=[{u:"https://example.org"}];
 assert.throws(()=>validateVectorAnimation(source),/assets/);
 const source2=structuredClone(original);source2.layers[0].nm="https://test.example/";
 assert.throws(()=>validateVectorAnimation(source2),/External/);
});
test("vector rejects text, expressions and image layers",()=>{
 const text=structuredClone(original);text.layers[0].ty=5;assert.throws(()=>validateVectorAnimation(text),/shape layers/);
 const expression=structuredClone(original);expression.layers[0].x="alert(1)";assert.throws(()=>validateVectorAnimation(expression),/Expressions/);
});
