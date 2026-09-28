import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {loadApi as loadBase} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
import {searchSpatial,loadSpatialApi} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
export const OUT='deliverables/campaign121-130-v146-20260924/round3-a';
export const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const save=(name,value)=>{fs.mkdirSync(OUT,{recursive:true});const p=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return p;};
export const base=read('deliverables/campaign121-130-v146-20260924/input-audit-1790434782575.json');
let seed=Number(process.env.SEED??17112401);
export const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
export const pick=a=>a[Math.floor(rand()*a.length)];
export const shuffle=a=>a.map(v=>[v,rand()]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
export const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
export const S=[[0,0]],H2=rect(2,1),H3=rect(3,1),V2=rect(1,2),V3=rect(1,3),L3=[[0,0],[0,1],[1,1]],L4=[[0,0],[1,0],[2,0],[0,1]],T4=[[1,0],[0,1],[1,1],[2,1]];
export async function apiLoad(){const a=await loadBase(),b=await build({stdin:{resolveDir:process.cwd(),contents:"export {matchingContinuousExitPortals,choosePortalReleaseCandidate} from './src/game/continuousDrag.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});return{...a.api,...await loadSpatialApi(),...await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'))};}
export function pack(area,blocks,fixed=[]){const legal=new Set(area.map(p=>p.join(','))),occ=new Map(),out=[];let visits=0;
 for(const b of fixed){for(const [dx,dy] of b.shape){const k=[b.x+dx,b.y+dy].join(',');if(!legal.has(k)||occ.has(k))return;occ.set(k,b);}out.push(b);}
 function go(left){if(++visits>Number(process.env.PACK_NODES??6000))return false;if(!left.length)return occ.size===legal.size;const p=area.find(p=>!occ.has(p.join(',')));if(!p)return false;
  for(const b of shuffle(left))for(const[dx,dy]of b.shape){const x=p[0]-dx,y=p[1]-dy,foot=b.shape.map(([a,c])=>[x+a,y+c]),keys=foot.map(p=>p.join(','));if(keys.some(k=>!legal.has(k)||occ.has(k)))continue;if(foot.some(([x,y])=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(p=>occ.get(p.join(','))?.color===b.color)))continue;
   const v={...b,x,y};for(const k of keys)occ.set(k,v);out.push(v);if(go(left.filter(a=>a!==b)))return true;out.pop();for(const k of keys)occ.delete(k);
  }return false;
 }return go(blocks)?out:undefined;
}
export function cleanBase(id,difficulty){const r=base.rows.find(r=>r.level.id===id),l=structuredClone(r.level);for(const k of ['blocks','gates','shutters','generators','flipDoors','coloredGrids','elevators','conveyors'])delete l[k];l.difficulty=difficulty;l.preservedMoveTarget=r.starTargets.moveTarget;return l;}
export function audit(level,api){api.validateLevel(level);const hard=api.auditRevisedCandidate(level);const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);const issues=hard.issues.filter(i=>!omit.has(i.code));assert.deepEqual(issues,[]);
 const opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden=auditHiddenCoverage(level),spans=auditGateSpanLimits(level),art=api.auditCandidateBlockArt(level),native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));for(const a of[opening,hidden,spans,art])assert(a.passed,JSON.stringify(a));assert(native.every(x=>x.match?.quarterTurns===0));const old=base.rows.find(r=>r.level.id===level.id);for(const k of ['width','height','playable','blocked','seams','name','timeSeconds','reward','parMoves'])assert.deepEqual(level[k],old.level[k],k);assert.deepEqual(api.levelStarTargets(level),old.starTargets);return{passed:true,opening,hidden,spans,art,native,levelSha256:digest(level)};
}
// Only deadlines are erased for search. All timed successful paths embed with
// the same costs in this larger spatial graph. Source candidate stays intact.
export function projection(level){const l=structuredClone(level);for(const b of l.blocks)delete b.timedBombSeconds;return l;}
export function replayBomb(level,drags,api,timed=true){const r={valid:false,complete:false,nonClearingDrags:0,effectiveDrags:0,clearEvents:0,naturalClockValidated:false,pointerValidated:false,simulatedTimeValidated:false};let seconds=0;
 try{assert([121,122,124].includes(level.id));api.validateLevel(level);const m=new api.PuzzleModel(level);m.startCountdown();const bombs=level.blocks.filter(b=>b.timedBombSeconds!==undefined).map(b=>({id:b.id,initial:b.timedBombSeconds}));const tick=t=>{if(timed){m.tick(t);seconds+=t;assert(!m.snapshot().failed,`Expired after ${seconds}s`);}};
  function auto(id,previous){const b=m.getBlock(id);if(!b||!m.isBlockActive(b))return;const s=m.possibleExitSides(b);if(!s.length)return;const snap=m.snapshot(),portals=api.matchingContinuousExitPortals(snap,b,s),[x,y]=b.shape[0],inferred=previous?(b.x<previous[0]?'left':b.x>previous[0]?'right':b.y<previous[1]?'top':b.y>previous[1]?'bottom':undefined):undefined;return api.choosePortalReleaseCandidate(portals,{x:b.x+x+.5,y:b.y+y+.5},{innerX:0,innerY:0,innerWidth:snap.width,innerHeight:snap.height,cell:1},inferred)?.portal.side;}
  for(const d of drags){tick(.75);tick(.08);const before=m.snapshot();m.beginAction();let side=auto(d.blockId);assert(!side||!d.path.length,'Down auto exit before moves');for(const[i,p]of d.path.entries()){const b=m.getBlock(d.blockId);assert(b);const prior=[b.x,b.y];assert.equal(Math.abs(p[0]-b.x)+Math.abs(p[1]-b.y),1);tick(.12);assert(m.moveBlockStep(b.id,...p));side=auto(b.id,prior);assert(!side||i===d.path.length-1);}assert.equal(side,d.exitSide);if(side)assert(m.tryExit(d.blockId,side).ok);assert(m.commitAction());const after=m.snapshot();assert(!after.failed);assert.equal(after.moves,before.moves+1);r.effectiveDrags++;r.clearEvents+=after.cleared-before.cleared;r.nonClearingDrags+=Number(after.cleared===before.cleared);for(const b of bombs)if(b.disarmedAt===undefined&&m.getBlock(b.id)?.timedBombSeconds===undefined)b.disarmedAt=seconds;tick(.08);}
  return{...r,valid:true,complete:m.snapshot().complete,simulatedTimeValidated:timed&&m.snapshot().complete,simulatedSeconds:seconds,bombs,levelSha256:digest(level),routeSha256:digest(drags)};
 }catch(e){return{...r,error:e.message,simulatedSeconds:seconds};}
}
export const source124=(()=>{
 const blocks=[],b=(x,y,shape,color,more={})=>blocks.push({id:`r171-124-${blocks.length+1}`,x,y,shape,color,...more});
 b(0,0,[[0,0],[0,1],[1,1]],'blue');b(1,0,[[0,0],[1,0],[1,1]],'green',{layers:['green','blue']});b(2,0,[[1,0],[1,1],[0,2],[1,2]],'orange',{layers:['orange','blue']});b(4,0,H2,'yellow',{timedBombSeconds:60});b(6,0,V2,'blue');b(4,1,S,'green');b(5,1,S,'yellow');b(0,2,H2,'red');b(4,2,S,'yellow');b(5,2,H2,'orange');b(0,3,V3,'orange');b(1,3,H2,'blue');b(3,3,S,'yellow');b(4,3,S,'purple');b(5,3,S,'yellow');b(6,3,S,'purple');b(1,4,[[0,0],[1,0],[1,1]],'green');b(3,4,S,'purple');b(4,4,S,'yellow');b(5,4,V2,'orange',{frozen:5});b(5,4,[[1,0],[1,1],[0,2],[1,2]],'yellow',{frozen:7});b(3,5,S,'yellow');b(4,5,S,'purple');b(0,5,T4,'red',{layers:['red','blue']});b(3,6,S,'purple');b(4,6,S,'yellow');
 return{source:'local-video-frame-review',frames:['sec-0197.jpg','sec-0200.jpg','sec-0215.jpg','sec-0220.jpg','sec-0225.jpg','sec-0250.jpg','sec-0270.jpg','sec-0280.jpg'].map(n=>`.codex-temp/video-audit-101-134/121-130/frames-1fps/${n}`),blocks,correction:'Reviewed 26 independent bodies / 49 occupied cells, 6 colors. Historical 23-body/44-cell histogram rejected. Bomb H2 plus separate yellow singleton below; ice5 orange V2, ice7 yellow L4.',gates:[{id:'r171-124-blue',color:'blue',side:'top',offset:1,size:3,frozen:18},{id:'r171-124-orange',color:'orange',side:'top',offset:5,size:2,frozen:14},{id:'r171-124-purple',color:'purple',side:'left',offset:0,size:1,frozen:24},{id:'r171-124-red',color:'red',side:'right',offset:4,size:3,frozen:12},{id:'r171-124-green',color:'green',side:'right',offset:0,size:2},{id:'r171-124-yellow',color:'yellow',side:'bottom',offset:3,size:2}]};
})();
export function make124(api,iteration){const l=cleanBase(124,'easy'),blocks=source124.blocks.map(b=>{const c=structuredClone(b);delete c.x;delete c.y;if(!api.matchFormalBlockShape(c.shape,'native-only'))c.shape=c.shape.length===3?L3:L4;return c;});
 // After the first full source-shape trials, iteratively alter shapes/colors;
 // mechanisms remain attached to the same identities and retain initial values.
 if(iteration>20){for(const b of blocks){if(b.shape.length===3)b.shape=pick([L3,H3,V3]);if(b.shape.length===4)b.shape=pick([rect(2,2),rect(2,2),L4,T4]);if(!b.layers&&b.timedBombSeconds===undefined)b.color=pick(['yellow','yellow','yellow','green','green','red','orange','blue','purple']);}}
 l.blocks=pack(l.playable,blocks);if(!l.blocks)return;l.gates=structuredClone(source124.gates);if(iteration>8){for(const g of l.gates){if(g.size<3&&rand()<.8)g.size=3;}l.gates[0].offset=0;l.gates[1].offset=4;l.gates[3].offset=4;l.gates[4].offset=0;l.gates[5].offset=pick([0,1,2,3,4]);l.gates[2].offset=pick([0,1,2,3,4]);}return l;
}
async function main(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));const api=await apiLoad(),start=Date.now(),duration=Number(process.argv[3]??120000),id=Number(process.argv[2]??124);assert.equal(id,124);const source={...source124,hashes:Object.fromEntries(source124.frames.map(p=>[p,digest(fs.readFileSync(p))]))};const sourceFile=save('source124-reviewed',source);let tries=0,valid=0,best=0,witnesses=0;const rejected={},attempts=[];
 while(Date.now()-start<duration){tries++;const initialSeed=seed,l=make124(api,tries);if(!l)continue;let a;try{a=audit(l,api);}catch(e){const k=e.message.slice(0,160);rejected[k]=(rejected[k]??0)+1;continue;}valid++;const p=projection(l),r=searchSpatial(p,api,{floor:16,maxStates:80000,maxMilliseconds:Number(process.env.SEARCH_MS??500),maxTransitions:2000000,weight:1000,normalize:true,diagnosticTrace:true,orderSeed:tries});attempts.push({try:tries,seed:initialSeed,hash:digest(l),projectedHash:digest(p),status:r.status,clears:r.maxClearsSeen,cost:r.cost,elapsed:r.elapsedMilliseconds,budgetMs:Number(process.env.SEARCH_MS??500)});
  if(r.maxClearsSeen>best){best=r.maxClearsSeen;const file=save('partial124',{ruleVersion:lock.activeVersion,sourceFile,seed:initialSeed,iteration:tries,level:l,audit:a,result:r});console.log(JSON.stringify({file,tries,valid,best,elapsed:Date.now()-start}));}
  if(r.status!=='witness')continue;const replay=replayBomb(l,r.drags,api,true);if(!replay.valid||!replay.complete){rejected['replay '+replay.error]=(rejected['replay '+replay.error]??0)+1;continue;}witnesses++;const proof=checkSymmetryFloor(p,{floor:5,maxStates:500000,maxMilliseconds:15000});const file=save('candidate124',{ruleVersion:lock.activeVersion,sourceFile,seed:initialSeed,iteration:tries,level:l,levelSha256:digest(l),audit:a,drags:r.drags,replay,proof:{...proof,deadlineErasure:{sourceLevelSha256:digest(l),projectedLevelSha256:digest(p),removed:l.blocks.filter(b=>b.timedBombSeconds).map(b=>({id:b.id,seconds:b.timedBombSeconds}))}},result:r,adaptations:l.blocks.map(b=>({id:b.id,source:source124.blocks.find(s=>s.id===b.id),authored:b})),formalAdopted:false,pointerValidated:false});console.log(JSON.stringify({file,U:replay.nonClearingDrags,proof:proof.status,tries,valid}));if(proof.thresholdProven&&replay.nonClearingDrags<=10)break;
 }
 console.log(JSON.stringify({file:save('search124-log',{ruleVersion:lock.activeVersion,sourceFile,tries,valid,witnesses,best,rejected,attempts,elapsed:Date.now()-start}),tries,valid,witnesses,best,rejected}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
