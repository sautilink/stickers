import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {chromium} from "playwright";
const origin="http://localhost:8798";
const server=spawn(process.execPath,["src/server.mjs"],{env:{...process.env,PORT:"8798"},stdio:"inherit"});
let browser;
try{
 for(let attempt=0;attempt<60;attempt++){
  try{if((await fetch(origin+"/health")).ok)break;}catch{}
  if(attempt===59)throw Error("Local server did not start");
  await new Promise(r=>setTimeout(r,250));
 }
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(origin+"/",{waitUntil:"domcontentloaded"});
 await page.waitForSelector("#stickerGrid .tile");
 assert.equal(await page.locator("#stickerGrid .tile").count(),24);
 const first=page.locator("#stickerGrid .tile").first();
 await first.locator(".heart").click();assert.equal(await first.locator(".heart.saved").count(),1);
 await page.locator("#loadMore").scrollIntoViewIfNeeded();await page.locator("#loadMore").click();
 await page.waitForFunction(()=>document.querySelectorAll("#stickerGrid .tile").length===48);
 // Preview and original fallback: an intentionally failed image must never be a blank card.
 await page.evaluate(async()=>{
  const {createStickerVisual}=await import("/vector-player.js");
  const node=createStickerVisual({id:"missing-art",format:"webp",title:"Missing",emoji:"🙂",asset_url:location.origin+"/assets/missing.webp"});
  node.id="forced-missing";document.body.prepend(node);
 });
 await page.locator("#forced-missing").scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector("#forced-missing")?.textContent.includes("🙂"));
 // Load every vector in a real Canvas renderer, and ensure nontransparent pixels are rendered.
 const ids=["heart","laugh","wow","wave","party","fire","thanks","cool"];
 for(const id of ids){
  await page.goto(origin+"/?sticker=slv-"+id,{waitUntil:"domcontentloaded"});
  await page.waitForSelector("#detailDialog[open]");
  await page.waitForFunction(()=>{
   const canvas=document.querySelector("#detailImage canvas");
   if(!canvas?.width||!canvas.height)return false;
   const ctx=canvas.getContext("2d"),pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   for(let i=3;i<pixels.length;i+=4)if(pixels[i]>100)return true;
   return false;
  },{},{timeout:20000});
 }
 assert.deepEqual(errors,[]);
 console.log("Browser check passed: 24-card initial view, pagination, favorites, image fallback, all 8 Lottie canvases.");
}finally{await browser?.close();server.kill();}
