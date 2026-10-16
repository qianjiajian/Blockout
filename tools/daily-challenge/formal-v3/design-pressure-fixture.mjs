import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadBoundedRuntime,boundedPlainTask,boundedBudget,createAttemptLedger,designFingerprints} from './bounded-proof.mjs';
import {independentReplay,levelSha256} from '../formal-v2/contract.mjs';
import {retileWholeBoard,boardCells,absoluteCells,bodyFootprint,random,inventorySummary,orbitFootprintArea} from './diversity-layout-factory.mjs';
import {compareLayouts} from './diversity.mjs';

export const PRESSURE_VERSION='single-opening-cross-axis-exit-pressure-1';
const shuffle=(xs,r)=>xs.map(x=>({x,k:r()})).sort((a,b)=>a.k-b.k).map(x=>x.x);
const width=b=>1+Math.max(...b.shape.map(p=>p[0])),height=b=>1+Math.max(...b.shape.map(p=>p[1]));
function atExit(b,g,l){const horizontal=g.side==='top'||g.side==='bottom',offset=horizontal?b.x:b.y,span=horizontal?width(b):height(b);
  return offset>=g.offset&&offset+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+height(b)===l.height:g.side==='left'?b.x===0:b.x+width(b)===l.width);}

/** Construction only: fresh exact cover and constrained six-colour assignment.
 * No puzzle route is searched, replayed or used to select a physics outcome. */
export function buildPressureCandidate(source,runtime,{seed=1}={}){
  const r=random(seed),area=boardCells(source).length;
  if(area!==source.width*source.height||source.width<6)return{ok:false,reason:'normal-rectangle-required'};
  const bodyCount=Math.round(area/(2.65+r()*.2));
  const partition=retileWholeBoard(source,runtime,{seed:seed|1,shapeProfile:'axial-bars',bodyCount,maxNodes:10000,maxTransitions:10000});
  if(!partition.ok)return{ok:false,reason:partition.reason,construction:{partition}};
  const bars=partition.blocks.filter(b=>width(b)===1&&height(b)===3),cross=partition.blocks.filter(b=>width(b)>=2);
  if(bars.length<Math.ceil(bodyCount*.5)||cross.length<3||!cross.some(b=>height(b)>=2))return{ok:false,reason:'missing-cross-axis-pressure',construction:{nodes:partition.nodes,transitions:partition.transitions}};
  const level={id:source.id,name:`每日基础阻塞研究 ${source.id}-${seed}`,difficulty:'super',reward:0,
    width:source.width,height:source.height,...(source.playable?{playable:structuredClone(source.playable)}:{}),
    ...(source.blocked?{blocked:structuredClone(source.blocked)}:{}),timeSeconds:source.timeSeconds,parMoves:source.parMoves,
    mechanismRules:'revised-2026-09-27-v1.5',blocks:partition.blocks,gates:[]};
  const colors=shuffle(Object.keys(runtime.GAME_ART.gameplay.formalBlocks),r).slice(0,6);
  const apertures=[];
  for(const side of ['top','bottom']){
    const left=Math.floor(r()*Math.max(1,level.width-4)),right=left+2+Math.floor(r()*Math.max(1,level.width-left-3));
    apertures.push({side,offset:left,size:2},{side,offset:Math.min(level.width-2,right),size:2});
  }
  apertures.push({side:'left',offset:Math.floor(r()*(level.height-1)),size:2},
    {side:'right',offset:Math.floor(r()*(level.height-1)),size:2});
  level.gates=apertures.map((g,i)=>({id:`pressure-g-${i}`,color:colors[i],...g}));
  const cells=level.blocks.map(absoluteCells),adjacent=cells.map((a,i)=>cells.flatMap((b,j)=>i!==j&&a.some(([x,y])=>b.some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1))?[j]:[]));
  const domains=level.blocks.map(b=>{const shape=runtime.matchFormalBlockShape(b.shape,'native-only');
    return level.gates.flatMap((g,i)=>runtime.GAME_ART.gameplay.formalBlocks[g.color]?.solid?.[shape?.shapeId]
      &&(g.side==='top'||g.side==='bottom'?width(b):height(b))<=g.size?[i]:[]);});
  const openings=shuffle(level.blocks.flatMap((b,i)=>b.shape.length>=3?domains[i].filter(g=>atExit(b,level.gates[g],level)).map(g=>({i,g})):[]),r);
  if(!openings.length)return{ok:false,reason:'no-large-initial-clear'};
  const opening=openings[0],assigned=Array(bodyCount).fill(-1);assigned[opening.i]=opening.g;
  let nodes=0,transitions=0;
  const distance=(b,g)=>{const horizontal=g.side==='top'||g.side==='bottom',at=horizontal?b.x:b.y,span=horizontal?width(b):height(b);
    return Math.min(Math.abs(at-g.offset),Math.abs(at+span-g.offset-g.size));};
  const dfs=n=>{
    if(nodes>=10000||transitions>=10000)return false;nodes++;
    if(n===bodyCount)return new Set(assigned).size===6;
    let index=-1,choices=null;
    for(let i=0;i<bodyCount;i++)if(assigned[i]<0){const possible=domains[i].filter(g=>!atExit(level.blocks[i],level.gates[g],level)&&!adjacent[i].some(j=>assigned[j]===g));
      if(!possible.length)return false;if(!choices||possible.length<choices.length){index=i;choices=possible;}}
    const used=new Set(assigned),b=level.blocks[index];
    choices=choices.map(g=>({g,score:r()+distance(b,level.gates[g])*.24+(used.has(g)?0:.4)})).sort((a,b)=>b.score-a.score).map(x=>x.g);
    for(const g of choices){if(transitions>=10000)return false;transitions++;assigned[index]=g;if(dfs(n+1))return true;assigned[index]=-1;}
    return false;
  };
  if(!dfs(1))return{ok:false,reason:'single-opening-colouring-unsatisfied',construction:{nodes,transitions}};
  level.blocks=level.blocks.map((b,i)=>({...b,color:colors[assigned[i]]}));
  try{runtime.validateLevel(level);}catch(e){return{ok:false,reason:e.message};}
  const model=new runtime.PuzzleModel(level),initialExits=level.blocks.filter(b=>model.possibleExitSides(model.getBlock(b.id)).length);
  if(initialExits.length!==1)return{ok:false,reason:'actual-opening-count-mismatch'};
  const sourceInventory=inventorySummary(source,runtime),actualInventory=inventorySummary(level,runtime);
  if(actualInventory.nonNativeOrMissingArtIds.length)return{ok:false,reason:'missing-original-art'};
  return{ok:true,level,sourceLevelSha256:levelSha256(source),construction:{seed,bodyCount,V3:bars.length,crossAxisBodies:cross.length,
    partitionNodes:partition.nodes,partitionTransitions:partition.transitions,colourNodes:nodes,colourTransitions:transitions,
    initialExitCount:1,initialClearBody:initialExits[0].id,sourceBoardExactlyRetained:true,sourceInventory,actualInventory,
    policy:'Fresh full-board tiling; six new unique-colour apertures; exactly one actual initial clear; colour preference maximizes required cross-axis alignment. Construction constraints do not prove difficulty.',
    inventoryAdaptation:'Daily inventory authored independently; source geometry retained, source hidden/queue/shell inventories disclosed, not claimed retained.'}};
}

async function main(){
  const label=process.env.PRESSURE_LABEL??'pressure-plain-01',root='deliverables/daily-formal-v3-20261008/design',dir=`${root}/${label}`;
  if(fs.existsSync(dir))throw Error('New label required; never overwrite historical attempts');
  const maxSearches=Number(process.env.PRESSURE_MAX_SEARCHES??40),maxConstructions=Number(process.env.PRESSURE_MAX_CONSTRUCTIONS??800);
  if(!Number.isSafeInteger(maxSearches)||maxSearches<1||maxSearches>40||!Number.isSafeInteger(maxConstructions)||maxConstructions<1||maxConstructions>1000)throw Error('Finite pressure research ceilings exceeded');
  const runtime=await loadBoundedRuntime(),ledger=await createAttemptLedger('deliverables/daily-formal-v3-20261008/proof/attempts');
  const sourceIds=[29,54,55,149],sources=sourceIds.map(id=>runtime.LEVELS.find(l=>l.id===id));
  const priorPaths=new Set(),prior=[];
  for(const item of fs.readdirSync(root,{withFileTypes:true}))if(item.isDirectory()){
    const file=`${root}/${item.name}/report.json`;if(!fs.existsSync(file))continue;
    try{const p=JSON.parse(fs.readFileSync(file));for(const a of p.accepted??[])if(a.path)priorPaths.add(a.path);}catch{}
  }
  for(const path of priorPaths)try{const p=JSON.parse(fs.readFileSync(path));if(p.accepted&&p.level)prior.push(p.level);}catch{}
  const oldIndex=JSON.parse(fs.readFileSync('deliverables/daily-formal-v2-20261007/final-qualified/index.json'));
  const oldPool=oldIndex.entries.map(e=>JSON.parse(fs.readFileSync(e.path)).level);
  const budgets=boundedBudget({maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
  const rows=[],accepted=[],parents=new Map(),partitions=new Set(prior.map(l=>levelSha256(l.blocks.map(bodyFootprint).sort())));
  let searches=0;
  fs.mkdirSync(dir,{recursive:true});
  const bindings=['tools/daily-challenge/formal-v3/design-pressure-fixture.mjs','tools/daily-challenge/formal-v3/diversity-layout-factory.mjs'].map(path=>({path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')}));
  const write=status=>fs.writeFileSync(`${dir}/report.json`,JSON.stringify({status,factoryVersion:PRESSURE_VERSION,ruleVersion:runtime.boundedRuleVersion,
    maxSearches,maxConstructions,searches,budgets,sourceIds,toolchainSha256:runtime.toolchainSha256,bindings,rows,accepted,productionChanged:false,formalReady:false},null,2)+'\n');
  for(let serial=0;serial<maxConstructions&&searches<maxSearches;serial++){
    const source=sources[serial%sources.length],seed=(0x65730d+Math.imul(serial+1,8191)+[...label].reduce((n,c)=>n+c.charCodeAt(0)*439,0))>>>0;
    const made=buildPressureCandidate(source,runtime,{seed}),row={serial,sourceLevelId:source.id,seed,status:'CONSTRUCTION_REJECTED',reason:made.reason??null};rows.push(row);
    if(!made.ok){write('RUNNING');continue;}
    const level=made.level,fingerprints=designFingerprints(level),parent=parents.get(source.id),partitionSha256=levelSha256(level.blocks.map(bodyFootprint).sort());
    const nearestPool=Math.max(0,...prior.map(p=>compareLayouts(p,level).footprintSimilarity)),nearestOld=Math.max(0,...oldPool.map(p=>compareLayouts(p,level).footprintSimilarity));
    Object.assign(row,{partitionSha256,sourceSimilarity:orbitFootprintArea(source,level),nearestPool,nearestOld});
    if(partitions.has(partitionSha256)||row.sourceSimilarity>.55||nearestPool>.65||nearestOld>.75){row.reason='duplicate-or-layout-similarity';write('RUNNING');continue;}
    if(parent&&(parent.shapeSha256===fingerprints.shapeSha256||parent.colorSha256===fingerprints.colorSha256)){row.reason='both-actual-shape-and-colour-must-change-after-failure';write('RUNNING');continue;}
    let attempt;try{attempt=await ledger.claim(level,parent?{redesignOf:parent.designSha256}:{});}catch(e){row.reason=e.message;write('RUNNING');continue;}
    searches++;partitions.add(partitionSha256);
    const proof=boundedPlainTask(level,runtime,{floor:16,searchUpper:96,...budgets});
    const path=`${dir}/candidate-${String(serial).padStart(4,'0')}.json`;
    const packet={schemaVersion:3,exploratory:true,sourceLevelId:source.id,sourceLevelSha256:made.sourceLevelSha256,level,levelSha256:levelSha256(level),
      factoryVersion:PRESSURE_VERSION,provenance:made.construction,attempt,proof,proofToolchainSha256:runtime.toolchainSha256,
      toolchainBindings:runtime.toolchainBindings,accepted:false,status:'UNKNOWN',formalReady:false};
    if(proof.rawFullBoardStates!==proof.discoveredStates||proof.rawExploredStates!==proof.exploredStates||proof.discoveredStates>10000||proof.exploredStates>10000)throw Error('Raw accounting contract violated');
    if(proof.drags){
      packet.drags=proof.drags;packet.replay=runtime.replayRevisedRoute(level,proof.drags);packet.independentReplay=independentReplay(runtime,level,proof.drags);
      const U=packet.replay.nonClearingDrags,L=proof.certifiedFloor,difficulty=U<=20?1:U<=30?2:3;
      if(packet.replay.valid&&packet.replay.complete&&packet.independentReplay.valid&&packet.independentReplay.complete&&!packet.independentReplay.failed
        &&packet.independentReplay.nonClearingDrags===U&&L>=[0,16,21,31][difficulty]&&L<=U){
        Object.assign(packet,{accepted:true,status:'EXPLORATORY_SAME_OBJECT_LU_PENDING_V3_CONTRACT',difficulty,L,U});
        accepted.push({path,sourceLevelId:source.id,difficulty,L,U,partitionSha256});prior.push(level);
      }else packet.status=U<16?'COUNTEREXAMPLE_BELOW_BAND':'UPPER_OR_LOWER_NOT_QUALIFIED';
    }
    await ledger.finish(attempt,{...packet,lowerBound:{result:proof},route:{search:proof}});if(!packet.accepted)parents.set(source.id,fingerprints);
    Object.assign(row,{path,status:packet.status,reason:proof.routeTermination??proof.termination,L:packet.L??null,U:packet.U??proof.cost??null,
      rawFullBoardStates:proof.rawFullBoardStates,rawExploredStates:proof.rawExploredStates,transitions:proof.attemptedTransitions});
    fs.writeFileSync(path,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});write('RUNNING');
    console.log(JSON.stringify({serial,searches,status:row.status,L:row.L,U:row.U,states:row.rawFullBoardStates,accepted:accepted.length}));
  }
  write('FINITE_PRESSURE_BATCH_FINISHED');console.log(JSON.stringify({finished:true,constructions:rows.length,searches,accepted}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
