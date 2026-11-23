import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const port=18991;
const server=spawn(process.execPath,["src/server.mjs"],{cwd:root,env:{...process.env,PORT:String(port)},stdio:"pipe"});
const base="http://127.0.0.1:"+port;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function check(){
 let ready=false;
 for(let i=0;i<40;i++){
  if(server.exitCode!==null)throw Error("Server exited before becoming ready");
  try{const r=await fetch(base+"/health");if(r.ok){ready=true;break;}}catch{}
  await pause(150);
 }
 assert.ok(ready,"Local server did not start");
 const catalog=JSON.parse(await readFile(new URL("../data/catalog.json",import.meta.url),"utf8"));
 const index=await fetch(base+"/");assert.equal(index.status,200);assert.match(await index.text(),/Every feeling/);
 const picker=await fetch(base+"/picker.js");assert.equal(picker.status,200);assert.match(await picker.text(),/sticker-selected/);
 const packs=await (await fetch(base+"/api/v1/packs")).json();assert.equal(packs.data.length,catalog.packs.length);
 const stickers=await (await fetch(base+"/api/v1/stickers?limit=60")).json();
 assert.equal(stickers.pagination.total,catalog.stickers.length);
 const svg=await fetch(base+"/assets/original/sl-love.svg");assert.equal(svg.status,200);
 assert.match(svg.headers.get("content-type"),/image\/svg\+xml/);
 const webp=catalog.stickers.find(s=>s.format==="webp");
 if(webp){
  const r=await fetch(base+webp.asset_path);assert.equal(r.status,200);
  const buf=Buffer.from(await r.arrayBuffer());assert.equal(buf.toString("ascii",0,4),"RIFF");assert.equal(buf.toString("ascii",8,12),"WEBP");
 }
 const cors=await fetch(base+"/api/v1/stickers",{headers:{Origin:"https://sautilink.com"}});
 assert.equal(cors.headers.get("access-control-allow-origin"),"https://sautilink.com");
 const reject=await fetch(base+"/api/v1/stickers",{method:"POST"});assert.equal(reject.status,405);
 console.log("HTTP smoke OK; "+catalog.packs.length+" packs / "+catalog.stickers.length+" stickers");
}
try{await check();}finally{server.kill("SIGTERM");}
