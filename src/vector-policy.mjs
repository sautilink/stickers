// Safe subset accepted for first-party and explicitly licensed vector sticker assets.
// No external images, fonts, expressions, text, scripts, remote assets or effects.
const disallowedKeys=new Set(["ef","masksProperties","refId","hasMask","tm","exp","expression","characters","fonts","slots"]);
const layerType=4;
export function validateVectorAnimation(data,{maxDuration=5}={}){
 if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Expected Lottie JSON object");
 const raw=JSON.stringify(data);
 if(raw.length>512000)throw Error("Vector JSON exceeds 512 KB");
 if(!/^5\.\d+\.\d+/.test(String(data.v||"")))throw Error("Unsupported Bodymovin version");
 if(!Number.isFinite(data.fr)||data.fr<=0||data.fr>60)throw Error("Vector framerate out of bounds");
 if(!Number.isFinite(data.w)||!Number.isFinite(data.h)||data.w<32||data.h<32||data.w>512||data.h>512)throw Error("Vector dimensions out of bounds");
 if(!Number.isFinite(data.ip)||!Number.isFinite(data.op)||data.op<=data.ip||(data.op-data.ip)/data.fr>maxDuration)throw Error("Vector duration exceeds policy");
 if(!Array.isArray(data.layers)||data.layers.length===0||data.layers.length>16)throw Error("Vector layer count invalid");
 if(!Array.isArray(data.assets)||data.assets.length!==0)throw Error("External and embedded assets not supported");
 if(data.layers.some(l=>l.ty!==layerType||!Array.isArray(l.shapes)||l.shapes.length>80||l.ddd===1||l.hasMask))throw Error("Only vector shape layers supported");
 let nodes=0;
 const walk=(value,depth=0)=>{
  if(depth>35)throw Error("Vector nested too deeply");
  if(++nodes>24000)throw Error("Vector complexity exceeded");
  if(typeof value==="string"){
   if(value.length>1500||/data:|https?:|javascript:|<script|<svg|<foreignobject/i.test(value))throw Error("External or unsafe vector content");
  }else if(typeof value==="number"){
   if(!Number.isFinite(value)||Math.abs(value)>1000000)throw Error("Unbounded vector number");
  }else if(Array.isArray(value)){
   if(value.length>4000)throw Error("Vector array too long");
   for(const x of value)walk(x,depth+1);
  }else if(value&&typeof value==="object"){
   for(const [k,x] of Object.entries(value)){
    if(disallowedKeys.has(k))throw Error("Unsupported vector property: "+k);
    if(k==="x"&&typeof x==="string")throw Error("Expressions are forbidden");
    if(k==="ty"&&typeof x==="string"&&!["gr","el","fl","st","tr","sh","rc","tm"].includes(x))throw Error("Unsupported vector shape: "+x);
    walk(x,depth+1);
   }
  }
 };
 walk(data);
 return true;
}
