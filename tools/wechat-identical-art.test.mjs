import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdir, mkdtemp, writeFile, rm, access, symlink} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {createIdenticalArtPlan, validateArtAliasPairs, rewriteIdenticalArtSource,
  deduplicatedArtSnapshot, removeGeneratedArtAliases} from '../scripts/wechat-identical-art.mjs';

const root = process.cwd(), prefix = 'assets/art/ui/formal-pages/';
const one = {rows:[{from:'page/a.png',to:'page/b.png'}]};
test('current six aliases have identical source bytes and only manifest URL references', async()=>{
  const plan = await createIdenticalArtPlan(root);
  assert.equal(plan.rows.length,6);
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
  const source='const a="'+prefix+'page/a.png",b="'+prefix+'page/b.png";';
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
  await assert.rejects(removeGeneratedArtAliases(root,dir,{rows:[{from:'link/a.png',to:'page/b.png'}]}),/Symlinked/);
  await access(resolve(page,'a.png'));await access(resolve(page,'b.png'));
}));
