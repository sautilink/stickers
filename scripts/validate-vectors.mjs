import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {validateVectorAnimation} from "../src/vector-policy.mjs";
import {createHash} from "node:crypto";
const root=fileURLToPath(new URL("../",import.meta.url));
const catalog=JSON.parse(await readFile(path.join(root,"data/catalog.json"),"utf8"));
let count=0;
for(const sticker of catalog.stickers){
 if(sticker.format!=="lottie")continue;
 if(!sticker.asset_path.startsWith("/assets/vector/")||!sticker.asset_path.endsWith(".json"))throw Error("Invalid vector path: "+sticker.id);
 const bytes=await readFile(path.join(root,"public",sticker.asset_path.slice(1)));
 const data=JSON.parse(bytes.toString("utf8"));
 validateVectorAnimation(data);
 if(sticker.file_sha256&&createHash("sha256").update(bytes).digest("hex")!==sticker.file_sha256)throw Error("Vector checksum mismatch: "+sticker.id);
 for(const layer of data.layers){
  const base=layer.shapes.findIndex(s=>s.nm==="base");
  if(base>=0&&base!==layer.shapes.length-1)throw Error("Background obscures the emoji details: "+sticker.id);
 }
 if(data.w!==sticker.width||data.h!==sticker.height)throw Error("Vector dimensions inconsistent with catalog: "+sticker.id);
 count++;
}
console.log("Vector animation integrity passed:",count,"Lottie JSON assets");
