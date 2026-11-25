const $=id=>document.getElementById(id);
const state={items:[],pack:"",category:"",tab:"all",cursor:null,total:0,selected:null,loading:false,requestId:0};
const storage={get(key){try{return JSON.parse(localStorage.getItem(key)||"[]");}catch{return[];}},set(key,arr){try{localStorage.setItem(key,JSON.stringify(arr.slice(0,80)));}catch{}}};
const favorites=()=>storage.get("sautilink-sticker-favorites");
const recent=()=>storage.get("sautilink-sticker-recent");
const escapeData=(obj)=>Object.assign({},obj);
function setNav(id){
 document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.id===id));
}
function setTab(tab,pack=""){
 state.tab=tab;state.pack=pack;state.cursor=null;
 setNav(tab==="favorites"?"favoritesTab":tab==="recent"?"recentTab":tab==="all"?"allPacks":"pack-"+pack);
 $("sectionTitle").textContent=tab==="favorites"?"Your favorites":tab==="recent"?"Recently used":tab==="pack"?"Sticker pack":"Explore stickers";
 void refresh();
}
function setCategory(cat){state.category=cat;renderCategories();void refresh();}
function renderCategories(){
 const el=$("categories");el.replaceChildren();
 for(const cat of ["","reactions","love","celebration","greetings"]){
  const b=document.createElement("button");b.type="button";b.className="chip"+(state.category===cat?" active":"");
  b.textContent=cat?cat.charAt(0).toUpperCase()+cat.slice(1):"All stickers";
  b.onclick=()=>setCategory(cat);el.append(b);
 }
}
function toggleFavorite(sticker){
 const old=favorites(),newList=old.includes(sticker.id)?old.filter(x=>x!==sticker.id):[sticker.id,...old];
 storage.set("sautilink-sticker-favorites",newList);
 if(state.tab==="favorites")void refresh();else renderCards();
 updateSelected();
}
function updateSelected(){
 const s=state.selected;if(!s)return;
 $("selectedName").textContent=s.title;
 $("favoriteSelected").textContent=favorites().includes(s.id)?"♥":"♡";
}
function selectSticker(s){
 state.selected=s;
 $("sentSticker").replaceChildren();
 const img=document.createElement("img");img.src=s.preview_url||s.asset_url;img.alt=s.title+" sticker";img.loading="lazy";$("sentSticker").append(img);
 storage.set("sautilink-sticker-recent",[s.id,...recent().filter(x=>x!==s.id)]);
 updateSelected();
 window.dispatchEvent(new CustomEvent("sautilink:sticker-selected",{detail:escapeData({id:s.id,pack_id:s.pack_id,format:s.format,asset_url:s.asset_url})}));
}
function renderCards(){
 const grid=$("stickerGrid");grid.replaceChildren();
 const fav=new Set(favorites());
 for(const s of state.items){
  const card=document.createElement("button");card.type="button";card.className="sticker-card";card.setAttribute("aria-label","Select "+s.title);
  const pic=document.createElement("img");pic.src=s.preview_url||s.asset_url;pic.alt="";pic.loading="lazy";
  const title=document.createElement("div");title.className="sticker-name";title.textContent=s.title;
  const heart=document.createElement("button");heart.type="button";heart.className="heart"+(fav.has(s.id)?" saved":"");
  heart.textContent=fav.has(s.id)?"♥":"♡";heart.setAttribute("aria-label",(fav.has(s.id)?"Remove ":"Add ")+s.title+" favorite");
  heart.onclick=e=>{e.stopPropagation();toggleFavorite(s);};
  card.append(pic,title);card.onclick=()=>selectSticker(s);
  // Avoid nesting interactive buttons: wrap heart with a separate sibling instead.
  const wrapper=document.createElement("div");wrapper.style.position="relative";wrapper.append(card,heart);grid.append(wrapper);
 }
 $("total").textContent=state.total+" stickers";
 $("status").textContent=state.items.length?"":(state.loading?"Loading…":"No stickers found. Try another search.");
 $("loadMore").hidden=!state.cursor;
}
async function refresh(append=false){
 const reqId=++state.requestId;state.loading=true;
 if(!append){state.items=[];state.cursor=null;}
 $("status").textContent="Loading stickers…";
 const params=new URLSearchParams({limit:"40"});
 const term=$("searchInput").value.trim();if(term)params.set("q",term);
 if(state.category)params.set("category",state.category);
 if(state.pack)params.set("pack",state.pack);
 if(append&&state.cursor)params.set("cursor",state.cursor);
 try{
  const r=await fetch("/api/v1/stickers?"+params);if(!r.ok)throw Error("API returned "+r.status);
  const data=await r.json();if(reqId!==state.requestId)return;
  let list=append?[...state.items,...data.data]:data.data;
  if(state.tab==="favorites"||state.tab==="recent"){
   const ids=(state.tab==="favorites"?favorites():recent()).filter(id=>/^[a-z0-9-]{1,90}$/.test(id)).slice(0,80);
   const details=await Promise.all(ids.map(async id=>{
    try{const result=await fetch("/api/v1/stickers/"+encodeURIComponent(id));return result.ok?(await result.json()).data:null;}catch{return null;}
   }));
   const query=term.normalize("NFKC").toLocaleLowerCase("en");
   list=details.filter(Boolean).filter(s=>(!state.category||s.category===state.category)&&
    (!state.pack||s.pack_id===state.pack)&&(!query||[s.title,s.emoji,...s.tags].join(" ").normalize("NFKC").toLocaleLowerCase("en").includes(query)));
  }
  if(reqId!==state.requestId)return;
  state.items=list;state.total=state.tab==="all"||state.tab==="pack"?data.pagination.total:list.length;
  state.cursor=state.tab==="all"||state.tab==="pack"?data.pagination.next_cursor:null;
  if(state.tab==="pack"&&list[0])$("sectionTitle").textContent=list[0].pack_id==="sautilink-originals"?"SautiLink Originals":list[0].pack_id;
 }catch(err){if(reqId!==state.requestId)return;$("status").textContent="Unable to load stickers. "+err.message;}
 finally{if(reqId===state.requestId){state.loading=false;renderCards();}}
}
async function boot(){
 renderCategories();
 for(const [id,tab] of [["allPacks","all"],["favoritesTab","favorites"],["recentTab","recent"]]){
  $(id).onclick=()=>setTab(tab);
 }
 let searchTimeout;
 $("searchInput").addEventListener("input",()=>{clearTimeout(searchTimeout);searchTimeout=setTimeout(()=>void refresh(),180);});
 $("loadMore").onclick=()=>void refresh(true);
 $("favoriteSelected").onclick=()=>{if(state.selected)toggleFavorite(state.selected);};
 $("randomSticker").onclick=()=>{if(state.items.length)selectSticker(state.items[Math.floor(Math.random()*state.items.length)]);};
 try{
  const r=await fetch("/api/v1/packs");if(!r.ok)throw Error("API unavailable");
  const d=await r.json();const nav=$("packNav");
  for(const p of d.data){const b=document.createElement("button");b.type="button";b.className="nav";b.id="pack-"+p.id;b.textContent=p.name;b.onclick=()=>setTab("pack",p.id);nav.append(b);}
 }catch{$("status").textContent="Unable to load sticker packs.";}
 await refresh();
}
void boot();
