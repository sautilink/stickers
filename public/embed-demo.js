const picker=document.getElementById("picker"),target=document.getElementById("message");
picker.addEventListener("sautilink:sticker-select",async ({detail})=>{
 const response=await fetch("/api/v1/stickers/"+encodeURIComponent(detail.sticker_id));
 if(!response.ok)return;
 const {data}=await response.json();
 const {createStickerVisual}=await import("./vector-player.js");
 target.replaceChildren(createStickerVisual(data,{size:122}));
 console.info("Sticker payload:",detail);
});

