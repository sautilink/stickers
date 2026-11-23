const picker=document.getElementById("picker"),target=document.getElementById("message");
picker.addEventListener("sautilink:sticker-select",async ({detail})=>{
 const response=await fetch("/api/v1/stickers/"+encodeURIComponent(detail.sticker_id));
 if(!response.ok)return;
 const {data}=await response.json();
 const image=document.createElement("img");image.alt=data.title;image.src=data.asset_url;
 target.replaceChildren(image);
 console.info("Sticker payload:",detail);
});

