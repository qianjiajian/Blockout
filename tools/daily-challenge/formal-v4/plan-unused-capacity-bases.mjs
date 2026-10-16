import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {compareLayouts,describeLayout} from '../formal-v3/diversity.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const load=async p=>{const b=await fs.readFile(p);return{path:p,sha256:hash(b),value:JSON.parse(b)};};
const exists=async p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const cells=b=>b.shape.map(([dx,dy])=>`${b.x+dx},${b.y+dy}`);
const rectangle=b=>b.shape.length===(Math.max(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))+1);
const root='deliverables/daily-formal-v4-20261008';
const runtime=await loadV4CatalogRuntime();
const index=await load('deliverables/daily-formal-v3-20261008/design/unused-basic-bases-01/index.json');
const sourceAudit=await load(index.value.sourceAudit),auditByPath=new Map(sourceAudit.value.rows.map(r=>[r.path,r]));
const selectedIndex=await load(`${root}/selection/merged-116-v2/index.json`);
const selected=await Promise.all(selectedIndex.value.files.map(async p=>(await load(p)).value));
const mountSource='src/core/generatorMountContract.ts';
const built=await build({entryPoints:[mountSource],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {auditGeneratorMounts}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const stageKeys={generator:'mechanisms-generator-35','axis-block':'mechanisms-axis-block-50',
 'colored-grid':'mechanisms-colored-grid-200','layered-lift':'mechanisms-layered-lift-65'};
const totalInventory=i=>Object.values(i).reduce((n,x)=>n+x.length,0);

async function analyze(level,drags,difficulty){
 runtime.assertPlainProofDomain(level);
 const bodies=new Map(level.blocks.map(b=>[b.id,{id:b.id,color:b.color,block:b,firstDrag:null,
  clearsBeforeFirst:null,exitDrag:null,clearsBeforeExit:null,exitSide:null,poses:[[b.x,b.y]],unitSteps:0}]));
 const visits=new Map(),entries=new Map(),departures=new Map(),gateFirstExits=new Map();
 const visit=b=>{for(const k of cells(b)){if(!visits.has(k))visits.set(k,new Set());visits.get(k).add(b.color);}};
 for(const b of level.blocks)visit(b);
 const mounts=[];
 for(const b of level.blocks){if(!rectangle(b))continue;
  const w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;if(w>3||h>3)continue;
  const match=runtime.matchFormalBlockShape(b.shape,'native-only');if(!match||match.quarterTurns!==0)continue;
  const colors=[];
  for(const g of level.gates){
   const path=runtime.GAME_ART.gameplay.formalBlocks[g.color]?.solid?.[match.shapeId];
   const fits=(g.portals??[g]).some(p=>p.size>=(['top','bottom'].includes(p.side)?w:h));
   if(path&&fits&&await exists(`public/${path.replace(/^\//,'')}`))colors.push(g.color);
  }
  if(new Set(colors).size<2)continue;
  for(const side of ['left','right','top','bottom']){
   if(side==='left'&&b.x!==0||side==='right'&&b.x+w!==level.width||side==='top'&&b.y!==0||side==='bottom'&&b.y+h!==level.height)continue;
   const vertical=['left','right'].includes(side),length=vertical?level.height:level.width,first=vertical?b.y:b.x,last=first+(vertical?h:w)-1;
   for(let offset=Math.max(1,first);offset<=Math.min(length-2,last);offset++){
    if(first<offset-1||last>offset+1)continue;
    const descriptor={id:`diagnostic-mount-${mounts.length}`,side,offset,rimSpan:3,rimMount:'rim',spawn:[b.x,b.y],queueBlockIds:[]};
    // Geometry-only view: no candidate/cargo is instantiated or modelled.
    const issues=auditGeneratorMounts({...level,generators:[descriptor]});
    if(!issues.length)mounts.push({ownerBodyId:b.id,descriptor,shape:b.shape,footprint:cells(b),nativeColors:[...new Set(colors)],firstFullVacancy:null});
   }
  }
 }
 const model=new runtime.PuzzleModel(level);model.startCountdown();let nonClearing=0,unitSteps=0;
 const observe=(drag,unitStep,phase)=>{const s=model.snapshot(),occupied=new Set(s.blocks.flatMap(cells));
  for(const m of mounts)if(!m.firstFullVacancy&&m.footprint.every(c=>!occupied.has(c)))m.firstFullVacancy={drag,unitStep,phase,cleared:s.cleared,baseBodiesRemain:s.blocks.length};};
 for(const [index,d]of drags.entries()){
  const before=model.snapshot(),b=model.getBlock(d.blockId),a=bodies.get(d.blockId);assert(b&&a);
  if(a.firstDrag===null){a.firstDrag=index+1;a.clearsBeforeFirst=before.cleared;}
  let previous=cells(b);
  for(const pos of d.path){const moved={...b,x:pos[0],y:pos[1]},next=cells(moved);
   for(const k of next)if(!previous.includes(k))entries.set(k,(entries.get(k)??0)+1);
   for(const k of previous)if(!next.includes(k))departures.set(k,(departures.get(k)??0)+1);
   previous=next;visit(moved);a.poses.push(pos);a.unitSteps++;unitSteps++;
  }
  const move=model.moveBlockStep;let step=0;
  model.moveBlockStep=function(...args){const ok=move.apply(this,args);if(ok)observe(index+1,++step,'held-unit-step');return ok;};
  try{applyNativeDrag(model,d);}finally{model.moveBlockStep=move;}
  const after=model.snapshot();observe(index+1,d.path.length,'committed-drag');
  nonClearing+=Number(after.cleared===before.cleared);
  if(d.exitSide){a.exitDrag=index+1;a.exitSide=d.exitSide;a.clearsBeforeExit=before.cleared;
   if(!gateFirstExits.has(b.color))gateFirstExits.set(b.color,{gateId:level.gates.find(g=>g.color===b.color).id,color:b.color,count:before.cleared,drag:index+1});}
 }
 assert(model.snapshot().complete&&!model.snapshot().blocks.length&&!model.snapshot().queuedBlocks.length);
 const axis=[...bodies.values()].filter(b=>b.unitSteps>0&&(b.poses.every(p=>p[0]===b.poses[0][0])&&['top','bottom'].includes(b.exitSide)
  ||b.poses.every(p=>p[1]===b.poses[0][1])&&['left','right'].includes(b.exitSide))).map(b=>({bodyId:b.id,
   axis:['top','bottom'].includes(b.exitSide)?'vertical':'horizontal',unitSteps:b.unitSteps,firstDrag:b.firstDrag,exitDrag:b.exitDrag,clearsBeforeFirst:b.clearsBeforeFirst}));
 const gridGroups=new Map();for(const [key,v]of visits)if(v.size===1&&((entries.get(key)??0)>0||(departures.get(key)??0)>0)){
  const color=[...v][0];if(!gridGroups.has(color))gridGroups.set(color,[]);
  gridGroups.get(color).push({cell:key.split(',').map(Number),unitEntries:entries.get(key)??0,unitDepartures:departures.get(key)??0});
 }
 const lift=[...bodies.values()].filter(b=>rectangle(b.block)&&b.block.shape.length>=2&&b.firstDrag===b.exitDrag
  &&b.clearsBeforeFirst>=2&&b.clearsBeforeFirst<level.blocks.length-2).map(b=>({bodyId:b.id,x:b.block.x,y:b.block.y,
  width:Math.max(...b.block.shape.map(p=>p[0]))+1,height:Math.max(...b.block.shape.map(p=>p[1]))+1,area:b.block.shape.length,
  firstDrag:b.firstDrag,exitDrag:b.exitDrag,clearsBeforeFirst:b.clearsBeforeFirst,baseBodiesRemainAfterExit:level.blocks.length-b.clearsBeforeFirst-1}));
 const generator=mounts.filter(m=>{const b=bodies.get(m.ownerBodyId);return b.firstDrag===b.exitDrag&&b.clearsBeforeFirst>=2&&b.clearsBeforeFirst<level.blocks.length-2&&m.firstFullVacancy?.baseBodiesRemain>=2;})
  .map(m=>({...m,owner:lift.find(b=>b.bodyId===m.ownerBodyId)??{bodyId:m.ownerBodyId,firstDrag:bodies.get(m.ownerBodyId).firstDrag,
   clearsBeforeFirst:bodies.get(m.ownerBodyId).clearsBeforeFirst},qualification:'physical rim only; actual FIFO coexistence and complete cargo route not constructed'}));
 const generatorDisjoint=[];
 for(const g of generator){
  if(generatorDisjoint.some(p=>p.ownerBodyId===g.ownerBodyId))continue;
  if(auditGeneratorMounts({...level,generators:[...generatorDisjoint,g].map(m=>m.descriptor)}).length)continue;
  generatorDisjoint.push(g);
 }
 const minimumCounter=2*difficulty+1;
 const support=[...[...gateFirstExits.values()].filter(g=>g.count>=minimumCounter).map(g=>({mechanism:'frozen-exit',...g})),
  ...[...bodies.values()].filter(b=>b.clearsBeforeFirst>=minimumCounter).map(b=>({mechanism:'numeric-ice',bodyId:b.id,count:b.clearsBeforeFirst,firstDrag:b.firstDrag}))];
 return{route:{complete:true,drags:drags.length,nonClearingDrags:nonClearing,unitSteps,clearEvents:model.snapshot().cleared},
  axis,grid:[...gridGroups].map(([color,cells])=>({color,cells})),lift,generator,generatorDisjoint,support,allPhysicalMountCount:mounts.length};
}

const rows=[];
for(const input of index.value.records){
 const file=await load(input.path);assert.equal(file.sha256,input.fileSha256);
 const base=file.value,audit=auditByPath.get(input.path);assert(audit?.plain&&audit.fullOriginalDualReplay);
 assert.equal(levelSha256(base.level),audit.levelSha256);assert.equal(routeSha256(base.drags),audit.routeSha256);
 const analysis=await analyze(base.level,base.drags,input.difficulty);assert.equal(analysis.route.nonClearingDrags,audit.actualReplayedU);
 rows.push({...input,levelSha256:audit.levelSha256,routeSha256:audit.routeSha256,roots:audit.ancestry.roots,
  sourceBoard:[base.level.width,base.level.height],analysis,base});
}
const plans=[],used=new Set(),usedRoots=new Set(),usedSources=new Set(),pending=[];
// Scarce physical ports first, then grid/lift, then the less constrained axes.
for(let round=0;round<3;round++)for(const mechanism of ['generator','colored-grid','layered-lift','axis-block']){
 const key={generator:'generatorDisjoint','colored-grid':'grid','layered-lift':'lift','axis-block':'axis'}[mechanism];
 const options=[];
 for(const row of rows){if(used.has(row.path)||!row.roots.length||row.roots.some(r=>usedRoots.has(r)))continue;
  const instances=row.analysis[key];if(!instances.length)continue;
  const slots=runtime.slots.filter(s=>s.stageKey===stageKeys[mechanism]&&s.difficulty===row.difficulty
   &&!selected.some(r=>r.formalId===s.formalId)&&!plans.some(r=>r.formalId===s.formalId));
  const slot=slots[0];if(!slot)continue;
  const prior=runtime.priorDailySlots.get(slot.formalId),needed=Math.max(row.difficulty+1,totalInventory(prior.inventory)+1);
  const count=Math.min(instances.length,row.difficulty+1),minimumSupport=Math.max(0,needed-count);
  // Adding any ice release requires two distinct real release events in the
  // combined policy. Do not present a lone numeric support as sufficient.
  const supportCount=minimumSupport>0?Math.max(2,minimumSupport):0;
  const distinctSupport=[...new Set(row.analysis.support.map(s=>s.count))];
  const releaseRequired=mechanism==='layered-lift'||supportCount>0;
  if(supportCount>row.analysis.support.length||releaseRequired&&distinctSupport.length<2)continue;
  const comparisons=[...selected,...pending].map(r=>({id:r.formalId,stageKey:r.stageKey,difficulty:r.difficulty,
   ...compareLayouts(row.base.level,r.level),maximum:r.stageKey===slot.stageKey&&r.difficulty===slot.difficulty ? .65 : .75}));
  if(comparisons.some(c=>c.footprintSimilarity>c.maximum+1e-12))continue;
  const nearest=comparisons.toSorted((a,b)=>b.footprintSimilarity-a.footprintSimilarity)[0];
  const rarity=Number(!usedSources.has(row.sourceLevelId))*100+Math.min(instances.length,4)*10+
   (row.difficulty===2?5:0)+Math.min(distinctSupport.length,5);
  options.push({row,slot,needed,count,supportCount,nearest,rarity});
 }
 options.sort((a,b)=>b.rarity-a.rarity||a.row.path.localeCompare(b.row.path));
 if(!options.length)continue;
 const {row,slot,needed,count,supportCount,nearest}=options[0];
 used.add(row.path);row.roots.forEach(r=>usedRoots.add(r));usedSources.add(row.sourceLevelId);
 const mechanismPlans=row.analysis[key];
 plans.push({...slot,basePath:row.path,baseFileSha256:row.fileSha256,baseLevelSha256:row.levelSha256,baseRouteSha256:row.routeSha256,
  sourceLevelId:row.sourceLevelId,roots:row.roots,U:row.analysis.route.nonClearingDrags,
  primaryInstancesAvailable:mechanismPlans.length,primaryInstancesProposal:count,minimumCombinedInstances:needed,supportInstancesNeeded:supportCount,
  mechanismOptions:mechanismPlans,supportOptions:row.analysis.support,
  distinctReleaseEventsRequired:mechanism==='layered-lift'||supportCount>0?2:0,nearest,
  phase:'PREDECLARED_READ_ONLY_ADAPTATION_PLAN',requiresFreshConstructedObject:true,
  caveat:mechanism==='generator'?'Rim geometry and first full vacancy verified; FIFO cargo may obstruct later steps; no cargo route claimed.'
   :mechanism==='layered-lift'?'Stationary full rectangle and midgame uncover opportunity only; added hidden inventory route remains unconstructed.'
   :'Known base route satisfies proposed spatial constraint; combined support and actual object still require construction and replay.'});
 pending.push({...slot,sourceLevelId:row.sourceLevelId,level:row.base.level});
}
const output=`${root}/design/unused-capacity-plan-02`;await fs.mkdir(output,{recursive:true});
const data={status:'READ_ONLY_CAPACITY_ADAPTATION_PREPLAN',scope:300,formalReady:false,productionChanged:false,
 sourceIndex:{path:index.path,sha256:index.sha256},sourceAudit:{path:sourceAudit.path,sha256:sourceAudit.sha256},
 selectedIndex:{path:selectedIndex.path,sha256:selectedIndex.sha256},tool:{path:'tools/daily-challenge/formal-v4/plan-unused-capacity-bases.mjs',sha256:hash(await fs.readFile('tools/daily-challenge/formal-v4/plan-unused-capacity-bases.mjs'))},
 mathToolchainSha256:runtime.toolchainSha256,checked:rows.length,proposed:plans.length,maxPlanSize:12,
 newConstructionCalls:0,newCandidates:0,ledgerClaims:0,proofSearches:0,heldReachabilitySearches:0,
 existingWitnessReplays:rows.length,unitStepVacancyObservation:true,prospectiveMountGeometryOnly:true,
 familyPolicy:'At most one proposed stage per exact base and bound whole-board family; selected116 family exclusions inherited from bound source audit.',
 similarityPolicy:'Every base passes current symmetric max8 global .75 and same stage/difficulty .65 against selected116 and earlier proposed bases. Final constructed inventory must be checked again.',
 plans,rows:rows.map(({base,...r})=>r)};
assert(plans.length<=12);assert.equal(new Set(plans.map(r=>r.basePath)).size,plans.length);
await fs.writeFile(`${output}/report.json`,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
await fs.writeFile(`${output}/plan.json`,JSON.stringify({status:data.status,sourceReport:`${output}/report.json`,
 sourceReportSha256:hash(await fs.readFile(`${output}/report.json`)),rows:plans,constructionAuthorizedByThisPlan:false,formalReady:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,checked:rows.length,proposed:plans.length,byStage:Object.fromEntries(Object.keys(stageKeys).map(m=>[m,plans.filter(p=>p.newestMechanism===m).length])),
 plans:plans.map(p=>({slot:p.formalId,source:p.sourceLevelId,base:p.basePath,available:p.primaryInstancesAvailable,primary:p.primaryInstancesProposal,support:p.supportInstancesNeeded,U:p.U}))}));
