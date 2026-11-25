// Generates small animated browse previews from the licensed originals.
// Original media remains byte-identical; generated files are build artifacts.
import sharp from "sharp";
import {readFile,writeFile,mkdir,stat,rm} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const catalog=JSON.parse(await readFile(path.join(root,"data/catalog.json"),"utf8"));
const out=path.join(root,"public/assets/previews");
await mkdir(out,{recursive:true});
const previews={};let originalBytes=0,previewBytes=0,decoded=0,animated=0;
for(const s of catalog.stickers){
 if(s.format!=="webp")continue;
 const source=path.join(root,"public",s.asset_path.slice(1)),bytes=(await stat(source)).size;
 const meta=await sharp(source,{animated:true}).metadata();
 if(meta.format!=="webp"||!meta.width||!(meta.pageHeight||meta.height))throw Error("Invalid WebP: "+s.id);
 // Decode every image's first frame, including tiny assets which do not need previews.
 await sharp(source).resize({width:16,height:16,fit:"inside"}).raw().toBuffer();
 decoded++;if((meta.pages||1)>1)animated++;
 if(bytes<100000)continue;
 const target=path.join(out,s.id+".webp");
 try{
  await sharp(source,{animated:true,limitInputPixels:100000000}).resize({width:160,height:160,fit:"inside",withoutEnlargement:true})
   .webp({quality:72,alphaQuality:85,effort:3,loop:meta.loop??0,delay:meta.delay}).toFile(target);
  const after=await sharp(target,{animated:true}).metadata(),size=(await stat(target)).size;
  if((after.pages||1)!==(meta.pages||1)||size>=bytes||after.width>160||(after.pageHeight||after.height)>160){await rm(target,{force:true});continue;}
  previews[s.id]={path:"/assets/previews/"+s.id+".webp",bytes:size};
  originalBytes+=bytes;previewBytes+=size;
 }catch(error){await rm(target,{force:true});throw Error("Preview generation failed: "+s.id,{cause:error});}
}
await writeFile(path.join(out,"manifest.json"),JSON.stringify({version:1,previews})+"\n");
console.log(JSON.stringify({webpDecoded:decoded,animatedWebp:animated,previews:Object.keys(previews).length,originalBytes,previewBytes},null,2));
if(!decoded||!Object.keys(previews).length||previewBytes>=originalBytes)throw Error("No useful previews generated");
