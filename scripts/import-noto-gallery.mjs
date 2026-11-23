/**
 * Build-time importer of official Google Noto animated emoji.
 * Uses pinned Google emoji-metadata JSON (animated=true), plus Unicode 17 names.
 * Noto artwork: CC BY 4.0. Metadata: Apache 2.0. Unicode names: Unicode terms.
 * Live SautiLink users never call Google; local copies are served by our Worker.
 */
import {readFile,writeFile,mkdir,rename} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {validateCatalog} from "../src/engine.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
const catalogFile=path.join(root,"data/catalog.json");
const media=path.join(root,"public/assets/noto");
const gallery="https://googlefonts.github.io/noto-emoji-animation/";
const googleMetadata="https://raw.githubusercontent.com/googlefonts/emoji-metadata/173b9b26e8fcbcbe64e1ecbf073a21a96b95c6b1/emoji_17_0_ordering.json";
const unicodeNames="https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt";
const limits={reactions:130,love:32,gestures:8,animals:98,food:60,activities:54,travel:30,objects:48,symbols:50};
const max=Number(process.argv.find(x=>x.startsWith("--limit="))?.slice(8)||"380");
if(!Number.isInteger(max)||max<1||max>450)throw Error("--limit must be 1..450");

async function fetchText(url){
 const response=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error("Metadata error: "+response.status+" at "+url);
 const result=await response.text();if(result.length>5_000_000)throw Error("Metadata exceeds limit");
 return result;
}
const [googleText,unicodeText]=await Promise.all([fetchText(googleMetadata),fetchText(unicodeNames)]);
const groups=JSON.parse(googleText);
if(!Array.isArray(groups)||groups.length<5)throw Error("Unexpected Google official metadata");
const records=new Map();let group="",subgroup="";
for(const line of unicodeText.split(/\r?\n/)){
 if(line.startsWith("# group: ")){group=line.slice(9).trim();continue;}
 if(line.startsWith("# subgroup: ")){subgroup=line.slice(12).trim();continue;}
 const match=/^([0-9A-F ]+)\s*;\s*fully-qualified\s*#\s*(\S+)\s+E[\d.]+\s+(.+)$/.exec(line);
 if(!match)continue;
 const code=match[1].trim().toLowerCase().replace(/\s+/g,"_");
 const info={emoji:match[2],title:match[3],group,subgroup};
 records.set(code,info);records.set(code.replaceAll("_fe0f",""),info);
}
function categoryFor(googleGroup,name){
 if(googleGroup==="Smileys and emotions"){
  return /heart|kiss|love|affection|blowing.*kiss/i.test(name)?"love":"reactions";
 }
 return ({"People":"gestures","Animals and nature":"animals","Food and drink":"food",
  "Travel and places":"travel","Activities and events":"activities",
  "Objects":"objects","Symbols":"symbols"})[googleGroup]||null;
}
const catalog=JSON.parse(await readFile(catalogFile,"utf8"));validateCatalog(catalog);
const current=new Set(catalog.stickers.map(s=>s.id));
const pools=Object.fromEntries(Object.keys(limits).map(key=>[key,[]]));
for(const group of groups){
 for(const entry of group.emoji||[]){
  if(entry.animated!==true||!Array.isArray(entry.base)||!entry.base.length)continue;
  const code=entry.base.map(n=>Number(n).toString(16)).join("_");
  if(!/^[a-f0-9_]+$/.test(code)||current.has("noto-"+code))continue;
  const name=records.get(code)?.title||entry.shortcodes?.[0]?.replaceAll(":","").replaceAll("-"," ")||"Animated emoji";
  const category=categoryFor(group.group,name);
  if(!category)continue;
  const info=records.get(code);
  const emoji=info?.emoji||String.fromCodePoint(...entry.base);
  pools[category].push({code,emoji,name,category,shortcodes:entry.shortcodes||[]});
 }
}
const selected=[];const tallies=Object.fromEntries(Object.keys(limits).map(c=>[c,0]));
while(selected.length<max){
 let advanced=false;
 for(const category of Object.keys(limits)){
  if(tallies[category]>=limits[category]||selected.length>=max)continue;
  const entry=pools[category].shift();
  if(!entry)continue;
  selected.push(entry);tallies[category]++;advanced=true;
 }
 if(!advanced)break;
}
if(selected.length<160)throw Error("Too few official animated assets found: "+selected.length);
console.log("Selected official animated stickers:",selected.length,tallies);
await mkdir(media,{recursive:true});
const saved=[];let failures=0,position=0;
async function download(entry){
 const {code,emoji,name,category,shortcodes}=entry;
 try{
  const url="https://fonts.gstatic.com/s/e/notoemoji/latest/"+code+"/512.webp";
  const response=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(22000)});
  if(!response.ok||Number(response.headers.get("content-length")||0)>3_000_000)throw Error("Unavailable/too large: "+response.status);
  const buffers=[];let length=0;
  for await(const part of response.body){length+=part.byteLength;if(length>3_000_000)throw Error("File above limit");buffers.push(part);}
  const content=Buffer.concat(buffers);
  if(content.toString("ascii",0,4)!=="RIFF"||content.toString("ascii",8,12)!=="WEBP")throw Error("Invalid WebP");
  await writeFile(path.join(media,code+".webp"),content);
  const words={
   reactions:["hisia","reaction"],love:["upendo","mapenzi"],gestures:["ishara"],
   animals:["wanyama"],food:["chakula"],activities:["michezo","sherehe"],
   travel:["safari"],objects:["vifaa"],symbols:["alama"]
  };
  saved.push({id:"noto-"+code,pack_id:"noto-"+category,title:name[0].toUpperCase()+name.slice(1),
   emoji,tags:[name,...shortcodes.map(s=>s.replaceAll(":","").replaceAll("-"," ")),...(words[category]||[])],
   category,sort_order:500+selected.indexOf(entry),format:"webp",animated:true,width:512,height:512,
   asset_path:"/assets/noto/"+code+".webp",file_sha256:createHash("sha256").update(content).digest("hex"),
   license:"CC BY 4.0",source_url:gallery});
 }catch(error){failures++;if(failures<=15)console.warn("Skipped",code,error.message);}
}
await Promise.all(Array.from({length:8},async()=>{while(position<selected.length){await download(selected[position++]);}}));
if(saved.length<160)throw Error("Only "+saved.length+" assets downloaded; refusing partial import");
const names={
 reactions:"Noto Expressions",love:"Noto Love & Hearts",gestures:"Noto Gestures",
 animals:"Noto Animals & Nature",food:"Noto Food & Drinks",activities:"Noto Fun & Activities",
 travel:"Noto Travel & Places",objects:"Noto Everyday Objects",symbols:"Noto Symbols"
};
for(const category of Object.keys(limits)){
 const groupStickers=saved.filter(s=>s.category===category);
 if(!groupStickers.length)continue;
 const id="noto-"+category;
 if(!catalog.packs.some(p=>p.id===id)){
  catalog.packs.push({id,name:names[category],description:"Animated "+category+" from Google Noto",
   author:"Google LLC",license:"CC BY 4.0",license_url:"https://creativecommons.org/licenses/by/4.0/",
   attribution:"Noto Animated Emoji © Google LLC (CC BY 4.0). Emoji names from Unicode 17.0.",
   source_url:gallery,featured:true,sort_order:10+Object.keys(limits).indexOf(category),
   cover_sticker_id:groupStickers[0].id});
 }
}
catalog.stickers.push(...saved);catalog.updated_at=new Date().toISOString().slice(0,10);
validateCatalog(catalog);
const tmp=catalogFile+".tmp";
await writeFile(tmp,JSON.stringify(catalog,null,2)+"\n");await rename(tmp,catalogFile);
console.log("Imported "+saved.length+"; failed "+failures+"; total "+catalog.stickers.length+" stickers and "+catalog.packs.length+" packs");
