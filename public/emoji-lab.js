import {createStickerClient} from "./sdk.js";
import {createStickerVisual,createInlineEmoji,popSticker} from "./vector-player.js";
const $=id=>document.getElementById(id);
const client=createStickerClient(location.origin);
let byId=new Map(),lite=false;
function preview(){
 const root=$("preview");root.replaceChildren(createInlineEmoji($("message").value,byId,{size:30,lite}));
 root.querySelectorAll(".sl-inline-emoji").forEach(el=>{
  el.tabIndex=0;el.setAttribute("role","button");
  el.setAttribute("aria-label","Play "+(byId.get(el.dataset.stickerId)?.title||"emoji")+" effect");
  const pulse=()=>popSticker(el);
  el.addEventListener("click",pulse);
  el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();pulse();}});
 });
}
function render(){
 const root=$("library");root.replaceChildren();
 for(const s of byId.values()){
  const b=document.createElement("button");b.type="button";b.className="vector-card";
  b.setAttribute("aria-label","Insert "+s.title+" emoji");
  const visual=createStickerVisual(s,{size:108,lite});
  const caption=document.createElement("span");caption.textContent=s.title;
  b.append(visual,caption);
  b.addEventListener("click",()=>{
   const area=$("message");
   area.value+=(area.value.endsWith(" ")?"":" ")+":"+s.id+":";
   preview();popSticker(visual);area.focus();
  });
  root.append(b);
 }
 preview();
}
async function boot(){
 $("update").onclick=preview;
 $("lite").onchange=e=>{lite=e.target.checked;render();};
 try{
  const {data}=await client.search({pack:"sautilink-motion-originals",limit:40});
  byId=new Map(data.filter(s=>s.format==="lottie"&&s.inline_emoji).map(s=>[s.id,s]));
  if(!byId.size)throw Error("No approved vector assets found");
  render();$("status").textContent=byId.size+" first-party animated emoji ready. Tap to insert.";
 }catch{
  $("status").textContent="Motion Emoji assets are unavailable. Please reload after deployment.";
 }
}
void boot();
