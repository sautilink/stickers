import {readFile,writeFile,mkdir,rename} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {validateCatalog} from "../src/engine.mjs";
// Build-time only: official Google Noto CC BY 4.0 gallery + Unicode 17 names.
const root=fileURLToPath(new URL("../",import.meta.url));
const file=path.join(root,"data/catalog.json");
const directory=path.join(root,"public/assets/noto");
const gallery="https://googlefonts.github.io/noto-emoji-animation/";
const metadata="https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt";
const limits={reactions:70,love:20,gestures:45,animals:65,food:45,activities:35,travel:35,objects:30,symbols:35};
const max=Number(process.argv.find(x=>x.startsWith("--limit="))?.slice(8)||"350");
if(!Number.isInteger(max)||max<1||max>400)throw Error("Use --limit=1..400");

async function readUrl(url,limit=7000000){
 const r=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error("Metadata HTTP "+r.status+" at "+url);
 const text=await r.text();
 if(text.length>limit)throw Error("Unexpected metadata size");
 return text;
}
const [html,unicode]=await Promise.all([readUrl(gallery),readUrl(metadata)]);
const galleryCodes=[...new Set([...html.matchAll(/fonts\.gstatic\.com\/s\/e\/notoemoji\/latest\/([a-f0-9_]+)\/512\.webp/gi)].map(x=>x[1].toLowerCase()))];
if(galleryCodes.length<250)throw Error("Expected animated WebP in official Google gallery; found "+galleryCodes.length);
const named=new Map();let group="",subgroup="";
for(const line of unicode.split(/\r?\n/)){
 if(line.startsWith("# group: ")){group=line.slice(9).trim();continue;}
 if(line.startsWith("# subgroup: ")){subgroup=line.slice(12).trim();continue;}
 const r=/^([0-9A-F ]+)\s*;\s*fully-qualified\s*#\s*(\S+)\s+E[\d.]+\s+(.+)$/.exec(line);
 if(!r)continue;
 const key=r[1].trim().toLowerCase().replace(/\s+/g,"_");
 const record={emoji:r[2],title:r[3],group,subgroup};
 named.set(key,record);named.set(key.replaceAll("_fe0f",""),record);
}
function categoryOf(r){
 if(!r)return null;
 if(r.group==="Smileys & Emotion")return /heart|love|kiss|affection/.test(r.subgroup+" "+r.title)?"love":"reactions";
 const mapping={"People & Body":"gestures","Animals & Nature":"animals","Food & Drink":"food",
 "Activities":"activities","Travel & Places":"travel","Objects":"objects","Symbols":"symbols"};
 return mapping[r.group]||null;
}
const catalog=JSON.parse(await readFile(file,"utf8"));validateCatalog(catalog);
const currentIds=new Set(catalog.stickers.map(s=>s.id));
const choices=Object.fromEntries(Object.keys(limits).map(key=>[key,[]]));
for(const code of galleryCodes){
 if(currentIds.has("noto-"+code))continue;
 if(code.split("_").some(s=>{const n=parseInt(s,16);return n>=0x1f3fb&&n<=0x1f3ff;}))continue;
 const record=named.get(code);const category=categoryOf(record);
 if(category)choices[category].push({code,record,category});
}
for(const c of Object.keys(choices))choices[c].sort((a,b)=>a.code.localeCompare(b.code));
const selected=[],counter=Object.fromEntries(Object.keys(limits).map(k=>[k,0]));
while(selected.length<max){
 let progress=false;
 for(const c of Object.keys(limits)){
  if(counter[c]>=limits[c]||selected.length>=max)continue;
  const next=choices[c].shift();
  if(next){selected.push(next);counter[c]++;progress=true;}
 }
 if(!progress)break;
}
if(selected.length<150)throw Error("Not enough available gallery assets: "+selected.length);
console.log("Google gallery codes: "+galleryCodes.length+"; selected: "+selected.length, counter);
await mkdir(directory,{recursive:true});
const added=[];let failed=0;let index=0;
async function download(item){
 const {code,record,category}=item;
 const url="https://fonts.gstatic.com/s/e/notoemoji/latest/"+code+"/512.webp";
 try{
  const response=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(22000)});
  if(!response.ok||Number(response.headers.get("content-length")||0)>3000000)throw Error("Unavailable/oversize");
  const chunks=[];let bytes=0;
  for await(const chunk of response.body){bytes+=chunk.byteLength;if(bytes>3000000)throw Error("Too large");chunks.push(chunk);}
  const data=Buffer.concat(chunks);
  if(data.toString("ascii",0,4)!=="RIFF"||data.toString("ascii",8,12)!=="WEBP")throw Error("Not WebP");
  await writeFile(path.join(directory,code+".webp"),data);
  const categoryTags={love:["upendo","mapenzi"],reactions:["hisia","cheka"],gestures:["ishara"],animals:["wanyama"],food:["chakula"],activities:["michezo"],travel:["safari"],objects:["vifaa"],symbols:["alama"]};
  added.push({id:"noto-"+code,pack_id:"noto-"+category,
    title:record.title[0].toUpperCase()+record.title.slice(1),emoji:record.emoji,
    tags:[...new Set([record.title,record.group,record.subgroup,...(categoryTags[category]||[])])],
    category,sort_order:500+selected.indexOf(item),format:"webp",animated:true,
    width:512,height:512,asset_path:"/assets/noto/"+code+".webp",
    file_sha256:createHash("sha256").update(data).digest("hex"),
    license:"CC BY 4.0",source_url:gallery});
 }catch(err){failed++;console.warn("Skipped",code,err.message);}
}
await Promise.all(Array.from({length:7},async()=>{while(index<selected.length){await download(selected[index++]);}}));
if(added.length<150)throw Error("Imported only "+added.length+" files, refusing incomplete catalog");
const names={
 reactions:"Noto Expressions",love:"Noto Love & Hearts",gestures:"Noto Gestures",
 animals:"Noto Animals & Nature",food:"Noto Food & Drinks",activities:"Noto Fun & Activities",
 travel:"Noto Travel & Places",objects:"Noto Everyday Objects",symbols:"Noto Symbols"
};
for(const category of Object.keys(limits)){
 const matching=added.filter(s=>s.category===category);
 if(!matching.length)continue;
 const id="noto-"+category;
 if(!catalog.packs.some(p=>p.id===id)){
  catalog.packs.push({id,name:names[category],description:"Animated "+category+" from Google Noto",
   author:"Google LLC",license:"CC BY 4.0",license_url:"https://creativecommons.org/licenses/by/4.0/",
   attribution:"Animated Noto Emoji © Google LLC (CC BY 4.0). Names from Unicode Emoji 17.0.",
   source_url:gallery,featured:true,sort_order:10+Object.keys(limits).indexOf(category),
   cover_sticker_id:matching[0].id});
 }
}
catalog.stickers.push(...added);catalog.updated_at=new Date().toISOString().slice(0,10);
validateCatalog(catalog);
const tmp=file+".tmp";await writeFile(tmp,JSON.stringify(catalog,null,2)+"\n");await rename(tmp,file);
console.log("Imported",added.length,"new animated WebPs, failed",failed,"catalog total",catalog.stickers.length,"packs",catalog.packs.length);
