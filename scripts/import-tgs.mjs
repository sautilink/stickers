// Offline, staff-reviewed TGS (gzip-compressed Lottie) to first-party Lottie JSON importer.
// No Telegram downloads, auto-publication, or remote URL ingestion.
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {gunzipSync} from "node:zlib";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {validateVectorAnimation} from "../src/vector-policy.mjs";

export function decodeTgs(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length<20||buffer.length>256*1024)throw Error("TGS file size invalid");
 if(buffer[0]!==0x1f||buffer[1]!==0x8b)throw Error("TGS must be gzip-compressed JSON");
 const out=gunzipSync(buffer,{maxOutputLength:512000});
 let data;try{data=JSON.parse(out.toString("utf8"));}catch{throw Error("TGS payload is not JSON");}
 validateVectorAnimation(data,{maxDuration:3});
 if(data.w!==512||data.h!==512)throw Error("TGS canvas must be 512x512");
 return data;
}
async function main(){
 const params=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith("--")&&x.includes("=")).map(x=>x.slice(2).split(/=(.*)/s).slice(0,2)));
 if(!params.input||!params.id||!params.rights)throw Error("Usage: npm run import:tgs -- --input=path/to/asset.tgs --id=slv-newname --rights=path/to/rights.json");
 if(!/^slv-[a-z0-9-]{2,65}$/.test(params.id))throw Error("Invalid first-party vector ID");
 const file=await readFile(path.resolve(params.input));
 const rights=JSON.parse(await readFile(path.resolve(params.rights),"utf8"));
 if(rights.rights_confirmed!==true||rights.asset_id!==params.id||typeof rights.copyright_owner!=="string"||rights.copyright_owner.length<5||
   typeof rights.license!=="string"||rights.license.length<3||typeof rights.source_url!=="string"||!/^https:\/\//.test(rights.source_url)){
   throw Error("Legal rights declaration is required. Confirm rights manually before importing.");
 }
 const data=decodeTgs(file);
 const root=fileURLToPath(new URL("../",import.meta.url));
 const dest=path.join(root,"public/assets/vector",params.id+".json");
 await mkdir(path.dirname(dest),{recursive:true});
 // No catalog mutation: staff must review animation and make a separate catalog PR.
 await writeFile(dest,JSON.stringify(data)+"\n",{flag:"wx"});
 console.log("Validated local TGS and saved Lottie JSON:",dest);
 console.log("NEXT: manually review art rights, add a vetted pack/sticker catalog entry, and submit a PR.");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
}
