import {createStickerClient,createStickerMessage} from "/sdk.js";
import {createStickerVisual} from "/vector-player.js";

const $=id=>document.getElementById(id);
const client=createStickerClient(location.origin);
const KEY="sautilink-stickers-v2:";
const preference=(key,fallback)=>{
  try{return JSON.parse(localStorage.getItem(KEY+key))??fallback;}catch{return fallback;}
};
const save=(key,value)=>{try{localStorage.setItem(KEY+key,JSON.stringify(value));}catch{}};
const list=(key)=>{const raw=preference(key,[]);return Array.isArray(raw)?raw.filter(s=>typeof s==="string"&&/^[a-z0-9-]{1,90}$/.test(s)).slice(0,80):[]};
const dict={
 en:{all:"Discover",favorites:"Favorites",recent:"Recently used",featured:"Featured",explore:"Explore stickers",
   search:"Search stickers, emotions, Kiswahili…",allStickers:"All stickers",loading:"Loading stickers…",
   empty:"No stickers found. Try a different search.",failed:"Could not load stickers. Try again.",
   copy:"Copy link",share:"Share",saved:"Saved to favorites",removed:"Removed from favorites",copied:"Sticker link copied",
   random:"Surprise me",selected:"SELECTED",use:"Use sticker",details:"Sticker details",
   count:"stickers",packs:"packs",view:"View details",more:"Load more",popular:"Curated order",newest:"Newest",az:"A–Z",
   offline:"API unavailable",online:"API online",license:"Artwork license"},
 sw:{all:"Gundua",favorites:"Ulizopenda",recent:"Uliyotumia",featured:"Zilizochaguliwa",explore:"Gundua stickers",
   search:"Tafuta stickers, hisia, maneno ya Kiswahili…",allStickers:"Stickers zote",loading:"Inapakia stickers…",
   empty:"Hakuna stickers zilizopatikana. Jaribu neno jingine.",failed:"Imeshindikana kupakia stickers. Jaribu tena.",
   copy:"Nakili link",share:"Shiriki",saved:"Imeongezwa kwenye ulizopenda",removed:"Imeondolewa kwenye ulizopenda",copied:"Link ya sticker imenakiliwa",
   random:"Nishtue",selected:"ILIYOCHAGULIWA",use:"Tumia sticker",details:"Maelezo ya sticker",
   count:"stickers",packs:"packs",view:"Angalia maelezo",more:"Pakia zaidi",popular:"Mpangilio wa maktaba",newest:"Mpya",az:"A–Z",
   offline:"API haipatikani",online:"API ipo hewani",license:"Leseni ya mchoro"}
};
let language=preference("lang","en")==="sw"?"sw":"en";
let dark=Boolean(preference("dark",false));
let lite=Boolean(preference("lite",false));
const t=k=>(dict[language]||dict.en)[k]||dict.en[k]||k;
const state={tab:"all",pack:"",category:"",sort:"default",items:[],packs:[],categories:[],selected:null,next:null,total:0,requestId:0,loading:false};
const favorites=()=>list("favorites");
const recent=()=>list("recent");
let toastTimer;
function toast(message) {
 const el=$("toast");el.textContent=message;el.classList.add("visible");
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("visible"),2600);
}
const urlFor=s=>{
 const url=new URL(s.asset_url,location.origin);
 return url.origin===location.origin?url.href:"";
};
function imageFor(sticker,{size=106}={}) {
 if(lite){
  const fallback=document.createElement("span");fallback.className="lite-art";
  fallback.textContent=sticker.emoji||"✦";fallback.style.fontSize=Math.round(size*.56)+"px";
  fallback.style.width=size+"px";fallback.style.height=size+"px";
  return fallback;
 }
 return createStickerVisual({...sticker,asset_url:urlFor(sticker)},{size,lite:false});
}
function setNav(){
 document.querySelectorAll(".nav").forEach(el=>el.classList.toggle("active",
  el.id===(state.tab==="pack"?"pack-"+state.pack:state.tab==="favorites"?"favoritesTab":state.tab==="recent"?"recentTab":state.tab==="featured"?"featuredTab":"allPacks")));
}
function setTab(tab,pack=""){
 state.tab=tab;state.pack=pack;state.category="";state.next=null;
 renderCategories();renderPackTiles();setNav();void refresh();
}
function setCategory(cat){state.category=cat;renderCategories();void refresh();}
function renderCategories(){
 const root=$("categories");root.replaceChildren();
 for(const category of [{id:"",count:null},...state.categories]){
  const button=document.createElement("button");button.type="button";button.className="chip"+(category.id===state.category?" active":"");
  const name=category.id?category.id.charAt(0).toUpperCase()+category.id.slice(1).replaceAll("-"," "):t("allStickers");
  button.textContent=name+(category.count===null?"":" · "+category.count);
  button.onclick=()=>setCategory(category.id);root.append(button);
 }
}
function renderPackTiles(){
 const root=$("packExplore");root.replaceChildren();
 for(const pack of state.packs){
  const btn=document.createElement("button");btn.type="button";btn.className="pack-tile"+(state.pack===pack.id&&state.tab==="pack"?" active":"");
  btn.setAttribute("aria-label","Open pack "+pack.name);
  const img=createStickerVisual({id:pack.cover_id,format:pack.cover_format,emoji:pack.cover_emoji,title:pack.cover_title,asset_url:pack.cover_url},{size:52,lite});
  const span=document.createElement("span");const name=document.createElement("b");name.textContent=pack.name;
  const count=document.createElement("small");count.textContent=pack.sticker_count+" "+t("count");
  span.append(name,count);btn.append(img,span);btn.onclick=()=>setTab("pack",pack.id);root.append(btn);
 }
}
function renderSidebar(){
 const nav=$("packNav");nav.replaceChildren();
 for(const p of state.packs){
  const b=document.createElement("button");b.type="button";b.className="nav";b.id="pack-"+p.id;
  const name=document.createElement("span");name.textContent="◈";name.setAttribute("aria-hidden","true");
  const label=document.createElement("span");label.textContent=p.name;
  const count=document.createElement("small");count.textContent=p.sticker_count;count.className="count-chip";
  b.append(name,label,count);b.onclick=()=>setTab("pack",p.id);nav.append(b);
 }
 setNav();
}
function updateSelected(){
 const s=state.selected;if(!s)return;
 $("selectedName").textContent=s.title;
 $("favoriteSelected").textContent=favorites().includes(s.id)?"♥":"♡";
 const image=$("sentSticker");image.replaceChildren(imageFor(s,{size:122}));
}
function selectSticker(s) {
 state.selected=s;
 save("recent",[s.id,...recent().filter(id=>id!==s.id)].slice(0,80));
 updateSelected();
 window.dispatchEvent(new CustomEvent("sautilink:sticker-selected",{detail:{
  id:s.id,pack_id:s.pack_id,format:s.format,asset_url:urlFor(s),
  message:createStickerMessage(s)
 }}));
 if(state.tab==="recent")void refresh();
}
function toggleFavorite(s){
 const items=favorites(),inList=items.includes(s.id);
 save("favorites",inList?items.filter(x=>x!==s.id):[s.id,...items].slice(0,80));
 toast(inList?t("removed"):t("saved"));
 if(state.tab==="favorites")void refresh();else renderCards();
 updateSelected();
}
function renderCards(){
 const root=$("stickerGrid");root.replaceChildren();
 const saved=new Set(favorites());
 for(const s of state.items){
  const wrapper=document.createElement("div");wrapper.className="tile";
  const card=document.createElement("button");card.type="button";card.className="sticker-card";card.setAttribute("aria-label",s.title+" — "+t("view"));
  card.append(imageFor(s),Object.assign(document.createElement("div"),{className:"sticker-name",textContent:s.title}));
  card.onclick=()=>showDetails(s);
  const fav=document.createElement("button");fav.type="button";fav.className="heart"+(saved.has(s.id)?" saved":"");
  fav.textContent=saved.has(s.id)?"♥":"♡";
  fav.setAttribute("aria-label",(saved.has(s.id)?"Remove ":"Add ")+s.title+" favorite");
  fav.onclick=()=>toggleFavorite(s);
  wrapper.append(card,fav);root.append(wrapper);
 }
 $("total").textContent=state.total+" "+t("count");
 $("status").textContent=state.items.length?"":t("empty");
 $("loadMore").textContent=t("more");
 $("loadMore").hidden=!state.next;
}
async function fetchAllSaved(ids){
 const chunks=[];for(let i=0;i<ids.length;i+=60)chunks.push(ids.slice(i,i+60));
 const responses=await Promise.all(chunks.map(chunk=>client.byIds(chunk)));
 const byId=new Map(responses.flatMap(r=>r.data).map(s=>[s.id,s]));
 return ids.map(id=>byId.get(id)).filter(Boolean);
}
async function refresh(append=false){
 const id=++state.requestId;state.loading=true;
 $("status").classList.remove("status-error");$("status").textContent=t("loading");
 if(!append){state.items=[];state.next=null;}
 try{
  const query=$("searchInput").value.trim();
  let items=[],next=null,total=0;
  if(state.tab==="favorites"||state.tab==="recent"){
   const ids=state.tab==="favorites"?favorites():recent();
   items=await fetchAllSaved(ids);
   items=items.filter(s=>(!state.category||s.category===state.category)&&
     (!query||[s.title,s.emoji,...s.tags,s.category].join(" ").normalize("NFKC").toLocaleLowerCase("en").includes(query.normalize("NFKC").toLocaleLowerCase("en"))));
   total=items.length;
  } else if(state.tab==="featured") {
   const r=await client.featured();
   items=r.data.filter(s=>(!state.category||s.category===state.category)&&
    (!query||[s.title,s.emoji,...s.tags].join(" ").toLocaleLowerCase("en").includes(query.toLocaleLowerCase("en"))));
   total=items.length;
  }else {
   const filters={q:query,pack:state.pack,category:state.category,sort:state.sort,limit:40};
   if(append&&state.next)filters.cursor=state.next;
   const result=await client.search(filters);
   items=append?[...state.items,...result.data]:result.data;
   next=result.pagination.next_cursor;total=result.pagination.total;
  }
  if(id!==state.requestId)return;
  state.items=items;state.next=next;state.total=total;
  const pack=state.packs.find(x=>x.id===state.pack);
  $("sectionTitle").textContent=state.tab==="pack"?(pack?.name||t("explore")):
    state.tab==="favorites"?t("favorites"):state.tab==="recent"?t("recent"):state.tab==="featured"?t("featured"):t("explore");
  renderCards();
 }catch(e){if(id!==state.requestId)return;$("status").textContent=t("failed");$("status").classList.add("status-error");console.error("Sticker search failed",e);}
 finally{if(id===state.requestId)state.loading=false;}
}
async function copyLink(s){
 if(!s)return;
 const target=new URL(location.href);target.search="";target.hash="";target.searchParams.set("sticker",s.id);
 try{await navigator.clipboard.writeText(target.toString());toast(t("copied"));}catch{toast("Clipboard unavailable");}
}
async function share(s){
 if(!s)return;
 const target=new URL(location.href);target.search="";target.searchParams.set("sticker",s.id);
 if(navigator.share){
  try{await navigator.share({title:s.title+" · SautiLink Stickers",url:target.toString()});}catch(e){if(e.name!=="AbortError")void copyLink(s);}
 }else void copyLink(s);
}
async function showDetails(s){
 state.selected=s;updateSelected();
 const dialog=$("detailDialog");
 $("detailTitle").textContent=s.title;$("detailPack").textContent=state.packs.find(p=>p.id===s.pack_id)?.name||s.pack_id;
 $("detailLicense").textContent=t("license")+": "+s.license;
 const image=$("detailImage");image.replaceChildren(imageFor(s,{size:170}));
 $("detailFavorite").textContent=favorites().includes(s.id)?"♥ "+t("favorites"):"♡ "+t("favorites");
 $("detailUse").textContent=t("use");$("detailCopy").textContent=t("copy");
 dialog.showModal();
}
function applyLanguage(){
 $("allPacks").childNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE)n.textContent=" "+t("all")+" ";});
 for(const [id,label] of [["favoritesTab","favorites"],["recentTab","recent"],["featuredTab","featured"]]){
  const b=$(id);for(const n of b.childNodes){if(n.nodeType===Node.TEXT_NODE)n.textContent=" "+t(label)+" ";}
 }
 $("searchInput").placeholder=t("search");
 $("sortSelect").options[0].text=t("popular");$("sortSelect").options[1].text=t("newest");$("sortSelect").options[2].text=t("az");
 $("copySticker").textContent=t("copy");$("shareSticker").textContent=t("share");
 $("langToggle").textContent=language==="sw"?"SW":"EN";
 renderCategories();renderPackTiles();renderSidebar();void refresh();
}
function bootControls(){
 const toolbar=document.querySelector(".toolbar-right");
 const lang=document.createElement("button");lang.id="langToggle";lang.className="tool";lang.type="button";
 lang.title="Switch between Kiswahili and English";
 lang.onclick=()=>{language=language==="en"?"sw":"en";save("lang",language);applyLanguage();};
 const theme=document.createElement("button");theme.className="tool";theme.type="button";theme.id="themeToggle";
 theme.title="Switch between light and dark theme";
 theme.onclick=()=>{dark=!dark;save("dark",dark);applyTheme();};
 const liteBtn=document.createElement("button");liteBtn.id="liteToggle";liteBtn.className="tool";liteBtn.type="button";
 liteBtn.title="Data saver: show emoji placeholders instead of downloading animations";
 liteBtn.onclick=()=>{lite=!lite;save("lite",lite);applyLite();renderCards();updateSelected();};
 toolbar.prepend(liteBtn,theme,lang);
 applyTheme();applyLite();
 function createSuggestions(){
  const datalist=document.createElement("datalist");datalist.id="searchSuggestions";document.body.append(datalist);
  $("searchInput").setAttribute("list","searchSuggestions");
 }
 createSuggestions();
}
function applyTheme(){
 document.body.classList.toggle("dark",dark);
 $("themeToggle").textContent=dark?"☀ Light":"☾ Dark";
 $("themeToggle").setAttribute("aria-pressed",String(dark));
}
function applyLite(){
 $("liteToggle").textContent=lite?"◉ Lite ON":"◌ Lite";
 $("liteToggle").classList.toggle("active",lite);
 $("liteToggle").setAttribute("aria-pressed",String(lite));
}
async function boot(){
 bootControls();
 for(const [id,tab] of [["allPacks","all"],["favoritesTab","favorites"],["recentTab","recent"],["featuredTab","featured"]]){
  $(id).onclick=()=>setTab(tab);
 }
 $("sortSelect").onchange=e=>{state.sort=e.target.value;void refresh();};
 $("loadMore").onclick=()=>{if(!state.loading&&state.next)void refresh(true);};
 $("favoriteSelected").onclick=()=>{if(state.selected)toggleFavorite(state.selected);};
 $("randomSticker").onclick=async()=>{
  try{const r=await client.random({category:state.category,pack:state.pack});selectSticker(r.data);toast(r.data.title);}catch{toast(t("failed"));}
 };
 $("copySticker").onclick=()=>void copyLink(state.selected);
 $("shareSticker").onclick=()=>void share(state.selected);
 $("closeDetails").onclick=()=>$("detailDialog").close();
 $("detailUse").onclick=()=>{if(state.selected)selectSticker(state.selected);$("detailDialog").close();};
 $("detailCopy").onclick=()=>void copyLink(state.selected);
 $("detailFavorite").onclick=()=>{if(state.selected)toggleFavorite(state.selected);$("detailFavorite").textContent=favorites().includes(state.selected.id)?"♥ "+t("favorites"):"♡ "+t("favorites");};
 $("detailDialog").addEventListener("click",e=>{if(e.target===$("detailDialog"))$("detailDialog").close();});
 let timer=0,suggestSeq=0;
 $("searchInput").addEventListener("input",()=>{
  clearTimeout(timer);
  timer=setTimeout(()=>void refresh(),220);
  const q=$("searchInput").value.trim(),seq=++suggestSeq;
  if(q.length<2){$("searchSuggestions").replaceChildren();return;}
  void client.suggestions(q).then(r=>{
   if(seq!==suggestSeq)return;const list=$("searchSuggestions");list.replaceChildren();
   for(const term of r.data){const opt=document.createElement("option");opt.value=term;list.append(opt);}
  }).catch(()=>{});
 });
 try{
  const [packs,categories]=await Promise.all([client.packs(),client.categories()]);
  state.packs=packs.data;state.categories=categories.data;
  $("apiState").lastChild.textContent=" "+t("online");
  renderSidebar();applyLanguage();
  const stickerId=new URL(location.href).searchParams.get("sticker");
  if(stickerId&&/^[a-z0-9-]{1,90}$/.test(stickerId)){
   try{const result=await client.sticker(stickerId);showDetails(result.data);}catch{}
  }
 }catch(e){
  $("apiState").lastChild.textContent=" "+t("offline");
  $("status").textContent=t("failed");$("status").classList.add("status-error");
  console.error("Sticker Studio init",e);
 }
}
void boot();
