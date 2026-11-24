// Run ONLY in GitHub CI after installing pinned lottie-web@5.13.0.
// Vendoring avoids loading players from any third-party CDN at runtime.
import {readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
const root=fileURLToPath(new URL("../",import.meta.url));
const pkg=JSON.parse(await readFile(path.join(root,"node_modules/lottie-web/package.json"),"utf8"));
if(pkg.version!=="5.13.0"||pkg.license!=="MIT")throw Error("Player version or license mismatch");
const source=path.join(root,"node_modules/lottie-web/build/player/lottie_light_canvas.min.js");
const content=await readFile(source);
if(content.length<20000||content.length>600000)throw Error("Unexpected player bundle size");
const dir=path.join(root,"public/vendor");await mkdir(dir,{recursive:true});
await writeFile(path.join(dir,"lottie_light_canvas.min.js"),content);
const notice=await readFile(path.join(root,"node_modules/lottie-web/LICENSE.md"),"utf8").catch(async()=>readFile(path.join(root,"node_modules/lottie-web/LICENSE"),"utf8"));
await writeFile(path.join(root,"licenses/lottie-web-MIT.txt"),notice);
console.log("Vendored reviewed lottie-web light canvas player",pkg.version,"bytes:",content.length);
