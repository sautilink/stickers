import {readFile,stat} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {originalIds} from "../src/art.mjs";
import {validateCatalog} from "../src/engine.mjs";
import sharp from "sharp";
const root=fileURLToPath(new URL("../",import.meta.url));
const catalog=JSON.parse(await readFile(path.join(root,"data/catalog.json"),"utf8"));
validateCatalog(catalog);
for(const s of catalog.stickers){
 if(s.asset_path.startsWith("/assets/original/")){if(!originalIds.includes(s.id))throw Error("Missing original SVG: "+s.id);}
 else{const filename=path.resolve(root,"public","."+s.asset_path);if(!filename.startsWith(path.join(root,"public")+path.sep))throw Error("Invalid path");await stat(filename);
  const bytes=await readFile(filename);
  if(s.format==="webp"&&(bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP"))throw Error("Invalid WebP magic: "+s.id);
  if(s.file_sha256){const digest=createHash("sha256").update(bytes).digest("hex");if(digest!==s.file_sha256)throw Error("Asset checksum mismatch: "+s.id);}}
 if(s.preview_path){
  const previewPath=path.resolve(root,"public","."+s.preview_path);
  if(!previewPath.startsWith(path.join(root,"public","assets","previews")+path.sep))throw Error("Invalid preview path");
  const preview=await readFile(previewPath), original=await readFile(path.resolve(root,"public","."+s.asset_path));
  const digest=value=>createHash("sha256").update(value).digest("hex");
  if(digest(preview)!==s.preview_sha256||digest(original)!==s.preview_source_sha256||preview.length!==s.preview_bytes||preview.length>=original.length)throw Error("Preview integrity mismatch: "+s.id);
  const sourceMeta=await sharp(original,{animated:true}).metadata(), meta=await sharp(preview,{animated:true}).metadata();
  if(meta.width!==s.preview_width||(meta.pageHeight||meta.height)!==s.preview_height)throw Error("Preview size mismatch: "+s.id);
  const duration=value=>(value.delay||[]).reduce((a,b)=>a+b,0);
  // WebP may coalesce identical consecutive frames, preserving their summed delay.
  if(((sourceMeta.pages||1)>1&&(meta.pages||1)<=1)||duration(sourceMeta)!==duration(meta)||sourceMeta.loop!==meta.loop)throw Error("Preview animation mismatch: "+s.id);
 }
}
console.log("Catalog OK: "+catalog.packs.length+" packs / "+catalog.stickers.length+" stickers");
