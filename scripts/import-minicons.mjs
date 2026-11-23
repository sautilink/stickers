// Import MIT-licensed Minicons Animated WebP into SautiLink's own catalog and storage.
// Pinned upstream commit. No user-provided remote URLs.
import {readFile,writeFile,mkdir,rename} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {validateCatalog} from "../src/engine.mjs";
const revision="587461f150fd3bd20e48475d4c1ec07badf25b9c";
const origin="https://raw.githubusercontent.com/tanximsiam/minicons-animated/"+revision+"/";
const root=fileURLToPath(new URL("../",import.meta.url));
const filename=path.join(root,"data/catalog.json");
const assetRoot=path.join(root,"public/assets/minicons");
const rawLimit=process.argv.find(x=>x.startsWith("--limit="));
const requested=rawLimit?Number(rawLimit.slice(8)):112;
if(!Number.isInteger(requested)||requested<1||requested>112)throw Error("--limit must be 1 through 112");
async function safeDownload(url,limit=4000000){
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:"error"});
 if(!response.ok||Number(response.headers.get("content-length")||0)>limit)throw Error("Unavailable or too large");
 const chunks=[];let size=0;
 for await(const chunk of response.body){size+=chunk.byteLength;if(size>limit)throw Error("Exceeds size limit");chunks.push(chunk);}
 return Buffer.concat(chunks);
}
const manifest=JSON.parse((await safeDownload(origin+"manifest.json",1000000)).toString("utf8"));
if(!Array.isArray(manifest.items)||manifest.items.length!==112)throw Error("Unexpected upstream manifest");
const catalog=JSON.parse(await readFile(filename,"utf8"));validateCatalog(catalog);
await mkdir(assetRoot,{recursive:true});
const already=new Set(catalog.stickers.map(s=>s.id));
let added=0,failed=0;
for(const source of manifest.items.slice(0,requested)){
 if(!/^[a-z][a-z0-9-]{0,40}$/.test(source.id)||source.webp!=="webp/"+source.id+".webp")throw Error("Unsafe upstream manifest item");
 const id="mini-"+source.id;
 if(already.has(id))continue;
 try{
  const data=await safeDownload(origin+source.webp);
  if(data.toString("ascii",0,4)!=="RIFF"||data.toString("ascii",8,12)!=="WEBP")throw Error("File is not a WebP");
  const target=path.join(assetRoot,source.id+".webp");
  await writeFile(target,data);
  const family=String(source.family||"").toLowerCase();
  const category=/romance|affection|love/.test(family+" "+source.id)?"love":/celebrat|party/.test(source.id)?"celebration":/hello|wave|greet/.test(source.id)?"greetings":"reactions";
  const tags=[source.id.replaceAll("-"," "),String(source.family||""),String(source.name||"")].filter(Boolean);
  catalog.stickers.push({id,pack_id:"minicons-animated",title:String(source.name||source.id),emoji:"",
   tags,category,sort_order:200+manifest.items.indexOf(source),format:"webp",animated:true,
   width:64,height:64,asset_path:"/assets/minicons/"+source.id+".webp",
   file_sha256:createHash("sha256").update(data).digest("hex"),license:"MIT",
   source_url:"https://github.com/tanximsiam/minicons-animated"});
  added++;console.log("Imported "+id);
 }catch(error){failed++;console.error("Skipped "+id+": "+error.message);}
}
if(!catalog.packs.some(x=>x.id==="minicons-animated")&&catalog.stickers.some(x=>x.pack_id==="minicons-animated")){
 catalog.packs.push({id:"minicons-animated",name:"Minicons Animated",description:"112 expressive animated face stickers",
  author:"Tanzim Siam",license:"MIT",
  license_url:"https://github.com/tanximsiam/minicons-animated/blob/"+revision+"/LICENSE",
  attribution:"Copyright (c) 2026 Tanzim Siam (tanximsiam). Licensed under the MIT License; see licenses/minicons-MIT.txt.",
  source_url:"https://github.com/tanximsiam/minicons-animated",featured:true,sort_order:2,
  cover_sticker_id:catalog.stickers.find(x=>x.pack_id==="minicons-animated").id});
}
validateCatalog(catalog);
if(added){
 catalog.updated_at=new Date().toISOString().slice(0,10);
 const tmp=filename+".tmp";await writeFile(tmp,JSON.stringify(catalog,null,2)+"\n");await rename(tmp,filename);
}
console.log("Minicons imported: "+added+"; failed: "+failed);
if(added===0&&failed>0)process.exitCode=1;
