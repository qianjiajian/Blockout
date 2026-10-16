import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadSpatialApi,searchSpatial} from './continuation211-colored-witness.mjs';
import {staticDelayedLiftFloor} from './regeneration211-design/native-static-lift214.mjs';
import {loadContinuationRuntime} from './continuation211-runtime.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
assert(verifyRulesLock().ok);
const out='deliverables/league-full-20261001';await mkdir(`${out}/levels`,{recursive:true});
const source=JSON.parse(await readFile('deliverables/league-step4-20261001/test-level-proof.json','utf8'));
const api=await loadSpatialApi(),core=await loadContinuationRuntime(),accepted=[],seen=new Set(),failures=[];
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function adjacent(bs){return bs.some((a,i)=>bs.slice(i+1).some(b=>a.color===b.color&&a.shape.some(([x,y])=>b.shape.some(([dx,dy])=>Math.abs(a.x+x-b.x-dx)+Math.abs(a.y+y-b.y-dy)===1))));}
function gameplayKey(l){return digest({width:l.width,height:l.height,playable:l.playable,gates:l.gates.map(({id,...g})=>g),blocks:l.blocks.map(({id,...b})=>b).sort((a,b)=>a.y-b.y||a.x-b.x),shutters:l.shutters,coloredGrids:l.coloredGrids});}
let seed=20261001;function rand(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/4294967296*n);}
for(const file of (await readdir(`${out}/levels`)).filter(f=>/^\d{3}\.json$/.test(f)).sort()){
 const p=JSON.parse(await readFile(`${out}/levels/${file}`,'utf8'));
 assert.equal(p.status,'PASS');assert.equal(digest(p.level),p.levelSha256);
 accepted.push({index:p.index,level:p.level,specials:p.specials,levelSha256:p.levelSha256,gameplayKey:p.gameplayKey,packing:p.packing});seen.add(p.gameplayKey);
}
seed+=accepted.length*137;
const names=['交错登顶','升降竞逐','横向突围','冰门调度','色格穿行','错位赛场','奖杯追逐','双层突破','边界冲刺','纵横接力'];
for(let attempt=0;attempt<10000&&accepted.length<100;attempt++){
 const base=accepted.length?accepted[rand(accepted.length)]:undefined;
 const level=structuredClone(base?.level??source.level),top=level.blocks.filter(b=>b.id.startsWith('wide-top'));
 // Permute actual opening bodies between distinct slots. This changes local
 // adjacency and exit routes, rather than a global palette or score-only skin.
 for(let k=0;k<1+rand(2);k++){const a=top[rand(8)],b=top[rand(8)];[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}
 // Alternate independent 3x3 packings of three vertical / horizontal native
 // rectangles. Both geometry and gate aperture change in these candidates.
 const packing=base?.packing??attempt%2;
 if(!base&&packing){const x=0;const bs=level.blocks.filter(b=>b.id.startsWith('wide-lower-')&&b.x>=x&&b.x<x+3).sort((a,b)=>a.x-b.x);
  bs.forEach((b,j)=>{b.x=x;b.y=6+j;b.shape=[[0,0],[1,0],[2,0]];});
  level.gates.find(g=>g.color==='orange').size=3;
  level.gates.find(g=>g.color==='blue').size=3;
 }
 if(adjacent(level.blocks.filter(b=>!b.shutterId)))continue;
 const key=gameplayKey(level);if(seen.has(key))continue;seen.add(key);
 const index=accepted.length+1;level.id=900000+index;level.name=`联赛${index}·${names[(index-1)%10]}`;
 const lower=staticDelayedLiftFloor(level,api,{floor:16,maxMilliseconds:1500,maxStates:1000000});
 if(!lower.thresholdProven){failures.push({attempt,packing,key,stage:'lower',status:lower.status});continue;}
 const witness=searchSpatial(level,api,{floor:21,maxMilliseconds:1200,maxStates:150000,normalize:true});
 if(witness.status!=='witness'){failures.push({attempt,packing,key,stage:'witness',status:witness.status});continue;}
 const replay=core.replayRevisedRoute(level,witness.drags);
 if(!replay.valid||!replay.complete||replay.nonClearingDrags>20){failures.push({attempt,packing,key,stage:'strict-replay',replay});continue;}
 if(core.auditRevisedMechanismContract(level).length)continue;
 if(level.blocks.some(b=>core.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns!==0))continue;
 level.parMoves=replay.effectiveDrags;level.preservedMoveTarget=replay.effectiveDrags;
 const specials=level.blocks.filter((b,j)=>b.shutterId||b.movementAxis||j%3===index%3).map(b=>b.id);
 const proof={status:'PASS',index,packing,levelSha256:digest(level),gameplayKey:key,level,specials,drags:witness.drags,replay,lower:{...lower,levelSha256:undefined},reference:{id:217,scope:'Project-authored board architecture reused; real local opening rearrangements and alternate native rectangle packings/gate apertures; not claimed 100 novel board outlines or exact competitor levels'}};
 // Score targets are metadata: prove the final same object again after setting
 // these fields, rather than attaching an earlier hash to the shipped object.
 proof.lower=staticDelayedLiftFloor(level,api,{floor:16,maxMilliseconds:1800,maxStates:1000000});assert(proof.lower.thresholdProven);
 await writeFile(`${out}/levels/${String(index).padStart(3,'0')}.json`,JSON.stringify(proof,null,2));
 accepted.push({index,level,specials,levelSha256:proof.levelSha256,gameplayKey:key,packing});
 console.log(JSON.stringify({accepted:index,attempt,packing,L:16,U:replay.nonClearingDrags,drags:replay.effectiveDrags}));
}
await writeFile(`${out}/generation-failures.json`,JSON.stringify(failures,null,2));
await writeFile(`${out}/catalog.json`,JSON.stringify({status:accepted.length===100?'PASS':'INCOMPLETE',count:accepted.length,accepted},null,2));
assert.equal(accepted.length,100,'Do not ship placeholders');
await writeFile('src/core/leagueLevelData.ts',`import type {LevelSpec} from './types';\nexport interface LeagueLevelEntry {index:number;level:LevelSpec;specials:readonly string[];levelSha256:string;gameplayKey:string;packing:number}\n// Independent league data. Reuses disclosed project-original architecture 217,\n// with distinct spatial arrangements / packings, never campaign progress.\nexport const LEAGUE_LEVELS:readonly LeagueLevelEntry[]=${JSON.stringify(accepted)};\n`);
console.log('PASS 100 independent league layouts');
