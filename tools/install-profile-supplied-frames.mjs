import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(process.argv[2] ?? 'C:/Users/Administrator/Desktop/block out/联赛-头像框/头像框1-20');
const archive = resolve(root, 'art-source/ui/profile-frames-supplied-v1');
const runtime = resolve(root, 'public/assets/art/ui/profile-frames-supplied-v1');
const sha = data => createHash('sha256').update(data).digest('hex');
const slash = path => path.replaceAll('\\', '/');
const assets = [];
// Stable IDs and unlock thresholds stay unchanged. The twentieth supplied PNG
// is archived only, as explicitly confirmed by the user.
for (let number = 1; number <= 20; number++) {
  const source = resolve(sourceRoot, `${number}.png`), bytes = await readFile(source);
  assert(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
  assert.equal(bytes.readUInt32BE(16), 146); assert.equal(bytes.readUInt32BE(20), 146);
  const file = number <= 19 ? `frame-${number - 1}.png` : 'reserve/20.png';
  const targets = [resolve(archive, file), ...(number <= 19 ? [resolve(runtime, file)] : [])];
  for (const path of targets) {
    const existing = await readFile(path).catch(error => { if(error.code !== 'ENOENT') throw error; });
    assert(!existing || existing.equals(bytes), `Refusing to overwrite different asset: ${path}`);
    await mkdir(dirname(path), {recursive:true}); await writeFile(path, bytes);
    assert.equal(sha(await readFile(path)), sha(bytes));
  }
  assets.push({ number, frameId:number<=19?number-1:null, status:number<=19?'active':'reserved',
    source:slash(source), archive:slash(relative(root,targets[0])), runtime:targets[1]?slash(relative(root,targets[1])):null,
    width:146,height:146,bytes:bytes.length,sha256:sha(bytes) });
}
await writeFile(resolve(archive,'provenance.json'),JSON.stringify({schemaVersion:1,suppliedOn:'2026-10-15',
  mapping:'User confirmed: PNG 1..19 replaces stable frame IDs 0..18; PNG 20 is reserved only. No unlock or save ID changes.',
  operation:'Byte-identical PNG copies. No image generation, recoloring, cropping, rotation, resizing or re-encoding.',assets},null,2)+'\n');
const manifestPath=resolve(root,'art-source/manifest.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
for(const row of assets.filter(a=>a.status==='active')){
  const key=`ui.profileSuppliedFrame.${row.frameId}`, entry={key,source:`ui/profile-frames-supplied-v1/frame-${row.frameId}.png`,
    runtime:`../public/assets/art/ui/profile-frames-supplied-v1/frame-${row.frameId}.png`,width:146,height:146,alpha:true,grid:[1,1],transform:'copy'};
  const index=manifest.assets.findIndex(a=>a.key===key);
  if(index<0)manifest.assets.push(entry);else manifest.assets[index]=entry;
}
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({active:19,reserved:1,runtimeBytes:assets.filter(a=>a.runtime).reduce((s,a)=>s+a.bytes,0)}));
