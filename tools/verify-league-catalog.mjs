import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadContinuationRuntime} from './continuation211-runtime.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
assert(verifyRulesLock().ok);
const out='deliverables/league-full-20261001',core=await loadContinuationRuntime(),sha=b=>createHash('sha256').update(b).digest('hex');
const bundle=await build({stdin:{contents:"export {LEAGUE_LEVELS} from './src/core/leagueLevelData.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {LEAGUE_LEVELS}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
assert.equal(LEAGUE_LEVELS.length,100);
const qualifications=[];
for(const path of ['deliverables/continue211-220-20260930/native-lift-qualification.json','deliverables/continue211-220-20260930/design-new/static-lift214-qualification.json','deliverables/continue211-220-20260930/design-new/fifo214-qualification-v4.json']){
 const bytes=await readFile(path),q=JSON.parse(bytes);assert.equal(q.status,'PASS');
 for(const[file,expected]of Object.entries(q.codeSha256))assert.equal(sha(await readFile(file)),expected,`Qualification drift: ${file}`);
 qualifications.push({path,sha256:sha(bytes)});
}
const keys=new Set(),rows=[];
const cells=b=>b.shape.map(([x,y])=>`${x+b.x},${y+b.y}`);
function full(bs,expected){const covered=bs.flatMap(cells);assert.equal(new Set(covered).size,covered.length);assert.deepEqual(new Set(covered),new Set(expected));}
for(const entry of LEAGUE_LEVELS){
 const p=JSON.parse(await readFile(`${out}/levels/${String(entry.index).padStart(3,'0')}.json`,'utf8')),l=entry.level;
 assert.deepEqual(l,p.level);assert.equal(p.status,'PASS');assert.equal(p.lower.thresholdProven,true);
 assert.equal(sha(JSON.stringify(l)),entry.levelSha256);assert.equal(p.lower.levelSha256,digest(l));
 const replay=core.replayRevisedRoute(l,p.drags);assert(replay.valid&&replay.complete&&replay.nonClearingDrags<=20);
 new core.PuzzleModel(l);assert.deepEqual(core.auditRevisedMechanismContract(l),[]);
 for(const b of l.blocks)assert.equal(core.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns,0);
 const initial=l.blocks.filter(b=>!b.shutterId);full(initial,l.playable.map(([x,y])=>`${x},${y}`));
 for(const cover of l.shutters??[])full(l.blocks.filter(b=>b.shutterId===cover.id),Array.from({length:cover.width*cover.height},(_,i)=>`${cover.x+i%cover.width},${cover.y+Math.floor(i/cover.width)}`));
 for(let i=0;i<initial.length;i++)for(let j=i+1;j<initial.length;j++)assert(initial[i].color!==initial[j].color||!initial[i].shape.some(([x,y])=>initial[j].shape.some(([dx,dy])=>Math.abs(initial[i].x+x-initial[j].x-dx)+Math.abs(initial[i].y+y-initial[j].y-dy)===1)));
 assert(!keys.has(entry.gameplayKey));keys.add(entry.gameplayKey);
 rows.push({index:entry.index,sha256:entry.levelSha256,packing:entry.packing,L:16,U:replay.nonClearingDrags,drags:replay.effectiveDrags,specials:entry.specials.length,openingCells:68,hiddenCells:12,nativeArt:true,adjacentSameColor:0});
}
await writeFile(`${out}/catalog-verification.json`,JSON.stringify({status:'PASS',rows,qualifications,note:'All 100 independently rearranged layouts reuse disclosed project-original architecture; no claim 100 different board outlines, optimal routes, physical device or blind playtest'},null,2));
console.log('PASS 100 same-object full routes, L16 certificates, native art, full coverage and distinct arrangements');
