import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bind=p=>({path:p,sha256:sha(p)});
const root='deliverables/daily-formal-v4-20261008',planPath=`${root}/design/remaining-capacity-plan-01/report.json`,prior=read(planPath),runtime=await loadV4CatalogRuntime();
assert.equal(prior.unallocated.length,7);
const selected=read(prior.selectedIndex.path).files.map(f=>read(f));
const proposed=prior.plans.map(p=>({...p,level:read(p.basePath).level})),rows=[];
const fileFor=p=>p.startsWith('/')?`public${p}`:`public/${p}`;
const asset=(b,color,kind='solid')=>{const m=runtime.matchFormalBlockShape(b.shape,'native-only');if(m?.quarterTurns!==0)return null;const p=runtime.GAME_ART.gameplay.formalBlocks[color]?.[kind]?.[m.shapeId];return p&&fs.existsSync(fileFor(p))?bind(fileFor(p)):null;};
const fits=(b,g)=>g.size>=1+Math.max(...b.shape.map(p=>p[['top','bottom'].includes(g.side)?0:1]));
const atExit=(b,g,l)=>{const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1])),horizontal=['top','bottom'].includes(g.side),offset=horizontal?b.x:b.y,span=horizontal?w:h;
 return offset>=g.offset&&offset+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+h===l.height:g.side==='left'?b.x===0:b.x+w===l.width);};
for(const u of prior.unallocated){
 const b=read(u.path),original=prior.rows.find(r=>r.path===u.path);assert.equal(sha(u.path),original.fileSha256);assert.equal(levelSha256(b.level),original.levelSha256);assert.equal(routeSha256(b.drags),original.routeSha256);
 const model=new runtime.PuzzleModel(b.level);model.startCountdown();const body=new Map(b.level.blocks.map(x=>[x.id,{block:x,firstDrag:null,clearBeforeFirst:null,exitDrag:null,clearBeforeExit:null,unitSteps:0}])),exits=[],trace=[];let U=0,elapsed=0;
 for(const [i,d]of b.drags.entries()){
  const before=model.snapshot(),info=body.get(d.blockId),piece=model.getBlock(d.blockId);if(info.firstDrag===null){info.firstDrag=i+1;info.clearBeforeFirst=before.cleared;}
  info.unitSteps+=d.path.length;elapsed+=.4+.25*d.path.length+(d.exitSide?.4:0);
  const pose=d.path.length?{...piece,x:d.path.at(-1)[0],y:d.path.at(-1)[1]}:piece;
  applyNativeDrag(model,d);const after=model.snapshot();U+=Number(after.cleared===before.cleared);
  if(d.exitSide){info.exitDrag=i+1;info.clearBeforeExit=before.cleared;info.exitPose={x:pose.x,y:pose.y};info.controlledExitTime=elapsed;
   exits.push({blockId:d.blockId,color:info.block.color,drag:i+1,clearedBefore:before.cleared,side:d.exitSide,controlledExitTime:elapsed});}
  trace.push({drag:i+1,clearDelta:after.cleared-before.cleared});
 }
 assert(model.snapshot().complete);assert.equal(U,original.actualReplay.U);
 const infos=[...body.values()],keys=infos.toSorted((a,b)=>a.exitDrag-b.exitDrag).slice(0,3),keyIds=new Set(keys.map(k=>k.block.id));
 const locks=infos.filter(x=>!keyIds.has(x.block.id)&&keys.filter(k=>k.exitDrag<x.firstDrag).length>=2).map(x=>({bodyId:x.block.id,firstDrag:x.firstDrag,keysClearedBeforeFirst:keys.filter(k=>k.exitDrag<x.firstDrag).length}));
 const shells=infos.filter(x=>asset(x.block,x.block.color,'shell')).map(x=>({bodyId:x.block.id,exitDrag:x.exitDrag,clearedBeforeExit:x.clearBeforeExit,
  outerShellAsset:asset(x.block,x.block.color,'shell'),innerOptions:b.level.gates.filter(g=>g.color!==x.block.color&&fits(x.block,g)&&asset(x.block,g.color)).map(g=>({color:g.color,gateId:g.id,side:g.side,
   sameOuterExitPoseCouldClear:atExit({...x.block,...x.exitPose},g,b.level),asset:asset(x.block,g.color)}))})).filter(x=>x.innerOptions.length).sort((a,b)=>b.exitDrag-a.exitDrag);
 const stars=[...new Map(infos.filter(x=>x.unitSteps>0).map(x=>[x.block.color,{bodyId:x.block.id,color:x.block.color,unitSteps:x.unitSteps,exitDrag:x.exitDrag,
  gateId:b.level.gates.find(g=>g.color===x.block.color)?.id}])).values()];
 const flips=b.level.gates.map(g=>{const uses=exits.filter(x=>x.color===g.color),parities=[...new Set(uses.map(x=>x.clearedBefore%2))];return{gateId:g.id,color:g.color,allBaseExits:uses,parities,
  phaseCompatible:parities.length===1,initiallyOpen:parities.length===1?parities[0]===0:null};});
 const bombs=infos.toSorted((a,b)=>a.exitDrag-b.exitDrag).map(x=>({bodyId:x.block.id,exitDrag:x.exitDrag,controlledExitTime:x.controlledExitTime,
  proposedSeconds:Math.max(15,Math.ceil(x.controlledExitTime+5))})).filter(x=>x.proposedSeconds<b.level.timeSeconds);
 const options=[{mechanism:'multilayer-shell',count:shells.length,staticCompatible:shells.length>=2,details:shells,
  caveat:'New inner layers require a complete actual route; base U has only the recorded slack and none of these shell objects has been constructed.'},
 {mechanism:'key-lock',count:locks.length,staticCompatible:locks.length>=2,keys:keys.map(k=>({id:k.block.id,exitDrag:k.exitDrag})),details:locks,
  currentDefaultAdapterHasStaggeredCounts:new Set(locks.map(x=>x.keysClearedBeforeFirst)).size>=2,
  caveat:'Two locks with counts 2 and 3 are feasible only where the selected lock first actions follow enough real keys; identical default counts need an explicit staggered design before any claim.'},
 {mechanism:'star',count:stars.length,staticCompatible:stars.length>=2,details:stars,caveat:'Pair each actual star body with its existing same-colour portal; no numeric count is invented.'},
 {mechanism:'bomb',count:bombs.length,staticCompatible:bombs.length>=2,details:bombs,
  scheduleAssumption:{secondsPerDrag:.4,secondsPerUnitStep:.25,secondsPerExitAnimation:.4},caveat:'Arithmetic schedule only, not a timed model replay or natural Pointer clock. Longer seconds relax the deadline and do not prove increased difficulty.'},
 {mechanism:'flip-door',count:flips.filter(x=>x.phaseCompatible).length,staticCompatible:flips.filter(x=>x.phaseCompatible).length>=2,details:flips,
  caveat:'Parity compatibility is a static screen; deferred exit animations, all phase changes and the final full route still require actual construction and replay.'}];
 const slotOptions=options.map(o=>({...o,emptySlots:runtime.slots.filter(s=>s.difficulty===1&&s.newestMechanism===o.mechanism&&!selected.some(r=>r.formalId===s.formalId))
  .filter(s=>[...selected,...proposed].every(r=>compareLayouts(b.level,r.level).footprintSimilarity<=(r.stageKey===s.stageKey&&r.difficulty===s.difficulty?.65:.75)))
  .map(s=>({formalId:s.formalId,oldLatestInstances:runtime.priorDailySlots.get(s.formalId).inventory[o.mechanism].length}))}));
 rows.push({base:bind(u.path),source:u.source,difficulty:1,levelSha256:original.levelSha256,routeSha256:original.routeSha256,roots:original.roots,
  existingRoute:{complete:true,U,totalDrags:b.drags.length,D1AdditionalNonClearingSlack:20-U},options:slotOptions,
  preferredDirection:slotOptions.find(o=>o.mechanism==='key-lock'&&o.staticCompatible&&o.currentDefaultAdapterHasStaggeredCounts&&o.emptySlots.length)?.mechanism
   ??slotOptions.find(o=>o.mechanism==='flip-door'&&o.staticCompatible&&o.emptySlots.length)?.mechanism??'star'});
}
const output=`${root}/design/seven-noncapacity-readonly-01.json`;
fs.writeFileSync(output,JSON.stringify({status:'STATIC_DIRECTIONS_ONLY_NO_CANDIDATES',sourcePlan:bind(planPath),selectedIndex:prior.selectedIndex,
 excludedAllTwentyFiveAssignedBases:true,rows,constructionCalls:0,ledgerClaims:0,proofSearches:0,heldSearches:0,providedOriginalRouteReplays:7,
 slotAssignmentsFrozen:false,finalSelectionRecheckRequired:true,formalReady:false,tool:bind('tools/daily-challenge/formal-v4/diagnose-seven-noncapacity.mjs')},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,rows:rows.map(r=>({source:r.source,path:r.base.path,U:r.existingRoute.U,preferred:r.preferredDirection,compatible:r.options.filter(o=>o.staticCompatible).map(o=>({m:o.mechanism,n:o.count,stagger:o.currentDefaultAdapterHasStaggeredCounts,slots:o.emptySlots.length}))}))}));
