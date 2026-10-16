import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadBoundedRuntime,exploreBoundedIceCandidate,designFingerprints} from './bounded-proof.mjs';
import {buildGlobalCandidate,boardCells,absoluteCells,random,digest} from './diversity-layout-factory.mjs';
import {compareLayouts,DIVERSITY_POLICY} from './diversity.mjs';
import {inspectHardRegionStatic,inheritedVisualExclusions} from './design-hard-region-pool.mjs';
import {clearInventoryCapacity} from './mechanism-early-ice.mjs';
import {intensityTargets,auditMechanismParticipation} from './mechanism-intensity.mjs';
import {applyNativeDrag,replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

export const VERSION='global-axial-geometric-frozen-exit-pilot-v1';
const ROOT='deliverables/daily-formal-v3-20261008';
const FROZEN='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const bind=p=>({path:p,fileSha256:sha(p)}),key=p=>p.join(',');
const dims=b=>[1+Math.max(...b.shape.map(p=>p[0])),1+Math.max(...b.shape.map(p=>p[1]))];
const span=(b,g)=>dims(b)[['top','bottom'].includes(g.side)?0:1];
const adjacent=(a,b)=>absoluteCells(a).some(p=>absoluteCells(b).some(q=>Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])===1));
const atExit=(b,g,l)=>{
 const[w,h]=dims(b),start=['top','bottom'].includes(g.side)?b.x:b.y;
 return span(b,g)<=g.size&&start>=g.offset&&start+span(b,g)<=g.offset+g.size&&
  (g.side==='top'?b.y===0:g.side==='bottom'?b.y+h===l.height:g.side==='left'?b.x===0:b.x+w===l.width);
};

/** Geometric gate cross-sections are recorded separately from movement rules.
 * No movementAxis field is created. Empty-board reachability is necessary only. */
export function geometricDirectionAudit(level,axis){
 const primary=axis==='horizontal'?['left','right']:['top','bottom'];
 const frozen=level.gates.filter(g=>primary.includes(g.side));
 const ordinary=level.gates.filter(g=>!primary.includes(g.side));
 const bars=level.blocks.filter(b=>{const[w,h]=dims(b);return axis==='horizontal'?h===1&&w>=3:w===1&&h>=3;});
 return{axis,notMovementAxisMechanic:true,movementAxisAttributes:level.blocks.filter(b=>b.movementAxis!==undefined).length,
  frozenGates:frozen.map(g=>({id:g.id,color:g.color,side:g.side,size:g.size,count:g.frozen})),ordinaryGates:ordinary.map(g=>({id:g.id,color:g.color,side:g.side,size:g.size})),
  primaryBars:bars.map(b=>({id:b.id,color:b.color,shape:b.shape,ordinaryExitCrossSections:ordinary.map(g=>({gate:g.id,required:span(b,g),available:g.size,canFit:span(b,g)<=g.size}))})),
  pass:frozen.length===4&&ordinary.length===4&&frozen.every(g=>g.frozen>=7)&&ordinary.every(g=>!g.frozen)&&
   new Set(frozen.map(g=>g.frozen)).size===4&&bars.length>=Math.ceil(level.blocks.length*.5)&&
   bars.every(b=>ordinary.every(g=>span(b,g)>g.size))&&!level.blocks.some(b=>b.movementAxis!==undefined)};
}

/** Finite graph-colouring construction, not puzzle state exploration. */
function paintForFrozenAxis(level,runtime,axis,seed){
 const r=random(seed),primary=axis==='horizontal'?['left','right']:['top','bottom'];
 const frozen=level.gates.filter(g=>primary.includes(g.side)).sort(()=>r()-.5);
 if(frozen.length!==4||level.gates.length!==8)return{ok:false,reason:'four-by-four-gate-capacity'};
 frozen.forEach((g,i)=>g.frozen=7+i);
 const gates=new Map(level.gates.map(g=>[g.color,g])),ordinary=level.gates.filter(g=>!g.frozen);
 const mouths=level.blocks.flatMap((b,i)=>ordinary.filter(g=>b.shape.length>=3&&atExit(b,g,level)).map(g=>({i,color:g.color,side:g.side})))
  .map(x=>({...x,rank:r()})).sort((a,b)=>a.rank-b.rank);
 if(!mouths.length)return{ok:false,reason:'no-three-cell-ordinary-opening'};
 const neighbors=level.blocks.map(b=>level.blocks.flatMap((c,i)=>b!==c&&adjacent(b,c)?[i]:[]));
 const domains=level.blocks.map(b=>{const art=runtime.matchFormalBlockShape(b.shape,'native-only');return level.gates.filter(g=>span(b,g)<=g.size&&art?.quarterTurns===0&&runtime.GAME_ART.gameplay.formalBlocks[g.color]?.solid?.[art.shapeId]).map(g=>g.color);});
 let nodes=0,transitions=0;
 for(const start of mouths.slice(0,8)){
  const assigned=Array(level.blocks.length).fill(null);assigned[start.i]=start.color;
  const visit=n=>{
   if(nodes>=10000)return false;nodes++;
   const normal=assigned.filter(c=>c&&!gates.get(c).frozen).length,remaining=assigned.filter(c=>!c).length;
   if(normal+remaining<7)return false;
   if(n===assigned.length)return normal>=7&&new Set(assigned).size===8;
   let i=-1,choices=[],score=Infinity;
   for(let j=0;j<assigned.length;j++)if(!assigned[j]){
    const forbidden=new Set(neighbors[j].map(k=>assigned[k])),possible=domains[j].filter(c=>!forbidden.has(c));
    if(!possible.length)return false;const s=possible.length-neighbors[j].length*.01;
    if(s<score){score=s;i=j;choices=possible;}
   }
   const used=new Set(assigned.filter(Boolean));choices=choices.map(c=>({c,rank:r()})).sort((a,b)=>
    (normal<7?Number(Boolean(gates.get(a.c).frozen))-Number(Boolean(gates.get(b.c).frozen)):0)||
    Number(used.has(a.c))-Number(used.has(b.c))||
    Number(atExit(level.blocks[i],gates.get(a.c),level))-Number(atExit(level.blocks[i],gates.get(b.c),level))||a.rank-b.rank).map(x=>x.c);
   for(const c of choices){if(transitions>=10000)return false;transitions++;assigned[i]=c;if(visit(n+1))return true;assigned[i]=null;}return false;
  };
  if(!visit(1))continue;
  level.blocks.forEach((b,i)=>b.color=assigned[i]);
  return{ok:true,nodes,transitions,knownOpening:{blockId:level.blocks[start.i].id,path:[],exitSide:start.side}};
 }
 return{ok:false,reason:'finite-axis-colour-constraints',nodes,transitions};
}

/** Checks one prescribed first clear; there is no alternate path/board search. */
export function firstClearAudit(runtime,level,drag){
 const model=new runtime.PuzzleModel(level);model.startCountdown();
 const block=model.getBlock(drag.blockId),before=model.snapshot(),sides=model.possibleExitSides(block);
 if(!sides.includes(drag.exitSide))return{pass:false,reason:'prescribed-initial-clear-not-legal'};
 applyNativeDrag(model,drag);const after=model.snapshot(),allowed=new Set(boardCells(level).map(key));
 const frozenColors=new Set(after.gates.filter(g=>g.frozen>0).map(g=>g.color));
 const parkingCandidates=[];
 for(const b of after.blocks.filter(b=>frozenColors.has(b.layers?.[0]??b.color))){
  const occupied=new Set(after.blocks.filter(c=>c.id!==b.id).flatMap(absoluteCells).map(key));
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])if(absoluteCells(b).every(([x,y])=>allowed.has(key([x+dx,y+dy]))&&!occupied.has(key([x+dx,y+dy]))))parkingCandidates.push({blockId:b.id,from:[b.x,b.y],to:[b.x+dx,b.y+dy],geometryQueryOnly:true});
 }
 return{pass:after.cleared===before.cleared+1&&parkingCandidates.length>0,drag,actualClearEvents:after.cleared-before.cleared,
  beforeStateSha256:levelSha256(before),afterStateSha256:levelSha256(after),frozenColourParkingCandidates:parkingCandidates,
  knownActionReplayCount:1,boardSearchInvocations:0,doesNotProveSevenClearPrefix:true};
}

export function buildAxialIceCandidate(source,runtime,{seed=1}={}){
 const area=boardCells(source).length;if(area!==source.width*source.height)return{ok:false,reason:'normal-rectangle-required-before-irregular-board-unlock'};
 const bodyCount=Math.max(area<47?16:18,Math.round(area/2.8));
 const base=buildGlobalCandidate(source,runtime,{seed,bodyCount,irregular:false,shapeProfile:'axial-bars',primaryExitQuota:4,paletteSize:8,maxNodes:10000,maxTransitions:10000});
 if(!base.ok)return{ok:false,reason:base.reason,construction:base};
 if(!base.construction.sourceShapeMultisetChanged)return{ok:false,reason:'source-shape-inventory-not-changed'};
 const level=structuredClone(base.level),axis=base.construction.primaryBarAxis,paint=paintForFrozenAxis(level,runtime,axis,seed^0x4a791d);
 if(!paint.ok)return{ok:false,reason:paint.reason,construction:{global:base.construction,axisPaint:paint}};
 const capacity=clearInventoryCapacity(level),geometry=geometricDirectionAudit(level,axis),staticAudit=inspectHardRegionStatic(level,source,runtime);
 if(!capacity.pass||capacity.initialUnconstrainedBodies<7||!geometry.pass||!staticAudit.valid)return{ok:false,reason:'static-capacity-or-native-geometry',construction:{capacity,geometry,staticAudit}};
 const opening=firstClearAudit(runtime,level,paint.knownOpening);if(!opening.pass)return{ok:false,reason:'first-clear-does-not-open-frozen-colour-parking',construction:{opening}};
 return{ok:true,level,staticAudit,provenance:{...base.construction,version:VERSION,axisPaint:paint,geometry,eventInventory:capacity,opening,
  strategy:'At least half of bodies are long bars with cross-section wider than every ordinary perpendicular exit. Four primary-axis gates are frozen at 7/8/9/10. The ordinary opening frees a genuine adjacent parking location for a frozen-colour body; only a returned actual complete witness may establish the seven-clear path and repeated parking.',
  icePlacedBeforeFirstSearch:true,plainSearchInvocations:0,movementAxisMechanicAdded:false,
  referenceFamily:null,allShapesAndColoursAuthoredGlobally:true,wholeBoardCandidateBeforeAxisRecolourSha256:levelSha256(base.level)}};
}

/** Replay one known complete witness; never search a replacement or partial route. */
export function analyzeFrozenParking(runtime,level,drags){
 const model=new runtime.PuzzleModel(level);model.startCountdown();const events=[],parkings=[],thaws=[];
 const counts=new Map();
 for(const[i,d]of drags.entries()){
  const before=model.snapshot(),b=model.getBlock(d.blockId),from=b?[b.x,b.y]:null,color=b?.layers?.[0]??b?.color,gate=before.gates.find(g=>g.color===color);
  applyNativeDrag(model,d);const after=model.snapshot(),delta=after.cleared-before.cleared;
  if(delta)events.push({drag:i+1,blockId:d.blockId,color,clearsBefore:before.cleared,clearsAfter:after.cleared,exitSide:d.exitSide});
  if(!delta&&(gate?.frozen??0)>0){const p={drag:i+1,blockId:d.blockId,color,clearsBefore:before.cleared,remainingGateIce:gate.frozen,from,to:d.path.at(-1),unitSteps:d.path.length};parkings.push(p);counts.set(d.blockId,(counts.get(d.blockId)??0)+1);}
  for(const g of before.gates)if(g.frozen>0&&after.gates.find(x=>x.id===g.id)?.frozen===0)thaws.push({gateId:g.id,color:g.color,drag:i+1,clears:after.cleared});
 }
 const final=model.snapshot(),repeated=[...counts].filter(([,count])=>count>=2).map(([blockId,count])=>({blockId,count}));
 return{complete:final.complete&&!final.failed&&final.blocks.length===0&&final.queuedBlocks.length===0,
  firstSevenClears:events.slice(0,7),actualSevenClearPathVerified:events.length>=7&&events[6].clearsAfter>=7,
  frozenColourPreThawParkings:parkings,repeatedParkingBodies:repeated,thaws,
  strongerMechanismStrategyObserved:events.length>=7&&repeated.length>=1&&thaws.length===4,
  routeReplayOnly:true,boardSearchInvocations:0};
}

function walk(dir,fn){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory()){if(!['identities','archive'].includes(e.name))walk(p,fn);}else if(e.name.endsWith('.json'))fn(p,e.name);}}
function acceptedObjects(){const out=new Map();for(const root of [ROOT,'deliverables/league-v2-20261008'])for(const section of ['design','mechanisms','proof','selection'])walk(`${root}/${section}`,(p,n)=>{
 if(n.endsWith('.request.json')||n.endsWith('.blocked.json')||n.startsWith('audit')||['report.json','index.json','all-pairs.json','references.json','references-qualified-v32.json'].includes(n))return;
 let q;try{q=read(p);}catch{return;}if(q.level?.blocks&&(q.accepted===true||q.proof?.accepted===true)){const k=levelSha256(q.level);if(!out.has(k))out.set(k,{...bind(p),level:q.level});}
 });return[...out.values()];}
function compare(level,rows,limit){let maximum=0,nearest=null;for(const r of rows){const v=compareLayouts(level,r.level).footprintSimilarity;if(v>maximum){maximum=v;nearest=r.path;}}return{pass:maximum<=limit,maximum,nearest,limit};}

export async function runPilot({label='axial-ice-native-01',selectedIndex=`${ROOT}/selection/multistep02-selected/index.json`,sources=[10,13,22,29,50,54,55,124]}={}){
 if(!/^[a-z0-9-]+$/.test(label)||sources.length>8||sources.length<6||new Set(sources).size!==sources.length)throw Error('Six to eight distinct source slots required');
 const directory=`${ROOT}/mechanisms/${label}`;if(fs.existsSync(directory))throw Error('Immutable pilot directory already exists');
 const runtime=await loadBoundedRuntime();if(runtime.toolchainSha256!==FROZEN||DIVERSITY_POLICY.version!=='daily-diversity-v3.2')throw Error('Frozen proof/design drift');
 const selection=read(selectedIndex),selected=selection.files.map(p=>({...bind(p),level:read(p).level})),pool=acceptedObjects(),oldIndex='deliverables/daily-formal-v2-20261007/final-qualified/index.json',old=read(oldIndex).entries.map(r=>({path:r.path,level:read(r.path).level}));
 const visual=inheritedVisualExclusions(selectedIndex),visualObjects=visual.excluded.map(r=>({...bind(r.baseInputFile),level:read(r.baseInputFile).level}));
 for(const file of [`${ROOT}/proof/visual-family-audit-next18-v1.json`,`${ROOT}/proof/visual-family-audit-nearest122-v1.json`])if(fs.existsSync(file))for(const r of read(file).records??[])if(r.recommendation==='EXCLUDE_FOR_VISUAL_FAMILY_REPETITION'){const p=r.receipt.path;visualObjects.push({...bind(p),level:read(p).level});}
 const preselection=`${ROOT}/proof/preselection-visual-exclusions.json`;if(fs.existsSync(preselection))for(const r of read(preselection).records??[]){const p=read(r.reviewFile).candidate.path;visualObjects.push({...bind(p),level:read(p).level});}
 const inputBindings=[...selected,...pool,...visualObjects].map(({level,...r})=>r);
 const reservations=[];for(const name of fs.readdirSync(`${ROOT}/design`).filter(n=>n.startsWith('shared-independent-08-11')||n.startsWith('nearband2'))){const p=`${ROOT}/design/${name}/report.json`;if(!fs.existsSync(p))continue;const q=read(p);for(const row of q.selected??q.selectedSeeds??[]){if(row.path&&fs.existsSync(row.path)){const b=read(row.path);if(b.level){reservations.push({...bind(row.path),level:b.level});}}}}
 fs.mkdirSync(directory,{recursive:true});
 const toolBindings=['mechanism-axial-ice-pilot.mjs','diversity-layout-factory.mjs','diversity.mjs','bounded-proof.mjs','bounded-ice-proof.mjs','mechanism-intensity.mjs','mechanism-early-ice.mjs','design-hard-region-pool.mjs'].map(n=>{const p=`tools/daily-challenge/formal-v3/${n}`,snapshot=`${directory}/${n}.snapshot`;fs.copyFileSync(p,snapshot,fs.constants.COPYFILE_EXCL);return{...bind(p),snapshot};});
 write(`${directory}/scope.json`,{version:VERSION,sourceIds:sources,maximumSearches:8,maximumConstructionsPerSource:64,proofToolchainSha256:runtime.toolchainSha256,
  currentSelection:{...bind(selectedIndex),count:selected.length},acceptedObjectCount:pool.length,inputBindings,oldIndex:bind(oldIndex),visual,reservations:reservations.map(({level,...r})=>r),toolBindings,
  strategy:'New global axial stock; 4 frozen primary-axis exits at 7/8/9/10, 4 ordinary perpendicular exits. No source layout, successful descendant, or failed object is reused. Construction node counters are separate from board search. One actual opening action is replayed; seven-clear path and repeated parking remain UNVERIFIED unless the single exact-ice search yields an actual complete witness.',
  floor:31,searchUpper:128,searchWindowIsNotDifficultyUpperLimit:true,budget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},formalReady:false});
 const rows=[],records=[],constructionRows=[];const report=status=>{fs.writeFileSync(`${directory}/report.json`,JSON.stringify({version:VERSION,status,formalReady:false,productionChanged:false,searched:rows.filter(r=>r.attemptId).length,accepted:records.length,sourceIds:sources,rows,constructionRows,records},null,2)+'\n');fs.writeFileSync(`${directory}/index.json`,JSON.stringify({status,formalReady:false,records},null,2)+'\n');};
 for(const sourceId of sources){
  const source=runtime.LEVELS.find(l=>l.id===sourceId);let chosen;
  for(let k=0;k<64;k++){
   const seed=createHash('sha256').update(`${label}:whole-board:${sourceId}:${k}`).digest().readUInt32LE(0),built=buildAxialIceCandidate(source,runtime,{seed});
   const c={sourceLevelId:sourceId,construction:k,seed,ok:built.ok,reason:built.reason??null};constructionRows.push(c);
   if(!built.ok){c.details=built.construction;continue;}
   const l=built.level;const comparisons={source:compare(l,[{path:`mainline:${sourceId}`,level:source}],.55),selected:compare(l,selected,.65),successful:compare(l,pool,.65),old450:compare(l,old,.75),visual:compare(l,visualObjects,.65),parallelLowU:compare(l,reservations,.65)};c.comparisons=comparisons;
   if(Object.values(comparisons).some(q=>!q.pass)){c.ok=false;c.reason='symmetric-diversity-rejected-before-search';continue;}
   chosen={...built,comparisons,seed,construction:k};break;
  }
  if(!chosen){rows.push({sourceLevelId:sourceId,status:'NO_STATIC_CANDIDATE',searched:false});report('FINITE_PILOT_RUNNING');continue;}
  const level=chosen.level,serial=rows.length;const row={sourceLevelId:sourceId,seed:chosen.seed,construction:chosen.construction,levelSha256:levelSha256(level),status:'SEARCH_PENDING',comparisons:chosen.comparisons};rows.push(row);
  const requestPath=`${directory}/input-${String(serial).padStart(4,'0')}.json`;write(requestPath,{sourceLevelId:sourceId,level,provenance:chosen.provenance,staticAudit:chosen.staticAudit,comparisons:chosen.comparisons,proofToolchainSha256:runtime.toolchainSha256,toolBindings});
  let result;try{result=await exploreBoundedIceCandidate(runtime,{sourceLevelId:sourceId,level},{floor:31,searchUpper:128,budget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000}});}catch(error){Object.assign(row,{status:'LEDGER_REJECTED',reason:error.message});report('FINITE_PILOT_RUNNING');continue;}
  const packet={...result,mechanismFirst:true,stageKey:'mechanisms-frozen-exit-6',targets:intensityTargets('frozen-exit',3),intensityTargets:intensityTargets('frozen-exit',3),provenance:chosen.provenance,
   staticAudit:chosen.staticAudit,comparisons:chosen.comparisons,inputRequest:bind(requestPath),toolBindings,sourceLevelSha256:levelSha256(source),mathAccepted:result.accepted};
  if(result.drags){packet.actualReplay=replayDecorated(runtime,level,result.drags);packet.participation=auditMechanismParticipation(level,result.drags,packet.actualReplay,'frozen-exit',packet.targets);packet.earlyParking=analyzeFrozenParking(runtime,level,result.drags);}
  packet.accepted=result.accepted&&packet.participation?.pass===true&&packet.earlyParking?.strongerMechanismStrategyObserved===true;
  if(result.accepted&&!packet.accepted)packet.status='MATH_D3_PASSED_MECHANISM_STRATEGY_UNOBSERVED';
  if(!result.drags)packet.earlyParking={actualSevenClearPathVerified:false,status:'UNVERIFIED_NO_COMPLETE_WITNESS',additionalPrefixSearches:0};
  const p=result.proof;if(p.rawFullBoardStates>10000||p.rawExploredStates>10000||p.rawFullBoardStates!==p.discoveredStates||p.rawExploredStates!==p.exploredStates)throw Error('Raw-state budget discrepancy');
  const candidatePath=`${directory}/candidate-${String(serial).padStart(4,'0')}.json`;write(candidatePath,packet);
  Object.assign(row,{path:candidatePath,fileSha256:sha(candidatePath),status:packet.status,accepted:packet.accepted,attemptId:result.attempt.id,
   proof:{termination:p.routeTermination??p.termination,rawFullBoardStates:p.rawFullBoardStates,rawExploredStates:p.rawExploredStates,actions:p.attemptedTransitions,micro:p.microDiscoveredStates,elapsedMilliseconds:p.elapsedMilliseconds,certifiedFloor:p.certifiedFloor,L:result.L,U:result.U},
   actualSevenClearPathVerified:packet.earlyParking.actualSevenClearPathVerified,preThawParking:packet.earlyParking.frozenColourPreThawParkings?.length??null,repeatedParkingBodies:packet.earlyParking.repeatedParkingBodies?.length??null});
  if(packet.accepted){records.push({path:candidatePath,fileSha256:sha(candidatePath),sourceLevelId:sourceId,stageKey:packet.stageKey,difficulty:3,L:packet.L,U:packet.U});pool.push({path:candidatePath,level});}
  report('FINITE_PILOT_RUNNING');console.log(JSON.stringify(row));
 }
 for(const b of toolBindings)if(sha(b.path)!==b.fileSha256)throw Error('Loaded tool snapshot changed during pilot');
 report('FINITE_PILOT_COMPLETE');return{directory,constructionCount:constructionRows.length,searched:rows.filter(r=>r.attemptId).length,accepted:records.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(await runPilot({label:process.argv[2]??'axial-ice-native-01'})));
