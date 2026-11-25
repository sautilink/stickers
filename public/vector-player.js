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
 if(!/^\/assets\/vector\/slv-[a-z0-9-]+\.json$/.test(url.pathname))throw Error("Vector asset must be first-party approved artwork");
 if(Number.isInteger(sticker.render_revision)&&sticker.render_revision>0&&sticker.render_revision<=9999)
  url.searchParams.set("v",String(sticker.render_revision));
 if(!animationCache.has(url.href)){
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
const observers=new WeakMap();
/**
 * Animated images keep their native WebP/SVG render path. Lottie is only
 * loaded when the element scrolls into view and motion is permitted.
 */
export function createStickerVisual(sticker,{size=106,lite=false,loop=true}={}){
 const wrapper=document.createElement("span");
 wrapper.className="sl-sticker-visual";
 wrapper.style.cssText="display:inline-grid;place-items:center;position:relative;max-width:100%;vertical-align:middle;width:"+size+"px;height:"+size+"px";
 wrapper.setAttribute("role","img");wrapper.setAttribute("aria-label",sticker.title||"Animated sticker");
 if(sticker.format!=="lottie" && !lite){
  const img=document.createElement("img");img.src=sticker.asset_url;img.alt="";
  img.loading="lazy";img.decoding="async";img.width=size;img.height=size;
  img.style.cssText="width:100%;height:100%;object-fit:contain";
  wrapper.append(img);return wrapper;
 }
 const fallback=document.createElement("span");fallback.textContent=sticker.emoji||"✨";
 fallback.style.cssText="font-size:"+Math.round(size*.65)+"px;line-height:1;display:grid;place-items:center";
 wrapper.append(fallback);
 if(lite||prefersReducedMotion()||sticker.format!=="lottie")return wrapper;
 const mount=async()=>{
  if(!wrapper.isConnected)return;
  try{
   const [player,animationData]=await Promise.all([loadPlayer(),fetchTrustedAnimation(sticker)]);
   if(!wrapper.isConnected||prefersReducedMotion())return;
   const stage=document.createElement("span");
   stage.style.cssText="display:block;width:100%;height:100%;overflow:hidden";
   wrapper.replaceChildren(stage);
   const instance=player.loadAnimation({
    container:stage,renderer:"canvas",loop,autoplay:true,
    animationData:JSON.parse(JSON.stringify(animationData)),
    rendererSettings:{clearCanvas:true}
   });
   const watcher=new MutationObserver(()=>{
    if(!wrapper.isConnected){instance.destroy();watcher.disconnect();}
   });
   watcher.observe(document.body,{subtree:true,childList:true});
   observers.set(wrapper,instance);
  }catch{
   wrapper.replaceChildren(fallback);
  }
 };
 if(typeof IntersectionObserver==="function"){
  const io=new IntersectionObserver(entries=>{
   if(entries.some(e=>e.isIntersecting)){io.disconnect();void mount();}
  },{rootMargin:"140px"});
  io.observe(wrapper);
 }else queueMicrotask(()=>void mount());
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
