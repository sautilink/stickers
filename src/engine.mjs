import {originalSvg} from "./art.mjs";
const ID=/^[a-z0-9-]{1,90}$/;
export function validateCatalog(c){
 if(!c||c.schema_version!==1||!Array.isArray(c.packs)||!Array.isArray(c.stickers))throw Error("Invalid catalog schema");
 const ps=new Set(), ss=new Set();
 for(const p of c.packs){if(!ID.test(p.id)||ps.has(p.id)||!p.name||!p.license||!p.attribution)throw Error("Invalid pack: "+p.id);ps.add(p.id);}
 for(const s of c.stickers){
  if(!ID.test(s.id)||ss.has(s.id)||!ps.has(s.pack_id)||!s.title||!s.license||!Array.isArray(s.tags)||!s.category||
   !["svg","webp","lottie"].includes(s.format)||!/^\/assets\/[a-z0-9/_-]+\.(svg|webp|json)$/.test(s.asset_path))throw Error("Invalid sticker: "+s.id);
  ss.add(s.id);
 }
 return true;
}
const normalize=x=>String(x??"").normalize("NFKC").trim().toLocaleLowerCase("en");
export function createEngine(catalog,{allowedOrigins=[]}={}){
 validateCatalog(catalog);
 const origins=new Set(allowedOrigins);
 const stickers=catalog.stickers.map(s=>({...s}));
 const byId=new Map(stickers.map(s=>[s.id,s]));
 const packs=catalog.packs.map(p=>({...p,sticker_count:stickers.filter(s=>s.pack_id===p.id).length}));
 const withUrl=(s,u)=>({...s,asset_url:new URL(s.asset_path,u.origin).href});
 const headers=(req,type="application/json; charset=utf-8")=>{
  const h=new Headers({"content-type":type,"cache-control":"public, max-age=30","x-content-type-options":"nosniff","referrer-policy":"no-referrer","vary":"Origin"});
  const o=req.headers.get("origin");if(o&&origins.has(o)){h.set("access-control-allow-origin",o);h.set("access-control-allow-methods","GET, HEAD, OPTIONS");h.set("access-control-allow-headers","content-type");}
  return h;
 };
 const json=(req,data,status=200)=>new Response(req.method==="HEAD"?null:JSON.stringify(data),{status,headers:headers(req)});
 const fail=(req,status,code,message)=>json(req,{error:{code,message}},status);
 async function fetch(req){
  let u;try{u=new URL(req.url);}catch{return fail(req,400,"BAD_REQUEST","Invalid URL");}
  const p=u.pathname.replace(/\/+$/,"")||"/";
  if(req.method==="OPTIONS"){
   if(req.headers.get("origin")&&!origins.has(req.headers.get("origin")))return fail(req,403,"FORBIDDEN","Origin not allowed");
   return new Response(null,{status:204,headers:headers(req)});
  }
  if(req.method!=="GET"&&req.method!=="HEAD")return fail(req,405,"METHOD_NOT_ALLOWED","Read-only API");
  const original=/^\/assets\/original\/(sl-[a-z]+)\.svg$/.exec(p);
  if(original){const svg=originalSvg(original[1]);if(!svg)return fail(req,404,"NOT_FOUND","Sticker missing");
   const h=headers(req,"image/svg+xml; charset=utf-8");h.set("cache-control","public, max-age=86400");h.set("content-security-policy","default-src 'none'; style-src 'unsafe-inline'");
   return new Response(req.method==="HEAD"?null:svg,{status:200,headers:h});
  }
  if(p==="/api/v1/health"||p==="/health")return json(req,{status:"ok",service:"sautilink-stickers",version:"0.1.0"});
  if(p==="/api/v1/licenses")return json(req,{data:packs.map(x=>({pack_id:x.id,license:x.license,license_url:x.license_url,attribution:x.attribution,source_url:x.source_url}))});
  if(p==="/api/v1/categories")return json(req,{data:[...new Set(stickers.map(x=>x.category))].sort()});
  if(p==="/api/v1/packs")return json(req,{data:packs.map(x=>({...x,cover_url:byId.has(x.cover_sticker_id)?withUrl(byId.get(x.cover_sticker_id),u).asset_url:null}))});
  if(p.startsWith("/api/v1/packs/")){
   const pack=packs.find(x=>x.id===p.slice(14));if(!pack)return fail(req,404,"NOT_FOUND","Pack missing");
   return json(req,{data:{...pack,stickers:stickers.filter(s=>s.pack_id===pack.id).map(s=>withUrl(s,u))}});
  }
  if(p==="/api/v1/stickers"){
   const q=u.searchParams.get("q")||"", pack=u.searchParams.get("pack")||"", category=u.searchParams.get("category")||"";
   if(q.length>80||(pack&&!ID.test(pack))||(category&&!ID.test(category)))return fail(req,400,"BAD_REQUEST","Invalid search filter");
   const limitText=u.searchParams.get("limit")||"30", cursorText=u.searchParams.get("cursor")||"0";
   if(!/^\d{1,3}$/.test(limitText)||!/^\d{1,8}$/.test(cursorText))return fail(req,400,"BAD_REQUEST","Invalid pagination");
   const limit=Math.min(60,Math.max(1,Number(limitText))),offset=Number(cursorText),term=normalize(q);
   const found=stickers.filter(s=>(!pack||s.pack_id===pack)&&(!category||s.category===category)&&(!term||normalize([s.title,s.emoji,...s.tags].join(" ")).includes(term)));
   found.sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id));
   return json(req,{data:found.slice(offset,offset+limit).map(s=>withUrl(s,u)),pagination:{total:found.length,limit,next_cursor:offset+limit<found.length?String(offset+limit):null}});
  }
  if(p.startsWith("/api/v1/stickers/")){const x=byId.get(p.slice(17));return x?json(req,{data:withUrl(x,u)}):fail(req,404,"NOT_FOUND","Sticker missing");}
  return fail(req,404,"NOT_FOUND","Resource not found");
 }
 return {fetch};
}
