import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createEngine} from '../src/engine.mjs';

const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const catalog=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
const allow=config.vars.ALLOWED_ORIGINS.split(',');
const engine=createEngine(catalog,{allowedOrigins:allow});

test('official production and staging origins have read-only CORS access',async()=>{
 for(const origin of ['https://sautilink.com','https://www.sautilink.com','https://test.sautilink.com']){
  const response=await engine.fetch(new Request('https://stickers.sautilink.com/api/v1/packs',{headers:{origin}}));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('access-control-allow-origin'),origin);
 }
});
test('unapproved origin cannot preflight Sticker Engine',async()=>{
 const response=await engine.fetch(new Request('https://stickers.sautilink.com/api/v1/packs',{
  method:'OPTIONS',headers:{origin:'https://external.example','access-control-request-method':'GET'}
 }));
 assert.equal(response.status,403);
 assert.equal(response.headers.get('access-control-allow-origin'),null);
});
