import http from "node:http";
import {readFile,stat} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createEngine} from "./engine.mjs";
import {createSeoPages} from "./seo-pages.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
const publicRoot=path.join(root,"public");
const catalog=JSON.parse(await readFile(path.join(root,"data/catalog.json"),"utf8"));
const origins=(process.env.ALLOWED_ORIGINS||"http://localhost:8787,http://127.0.0.1:8787,https://sautilink.com,https://www.sautilink.com").split(",").map(x=>x.trim()).filter(Boolean);
const engine=createEngine(catalog,{allowedOrigins:origins});
const seo=createSeoPages(catalog,{publicSiteUrl:process.env.PUBLIC_SITE_URL||"http://localhost:"+(process.env.PORT||8787)});
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".webp":"image/webp",".json":"application/json; charset=utf-8"};
const port=Number(process.env.PORT||8787);
if(!Number.isInteger(port)||port<1||port>65535)throw Error("Invalid PORT");
async function handle(req,res){
 const url=new URL(req.url||"/","http://localhost:"+port);
 let response;
 if(url.pathname==="/sitemap.xml"||url.pathname==="/robots.txt"||url.pathname.startsWith("/packs/")||url.pathname.startsWith("/stickers/")){
  response=seo.fetch(new Request(url,{method:req.method,headers:req.headers}));
 }else if(url.pathname.startsWith("/api/")||url.pathname==="/health"||url.pathname.startsWith("/assets/original/")){
  response=await engine.fetch(new Request(url,{method:req.method,headers:req.headers}));
 }else{
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
  const filename=path.resolve(publicRoot,"."+(pathname==="/"?"/index.html":pathname));
  if(!filename.startsWith(publicRoot+path.sep)){res.writeHead(403);res.end();return;}
  try{
   const info=await stat(filename);if(!info.isFile()||info.size>5000000)throw Error("Invalid file");
   const body=await readFile(filename);
   response=new Response(req.method==="HEAD"?null:body,{headers:{"content-type":mime[path.extname(filename)]||"application/octet-stream",
    "cache-control":filename.endsWith(".html")?"no-cache":"public, max-age=3600",
    "x-content-type-options":"nosniff","referrer-policy":"no-referrer",
    "content-security-policy":"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"}});
  }catch{response=new Response("Not found",{status:404,headers:{"content-type":"text/plain"}});}
 }
 res.writeHead(response.status,Object.fromEntries(response.headers.entries()));
 if(response.body)for await(const chunk of response.body)res.write(chunk);
 res.end();
}
http.createServer((req,res)=>handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();})).listen(port,()=>console.log("Local Sticker Engine: http://localhost:"+port));
