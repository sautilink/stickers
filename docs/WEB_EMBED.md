# Embed the Sticker Picker in SautiLink Web

Include the first-party module on your website:

    <script type="module" src="https://STICKER_ORIGIN/embed.js"></script>
    <sautilink-sticker-picker api="https://STICKER_ORIGIN" theme="light"></sautilink-sticker-picker>

Subscribe to the stable ID payload event:

    const picker = document.querySelector("sautilink-sticker-picker");
    picker.addEventListener("sautilink:sticker-select", ({ detail }) => {
      // detail = {type:"sticker", sticker_id:"sl-happy", pack_id:"sautilink-originals"}
      // Validate and send through SautiLink's existing authenticated chat/comment backend.
    });

The component supports search, packs, categories, pagination and accessible open/close; it does not send, persist or upload messages.

The source site's domain must be in the Worker's CORS allowlist. Use approved company origins only. Never trust arbitrary user media URLs: resolve the sticker ID in the service, check that it is still allowed, then display its stored asset.

Try the standalone integration sample at /embed-demo.html.
