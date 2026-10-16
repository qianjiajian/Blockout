import assert from "node:assert/strict";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import sharp from "sharp";
const base="art-source/ui/league-video-v1",runtime="public/assets/art/ui/league-video-v1";
const manifest=JSON.parse(await readFile(`${base}/manifest.json`,"utf8"));
assert.equal(manifest.generator,"built-in image_gen");assert.equal(manifest.entries.length,17);
const results=[];
for(const e of manifest.entries){
  const bytes=await readFile(`${runtime}/${e.name}`),source=await readFile(`${base}/${e.name}`),metadata=await sharp(bytes).metadata();
  assert.equal(bytes.compare(source),0);assert.equal(createHash("sha256").update(bytes).digest("hex"),e.sha256);
  assert.equal(metadata.width,e.width);assert.equal(metadata.height,e.height);assert.equal(metadata.hasAlpha,e.hasAlpha);
  if(e.crop){const cell=await sharp(`${base}/${e.atlas}`).extract(e.crop).png().toBuffer();const extracted=await sharp(cell).trim().png().toBuffer();assert.equal(bytes.compare(extracted),0);}
  results.push({name:e.name,sha256:e.sha256,width:e.width,height:e.height,bytes:bytes.length});
}
const output="deliverables/league-video-ui-20261001";await mkdir(output,{recursive:true});
await writeFile(`${output}/generated-art-verification.json`,JSON.stringify({status:"PASS",generator:manifest.generator,results},null,2));
console.log(`PASS: ${results.length} generated league assets, crop provenance, bytes, alpha and dimensions`);
