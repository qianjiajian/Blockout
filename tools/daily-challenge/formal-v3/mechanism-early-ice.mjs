import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,exploreBoundedIceCandidate,designFingerprints} from './bounded-proof.mjs';
import {buildGlobalCandidate,boardCells,absoluteCells,random,digest} from './diversity-layout-factory.mjs';
import {intensityTargets,auditMechanismParticipation} from './mechanism-intensity.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {inspectHardRegionStatic,inheritedVisualExclusions} from './design-hard-region-pool.mjs';
import {compareLayouts} from './diversity.mjs';

export const EARLY_ICE_VERSION='early-native-choice-ice-global-v1';
const ROOT='deliverables/daily-formal-v3-20261008',read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const adjacent=(a,b)=>absoluteCells(a).some(p=>absoluteCells(b).some(q=>Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])===1));
const span=(b,g)=>Math.max(...b.shape.map(p=>p[['top','bottom'].includes(g.side)?0:1]))+1;
function opening(b,g,l){
 const w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1,start=['top','bottom'].includes(g.side)?b.x:b.y;
 return start>=g.offset&&start+span(b,g)<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+h===l.height:g.side==='left'?b.x===0:b.x+w===l.width);
}
export function clearInventoryCapacity(level){
 const gateIce=new Map(level.gates.map(g=>[g.color,g.frozen??0])),thresholds=level.blocks.map(b=>({id:b.id,threshold:Math.max(b.frozen??0,gateIce.get(b.color)??0)})).sort((a,b)=>a.threshold-b.threshold);
 let available=0;for(const t of thresholds){if(t.threshold>available)return{pass:false,available,blockedAt:t,thresholds};available++;}
 return{pass:true,available,initialUnconstrainedBodies:thresholds.filter(t=>t.threshold===0).length,thresholds,geometryIgnored:true};
}
function combinations(a,n,start=0,head=[],out=[]){if(head.length===n){out.push(head);return out;}for(let i=start;i<a.length;i++)combinations(a,n,i+1,[...head,a[i]],out);return out;}

/** Static colouring, not puzzle search. One shared 10k assignment budget. */
function forceOpeningColours(level,runtime,a,b,randomizer,meter){
 const forced=new Map([[a.body.id,a.gate.color],[b.body.id,b.gate.color]]),neighbors=new Map(level.blocks.map(x=>[x.id,level.blocks.filter(y=>x!==y&&adjacent(x,y))]));
 const domains=new Map(level.blocks.map(x=>{const match=runtime.matchFormalBlockShape(x.shape,'native-only');return[x.id,[...new Set(level.gates.filter(g=>span(x,g)<=g.size).map(g=>g.color))]
  .filter(c=>!forced.has(x.id)||forced.get(x.id)===c).filter(c=>match?.quarterTurns===0&&runtime.GAME_ART.gameplay.formalBlocks[c]?.solid?.[match.shapeId])
  .map(c=>({c,n:c===x.color?-.2:randomizer()})).sort((a,b)=>a.n-b.n).map(x=>x.c)];}));
 if([...domains.values()].some(d=>!d.length))return false;
 const order=[...level.blocks].sort((x,y)=>domains.get(x.id).length-domains.get(y.id).length||neighbors.get(y.id).length-neighbors.get(x.id).length),assigned=new Map();
 const visit=i=>{if(meter.nodes>=10000)return false;meter.nodes++;if(i===order.length)return new Set(assigned.values()).size>=6;
  const block=order[i],excluded=new Set(neighbors.get(block.id).map(x=>assigned.get(x.id)));
  for(const c of domains.get(block.id)){if(excluded.has(c))continue;assigned.set(block.id,c);if(visit(i+1))return true;assigned.delete(block.id);}return false;};
 if(!visit(0))return false;for(const block of level.blocks)block.color=assigned.get(block.id);return true;
}

/** Create one globally repartitioned shape inventory, then design its initial
 * colour choices and ice together before its first native joint search. */
export function buildEarlyIceCandidate(source,runtime,{seed=1,mechanism='numeric-ice'}={}){
 if(!['numeric-ice','frozen-exit'].includes(mechanism))throw Error('Qualified numeric ice or frozen exit only');
 if(boardCells(source).length!==source.width*source.height)return{ok:false,reason:'frozen-exit-stage-needs-normal-rectangle'};
 const area=boardCells(source).length,targets=intensityTargets(mechanism,3),bodyCount=Math.max(16,Math.round(area/2.8));
 const base=buildGlobalCandidate(source,runtime,{seed,bodyCount,irregular:false,shapeProfile:'balanced',paletteSize:8,maxNodes:10000,maxTransitions:10000});
 if(!base.ok)return{ok:false,reason:base.reason,construction:base};
 const r=random(seed^0x4071c),mouths=base.level.blocks.flatMap(body=>base.level.gates.filter(g=>opening(body,g,base.level)).map(gate=>({body,gate})));
 const pairs=mouths.flatMap(a=>mouths.filter(b=>a.body.id!==b.body.id&&a.gate.color!==b.gate.color).map(b=>({a,b,n:r()})))
  .sort((x,y)=>x.a.body.shape.length-y.a.body.shape.length||x.n-y.n).slice(0,16),meter={nodes:0};
 for(const[pairIndex,{a,b}]of pairs.entries()){
  const level=structuredClone(base.level);if(!forceOpeningColours(level,runtime,a,b,r,meter))continue;
  let placements=[];
  if(mechanism==='numeric-ice'){
   const first=level.blocks.find(x=>x.id===a.body.id),others=level.blocks.filter(x=>x.id!==first.id&&x.id!==b.body.id)
    .map(x=>({b:x,n:r(),distance:Math.abs(x.x-first.x)+Math.abs(x.y-first.y)})).sort((x,y)=>x.b.shape.length-y.b.shape.length||x.distance-y.distance||x.n-y.n).slice(0,3).map(x=>x.b);
   if(others.length!==3)continue;const chosen=[first,...others];
   if(chosen.reduce((n,x)=>n+x.shape.length,0)>area*.30)continue;
   for(const[i,x]of chosen.entries()){x.frozen=7+i;placements.push({id:x.id,count:x.frozen,color:x.color});}
  }else{
   const first=level.gates.find(g=>g.id===a.gate.id),eligible=level.gates.filter(g=>g.id!==first.id&&g.color!==b.gate.color&&level.blocks.some(x=>x.color===g.color));
   let gates;
   for(const rest of combinations(eligible,3).slice(0,24)){
    const trial=structuredClone(level);for(const[i,g]of[first,...rest].entries())trial.gates.find(x=>x.id===g.id).frozen=7+i;
    if(clearInventoryCapacity(trial).pass){gates=trial.gates;break;}
   }
   if(!gates)continue;level.gates=gates;placements=gates.filter(g=>g.frozen).map(g=>({id:g.id,color:g.color,count:g.frozen}));
  }
  const capacity=clearInventoryCapacity(level);if(!capacity.pass)continue;
  const actual=new runtime.PuzzleModel(level);actual.startCountdown();const relaxedLevel=structuredClone(level);
  for(const x of relaxedLevel.blocks)delete x.frozen;for(const g of relaxedLevel.gates)delete g.frozen;
  const relaxed=new runtime.PuzzleModel(relaxedLevel);relaxed.startCountdown();
  const before=relaxed.possibleExitSides(relaxed.getBlock(a.body.id)),after=actual.possibleExitSides(actual.getBlock(a.body.id)),start=actual.possibleExitSides(actual.getBlock(b.body.id));
  if(!before.includes(a.gate.side)||after.length||!start.includes(b.gate.side))continue;
  const staticAudit=inspectHardRegionStatic(level,source,runtime);if(!staticAudit.valid)continue;
  return{ok:true,level,staticAudit,targets,provenance:{...base.construction,version:EARLY_ICE_VERSION,mechanism,targetDifficulty:3,
   icePlacedBeforeFirstSearch:true,plainSearchInvocations:0,targets,placements,eventCapacity:capacity,colouringNodes:meter.nodes,pairIndex,
   openingChoice:{blockedBodyId:a.body.id,blockedGateId:a.gate.id,unfrozenBodyId:b.body.id,unfrozenGateId:b.gate.id,
    unicedPossibleSides:before,actualBlockedPossibleSides:after,actualStartingPossibleSides:start,queriesOnly:true},
   strategy:'Block one formerly legal opening exit, retain a different real opening exit, and stagger four actual counters at 7/8/9/10.'}};
 }
 return{ok:false,reason:'no-four-ice-early-choice-with-real-event-capacity',construction:{global:base.construction,openingPairs:pairs.length,colouringNodes:meter.nodes}};
}

function allAccepted(directory,out=[]){for(const e of fs.readdirSync(directory,{withFileTypes:true})){const p=`${directory}/${e.name}`;if(e.isDirectory())allAccepted(p,out);else if(/^candidate.*\.json$/.test(e.name)){let q;try{q=read(p);}catch{continue;}if(q.accepted&&q.level)out.push(q.level);}}return out;}
export async function runEarlyIceBatch({label='early-ice-01',sources=[14,18,29,54,100,3],selectedIndex=`${ROOT}/selection/region-nearband15-selected/index.json`}={}){
 if(!/^[a-z0-9-]+$/.test(label)||sources.length!==6||new Set(sources).size!==6)throw Error('Exactly six distinct sources; twelve new input slots maximum');
 const directory=`${ROOT}/mechanisms/${label}`;if(fs.existsSync(directory))throw Error('Use a new immutable early-ice label');
 const runtime=await loadBoundedRuntime();if(runtime.toolchainSha256!=='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804')throw Error('Frozen core changed');
 const selected=read(selectedIndex).files.map(p=>read(p).level),pool=allAccepted(`${ROOT}/design`),old=read('deliverables/daily-formal-v2-20261007/final-qualified/index.json').entries.map(e=>read(e.path).level),
  visual=inheritedVisualExclusions(selectedIndex),excluded=new Set(visual.excluded.map(e=>e.designSha256));
 fs.mkdirSync(directory,{recursive:true});
 const bindings=['mechanism-early-ice.mjs','diversity-layout-factory.mjs','mechanism-intensity.mjs','bounded-proof.mjs','bounded-ice-proof.mjs','design-hard-region-pool.mjs'].map(name=>{
  const p=`tools/daily-challenge/formal-v3/${name}`;fs.copyFileSync(p,`${directory}/${name}.snapshot`);return{path:p,sha256:hash(p)};});
 const legacy=['ice-body3-native-11','ice-body4-global-11','ice-gate4-rect-11'].map(label=>{const p=`${ROOT}/design/${label}/report.json`,q=read(p);return{path:p,fileSha256:hash(p),sourceCount:q.sourceIds.length,
  constructionAttempts:q.rows.length,searched:q.rows.filter(r=>r.proof).length,accepted:q.accepted.length,mechanism:q.mechanism,target:q.targetDifficulty,
  reasons:q.rows.reduce((m,r)=>(m[r.reason??r.status]=(m[r.reason??r.status]??0)+1,m),{})};});
 fs.writeFileSync(`${directory}/legacy-diagnosis.json`,JSON.stringify({legacy,interpretation:'Old ice was genuinely placed before search, but door selection excluded every initially clearable colour; far-half body placement did not establish an early changed choice. Static event capacity was optimistic and did not establish spatial solvability.',newSearchInvocations:0},null,2)+'\n',{flag:'wx'});
 const rows=[],records=[],parents=new Map(),budget={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000};
 const write=status=>{fs.writeFileSync(`${directory}/report.json`,JSON.stringify({version:EARLY_ICE_VERSION,status,formalReady:false,productionChanged:false,sourceIds:sources,
  maximumPhysicalInputSlots:12,maximumSearches:12,constructionCount:rows.length,searched:rows.filter(r=>r.proof).length,proofToolchainSha256:runtime.toolchainSha256,
  budget,floor:31,searchUpper:128,plainSearchInvocations:0,bindings,selectedIndex,selectedIndexSha256:hash(selectedIndex),visual,rows,records},null,2)+'\n');fs.writeFileSync(`${directory}/index.json`,JSON.stringify({records},null,2)+'\n');};
 for(const sourceId of sources)for(const mechanism of ['numeric-ice','frozen-exit']){
  const source=runtime.LEVELS.find(l=>l.id===sourceId),serial=rows.length,seed=createHash('sha256').update(`${label}:${sourceId}:${mechanism}`).digest().readUInt32LE(0),built=buildEarlyIceCandidate(source,runtime,{seed,mechanism});
  const row={serial,sourceLevelId:sourceId,mechanism,seed,status:'STATIC_REJECTED',reason:built.reason??null,construction:built.construction};rows.push(row);
  if(!built.ok){write('FINITE_BATCH_RUNNING');continue;}
  const level=built.level,fp=designFingerprints(level),nearest=ls=>Math.max(0,...ls.map(l=>compareLayouts(l,level).footprintSimilarity));
  row.similarity={source:compareLayouts(source,level).footprintSimilarity,selected:nearest(selected),pool:nearest(pool),old450:nearest(old)};row.earlyChoice=built.provenance.openingChoice;row.eventCapacity=built.provenance.eventCapacity;
  if(excluded.has(fp.designSha256)||row.similarity.source>.55||row.similarity.selected>.65||row.similarity.pool>.65||row.similarity.old450>.75){row.reason='diversity-or-visual-exclusion';write('FINITE_BATCH_RUNNING');continue;}
  let result;try{result=await exploreBoundedIceCandidate(runtime,{sourceLevelId:sourceId,level},{floor:31,searchUpper:128,budget,...(parents.has(sourceId)?{redesignOf:parents.get(sourceId)}:{})});}
  catch(e){row.reason=e.message;row.status='LEDGER_REJECTED';write('FINITE_BATCH_RUNNING');continue;}
  const packet={...result,mechanismFirst:true,stageKey:`mechanisms-${mechanism}-${mechanism==='numeric-ice'?10:6}`,targets:built.targets,intensityTargets:built.targets,
   sourceLevelSha256:levelSha256(source),provenance:built.provenance,staticAudit:built.staticAudit,inputBindings:bindings,proofToolchainSha256:runtime.toolchainSha256,mathAccepted:result.accepted};
  if(result.drags){packet.actualReplay=replayDecorated(runtime,level,result.drags);packet.participation=auditMechanismParticipation(level,result.drags,packet.actualReplay,mechanism,built.targets);}
  if(result.accepted&&!packet.participation?.pass){packet.accepted=false;packet.status='MATH_PASSED_PARTICIPATION_REJECTED';}
  if(!result.accepted)parents.set(sourceId,fp.designSha256);
  const p=result.proof;if(p.rawFullBoardStates>10000||p.rawExploredStates>10000||p.rawFullBoardStates!==p.discoveredStates||p.rawExploredStates!==p.exploredStates)throw Error('Raw budget mismatch');
  row.proof={termination:p.routeTermination??p.termination,rawFullBoardStates:p.rawFullBoardStates,rawExploredStates:p.rawExploredStates,actions:p.attemptedTransitions,micro:p.microDiscoveredStates,L:result.L,U:result.U};
  const candidatePath=`${directory}/candidate-${String(serial).padStart(4,'0')}.json`;fs.writeFileSync(candidatePath,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
  Object.assign(row,{path:candidatePath,status:packet.status,accepted:packet.accepted});if(packet.accepted){records.push({path:candidatePath,fileSha256:hash(candidatePath),sourceLevelId:sourceId,stageKey:packet.stageKey,difficulty:3,L:packet.L,U:packet.U});pool.push(level);}
  write('FINITE_BATCH_RUNNING');console.log(JSON.stringify({sourceId,mechanism,status:row.status,proof:row.proof}));
 }
 write('FINITE_BATCH_COMPLETE');return{directory,constructionCount:rows.length,searched:rows.filter(r=>r.proof).length,accepted:records.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(await runEarlyIceBatch({label:process.argv[2]??'early-ice-01'})));
