// Download curated Google Noto Animated Emoji WebP files into our own catalog.
// CC BY 4.0 attribution is mandatory. No user-supplied URL is ever fetched.
import {readFile,writeFile,mkdir,rename} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {validateCatalog} from "../src/engine.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
const catalogFile=path.join(root,"data/catalog.json");
const assetDir=path.join(root,"public/assets/noto");
const selected=[
 ["1f602","Tears of Joy","😂",["laugh","lol","cheka","happy"],"reactions"],
 ["1f60d","Heart Eyes","😍",["love","upendo","cute"],"love"],
 ["1f914","Thinking","🤔",["thinking","think","fikiria","hmm"],"reactions"],
 ["1f44d","Thumbs Up","👍",["yes","like","sawa","good"],"reactions"],
 ["1f525","Fire","🔥",["fire","hot","kali","lit"],"reactions"],
 ["1f973","Party Face","🥳",["party","congratulations","sherehe"],"celebration"],
 ["1f62d","Crying","😭",["cry","sad","huzuni"],"reactions"],
 ["1f631","Scream","😱",["wow","shock","scared"],"reactions"],
 ["1f64f","Thank You","🙏",["thank","asante","please"],"greetings"],
 ["1f389","Party Popper","🎉",["party","celebrate","sherehe"],"celebration"],
 ["1f923","Rolling Laugh","🤣",["laugh","cheka","funny"],"reactions"],
 ["1f60e","Sunglasses","😎",["cool","poa","style"],"reactions"],
 ["1f44b","Waving Hand","👋",["hello","mambo","hi"],"greetings"],
 ["1f970","Smiling Hearts","🥰",["love","heart","upendo"],"love"],
 ["1f44f","Clapping","👏",["clap","bravo","congrats"],"reactions"],
 ["1f607","Angel","😇",["angel","innocent"],"reactions"]
];
const limitArg=process.argv.find(x=>x.startsWith("--limit="));
const limit=limitArg?Number(limitArg.slice(8)):selected.length;
if(!Number.isInteger(limit)||limit<1||limit>selected.length)throw Error("Invalid --limit");
const catalog=JSON.parse(await readFile(catalogFile,"utf8"));
validateCatalog(catalog);
await mkdir(assetDir,{recursive:true});
let imported=0,failed=0;
for(const [code,title,emoji,tags,category] of selected.slice(0,limit)){
 const id="noto-"+code, target=path.join(assetDir,code+".webp");
 if(catalog.stickers.some(s=>s.id===id)){console.log("Skipping existing "+id);continue;}
 const url="https://fonts.gstatic.com/s/e/notoemoji/latest/"+code+"/512.webp";
 try{
  const r=await fetch(url,{signal:AbortSignal.timeout(15000),redirect:"error"});
  if(!r.ok||Number(r.headers.get("content-length")||0)>4000000)throw Error("Remote asset unavailable or too large");
  const chunks=[];let size=0;
  for await(const chunk of r.body){size+=chunk.length;if(size>4000000)throw Error("Exceeds 4 MB");chunks.push(chunk);}
  const data=Buffer.concat(chunks);
  if(data.toString("ascii",0,4)!=="RIFF"||data.toString("ascii",8,12)!=="WEBP")throw Error("Not a WebP file");
  await writeFile(target,data,{flag:"w"});
  catalog.stickers.push({id,pack_id:"google-noto-animated",title,emoji,tags,category,sort_order:100+imported,
   format:"webp",animated:true,width:512,height:512,asset_path:"/assets/noto/"+code+".webp",
   file_sha256:createHash("sha256").update(data).digest("hex"),
   license:"CC BY 4.0",source_url:"https://googlefonts.github.io/noto-emoji-animation/"});
  imported++;console.log("Imported "+id+" ("+size+" bytes)");
 }catch(err){failed++;console.error("Skipped "+id+": "+err.message);}
}
if(!catalog.packs.some(x=>x.id==="google-noto-animated")&&catalog.stickers.some(x=>x.pack_id==="google-noto-animated")){
 catalog.packs.push({id:"google-noto-animated",name:"Noto Animated Emoji",description:"Expressive animated emojis by Google",
  author:"Google LLC",license:"CC BY 4.0",license_url:"https://creativecommons.org/licenses/by/4.0/",
  attribution:"Animated Noto Emoji © Google LLC, licensed under Creative Commons Attribution 4.0 International.",
  source_url:"https://googlefonts.github.io/noto-emoji-animation/",featured:true,sort_order:1,
  cover_sticker_id:catalog.stickers.find(x=>x.pack_id==="google-noto-animated").id});
}
validateCatalog(catalog);
if(imported>0){
 catalog.updated_at=new Date().toISOString().slice(0,10);
 const temp=catalogFile+".tmp";
 await writeFile(temp,JSON.stringify(catalog,null,2)+"\n");
 await rename(temp,catalogFile);
}
console.log("Imported "+imported+"; failed "+failed+"; no live provider dependency.");
if(imported===0&&failed>0)process.exitCode=1;
