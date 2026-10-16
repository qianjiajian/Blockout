import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdir, mkdtemp, writeFile, rm, access, symlink} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {createIdenticalArtPlan, validateArtAliasPairs, rewriteIdenticalArtSource,
  deduplicatedArtSnapshot, removeGeneratedArtAliases, generatedArtAliasPath, assertOriginalArtPixelsMatch} from '../scripts/wechat-identical-art.mjs';
import sharp from 'sharp';

const root = process.cwd(), prefix = 'assets/';
const formal = 'art/ui/formal-pages/';
const one = {rows:[{from:formal+'page/a.png',to:formal+'page/b.png'}]};
test('eighteen aliases preserve exact source RGBA and only rewrite manifest URL references', async()=>{
  const plan = await createIdenticalArtPlan(root);
  assert.equal(plan.rows.length,18);
  assert.equal(plan.schemaVersion,2);
  assert(plan.rows.every(row=>row.rgbaSha256.length===64&&row.width>0&&row.height>0));
  const differentEncoding=plan.rows.find(row=>row.from.endsWith('journey/presentation-close.png'));
  assert.equal(differentEncoding.originalBytesEqual,false);
  assert.notEqual(differentEncoding.sourceSha256,differentEncoding.targetSourceSha256);
  const original = await readFile('src/game/artManifest.ts','utf8');
  const rewritten = rewriteIdenticalArtSource(original,plan);
  for(const {from,to}of plan.rows){assert(!rewritten.includes(prefix+from));assert(rewritten.includes(prefix+to));}
  assert(original.includes('overlays/win/coin-pile.png'),'Web remains unchanged');
});
test('rejects unsafe, duplicate, self and chained aliases',()=>{
  for(const pairs of [[['../x.png','a.png']],[['/x.png','a.png']],[['x\\a.png','a.png']],
    [['a.png','a.png']],[['a.png','b.png'],['a.png','c.png']],[['a.png','b.png'],['b.png','c.png']],
    [['a.png','b.png'],['b.png','a.png']]]) assert.throws(()=>validateArtAliasPairs(pairs));
});
test('unknown or nonliteral runtime reference does not silently disappear',()=>{
  assert.throws(()=>rewriteIdenticalArtSource('const p="other.png"',one),/Missing literal/);
  const source='const a="'+prefix+formal+'page/a.png",b="'+prefix+formal+'page/b.png";';
  assert.equal(rewriteIdenticalArtSource(source,one),source.replace('page/a.png','page/b.png'));
});
test('native snapshot cannot omit changed, missing or non-identical images',()=>{
  const rows=[{path:'page/a.png',bytes:12,sha256:'equal'},{path:'page/b.png',bytes:12,sha256:'equal'},{path:'other.png',bytes:4,sha256:'other'}];
  assert.deepEqual(deduplicatedArtSnapshot(rows,one),rows.slice(1));
  for(const change of [{bytes:13},{sha256:'changed'}]) assert.throws(()=>deduplicatedArtSnapshot([{...rows[0],...change},...rows.slice(1)],one),/mismatch/);
  assert.throws(()=>deduplicatedArtSnapshot(rows.slice(1),one),/mismatch/);
});
async function fixture(fn){
  const dir=await mkdtemp(resolve(root,'.codex-temp/wechat-art-alias-test-'));
  assert(relative(root,dir).replaceAll('\\','/').startsWith('.codex-temp/wechat-art-alias-test-'));
  try{const page=resolve(dir,'meta-ui/formal-pages/page');await mkdir(page,{recursive:true});await writeFile(resolve(page,'a.png'),'same');await writeFile(resolve(page,'b.png'),'same');await fn(dir,page);}
  finally{await rm(dir,{recursive:true,force:true});}
}
test('removes only an exact generated duplicate; keeps canonical and refuses authored root',async()=>fixture(async(dir,page)=>{
  await assert.rejects(removeGeneratedArtAliases(root,root,one),/Unsafe/);
  await removeGeneratedArtAliases(root,dir,one);
  await assert.rejects(access(resolve(page,'a.png')));assert.equal(await readFile(resolve(page,'b.png'),'utf8'),'same');
}));
test('native byte drift refuses all deletion',async()=>fixture(async(dir,page)=>{
  await writeFile(resolve(page,'a.png'),'different');await assert.rejects(removeGeneratedArtAliases(root,dir,one),/bytes differ/);
  await access(resolve(page,'a.png'));await access(resolve(page,'b.png'));
}));
test('symlink/junction aliases cannot delete canonical files',async()=>fixture(async(dir,page)=>{
  // Directory junctions do not require Windows symlink elevation.
  const linked=resolve(dir,'meta-ui/formal-pages/link');
  await symlink(page,linked,process.platform==='win32'?'junction':'dir');
  await assert.rejects(removeGeneratedArtAliases(root,dir,{rows:[{from:formal+'link/a.png',to:formal+'page/b.png'}]}),/Symlinked/);
  await access(resolve(page,'a.png'));await access(resolve(page,'b.png'));
}));

test('source encoding may differ but one changed pixel or dimension rejects the alias',async()=>{
  const pixels=Buffer.from([255,0,0,255,0,255,0,255]);
  const a=await sharp(pixels,{raw:{width:2,height:1,channels:4}}).png({compressionLevel:0}).toBuffer();
  const b=await sharp(pixels,{raw:{width:2,height:1,channels:4}}).png({compressionLevel:9}).toBuffer();
  assert(!a.equals(b));
  await assertOriginalArtPixelsMatch(a,b,'same pixels');
  const changed=Buffer.from(pixels);changed[0]=254;
  const c=await sharp(changed,{raw:{width:2,height:1,channels:4}}).png().toBuffer();
  await assert.rejects(assertOriginalArtPixelsMatch(a,c,'changed'),/pixels differ/);
  const resized=await sharp(a).resize(1,2).png().toBuffer();
  await assert.rejects(assertOriginalArtPixelsMatch(a,resized,'size'),/pixels differ/);
});

test('cross-package paths resolve through the existing native host package families',()=>{
  assert.equal(generatedArtAliasPath('art/ui/home-v3/top-header.png'),'assets/art/ui/home-v3/top-header.png');
  assert.equal(generatedArtAliasPath('art/ui/league-supplied-v1/top-header.png'),'league-ui/league-supplied-v1/top-header.png');
  assert.equal(generatedArtAliasPath(formal+'collection/top-header.png'),'meta-ui/formal-pages/collection/top-header.png');
  const plan={rows:[{from:'art/ui/home-v3/top-header.png',to:formal+'collection/top-header.png'}]};
  const rows=plan.rows.flatMap(({from,to})=>[{path:from,bytes:12,sha256:'equal'},{path:to,bytes:12,sha256:'equal'}]);
  assert.deepEqual(deduplicatedArtSnapshot(rows,plan,''),[rows[1]]);
  assert.throws(()=>deduplicatedArtSnapshot([{...rows[0],sha256:'different'},rows[1]],plan,''),/mismatch/);
});

test('cross-package deletion waits until every generated pair is checked',async()=>fixture(async(dir,page)=>{
  const main=resolve(dir,'assets/art/ui/home-v3');await mkdir(main,{recursive:true});
  await writeFile(resolve(main,'top-header.png'),'same');
  const cross={from:'art/ui/home-v3/top-header.png',to:formal+'page/b.png'};
  const plan={rows:[cross,...one.rows]};
  await writeFile(resolve(page,'a.png'),'different');
  await assert.rejects(removeGeneratedArtAliases(root,dir,plan),/bytes differ/);
  await access(resolve(main,'top-header.png'));
  await writeFile(resolve(page,'a.png'),'same');
  await removeGeneratedArtAliases(root,dir,plan);
  await assert.rejects(access(resolve(main,'top-header.png')));
  await assert.rejects(access(resolve(page,'a.png')));
  assert.equal(await readFile(resolve(page,'b.png'),'utf8'),'same');
}));
