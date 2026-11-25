import sharp from 'sharp';
import { readFile, writeFile, mkdir, rename, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateCatalog } from '../src/engine.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = path.join(root, 'data/catalog.json');
const catalog = JSON.parse(await readFile(file, 'utf8'));
validateCatalog(catalog);
const stickers = catalog.stickers.filter(sticker => sticker.format === 'webp');
const sourceOf = sticker => path.join(root, 'public', sticker.asset_path);
if (process.argv.includes('--wait-for-assets')) {
  let attempts = 0;
  while (true) {
    const missing = await Promise.all(stickers.map(async sticker => {
      try { await access(sourceOf(sticker)); return false; } catch { return true; }
    }));
    if (!missing.some(Boolean)) break;
    if (attempts++ > 900) throw new Error('Artwork checkout did not finish');
    if (attempts % 30 === 1) console.log('Waiting for the unchanged original artwork...', missing.filter(Boolean).length);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
const destination = path.join(root, 'public/assets/previews');
await mkdir(destination, { recursive: true });
sharp.cache(false); sharp.concurrency(1);
let position = 0, processed = 0, originalBytes = 0, previewBytes = 0, optimized = 0;
const failures = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const duration = meta => (meta.delay || []).reduce((sum, delay) => sum + delay, 0);
async function next() {
  while (position < stickers.length) {
    const sticker = stickers[position++];
    try {
      const source = await readFile(sourceOf(sticker));
      if (sticker.file_sha256 && hash(source) !== sticker.file_sha256) throw new Error('Original artwork hash differs');
      originalBytes += source.length;
      const metadata = await sharp(source, { animated: true }).metadata();
      if (source.length < 30_000 && Math.max(metadata.width, metadata.pageHeight || metadata.height) <= 256) {
        previewBytes += source.length;
      } else {
        const preview = await sharp(source, { animated: true }).resize({ width: 192, height: 192, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 75, alphaQuality: 90, effort: 4, minSize: true, loop: metadata.loop ?? 0, delay: metadata.delay }).toBuffer();
        const result = await sharp(preview, { animated: true }).metadata();
        if ((metadata.pages || 1) > 1 && ((result.pages || 1) <= 1 || duration(metadata) !== duration(result) || metadata.loop !== result.loop))
          throw new Error('Animation timing did not survive encoding');
        if (Math.max(result.width, result.pageHeight || result.height) > 256) throw new Error('Preview bounds are invalid');
        if (preview.length < source.length * .9) {
          const sha = hash(preview);
          const name = `${sticker.id}-${sha.slice(0, 12)}.webp`;
          await writeFile(path.join(destination, name), preview);
          Object.assign(sticker, { preview_path: `/assets/previews/${name}`, preview_sha256: sha,
            preview_source_sha256: hash(source), preview_width: result.width, preview_height: result.pageHeight || result.height,
            preview_bytes: preview.length });
          previewBytes += preview.length; optimized++;
        } else previewBytes += source.length;
      }
    } catch (error) {
      failures.push({ id: sticker.id, message: error.message });
      console.warn(sticker.id, error.message);
    }
    processed++;
    if (processed % 25 === 0) console.log(JSON.stringify({ processed, total: stickers.length, optimized }));
  }
}
await Promise.all([next(), next()]);
if (failures.length) throw new Error(`Preview generation failed for ${failures.length} assets`);
catalog.updated_at = new Date().toISOString().slice(0, 10);
validateCatalog(catalog);
await writeFile(file + '.tmp', JSON.stringify(catalog, null, 2) + '\n');
await rename(file + '.tmp', file);
console.log(JSON.stringify({ processed, optimized, originalBytes, previewBytes }));
