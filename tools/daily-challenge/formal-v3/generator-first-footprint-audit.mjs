import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';

export const FIRST_FOOTPRINT_AUDIT_VERSION='read-only-unit-step-first-cargo-footprint-v1';
export const CARGO_SHAPES=Object.freeze({S1:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],SQ2:[[0,0],[1,0],[0,1],[1,1]]});
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const cellKey=p=>p.join(','),blockCells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]);

export async function loadMountAudit(){
 const built=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:[
  'export {auditGeneratorMounts} from "./src/core/generatorMountContract.ts";',
  'export {validateGeneratorMouthSpawn,resolveGeneratorMouthTemplate} from "./src/core/generatorMouthSpawnGeometry.ts";',
 ].join('\n')},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
}

/** Known-route replay only. A sample follows every native unit step, actual
 * clear, commit, and departure completion; no alternate action is explored. */
export function traceKnownRoute(runtime,level,drags){
 assert(!level.generators?.length&&!level.shutters?.length&&!level.elevators?.length&&!level.conveyors?.length);
 assert(level.blocks.every(b=>(b.layers?.length??1)===1&&b.timedBombSeconds===undefined));
 const model=new runtime.PuzzleModel(structuredClone(level),{deferExitCompletion:true}),samples=[],dragEvents=[];
 const legal=new Set((level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)]))
  .filter(p=>!(level.blocked??[]).some(b=>cellKey(b)===cellKey(p))).map(cellKey));
 model.startCountdown();let unitSteps=0;
 const record=(phase,drag=0,unitStep=0,blockId=null)=>{
  const s=model.snapshot(),occupied=new Set(s.blocks.flatMap(blockCells).map(cellKey));
  samples.push({index:samples.length,phase,drag,unitStep,unitSteps,blockId,cleared:s.cleared,baseBodiesRemaining:s.blocks.length,
   freeCells:legal.size-occupied.size,occupied,stateSha256:levelSha256(s)});
 };
 record('opening');
 for(const[i,d]of drags.entries()){
  const before=model.snapshot(),start=model.getBlock(d.blockId);assert(start,'missing supplied-route body');
  const clearedArea=start.shape.length;model.beginAction();let exit=canonicalExit(runtime,model,d.blockId);
  assert(!exit||d.path.length===0,'provided path passes initial automatic exit');
  for(const[j,p]of d.path.entries()){
   const body=model.getBlock(d.blockId),previous=[body.x,body.y];
   assert(model.moveBlockStep(d.blockId,...p),`provided move rejected ${i}:${j}`);unitSteps++;record('unit-step',i+1,j+1,d.blockId);
   exit=canonicalExit(runtime,model,d.blockId,previous);assert(!exit||j===d.path.length-1,'provided path crosses automatic exit');
  }
  assert.equal(exit,d.exitSide,'provided canonical exit differs');let departure;
  if(d.exitSide){departure=model.tryExit(d.blockId,d.exitSide);assert(departure.ok);record('clear',i+1,d.path.length,d.blockId);}
  assert(model.commitAction());record('commit',i+1,d.path.length,d.blockId);
  if(departure?.exitAnimationId){assert(model.completeExitAnimation(departure.exitAnimationId));record('animation-complete',i+1,d.path.length,d.blockId);}
  const after=model.snapshot();assert(!after.failed);
  dragEvents.push({drag:i+1,blockId:d.blockId,clearDelta:after.cleared-before.cleared,
   removedArea:after.cleared>before.cleared?clearedArea:0,baseBodiesRemaining:after.blocks.length,cleared:after.cleared,endingSample:samples.length-1});
 }
 const final=model.snapshot();assert(final.complete&&!final.failed&&!final.blocks.length&&!final.queuedBlocks.length);
 const chains=[];let chain;
 for(const d of dragEvents){
  if(d.clearDelta===0){if(!chain)chain={fromDrag:d.drag,toDrag:d.drag,nonClearingDrags:0,clearedBefore:d.cleared};chain.toDrag=d.drag;chain.nonClearingDrags++;chain.endingSample=d.endingSample;}
  else if(chain){chains.push({...chain,nextClearDrag:d.drag});chain=null;}
 }if(chain)chains.push(chain);
 const largestChain=[...chains].sort((a,b)=>b.nonClearingDrags-a.nonClearingDrags)[0]??null;
 if(largestChain){const during=samples.filter(s=>s.drag>=largestChain.fromDrag&&s.drag<=largestChain.toDrag);
  largestChain.freeCellMinimum=Math.min(...during.map(s=>s.freeCells));largestChain.freeCellMaximum=Math.max(...during.map(s=>s.freeCells));
  largestChain.sampleCount=during.length;largestChain.removedAreaBefore=dragEvents.filter(d=>d.drag<largestChain.fromDrag).reduce((n,d)=>n+d.removedArea,0);
 }
 return{samples,dragEvents,chains,largestChain,
  valid:true,complete:true,totalDrags:drags.length,nonClearingDrags:dragEvents.filter(x=>!x.clearDelta).length,unitSteps,
  fullBoardSearchInvocations:0,alternativeActionsExplored:0};
}

export function firstEmptySample(samples,footprint){
 const keys=footprint.map(cellKey),s=samples.find(s=>keys.every(k=>!s.occupied.has(k)));
 if(!s)return null;const{occupied,...event}=s;return event;
}

function physicalBerths(level,mountAudit){
 const out=[];
 for(const side of ['top','right','bottom','left']){
  const n=['top','bottom'].includes(side)?level.width:level.height;
  for(let center=0;center<n;center++){
   const mouth=side==='left'?[0,center]:side==='right'?[level.width-1,center]:side==='top'?[center,0]:[center,level.height-1];
   const machine={id:`probe-${side}-${center}`,side,offset:center,rimSpan:3,rimMount:'rim',spawn:mouth,queueBlockIds:['probe-cargo']};
   const boundaryIssues=mountAudit.auditGeneratorMounts({...level,gates:[],flipDoors:[],generators:[machine]});
   if(boundaryIssues.length)continue;
   const actualIssues=mountAudit.auditGeneratorMounts({...level,generators:[machine]});
   out.push({id:machine.id,side,center,mouth,machine,existingMountValid:actualIssues.length===0,existingMountIssues:actualIssues});
  }
 }
 return out;
}

/** Static mount combinations only, not a board/route search. It deliberately
 * proves no simultaneous cargo capacity: overlapping heads can block one another. */
function maxMountSet(level,berths,mountAudit,redesignExits=false){
 let best=[],checks=0;const workLevel=redesignExits?{...level,gates:[],flipDoors:[]}:level;
 const visit=(chosen,start)=>{if(chosen.length>best.length)best=chosen;if(best.length>=4)return;
  for(let i=start;i<berths.length;i++){
   if(chosen.length+berths.length-i<=best.length)break;checks++;
   const next=[...chosen,berths[i]];if(mountAudit.auditGeneratorMounts({...workLevel,generators:next.map(x=>x.machine)}).length)continue;
   visit(next,i+1);if(best.length>=4)return;
  }};visit([],0);
 return{capacityCappedAtFour:best.length,ids:best.map(x=>x.id),staticMountCombinationChecks:checks,
  fullBoardSearchInvocations:0,simultaneousFIFOFeasibilityCertified:false};
}

function fourDisjointHeadWitness(level,heads,berths,mountAudit){
 let checks=0,found=null;const byId=new Map(berths.map(b=>[b.id,b]));
 const visit=(selected,start)=>{
  if(selected.length===4){found=selected;return;}if(found||checks>=5000)return;
  const occupied=new Set(selected.flatMap(h=>h.footprint.map(cellKey)));
  for(let i=start;i<heads.length&&!found&&checks<5000;i++){
   const head=heads[i];checks++;
   if(selected.some(h=>h.berthId===head.berthId)||head.footprint.some(p=>occupied.has(cellKey(p))))continue;
   const next=[...selected,head],machines=next.map(h=>byId.get(h.berthId).machine);
   if(mountAudit.auditGeneratorMounts({...level,gates:[],flipDoors:[],generators:machines}).length)continue;
   visit(next,i+1);
  }
 };visit(heads.length?[]:[],0);
 return{found:!!found,headIds:found?.map(h=>h.id)??[],heads:found??[],staticFootprintCombinationChecks:checks,
  termination:found?'four-disjoint-geometric-heads':checks>=5000?'finite-static-combination-limit':'static-combinations-exhausted',
  fullBoardSearchInvocations:0,requiresNewExitDesign:true,completeFIFOProven:false};
}

export function auditRouteFootprints(runtime,mountAudit,packet){
 const {level,drags}=packet,trace=traceKnownRoute(runtime,level,drags),berths=physicalBerths(level,mountAudit),heads=[];
 const exits=[...level.gates,...(level.flipDoors??[])],chain=trace.largestChain;
 for(const berth of berths)for(const[name,baseShape]of Object.entries(CARGO_SHAPES)){
  const width=Math.max(...baseShape.map(p=>p[0]))+1,height=Math.max(...baseShape.map(p=>p[1]))+1;
  for(let dx=1-width;dx<=0;dx++)for(let dy=1-height;dy<=0;dy++){
   const shape=baseShape.map(([x,y])=>[x+dx,y+dy]),spawn=berth.mouth;
   const placement=mountAudit.validateGeneratorMouthSpawn(berth.machine,spawn,shape,level);if(placement.status!=='ok')continue;
   const match=runtime.matchFormalBlockShape(shape,'native-only');assert(match&&match.quarterTurns===0);
   const compatibleExits=exits.filter(g=>g.size>=(['top','bottom'].includes(g.side)?width:height)
    &&runtime.GAME_ART.gameplay.formalBlocks[g.color]?.solid?.[match.shapeId]);
   const first=firstEmptySample(trace.samples,placement.footprint),mouthFirst=firstEmptySample(trace.samples,[spawn]);
   heads.push({id:`${berth.id}/${name}/${dx}/${dy}`,berthId:berth.id,shapeName:name,spawn,shape,footprint:placement.footprint,
    shapeId:match.shapeId,quarterTurns:0,existingMountValid:berth.existingMountValid,
    compatibleExitColors:[...new Set(compatibleExits.map(g=>g.color))],compatibleExitIds:compatibleExits.map(g=>g.id),
    firstEmpty:first,singleCellFirstEmpty:mouthFirst,delayedSamplesVersusS1:first&&mouthFirst?first.index-mouthFirst.index:null,
    hasAtLeastTwoOriginalBodies:first?first.baseBodiesRemaining>=2:false,
    afterLargestTransferChain:first&&chain?first.index>chain.endingSample:false,
    reservationOnly:true,queueInjected:false,completeFIFOProven:false});
  }
 }
 const useful=heads.filter(h=>h.shapeName!=='S1'&&h.firstEmpty&&h.hasAtLeastTwoOriginalBodies&&h.afterLargestTransferChain&&h.compatibleExitColors.length>=2);
 const usefulBerths=berths.filter(b=>useful.some(h=>h.berthId===b.id)),actual=usefulBerths.filter(b=>b.existingMountValid);
 const byShape=Object.fromEntries(['H2','V2','SQ2'].map(name=>{
  const eligible=berths.filter(b=>useful.some(h=>h.berthId===b.id&&h.shapeName===name));
  const existing=maxMountSet(level,eligible.filter(b=>b.existingMountValid),mountAudit,false),redesigned=maxMountSet(level,eligible,mountAudit,true);
  const representatives=redesigned.ids.map(id=>useful.filter(h=>h.berthId===id&&h.shapeName===name).sort((a,b)=>a.firstEmpty.index-b.firstEmpty.index)[0]);
  return[name,{existing,exitsMustBeRedesigned:redesigned,representativeHeadFootprints:representatives,
   fourDisjointHeadsForNewLayout:fourDisjointHeadWitness(level,useful.filter(h=>h.shapeName===name),berths,mountAudit)}];
 }));
 const cleanSamples=trace.samples.map(({occupied,...s})=>s);
 return{levelSha256:levelSha256(level),routeSha256:routeSha256(drags),sourceLevelId:packet.sourceLevelId,formalId:packet.formalId,
  width:level.width,height:level.height,openingBodies:level.blocks.length,knownL:packet.L,knownU:packet.U,
  route:{...trace,samples:cleanSamples},berths,heads,byShape,
  firstFreeAfterChainDefinition:'First wholly empty footprint occurs after the last commit in the longest consecutive non-clearing segment. Exact unit-step samples are retained, including earlier vacancies excluded by this conservative filter.',
  exitCompatibilityDefinition:'Native color artwork and exit cross-section only. No cargo route, current gate phase, ice timing, or complete FIFO claim.',
  afterChainHeadCounts:Object.fromEntries(Object.keys(CARGO_SHAPES).map(name=>[name,useful.filter(h=>h.shapeName===name).length])),
  existingExitsMountCapacity:maxMountSet(level,actual,mountAudit,false),
  boundaryCapacityOnlyIfExitsRedesigned:maxMountSet(level,usefulBerths,mountAudit,true),
  existingLayoutReusedForAnotherSlot:false,fullBoardSearchInvocations:0};
}

export async function runFirstFootprintAudit({indexPath='deliverables/daily-formal-v3-20261008/selection/compose12-selected-01/index.json',
 output='deliverables/daily-formal-v3-20261008/mechanisms/d3-first-footprint-audit-01.json'}={}){
 if(fs.existsSync(output))throw Error('Keep previous footprint audits immutable');
 const runtime=await loadBoundedRuntime(),mountAudit=await loadMountAudit(),index=JSON.parse(fs.readFileSync(indexPath)),rows=[];
 for(const file of index.files){const packet=JSON.parse(fs.readFileSync(file));if(packet.difficulty!==3||!packet.accepted)continue;
  const before=sha(file),row=auditRouteFootprints(runtime,mountAudit,packet);assert.equal(sha(file),before);
  rows.push({inputFile:file,inputFileSha256:before,...row});
 }
 const art=Object.entries(CARGO_SHAPES).map(([name,shape])=>{const match=runtime.matchFormalBlockShape(shape,'native-only');return{name,shape,match,
  colors:Object.entries(runtime.GAME_ART.gameplay.formalBlocks).map(([color,a])=>{const asset=a.solid?.[match.shapeId],file=asset?path.join('public',asset):null;
   return{color,assetPath:asset,exists:!!file&&fs.existsSync(file),sha256:file&&fs.existsSync(file)?sha(file):null};})};});
 const report={schemaVersion:1,version:FIRST_FOOTPRINT_AUDIT_VERSION,generatedAt:new Date().toISOString(),ruleVersion:runtime.boundedRuleVersion,
  proofToolchainSha256:runtime.toolchainSha256,toolSha256:sha(path.resolve('tools/daily-challenge/formal-v3/generator-first-footprint-audit.mjs')),
  inputIndex:indexPath,inputIndexSha256:sha(indexPath),art,rows,fullBoardSearchInvocations:0,alternativeMovesExplored:0,
  productionChanged:false,oldEvidenceChanged:false,formalReady:false,
  limitation:'Only the supplied successful routes are replayed. First-empty geometry is a necessary opportunity, not a complete augmented puzzle or simultaneous multi-machine FIFO certificate. Existing D3 objects remain assigned to their current slots; exit-redesign capacities are guidance for new global layouts only.'};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const r=await runFirstFootprintAudit();console.log(JSON.stringify(r.rows.map(x=>({source:x.sourceLevelId,U:x.knownU,chain:x.route.largestChain,
  shapes:x.afterChainHeadCounts,actual:x.existingExitsMountCapacity,potential:x.boundaryCapacityOnlyIfExitsRedesigned}))));
}
