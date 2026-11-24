import {createStickerClient,createStickerMessage} from "./sdk.js";
import {createStickerVisual} from "./vector-player.js";

/**
 * Self-contained sticker picker for SautiLink Web.
 * Usage:
 * <script type="module" src="https://STICKER_HOST/embed.js"></script>
 * <sautilink-sticker-picker api="https://STICKER_HOST" theme="light"></sautilink-sticker-picker>
 * The "sautilink:sticker-select" event exposes the stable sticker payload.
 */
const style=String.raw;
/* No third-party JS or CSS dependencies. */
class SautiLinkStickerPicker extends HTMLElement {
  constructor(){
    super();this.root=this.attachShadow({mode:"open"});
    this.api=null;this.items=[];this.next=null;this.total=0;this.loading=false;this.seq=0;this.expanded=false;
  }
  connectedCallback(){
    if(this.root.childElementCount)return;
    this.root.innerHTML='<style>'+
      ':host{display:inline-block;position:relative;font:14px Inter,system-ui,-apple-system,sans-serif;color:#2c3446;--bg:#fff;--text:#25334a;--soft:#f5f6fb;--line:#e6eaf2;--accent:#7068dd}'+
      ':host([theme="dark"]){--bg:#1d2637;--text:#f2f5ff;--soft:#273448;--line:#3b4860;--accent:#a094ff}'+
      '*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #9a93ef;outline-offset:2px}'+
      '.trigger{border:1px solid var(--line);background:var(--bg);padding:10px 14px;border-radius:14px;display:flex;align-items:center;gap:9px;font-weight:700;color:var(--text);box-shadow:0 4px 15px #1f27420b}'+
      '.trigger span{font-size:21px}.panel{position:absolute;bottom:calc(100% + 8px);left:0;width:min(360px,calc(100vw - 24px));max-height:450px;display:flex;flex-direction:column;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:20px;box-shadow:0 20px 55px #15203235;z-index:999;padding:14px}'+
      '.panel[hidden]{display:none}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.top button{border:0;background:transparent;color:var(--text);font-size:22px}'+
      '.filters{display:flex;gap:7px;flex-wrap:wrap}.filters input{background:var(--soft);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px;width:100%;min-width:0}.filters select{background:var(--soft);color:var(--text);border:1px solid var(--line);border-radius:10px;padding:8px;max-width:calc(50% - 4px);flex:1;font-size:11px}'+
      '.results{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;overflow:auto;max-height:260px;margin-top:12px}.sticker{border:0;background:transparent;border-radius:12px;padding:6px;min-height:72px;display:flex;align-items:center;justify-content:center}.sticker:hover{background:var(--soft)}.sticker img{width:62px;height:62px;object-fit:contain}'+
      '.footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:9px;color:#98a1ad;font-size:11px}.footer button{border:1px solid var(--line);background:var(--soft);color:var(--text);border-radius:9px;padding:6px 11px;font-size:11px}.status{font-size:11px;color:#929da8;margin:10px 0 0}'+
      '@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}'+
      '</style>'+
      '<button class="trigger" type="button" aria-expanded="false" aria-haspopup="dialog"><span>☺</span> Stickers</button>'+
      '<div class="panel" role="dialog" aria-label="Choose sticker" hidden>'+
      '<div class="top"><b>SautiLink Stickers</b><button class="close" type="button" aria-label="Close">×</button></div>'+
      '<div class="filters"><input class="search" type="search" placeholder="Search stickers..." aria-label="Search stickers"/>'+
      '<select class="packs" aria-label="Sticker pack"><option value="">All packs</option></select>'+
      '<select class="category" aria-label="Sticker category"><option value="">All categories</option></select></div>'+
      '<div class="results" role="list"></div><div class="status" role="status"></div>'+
      '<div class="footer"><span class="count"></span><button class="more" type="button" hidden>More</button></div></div>';
    this.trigger=this.root.querySelector(".trigger");
    this.panel=this.root.querySelector(".panel");
    this.trigger.addEventListener("click",()=>this.toggle());
    this.root.querySelector(".close").addEventListener("click",()=>this.close());
    let timer;
    this.root.querySelector(".search").addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>void this.search(),220);});
    this.root.querySelector(".packs").addEventListener("change",()=>void this.search());
    this.root.querySelector(".category").addEventListener("change",()=>void this.search());
    this.root.querySelector(".more").addEventListener("click",()=>void this.search(true));
    this.root.addEventListener("keydown",e=>{if(e.key==="Escape")this.close();});
    this._outside=e=>{if(this.expanded&&!this.contains(e.target))this.close();};
    document.addEventListener("pointerdown",this._outside);
  }
  disconnectedCallback(){if(this._outside)document.removeEventListener("pointerdown",this._outside);}
  async open(){
    if(this.expanded)return;
    this.expanded=true;this.panel.hidden=false;this.trigger.setAttribute("aria-expanded","true");
    try{
      this.api||=createStickerClient(this.getAttribute("api")||new URL(import.meta.url).origin);
      const [packs,cats]=await Promise.all([this.api.packs(),this.api.categories()]);
      const packSelect=this.root.querySelector(".packs"),categorySelect=this.root.querySelector(".category");
      if(packSelect.options.length===1){
        for(const p of packs.data){const o=document.createElement("option");o.value=p.id;o.textContent=p.name;packSelect.append(o);}
      }
      if(categorySelect.options.length===1){
        for(const c of cats.data){const o=document.createElement("option");o.value=c.id;o.textContent=c.id+" ("+c.count+")";categorySelect.append(o);}
      }
      await this.search();this.root.querySelector(".search").focus();
    }catch{
      this.root.querySelector(".status").textContent="Sticker service unavailable. Try again.";
    }
  }
  close(){this.expanded=false;this.panel.hidden=true;this.trigger.setAttribute("aria-expanded","false");this.trigger.focus();}
  toggle(){return this.expanded?this.close():this.open();}
  async search(append=false){
    if(this.loading)return;
    const token=++this.seq;this.loading=true;
    const status=this.root.querySelector(".status");status.textContent="Loading…";
    const filters={q:this.root.querySelector(".search").value.trim(),
      pack:this.root.querySelector(".packs").value,
      category:this.root.querySelector(".category").value,limit:40};
    if(append&&this.next)filters.cursor=this.next;
    try{
      const answer=await this.api.search(filters);
      if(token!==this.seq)return;
      this.items=append?[...this.items,...answer.data]:answer.data;
      this.next=answer.pagination.next_cursor;this.total=answer.pagination.total;
      this.render();
      status.textContent=this.items.length?"":"No matching stickers";
    }catch{status.textContent="Unable to load stickers.";}
    finally{this.loading=false;}
  }
  render(){
    const root=this.root.querySelector(".results");root.replaceChildren();
    for(const sticker of this.items){
      const button=document.createElement("button");button.type="button";button.className="sticker";button.setAttribute("aria-label",sticker.title);
      const target=new URL(sticker.asset_url);
      const expected=new URL(this.getAttribute("api")||new URL(import.meta.url).origin).origin;
      if(target.origin!==expected)continue;
      button.append(createStickerVisual(sticker,{size:62}));button.addEventListener("click",()=>{
        const payload=createStickerMessage(sticker);
        this.dispatchEvent(new CustomEvent("sautilink:sticker-select",{detail:payload,bubbles:true,composed:true}));
        this.close();
      });
      root.append(button);
    }
    this.root.querySelector(".count").textContent=this.items.length+" of "+this.total;
    this.root.querySelector(".more").hidden=!this.next;
  }
}
if(!customElements.get("sautilink-sticker-picker"))customElements.define("sautilink-sticker-picker",SautiLinkStickerPicker);
