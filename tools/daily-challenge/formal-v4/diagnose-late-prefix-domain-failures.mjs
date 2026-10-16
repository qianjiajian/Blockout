import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

// Derive the single recorded seed's static portal choices only. No constructor,
// colour DFS, alternative seed/portal branch, PuzzleModel, or solver is called.
const SELF='tools/daily-challenge/formal-v4/diagnose-late-prefix-domain-failures.mjs';
const DIR='deliverables/daily-formal-v4-20261008/design/late-prefix-newstock8-construct-01';
const hash=b=>createHash('sha256').update(b).digest('hex'),bindings={};
const read=async(p,h)=>{const b=await fs.readFile(p);if(h)assert.equal(hash(b),h);bindings[p]=hash(b);return JSON.parse(b);};
const random=seed=>()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
const shuffle=(xs,r)=>xs.map(x=>({x,n:r()})).sort((a,b)=>a.n-b.n).map(x=>x.x);
const dimensions=b=>({w:1+Math.max(...b.shape.map(p=>p[0])),h:1+Math.max(...b.shape.map(p=>p[1]))});
const overlap=(a,b)=>a.side===b.side&&Math.max(a.offset,b.offset)<Math.min(a.offset+a.size,b.offset+b.size);
function atExit(b,g,l){const{w,h}=dimensions(b),vertical=['left','right'].includes(g.side),offset=vertical?b.y:b.x,span=vertical?h:w;
 return offset>=g.offset&&offset+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+h===l.height:g.side==='left'?b.x===0:b.x+w===l.width);}
function apertures(l){const result=[];for(const side of ['top','right','bottom','left']){const length=['top','bottom'].includes(side)?l.width:l.height;
 for(let size=1;size<=3;size++)for(let offset=0;offset+size<=length;offset++)result.push({side,offset,size});}return result;}
function mapping(bp){const positions=new Map(bp.level.blocks.map(b=>[b.id,[b.x,b.y]])),parkingPoses={},openingColours={},gates=new Map();
 for(const d of bp.prefixDrags){const b=bp.level.blocks.find(x=>x.id===d.blockId);if(d.exitSide){openingColours[b.id]=b.color;const g=bp.level.gates.find(x=>x.color===b.color&&x.side===d.exitSide);assert(g);gates.set(g.id,g);}
  else{parkingPoses[b.id]??=[];parkingPoses[b.id].push(positions.get(b.id),...d.path);}if(d.path.length)positions.set(b.id,d.path.at(-1));}
 return{parkingPoses,openingColours,preservedGates:[...gates.values()],fixedBodyColours:Object.fromEntries(bp.fixedBlocks.map(b=>[b.id,b.color])),
  forbiddenBodyColours:{[bp.changedBodies[0].id]:[bp.changedBodies[0].color]}};}
function recordedGates(level,map,seed,runtime){
 const r=random(seed),colors=shuffle(Object.keys(runtime.GAME_ART.gameplay.formalBlocks),r).slice(0,8),rim=shuffle(apertures(level),r);
 const gates=structuredClone(map.preservedGates),occupied=new Set(gates.flatMap(g=>Array.from({length:g.size},(_,i)=>`${g.side}:${g.offset+i}`)));
 shuffle(['top','right','bottom','left'],r).slice(0,0); // The frozen helper consumes these four RNG values even with no reserved berth.
 shuffle(Array.from({length:colors.length},(_,i)=>i<3),r); // Its unused balanced-profile primary-exit mask also consumes RNG.
 for(const color of colors){if(gates.some(g=>g.color===color))continue;
  const choices=rim.filter(g=>Array.from({length:g.size},(_,i)=>`${g.side}:${g.offset+i}`).every(k=>!occupied.has(k)));
  const choice=choices.map(g=>({g,score:r()+(g.size===1?.4:g.size===2?-.4:-.1)})).sort((a,b)=>a.score-b.score)[0]?.g;assert(choice);
  gates.push({id:`v3-g-${color}`,color,...choice});for(let i=0;i<choice.size;i++)occupied.add(`${choice.side}:${choice.offset+i}`);
 }return gates;
}
function gateReasons(b,g,l,map,runtime){
 const reasons=[],{w,h}=dimensions(b),span=['top','bottom'].includes(g.side)?w:h;
 const art=runtime.matchFormalBlockShape(b.shape,'native-only');if(!runtime.GAME_ART.gameplay.formalBlocks[g.color]?.solid?.[art?.shapeId])reasons.push('missing-native-color-art');
 if(span>g.size)reasons.push(`cross-section-${span}-exceeds-mouth-${g.size}`);
 if(map.fixedBodyColours[b.id]&&map.fixedBodyColours[b.id]!==g.color)reasons.push(`fixed-color-${map.fixedBodyColours[b.id]}`);
 if(map.openingColours[b.id]&&map.openingColours[b.id]!==g.color)reasons.push(`prefix-clear-color-${map.openingColours[b.id]}`);
 if((map.forbiddenBodyColours[b.id]??[]).includes(g.color))reasons.push('first-retiled-body-must-change-color');
 const parking=(map.parkingPoses[b.id]??[]).filter(([x,y])=>atExit({...b,x,y},g,l));if(parking.length)reasons.push('prefix-parking-would-auto-clear');
 if(!map.openingColours[b.id]&&!map.fixedBodyColours[b.id]&&atExit(b,g,l))reasons.push('unintended-opening-auto-clear');
 return{reasons,parkingConflictPoses:parking};
}

const runtime=await loadV4Runtime(),environment=prefixExecutionEnvironment(runtime);
const index=await read(`${DIR}/index.json`),plan=await read(index.plan.path,index.plan.sha256),rows=[];
for(const file of [SELF,'tools/daily-challenge/formal-v4/late-prefix-colouring.mjs','tools/daily-challenge/formal-v4/late-region-factory.mjs',
 'tools/daily-challenge/formal-v3/diversity-layout-factory.mjs','src/game/artManifest.ts','src/game/formalBlockShapes.ts']){
 const b=await fs.readFile(file);bindings[file]=hash(b);if(plan.bindings[file])assert.equal(hash(b),plan.bindings[file]);}
for(const a of index.attempts){
 const q=await read(a.constructionEvidence.path,a.constructionEvidence.sha256);if(!q.paint)continue;
 const level=q.placeholderWorld,bp=plan.blueprints.find(x=>x.sourceLevelId===a.sourceLevelId),map=mapping(bp);
 const fullMask=Array.from({length:level.width*level.height},(_,i)=>`${i%level.width},${Math.floor(i/level.width)}`).sort();
 assert.equal(level.blocked?.length??0,0);assert.deepEqual(level.playable?level.playable.map(p=>p.join(',')).sort():fullMask,fullMask,
  'This exact static equivalence is restricted to full rectangular masks, including explicit full playable arrays');
 for(const b of level.blocks){const{w,h}=dimensions(b);assert.equal(b.shape.length,w*h);assert.equal(new Set(b.shape.map(p=>p.join(','))).size,w*h);}
 const gates=recordedGates(level,map,a.seed,runtime);
 // Two already recorded successful CSP outputs validate the deterministic
 // reconstruction; no new paint pass is used even as a positive control.
 if(q.paint.ok)assert.deepEqual(gates,q.paint.gates,'Recorded successful gate set must match reconstructed prefix exactly');
 const bodyDomains=level.blocks.map(b=>{const evaluated=gates.map(g=>({gate:g,...gateReasons(b,g,level,map,runtime)}));return{blockId:b.id,
  position:[b.x,b.y],dimensions:dimensions(b),fixedColor:map.fixedBodyColours[b.id]??null,availableColors:evaluated.filter(x=>x.reasons.length===0).map(x=>x.gate.color),evaluated};});
 const empty=bodyDomains.filter(b=>!b.availableColors.length);assert.equal(empty.length===0,q.paint.reason!=='shape-exit-domain');
 const fixedColourRequirements=Object.entries(map.fixedBodyColours).reduce((all,[id,color])=>{all[color]??=[];all[color].push(id);return all;},{});
 const futureStaticApertureOptions=Object.entries(fixedColourRequirements).map(([color,ids])=>({color,bodyIds:ids,preserved:map.preservedGates.some(g=>g.color===color),
  compatibleExposedApertures:apertures(level).filter(g=>!map.preservedGates.some(p=>p.color!==color&&overlap(g,p)))
   .filter(g=>ids.every(id=>gateReasons(level.blocks.find(b=>b.id===id),{...g,color},level,map,runtime).reasons.length===0))}));
 rows.push({construction:a.constructionEvidence,index:a.index,sourceLevelId:a.sourceLevelId,seed:a.seed,recordedResult:q.paint.reason??'CSP_SUCCESS',
  originalCompleteAssignments:q.paint.completeColourAssignments,originalCspNodes:q.paint.accounting.nodes,
  reconstructedGates:gates,reconstructionMatchedRecordedSuccessfulGateSet:q.paint.ok?true:null,
  emptyBodyDomains:empty,allDomainSizes:bodyDomains.map(b=>({id:b.blockId,size:b.availableColors.length,colors:b.availableColors})),futureStaticApertureOptions,
  evidenceLimit:'Failure receipts did not retain chosen gates/domains. These static choices are independently reconstructed from the immutable seed and frozen code; they are not a rerun of the constructor or colour CSP.'});
}
assert.equal(rows.length,8);assert.equal(rows.filter(r=>r.recordedResult==='shape-exit-domain').length,6);
for(const[p,h]of Object.entries(bindings))assert.equal(hash(await fs.readFile(p)),h);
const output=`${DIR}/domain-failure-readonly-diagnosis.json`;
await fs.writeFile(output,JSON.stringify({status:'READ_ONLY_STATIC_DOMAIN_DIAGNOSIS',index:{path:`${DIR}/index.json`,sha256:bindings[`${DIR}/index.json`]},plan:index.plan,
 executionEnvironment:environment,rows,fileBindings:bindings,
 recommendations:[
  'Keep the already-cleared prefix portals fixed. For every other fixed colour, intersect portal candidates across ALL fixed bodies of that colour, including shape cross-section, original-orientation art and every recorded parking pose.',
  'Choose the most constrained fixed-colour gate first, remove overlaps, and propagate remaining gate candidates. Randomise only within the compatible domain, never across a fixed-body requirement.',
  'During placement, require every retiled body to retain at least one feasible colour/portal, after native art, forbidden old colour, no unintended opening exit, and fixed-neighbour colour exclusions. A forced body-colour pair propagates back to that gate domain.',
  'Treat portal packing and body-domain coverage as one finite static CSP for genuinely new stocks. Charge all complete colour/world assignments under the existing shared construction budget and archive chosen gates and rejected body-domain reasons on every return.',
  'These are necessary static conditions only. Preserve whole-region shape and colour redesign, near-layout limits and complete prefix/tail model validation. Do not retry these six stock shapes or the two already attempted candidates.'
 ],newConstructionCalls:0,colourCspInvocations:0,gameplayModelInvocations:0,singleBodyReachabilitySearches:0,fullBoardSearches:0,publicLedgerClaims:0,
 newCandidateObjects:0,oldReportsChanged:false,formalReady:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,sha256:hash(await fs.readFile(output)),rows:rows.map(r=>({index:r.index,source:r.sourceLevelId,result:r.recordedResult,
 empty:r.emptyBodyDomains.map(b=>({id:b.blockId,fixed:b.fixedColor,size:b.dimensions,matchedColorReasons:b.evaluated.filter(e=>e.gate.color===b.fixedColor).map(e=>({gate:e.gate,reasons:e.reasons,poses:e.parkingConflictPoses}))}))}))}));
