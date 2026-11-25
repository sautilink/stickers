// SautiLink's first-party Lottie visual renderer. The player JS is self-hosted.
// No remote scripts, third-party assets, raw HTML injection or untrusted JSON imports.
const scriptUrl=new URL("./vendor/lottie_light_canvas.min.js",import.meta.url);
const allowedId=/^[a-z0-9-]{1,90}$/;
let playerReady;
const prefersReducedMotion=()=>globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
function loadPlayer(){
 if(playerReady)return playerReady;
 playerReady=new Promise((resolve,reject)=>{
  if(globalThis.lottie?.loadAnimation){resolve(globalThis.lottie);return;}
  const script=document.createElement("script");
  script.src=scriptUrl.href;script.async=true;
  script.addEventListener("load",()=>globalThis.lottie?.loadAnimation?resolve(globalThis.lottie):reject(Error("Player unavailable")),{once:true});
  script.addEventListener("error",()=>reject(Error("Could not load first-party player")),{once:true});
  document.head.append(script);
 }).catch(error=>{playerReady=null;throw error;});
 return playerReady;
}
const animationCache=new Map();
async function fetchTrustedAnimation(sticker){
 if(!allowedId.test(sticker.id))throw Error("Invalid sticker ID");
 const url=new URL(sticker.asset_url);
 const expectedOrigin=new URL(import.meta.url).origin;
 if(url.origin!==expectedOrigin)throw Error("Only first-party vector assets may be loaded");
 if(url.protocol!=="https:" && !(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname)))throw Error("Bad vector protocol");
 if(url.pathname!=="/assets/vector/"+sticker.id+".json"||url.search||url.hash)throw Error("Vector asset must be first-party approved artwork");
 if(!animationCache.has(url.href)){
  if(animationCache.size>=64)animationCache.delete(animationCache.keys().next().value);
  animationCache.set(url.href,fetch(url.href,{credentials:"omit",mode:"cors",headers:{accept:"application/json"}}).then(async res=>{
   if(!res.ok)throw Error("Vector asset unavailable");
   const text=await res.text();if(text.length>512000)throw Error("Vector asset too large");
   const data=JSON.parse(text);
   if(data.layers?.some(l=>l.ty!==4)||data.assets?.length||data.w>512||data.h>512)throw Error("Unexpected vector animation");
   return data;
  }).catch(err=>{animationCache.delete(url.href);throw err;}));
 }
 return animationCache.get(url.href);
}
// One visibility observer and one cleanup loop, rather than one mutation observer per sticker.
const active=new Map();
let cleanupTimer=null;
function dispose(node,entry){
 try{entry.instance?.destroy();}catch{}
 visibility?.unobserve(node);active.delete(node);
}
function cleanup(){
 for(const [node,entry] of active){
  if(!node.isConnected)dispose(node,entry);
  else if(entry.visible&&!entry.instance&&!entry.loading&&!entry.failed&&!document.hidden&&!prefersReducedMotion())void entry.mount();
  else if(entry.instance){
   if(document.hidden||prefersReducedMotion()||!entry.visible)entry.instance.pause();
   else entry.instance.play();
  }
 }
 if(!active.size&&cleanupTimer!==null){clearInterval(cleanupTimer);cleanupTimer=null;}
}
const visibility=typeof IntersectionObserver==="function"?new IntersectionObserver(entries=>{
 for(const hit of entries){
  const entry=active.get(hit.target);if(!entry)continue;
  entry.visible=hit.isIntersecting;
  if(entry.visible&&!entry.instance&&!entry.loading&&!entry.failed)void entry.mount();
  if(entry.instance){if(entry.visible&&!document.hidden&&!prefersReducedMotion())entry.instance.play();else entry.instance.pause();}
 }
},{rootMargin:"80px"}):null;
if(typeof document!=="undefined")document.addEventListener("visibilitychange",cleanup);
export function createStickerVisual(sticker,{size=106,lite=false,loop=true}={}){
 const wrapper=document.createElement("span");
 wrapper.className="sl-sticker-visual";
 wrapper.style.cssText="display:inline-grid;place-items:center;position:relative;max-width:100%;vertical-align:middle;width:"+size+"px;height:"+size+"px";
 wrapper.setAttribute("role","img");wrapper.setAttribute("aria-label",sticker.title||"Animated sticker");
 const fallback=document.createElement("span");fallback.textContent=sticker.emoji||"✨";
 fallback.style.cssText="font-size:"+Math.round(size*.65)+"px;line-height:1;display:grid;place-items:center";
 wrapper.append(fallback);
 let url;
 try{url=new URL(sticker.asset_url);if(url.origin!==new URL(import.meta.url).origin||!/^\/assets\/[a-z0-9/_-]+\.(webp|svg|json)$/.test(url.pathname)||url.search||url.hash)return wrapper;}catch{return wrapper;}
 if(lite||prefersReducedMotion())return wrapper;
 if(sticker.format!=="lottie"){
  const img=document.createElement("img");img.alt="";img.loading="lazy";img.decoding="async";img.width=size;img.height=size;
  img.style.cssText="width:100%;height:100%;object-fit:contain";
  img.addEventListener("load",()=>{if(img.naturalWidth>0)wrapper.replaceChildren(img);},{once:true});
  img.addEventListener("error",()=>wrapper.replaceChildren(fallback),{once:true});
  // Attach hidden image to retain native lazy loading and keep the fallback visible until decoded.
  img.style.position="absolute";img.style.opacity="0";
  img.addEventListener("load",()=>{img.style.opacity="1";img.style.position="static";},{once:true});
  wrapper.append(img);img.src=url.href;
  return wrapper;
 }
 const entry={visible:!visibility,loading:false,failed:false,instance:null,mount:async()=>{
  if(!wrapper.isConnected||entry.loading||entry.instance||entry.failed||document.hidden||prefersReducedMotion())return;
  entry.loading=true;
  try{
   const [player,animationData]=await Promise.all([loadPlayer(),fetchTrustedAnimation(sticker)]);
   if(!wrapper.isConnected||active.get(wrapper)!==entry||prefersReducedMotion())return;
   const stage=document.createElement("span");stage.style.cssText="display:block;width:100%;height:100%;overflow:hidden";
   wrapper.replaceChildren(stage);
   const instance=player.loadAnimation({container:stage,renderer:"canvas",loop,autoplay:entry.visible&&!document.hidden,
    animationData:JSON.parse(JSON.stringify(animationData)),rendererSettings:{clearCanvas:true}});
   entry.instance=instance;
   const fail=()=>{entry.failed=true;dispose(wrapper,entry);wrapper.replaceChildren(fallback);};
   instance.addEventListener?.("data_failed",fail);instance.addEventListener?.("error",fail);
  }catch{entry.failed=true;dispose(wrapper,entry);wrapper.replaceChildren(fallback);}
  finally{entry.loading=false;}
 }};
 active.set(wrapper,entry);
 if(cleanupTimer===null)cleanupTimer=setInterval(cleanup,1000);
 if(visibility)visibility.observe(wrapper);else queueMicrotask(()=>void entry.mount());
 return wrapper;
}
export function popSticker(element,{color="#ffc44f"}={}){
 if(prefersReducedMotion()||!element?.isConnected)return;
 const overlay=document.createElement("span");
 overlay.setAttribute("aria-hidden","true");
 overlay.style.cssText="pointer-events:none;position:absolute;inset:-14px;display:grid;place-items:center;border:3px solid "+color+";border-radius:50%;z-index:2;opacity:.9;transform:scale(.5);transition:transform .38s ease-out,opacity .38s ease-out";
 element.style.position="relative";
 element.append(overlay);
 requestAnimationFrame(()=>{overlay.style.transform="scale(1.35)";overlay.style.opacity="0";});
 overlay.addEventListener("transitionend",()=>overlay.remove(),{once:true});
}
export function createInlineEmoji(text,byId,{size=27,lite=false}={}){
 const root=document.createDocumentFragment();
 const reg=/:([a-z0-9-]{1,90}):/g;let last=0;
 for(const match of String(text).matchAll(reg)){
  const id=match[1],sticker=byId.get(id);
  if(!sticker||sticker.inline_emoji!==true)continue;
  root.append(document.createTextNode(text.slice(last,match.index)));
  const el=createStickerVisual(sticker,{size,lite});
  el.classList.add("sl-inline-emoji");el.dataset.stickerId=id;
  el.style.cursor="pointer";el.style.margin="0 2px";
  root.append(el);last=match.index+match[0].length;
 }
 root.append(document.createTextNode(text.slice(last)));
 return root;
}
