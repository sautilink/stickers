import { originalSvg } from "./art.mjs";

const ID = /^[a-z0-9-]{1,90}$/;
const SORTS = new Set(["default", "name", "newest"]);
const clean = value => String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("en");
const MAX_IDS = 80;
const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "vary": "Origin"
};

export function validateCatalog(catalog) {
  if (!catalog || catalog.schema_version !== 1 || !Array.isArray(catalog.packs) || !Array.isArray(catalog.stickers)) {
    throw Error("Invalid catalog schema");
  }
  const packIds = new Set();
  const stickerIds = new Set();
  const assets = new Set();
  for (const pack of catalog.packs) {
    if (!pack || !ID.test(pack.id) || packIds.has(pack.id) || !pack.name || !pack.license || !pack.attribution || !ID.test(pack.cover_sticker_id)) {
      throw Error("Invalid or duplicate pack: " + pack?.id);
    }
    packIds.add(pack.id);
  }
  for (const sticker of catalog.stickers) {
    if (!sticker || !ID.test(sticker.id) || stickerIds.has(sticker.id) || !packIds.has(sticker.pack_id) ||
        !sticker.title || !sticker.license || !Array.isArray(sticker.tags) || !sticker.tags.every(x => typeof x === "string" && x.length < 100) ||
        !ID.test(sticker.category) || !["svg","webp","lottie"].includes(sticker.format) ||
        !/^\/assets\/[a-z0-9/_-]+\.(svg|webp|json)$/.test(sticker.asset_path) || assets.has(sticker.asset_path)) {
      throw Error("Invalid or duplicate sticker: " + sticker?.id);
    }
    stickerIds.add(sticker.id);
    assets.add(sticker.asset_path);
  }
  for (const pack of catalog.packs) {
    const cover = catalog.stickers.find(s => s.id === pack.cover_sticker_id);
    if (!cover || cover.pack_id !== pack.id) throw Error("Invalid pack cover: " + pack.id);
  }
  return true;
}

export function createEngine(catalog, {allowedOrigins = []} = {}) {
  validateCatalog(catalog);
  const originAllowlist = new Set(allowedOrigins);
  const stickers = catalog.stickers.map(s => ({...s}));
  const byId = new Map(stickers.map(s => [s.id,s]));
  const byPack = new Map(), byCategory = new Map(), searchText = new Map();
  const suggestionTerms = new Map();
  for (const s of stickers) {
    for (const [index,key] of [[byPack,s.pack_id],[byCategory,s.category]]) {
      if(!index.has(key))index.set(key,[]);index.get(key).push(s);
    }
    searchText.set(s.id,clean([s.title,s.emoji,...s.tags,s.category].join(" ")));
    for(const label of [s.title,...s.tags])if(!suggestionTerms.has(label))suggestionTerms.set(label,clean(label));
  }
  const compare = {default:(a,b)=>(a.sort_order??0)-(b.sort_order??0)||a.id.localeCompare(b.id),name:(a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id),newest:(a,b)=>(b.sort_order??0)-(a.sort_order??0)||b.id.localeCompare(a.id)};
  const defaultOrder=stickers.slice().sort(compare.default);
  const resultsCache=new Map();
  const CACHE_LIMIT=128;
  const cacheKey=url=>url.origin+url.pathname+url.search;
  const packById=new Map();
  const packs = catalog.packs.map(p => ({
    ...p, sticker_count: (byPack.get(p.id)||[]).length
  })).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));
  const categories = [...new Set(stickers.map(s=>s.category))].sort();
  const counts = Object.fromEntries(categories.map(c=>[c,byCategory.get(c).length]));
  for(const p of packs)packById.set(p.id,p);
  const formats=stickers.reduce((acc,s)=>(acc[s.format]=(acc[s.format]||0)+1,acc),{});
  const animatedCount=stickers.filter(s=>s.animated).length;
  const asSticker = (s, url) => ({...s, asset_url: new URL(s.asset_path, url.origin).href});
  const asPack = (p, url) => ({
    ...p, cover_url: asSticker(byId.get(p.cover_sticker_id), url).asset_url,
    cover_id: p.cover_sticker_id,
    cover_format: byId.get(p.cover_sticker_id).format,
    cover_emoji: byId.get(p.cover_sticker_id).emoji,
    cover_title: byId.get(p.cover_sticker_id).title
  });
  const commonHeaders = (req, type) => {
    const headers = new Headers({...jsonHeaders, "content-type": type || jsonHeaders["content-type"]});
    const origin = req.headers.get("origin");
    if (origin && originAllowlist.has(origin)) {
      headers.set("access-control-allow-origin", origin);
      headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
      headers.set("access-control-allow-headers", "content-type");
      headers.set("access-control-max-age", "86400");
    }
    return headers;
  };
  const response = (req, payload, status=200, cache="public, max-age=60, stale-while-revalidate=60") => {
    const headers = commonHeaders(req);
    headers.set("cache-control", cache);
    const body=JSON.stringify(payload);
    if(status===200 && cache.startsWith("public")){
      const key=cacheKey(new URL(req.url));
      // Bounded per-isolate cache; response headers are built separately for each Origin.
      let hash=2166136261;for(let i=0;i<body.length;i++)hash=Math.imul(hash^body.charCodeAt(i),16777619);
      const etag='W/"'+(hash>>>0).toString(16)+'-'+body.length+'"';
      if(body.length<=500000){
        if(resultsCache.size>=CACHE_LIMIT)resultsCache.delete(resultsCache.keys().next().value);
        resultsCache.set(key,{body,etag,cache,expires:Date.now()+60000});
      }
      headers.set("etag",etag);
      if(req.headers.get("if-none-match")?.split(",").map(x=>x.trim()).some(x=>x===etag||x==="*"))return new Response(null,{status:304,headers});
    }
    return new Response(req.method === "HEAD" ? null : body, {status,headers});
  };
  const fail = (req,status,code,message) => response(req,{error:{code,message}},status,"no-store");
  const getParam = (url, name, fallback="") => url.searchParams.get(name) ?? fallback;
  const validFilter = value => !value || ID.test(value);
  const filterStickers = (url, {ids=null}={}) => {
    const pack = getParam(url,"pack");
    const category = getParam(url,"category");
    const q = getParam(url,"q");
    if (!validFilter(pack) || !validFilter(category) || q.length > 80) throw Error("Invalid filter");
    const term = clean(q);
    const pool=ids?[...ids].map(id=>byId.get(id)).filter(Boolean):pack?(byPack.get(pack)||[]):category?(byCategory.get(category)||[]):defaultOrder;
    return pool.filter(s => (!pack || s.pack_id===pack) && (!category || s.category===category) && (!term || searchText.get(s.id).includes(term)));
  };
  function paginate(url, found) {
    const rawLimit = getParam(url,"limit","40"), rawCursor = getParam(url,"cursor","0");
    const sort = getParam(url,"sort","default");
    if (!/^[0-9]{1,3}$/.test(rawLimit) || !/^[0-9]{1,8}$/.test(rawCursor) || !SORTS.has(sort)) throw Error("Invalid pagination");
    const limit = Math.min(60, Math.max(1, Number(rawLimit))), offset = Number(rawCursor);
    found.sort(compare[sort]);
    return {items:found.slice(offset,offset+limit), pagination:{
      total:found.length, limit, next_cursor:offset+limit<found.length?String(offset+limit):null
    }};
  }
  async function fetch(req) {
    let url;
    try { url = new URL(req.url); } catch { return fail(req,400,"BAD_REQUEST","Invalid URL"); }
    const path = url.pathname.replace(/\/+$/,"") || "/";
    if (req.method === "OPTIONS") {
      if (req.headers.get("origin") && !originAllowlist.has(req.headers.get("origin"))) {
        return fail(req,403,"FORBIDDEN","Origin not allowed");
      }
      return new Response(null,{status:204,headers:commonHeaders(req)});
    }
    if (req.method !== "GET" && req.method !== "HEAD") return fail(req,405,"METHOD_NOT_ALLOWED","Read-only API");
    const original = /^\/assets\/original\/(sl-[a-z]+)\.svg$/.exec(path);
    if (original) {
      const svg = originalSvg(original[1]);
      if (!svg) return fail(req,404,"NOT_FOUND","Sticker missing");
      const headers = commonHeaders(req,"image/svg+xml; charset=utf-8");
      headers.set("cache-control","public, max-age=86400");
      headers.set("content-security-policy","default-src 'none'; style-src 'unsafe-inline'");
      return new Response(req.method==="HEAD"?null:svg,{status:200,headers});
    }
    const cached=resultsCache.get(cacheKey(url));
    if(cached && cached.expires>Date.now()){
      const headers=commonHeaders(req);headers.set("cache-control",cached.cache);headers.set("etag",cached.etag);
      const matches=req.headers.get("if-none-match")?.split(",").map(x=>x.trim()).some(x=>x===cached.etag||x==="*");
      return new Response(matches||req.method==="HEAD"?null:cached.body,{status:matches?304:200,headers});
    }
    if (path === "/api/v1/health" || path === "/health") return response(req,{
      status:"ok",service:"sautilink-stickers",version:"0.2.0"
    },200,"no-store");
    if (path === "/api/v1/stats") return response(req,{data:{
      packs:packs.length, stickers:stickers.length, animated:animatedCount,
      categories:counts, formats, catalog_updated_at:catalog.updated_at
    }});
    if (path === "/api/v1/capabilities") return response(req,{data:{
      formats:["webp","svg","lottie"],tgs_import:true,inline_emoji:true,interactive_effects:["pop"],
      first_party_assets:true,client_pickup:{type:"sticker",fields:["sticker_id","pack_id"]},
      requires_artwork_rights_review:true
    }});
    if (path === "/api/v1/emoji-map") return response(req,{data:stickers.filter(s=>s.inline_emoji).map(s=>({id:s.id,emoji:s.emoji,pack_id:s.pack_id,format:s.format,asset_url:asSticker(s,url).asset_url}))});
    if (path === "/api/v1/licenses") return response(req,{data:packs.map(p=>({
      pack_id:p.id,author:p.author,license:p.license,license_url:p.license_url,
      attribution:p.attribution,source_url:p.source_url
    }))});
    if (path === "/api/v1/categories") return response(req,{data:getParam(url,"with_counts")==="true"?categories.map(id=>({id,count:counts[id]})):categories,counts});
    if (path === "/api/v1/packs") return response(req,{data:packs.map(p=>asPack(p,url))});
    if (path.startsWith("/api/v1/packs/")) {
      const id = path.slice("/api/v1/packs/".length);
      const pack = packById.get(id);
      if (!pack) return fail(req,404,"NOT_FOUND","Pack missing");
      return response(req,{data:{
        ...asPack(pack,url),
        stickers:(byPack.get(id)||[]).map(s=>asSticker(s,url))
      }});
    }
    if (path === "/api/v1/featured") {
      const featured = packs.filter(p=>p.featured).flatMap(p=>
        (byPack.get(p.id)||[]).slice(0,8));
      return response(req,{data:featured.map(s=>asSticker(s,url))});
    }
    if (path === "/api/v1/stickers/random") {
      let found;
      try {found=filterStickers(url);}catch{return fail(req,400,"BAD_REQUEST","Invalid filter");}
      if (!found.length) return fail(req,404,"NOT_FOUND","No matching stickers");
      const item=found[Math.floor(Math.random()*found.length)];
      return response(req,{data:asSticker(item,url)},200,"no-store");
    }
    if (path === "/api/v1/suggestions") {
      const q=getParam(url,"q");
      if (q.length>80) return fail(req,400,"BAD_REQUEST","q too long");
      const term=clean(q);
      if (term.length<2) return response(req,{data:[]});
      const terms=new Set();
      for (const [tag,normalized] of suggestionTerms) {
        if(normalized.startsWith(term))terms.add(tag);
        if(terms.size>=250)break;
      }
      return response(req,{data:[...terms].sort((a,b)=>a.length-b.length||a.localeCompare(b)).slice(0,12)});
    }
    if (path === "/api/v1/stickers") {
      let found, paged;
      try {
        const ids=getParam(url,"ids");
        let idSet=null;
        if (ids) {
          const selected=ids.split(",");
          if (selected.length>MAX_IDS || selected.some(id=>!ID.test(id))) throw Error("Invalid ids");
          idSet=new Set(selected);
        }
        found=filterStickers(url,{ids:idSet});
        paged=paginate(url,found);
        if(idSet && !url.searchParams.has("sort")){
          const order=new Map([...idSet].map((id,i)=>[id,i]));
          found.sort((a,b)=>order.get(a.id)-order.get(b.id));
          paged={items:found.slice(Number(getParam(url,"cursor","0")),Number(getParam(url,"cursor","0"))+paged.pagination.limit),pagination:{
            ...paged.pagination,total:found.length
          }};
        }
      } catch {return fail(req,400,"BAD_REQUEST","Invalid sticker query");}
      return response(req,{data:paged.items.map(s=>asSticker(s,url)),pagination:paged.pagination});
    }
    const match=/^\/api\/v1\/stickers\/([a-z0-9-]{1,90})(\/related)?$/.exec(path);
    if (match) {
      const s=byId.get(match[1]);
      if(!s) return fail(req,404,"NOT_FOUND","Sticker missing");
      if(match[2]) {
        const related=stickers.filter(x=>x.id!==s.id && (x.category===s.category || x.pack_id===s.pack_id))
          .sort((a,b)=>{
            const ra=(a.pack_id===s.pack_id?2:0)+(a.category===s.category?1:0);
            const rb=(b.pack_id===s.pack_id?2:0)+(b.category===s.category?1:0);
            return rb-ra||a.id.localeCompare(b.id);
          }).slice(0,12);
        return response(req,{data:related.map(x=>asSticker(x,url))});
      }
      return response(req,{data:asSticker(s,url)});
    }
    return fail(req,404,"NOT_FOUND","Resource not found");
  }
  return {fetch};
}
