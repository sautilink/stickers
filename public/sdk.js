/**
 * SautiLink Sticker Engine client SDK (browser ESM).
 * This API is read-only. Send sticker IDs through YOUR authenticated message backend.
 * @example import {createStickerClient} from "/sdk.js";
 * const stickers = createStickerClient("https://stickers.sautilink.com");
 * const {data} = await stickers.search({q:"furaha"});
 */
export function createStickerClient(baseUrl=globalThis.location?.origin,fetcher=globalThis.fetch) {
  if(typeof fetcher!=="function") throw new TypeError("fetch is required");
  const origin = new URL(baseUrl);
  if(origin.protocol!=="https:" && !(origin.protocol==="http:" && ["localhost","127.0.0.1"].includes(origin.hostname))) {
    throw new TypeError("Sticker API must use HTTPS");
  }
  const api = async (path,query={})=>{
    const url=new URL(path,origin);
    for(const [key,value] of Object.entries(query)) {
      if(value!==undefined && value!==null && value!=="") url.searchParams.set(key,Array.isArray(value)?value.join(","):String(value));
    }
    const response=await fetcher(url.toString(),{method:"GET",headers:{accept:"application/json"}});
    const payload=await response.json();
    if(!response.ok) {
      const error=new Error(payload?.error?.message||"Sticker API error");
      error.status=response.status;error.code=payload?.error?.code;throw error;
    }
    return payload;
  };
  return Object.freeze({
    capabilities:()=>api("/api/v1/capabilities"),
    emojiMap:()=>api("/api/v1/emoji-map"),
    packs:()=>api("/api/v1/packs"),
    pack:id=>api("/api/v1/packs/"+encodeURIComponent(id)),
    categories:()=>api("/api/v1/categories",{with_counts:"true"}),
    featured:()=>api("/api/v1/featured"),
    stats:()=>api("/api/v1/stats"),
    licenses:()=>api("/api/v1/licenses"),
    search:filters=>api("/api/v1/stickers",filters),
    sticker:id=>api("/api/v1/stickers/"+encodeURIComponent(id)),
    related:id=>api("/api/v1/stickers/"+encodeURIComponent(id)+"/related"),
    byIds:ids=>api("/api/v1/stickers",{ids,limit:60}),
    random:filters=>api("/api/v1/stickers/random",filters),
    suggestions:q=>api("/api/v1/suggestions",{q})
  });
}

export function createStickerMessage(sticker){
  if(!sticker||!(/^[a-z0-9-]{1,90}$/.test(sticker.id))||!(/^[a-z0-9-]{1,90}$/.test(sticker.pack_id))) {
    throw new TypeError("Invalid sticker data");
  }
  return Object.freeze({type:"sticker",sticker_id:sticker.id,pack_id:sticker.pack_id});
}
