/**
 * Crawlable server-rendered public sticker/pack pages.
 * Not a user-upload route. All content is drawn from the validated catalog.
 * Canonical base is configured once (PUBLIC_SITE_URL) for *all* hosts.
 */
const esc = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const xml = esc;
const json = object => JSON.stringify(object).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
const SITE_NAME="SautiLink Stickers";
const LOGO="https://sautilink.com/logo.png";
const DEFAULT_SITE="https://stickers.sautilink.com";
const ID=/^[a-z0-9-]{1,90}$/;
function siteBase(url){
  try{
    const value=new URL(url||DEFAULT_SITE);
    if(value.protocol!=="https:" && !["localhost","127.0.0.1"].includes(value.hostname))throw Error("Bad site URL");
    return value.origin;
  }catch{return DEFAULT_SITE;}
}
function header(title,description,canonical,image=LOGO,kind="WebPage"){
 const data={"@context":"https://schema.org","@graph":[
   {"@type":"Organization","@id":"https://sautilink.com/#organization","name":"SautiLink Corporation","url":"https://sautilink.com/","logo":{"@type":"ImageObject","url":LOGO}},
   {"@type":"WebSite","@id":canonical.split("/").slice(0,3).join("/")+"/#website","name":SITE_NAME,"alternateName":"SautiLink Sticker Engine","url":canonical.split("/").slice(0,3).join("/")+"/","publisher":{"@id":"https://sautilink.com/#organization"}},
   {"@type":kind,"@id":canonical+"#webpage","name":title,"url":canonical,"description":description,"isPartOf":{"@id":canonical.split("/").slice(0,3).join("/")+"/#website"},"inLanguage":"en"}
 ]};
 return {data, html:
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
  '<meta name="theme-color" content="#ffffff"><meta name="color-scheme" content="light dark">'+
  '<title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'">'+
  '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">'+
  '<link rel="canonical" href="'+esc(canonical)+'">'+
  '<link rel="icon" type="image/png" href="'+LOGO+'"><link rel="apple-touch-icon" href="'+LOGO+'">'+
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'+
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">'+
  '<link rel="stylesheet" href="/seo-pages.css">'+
  '<meta property="og:type" content="website"><meta property="og:site_name" content="'+SITE_NAME+'">'+
  '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'">'+
  '<meta property="og:url" content="'+esc(canonical)+'"><meta property="og:image" content="'+esc(image)+'">'+
  '<meta property="og:image:alt" content="SautiLink animated stickers">'+
  '<meta name="twitter:card" content="summary"><meta name="twitter:title" content="'+esc(title)+'">'+
  '<meta name="twitter:description" content="'+esc(description)+'"><meta name="twitter:image" content="'+esc(image)+'">'+
  '<script type="application/ld+json">'+json(data)+'</script>'
 };
}
function document(head,body){
 return '<!doctype html><html lang="en"><head>'+head+'</head><body>'+
  '<a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="container header-row">'+
  '<a class="brand" href="/"><img src="'+LOGO+'" width="31" height="31" alt=""><strong>SautiLink <span>Stickers</span></strong></a>'+
  '<nav aria-label="Primary navigation"><a href="/">Sticker Studio</a><a href="/credits.html">Artwork credits</a><a href="https://sautilink.com/">SautiLink</a></nav>'+
  '</div></header><main id="main" class="container">'+body+'</main>'+
  '<footer class="site-footer"><div class="container">© SautiLink Corporation · <a href="/credits.html">Artwork credits & licensing</a> · <a href="https://sautilink.com/">SautiLink</a></div></footer>'+
  '</body></html>';
}
const thumb=(s,base)=>'<a class="sticker-card" href="/stickers/'+encodeURIComponent(s.id)+'">'+
 '<img src="'+esc(base+s.asset_path)+'" width="110" height="110" loading="lazy" decoding="async" alt="'+esc(s.title)+' animated sticker">'+
 '<strong>'+esc(s.title)+'</strong></a>';
const pageHeaders={"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=300, stale-while-revalidate=600","x-content-type-options":"nosniff","referrer-policy":"strict-origin-when-cross-origin","x-frame-options":"DENY","permissions-policy":"camera=(), microphone=(), geolocation=(), payment=()","content-security-policy":"default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https://sautilink.com data:; font-src 'self' https://fonts.gstatic.com; upgrade-insecure-requests"};
const textHeaders={"content-type":"text/plain; charset=utf-8","cache-control":"public, max-age=3600","x-content-type-options":"nosniff"};
const xmlHeaders={"content-type":"application/xml; charset=utf-8","cache-control":"public, max-age=3600","x-content-type-options":"nosniff"};

export function createSeoPages(catalog,{publicSiteUrl=DEFAULT_SITE}={}){
 const base=siteBase(publicSiteUrl);
 const packs=new Map(catalog.packs.map(p=>[p.id,p]));
 const stickers=new Map(catalog.stickers.map(s=>[s.id,s]));
 const urlFor=path=>base+path;
 const otherPacks=()=>catalog.packs.map(p=>'<a href="/packs/'+p.id+'">'+esc(p.name)+'</a>').join(" · ");
 const unknown=(req)=>new Response(req.method==="HEAD"?null:"Not found",{status:404,headers:{"content-type":"text/plain; charset=utf-8","x-robots-tag":"noindex, nofollow","cache-control":"no-store"}});
 function sitemap(){
  const pages=[{path:"/",priority:"1.0"},{path:"/credits.html",priority:"0.3"},
    ...catalog.packs.map(p=>({path:"/packs/"+p.id,priority:"0.8"})),
    ...catalog.stickers.map(s=>({path:"/stickers/"+s.id,priority:"0.5"}))];
  const lastmod= /^\d{4}-\d{2}-\d{2}$/.test(catalog.updated_at)?catalog.updated_at:"2026-11-23";
  return '<?xml version="1.0" encoding="UTF-8"?>\n'+
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
    pages.map(p=>'<url><loc>'+xml(urlFor(p.path))+'</loc><lastmod>'+lastmod+'</lastmod><priority>'+p.priority+'</priority></url>').join("")+'</urlset>';
 }
 function pageForSticker(s){
  const pack=packs.get(s.pack_id);
  const canonical=urlFor("/stickers/"+s.id);
  const description=s.title+" animated sticker in the "+pack.name+" collection. Find, preview and share this sticker using the SautiLink Sticker Engine.";
  const heading=s.title+" Animated Sticker | SautiLink Stickers";
  const {data,html}=header(heading,description,canonical,urlFor(s.asset_path));
  const related=catalog.stickers.filter(x=>x.id!==s.id&&(x.pack_id===s.pack_id||x.category===s.category)).slice(0,12);
  data["@graph"][2]["image"]={"@type":"ImageObject","url":urlFor(s.asset_path),"name":s.title+" animated sticker"};
  data["@graph"].push({"@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":"Sticker Studio","item":base+"/"},
    {"@type":"ListItem","position":2,"name":pack.name,"item":base+"/packs/"+pack.id},
    {"@type":"ListItem","position":3,"name":s.title,"item":canonical}
  ]});
  const ld='<script type="application/ld+json">'+json(data)+'</script>';
  const head=html.replace(/<script type="application\/ld\+json">.*?<\/script>/,ld);
  return document(head,'<nav class="crumb" aria-label="Breadcrumb"><a href="/">Sticker Studio</a> / <a href="/packs/'+pack.id+'">'+esc(pack.name)+'</a> / '+esc(s.title)+'</nav>'+
   '<section class="detail-grid"><div class="art"><img src="'+esc(urlFor(s.asset_path))+'" width="288" height="288" alt="'+esc(s.title)+' animated sticker"></div>'+
   '<div><p class="eyebrow">ANIMATED STICKER</p><h1>'+esc(s.title)+'</h1><p class="lead">'+esc(description)+'</p>'+
   '<p>Collection: <a href="/packs/'+pack.id+'">'+esc(pack.name)+'</a></p>'+
   '<p>Category: '+esc(s.category)+' · Format: '+esc(s.format.toUpperCase())+'</p>'+
   '<p>Artwork license: '+esc(s.license)+' · <a href="/credits.html">Credits</a></p>'+
   '<div class="actions"><a class="button" href="/?sticker='+encodeURIComponent(s.id)+'">Open in Sticker Studio</a>'+
   '<a class="secondary" href="/packs/'+pack.id+'">View sticker pack</a></div></div></section>'+
   '<section class="section"><h2>More animated stickers</h2><div class="sticker-grid">'+related.map(x=>thumb(x,base)).join("")+'</div></section>'+
   '<section class="section"><h2>Explore sticker packs</h2><p class="links">'+otherPacks()+'</p></section>');
 }
 function pageForPack(p){
  const canonical=urlFor("/packs/"+p.id);
  const items=catalog.stickers.filter(s=>s.pack_id===p.id);
  const description="Explore "+items.length+" animated stickers in "+p.name+". Preview, discover and share expressive stickers on SautiLink.";
  const title=p.name+" Animated Stickers | SautiLink";
  const {data,html}=header(title,description,canonical,urlFor(items[0]?.asset_path||"/"));
  data["@graph"][2]["mainEntity"]={"@type":"ItemList","numberOfItems":items.length,"itemListElement":items.slice(0,40).map((s,i)=>({"@type":"ListItem","position":i+1,"name":s.title,"url":urlFor("/stickers/"+s.id)}))};
  data["@graph"].push({"@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":"Sticker Studio","item":base+"/"},
    {"@type":"ListItem","position":2,"name":p.name,"item":canonical}
  ]});
  const ld='<script type="application/ld+json">'+json(data)+'</script>';
  const head=html.replace(/<script type="application\/ld\+json">.*?<\/script>/,ld);
  return document(head,'<nav class="crumb" aria-label="Breadcrumb"><a href="/">Sticker Studio</a> / '+esc(p.name)+'</nav>'+
   '<section class="intro"><p class="eyebrow">SAUTILINK STICKER COLLECTION</p><h1>'+esc(p.name)+'</h1>'+
   '<p class="lead">'+esc(description)+'</p><p>Artwork by '+esc(p.author)+
   ' · '+esc(p.license)+' · <a href="/credits.html">License details</a></p>'+
   '<div class="actions"><a class="button" href="/">Open Sticker Studio</a></div></section>'+
   '<section class="section"><h2>All '+items.length+' stickers in this pack</h2><div class="sticker-grid">'+items.map(s=>thumb(s,base)).join("")+'</div></section>'+
   '<section class="section"><h2>Browse more packs</h2><p class="links">'+otherPacks()+'</p></section>');
 }
 function fetch(req){
  const u=new URL(req.url);const path=u.pathname.replace(/\/+$/,"")||"/";
  if(req.method!=="GET"&&req.method!=="HEAD")return new Response(null,{status:405,headers:{allow:"GET, HEAD"}});
  if(path==="/robots.txt"){
   const robots="User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /embed-demo.html\nSitemap: "+urlFor("/sitemap.xml")+"\n";
   return new Response(req.method==="HEAD"?null:robots,{headers:textHeaders});
  }
  if(path==="/sitemap.xml")return new Response(req.method==="HEAD"?null:sitemap(),{headers:xmlHeaders});
  const packMatch=/^\/packs\/([a-z0-9-]{1,90})$/.exec(path);
  if(packMatch){const p=packs.get(packMatch[1]);return p?new Response(req.method==="HEAD"?null:pageForPack(p),{headers:pageHeaders}):unknown(req);}
  const stickerMatch=/^\/stickers\/([a-z0-9-]{1,90})$/.exec(path);
  if(stickerMatch){const s=stickers.get(stickerMatch[1]);return s?new Response(req.method==="HEAD"?null:pageForSticker(s),{headers:pageHeaders}):unknown(req);}
  return unknown(req);
 }
 return {fetch,sitemap};
}
