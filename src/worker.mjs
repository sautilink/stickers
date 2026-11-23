// Optional worker adapter. Do not deploy until Cloudflare configuration is reviewed.
import catalog from "../data/catalog.json" with {type:"json"};
import {createEngine} from "./engine.mjs";
export default {async fetch(request,env){
 const allowedOrigins=String(env.ALLOWED_ORIGINS||"https://sautilink.com,https://www.sautilink.com").split(",").map(x=>x.trim()).filter(Boolean);
 const engine=createEngine(catalog,{allowedOrigins});
 const p=new URL(request.url).pathname;
 if(p.startsWith("/api/")||p==="/health"||p.startsWith("/assets/original/"))return engine.fetch(request);
 return env.ASSETS?env.ASSETS.fetch(request):new Response("Static assets binding not configured",{status:503});
}};
