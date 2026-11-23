import {readFile,stat} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {originalIds} from "../src/art.mjs";
import {validateCatalog} from "../src/engine.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
const catalog=JSON.parse(await readFile(path.join(root,"data/catalog.json"),"utf8"));
validateCatalog(catalog);
for(const s of catalog.stickers){
 if(s.asset_path.startsWith("/assets/original/")){if(!originalIds.includes(s.id))throw Error("Missing original SVG: "+s.id);}
 else{const filename=path.resolve(root,"public","."+s.asset_path);if(!filename.startsWith(path.join(root,"public")+path.sep))throw Error("Invalid path");await stat(filename);
  const bytes=await readFile(filename);
  if(s.format==="webp"&&(bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP"))throw Error("Invalid WebP magic: "+s.id);
  if(s.file_sha256){const digest=createHash("sha256").update(bytes).digest("hex");if(digest!==s.file_sha256)throw Error("Asset checksum mismatch: "+s.id);}}
}
console.log("Catalog OK: "+catalog.packs.length+" packs / "+catalog.stickers.length+" stickers");
