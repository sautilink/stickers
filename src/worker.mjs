// Optional adapter for the later Cloudflare connection step. No deployment is configured.
import catalog from "../data/catalog.json" with {type:"json"};
import {createEngine} from "./engine.mjs";
import {createSeoPages} from "./seo-pages.mjs";
let cachedConfig;
let cachedEngine;
let cachedSeo;
let cachedSite;
export default {
 async fetch(request,env){
  const config=String(env.ALLOWED_ORIGINS||"https://sautilink.com,https://www.sautilink.com");
  if(cachedConfig!==config||!cachedEngine){
   const allowedOrigins=config.split(",").map(x=>x.trim()).filter(Boolean);
   cachedEngine=createEngine(catalog,{allowedOrigins});
   cachedConfig=config;
  }
  const path=new URL(request.url).pathname;
  const siteUrl=String(env.PUBLIC_SITE_URL||"https://stickers.sautilink.com");
  if(!cachedSeo||cachedSite!==siteUrl){cachedSeo=createSeoPages(catalog,{publicSiteUrl:siteUrl});cachedSite=siteUrl;}
  if(path==="/sitemap.xml"||path==="/robots.txt"||path.startsWith("/packs/")||path.startsWith("/stickers/"))return cachedSeo.fetch(request);
  if(path.startsWith("/api/")||path==="/health"||path.startsWith("/assets/original/"))return cachedEngine.fetch(request);
  return env.ASSETS?env.ASSETS.fetch(request):new Response("Static assets binding not configured",{status:503});
 }
};
