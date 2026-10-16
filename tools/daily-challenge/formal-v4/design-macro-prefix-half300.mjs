import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {retileWholeBoard,boardCells,bodyFootprint,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {colourMacroForPrefix} from '../formal-v3/design-macro-prefix-colouring.mjs';
import {probeMappedMacroPrefix} from '../formal-v3/design-macro-prefix-probe.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';

const ROOT='deliverables/daily-formal-v3-20261008',OLD=`${ROOT}/design/macro-prefix64-04`;
const OUT='deliverables/daily-formal-v4-20261008/design/macro-prefix-half300-01';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const cellKey=p=>p.join(','),absolute=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]);
const mask=l=>levelSha256({width:l.width,height:l.height,cells:boardCells(l).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
const fp=l=>designFingerprints(l),stock=l=>levelSha256(l.blocks.map(bodyFootprint).sort());
const changed=(a,b)=>a.shapeSha256!==b.shapeSha256&&a.colorSha256!==b.colorSha256
 &&b.colorAssignments.some(x=>a.colorAssignments.some(y=>x.id===y.id&&JSON.stringify(x.colors)!==JSON.stringify(y.colors)));
const connected=points=>{if(!points.length)return false;const set=new Set(points.map(cellKey)),seen=new Set([cellKey(points[0])]),q=[points[0]];
 for(const[x,y]of q)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const k=cellKey(p);if(set.has(k)&&!seen.has(k)){seen.add(k);q.push(p);}}
 return seen.size===set.size;};
assert(!fs.existsSync(OUT),'A completed or partial finite plan must never restart');
const runtime=await loadV4Runtime(),prior=read(`${OLD}/scope156/completion-audit.json`);
assert.equal(prior.actualInputs,1);assert.equal(prior.newJointSearches,1);assert.equal(prior.result.source,105);
const oldSolve=read(`${OLD}/scope156/solve-1/report.json`);assert.equal(oldSolve.rows.length,1);assert.equal(oldSolve.rows[0].accepted,false);
const selectedPath='deliverables/daily-formal-v4-20261008/selection/merged-116-v2/index.json';
const selected=read(selectedPath).files.map(path=>({path,...read(path)}));
const old450=read('deliverables/daily-formal-v2-20261007/final-qualified/index.json').entries.map(e=>({path:e.path,level:read(e.path).level}));
const capacityPath=`OLD/untouched-prefix31-capacity.json`.replace('OLD',OLD);
const refs=read(capacityPath).rows.filter(r=>[54,198,118].includes(r.source));
const files=['tools/daily-challenge/formal-v4/design-macro-prefix-half300.mjs','tools/daily-challenge/formal-v4/runtime.mjs',
 'tools/daily-challenge/formal-v3/diversity-layout-factory.mjs','tools/daily-challenge/formal-v3/design-macro-prefix-colouring.mjs',
 'tools/daily-challenge/formal-v3/design-macro-prefix-probe.mjs','tools/daily-challenge/formal-v3/reverse-route-audit.mjs',
 'tools/daily-challenge/formal-v3/diversity.mjs','tools/daily-challenge/formal-v3/bounded-proof.mjs'];
const bindings=files.map(path=>({path,sha256:sha(path)}));
fs.mkdirSync(OUT,{recursive:true});for(const f of files)fs.copyFileSync(f,`${OUT}/${f.split('/').at(-1)}.snapshot`,fs.constants.COPYFILE_EXCL);
const plan={status:'PREDECLARED_HALF_REGION_31_PREFIX_ONLY',scope:300,policy:'1.156.0',maximumNewPreviews:12,
 maximumNewFixedColourInputsIncludingRejected:12,
 maximumStaticPartitionAttempts:2000,maximumPerReference:4,combinedBatchMaximumInputs:64,previousBatchActualInputs:1,
 previousFailedSource105:oldSolve.rows[0],priorBatch:{path:`${OLD}/scope156/completion-audit.json`,sha256:sha(`${OLD}/scope156/completion-audit.json`)},
 originalPlan:{path:`${OLD}/plan.json`,sha256:sha(`${OLD}/plan.json`)},selected:{path:selectedPath,sha256:sha(selectedPath)},
 references:refs.map(r=>({path:r.file,sha256:sha(r.file),source:r.source})),capacity:{path:capacityPath,sha256:sha(capacityPath)},
 strategy:'Keep every body used by first31 actual parking gestures fixed; replace a connected untouched whole-body region, then recolour once per genuinely new partition. No translated or altered prefix gesture.',
 geometry:{minimumChangedAreaFraction:.35,maximumSelectedRegionFraction:.85,minimumOldBodies:8,minimumQuadrants:2,
  allowConnectedHalfBoard:true,normalSourceMaskRetained:true,forbidEveryReplacedOriginalFootprint:true},
 similarity:{parent:.65,selectedGlobal:.75,selectedSameGroup:.65,old450:.75,priorMacroStocks:.65},
 staticPartitionBudgetPerAttempt:{maxNodes:4000,maxTransitions:8000},colourBudgetPerPartition:{maxNodes:3000,maxTransitions:6000},
 prefixConstructionWorldLimit:10000,blueprintConsecutiveParking:31,prefixIsNotLowerBound:true,
 completeSearchesAuthorized:false,fullWitnessNotClaimed:true,bindings,mathToolchainSha256:runtime.toolchainSha256};
fs.writeFileSync(`${OUT}/plan.json`,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});

const previousMacro=[],knownStocks=new Set(),latestFailures=new Map();
for(const row of read(`${OLD}/scope156/preview-1/report.json`).latestFailedBySource??[]){
 if(![54,198,118].includes(row.source))continue;const v=read(row.file);latestFailures.set(row.source,{...row,fingerprints:fp(v.level)});
}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const path=`${dir}/${e.name}`;if(e.isDirectory())walk(path);
 else if(/^candidate.*\.json$/.test(e.name)){const v=read(path);if(v.level){knownStocks.add(stock(v.level));previousMacro.push({path,level:v.level});}}}}
for(const e of fs.readdirSync(`${ROOT}/design`,{withFileTypes:true}))if(e.isDirectory()&&/^macro-/.test(e.name))walk(`${ROOT}/design/${e.name}`);
const referenceRows=[],candidates=[],fixedInputs=[],attempts=[],rejections={};let staticAttempts=0,colourCalls=0,prefixCalls=0;
const reject=(r,a)=>{rejections[r]=(rejections[r]??0)+1;if(a)a.rejected=r;};
for(const ref of refs){
 const original=read(ref.file);assert(original.accepted);assert.equal(original.levelSha256,levelSha256(original.level));
 runtime.assertPlainProofDomain(original.level);assert.equal(mask(original.level),mask(runtime.LEVELS.find(l=>l.id===ref.source)));
 const actual=replayDecorated(runtime,original.level,original.drags),independent=independentReplay(runtime,original.level,original.drags);
 assert(actual.valid&&actual.complete&&independent.valid&&independent.complete&&actual.nonClearingDrags===independent.nonClearingDrags);
 let initial=0;while(original.drags[initial]?.exitSide)initial++;let run=0;while(original.drags[initial+run]&&!original.drags[initial+run].exitSide)run++;
 const rr={path:ref.file,sha256:sha(ref.file),source:ref.source,levelSha256:original.levelSha256,routeSha256:routeSha256(original.drags),
  fullWitness:{actualU:actual.nonClearingDrags,drags:original.drags.length,dualReplayComplete:true},initialClears:initial,consecutiveParkingAvailable:run,regions:[]};referenceRows.push(rr);
 if(initial<1||initial>2||run<31){rr.skip='reference-no-fixed31-consecutive-chain';continue;}
 const prefix=original.drags.slice(0,initial+31),touched=new Set(prefix.map(d=>d.blockId)),untouched=original.level.blocks.filter(b=>!touched.has(b.id));
 const possible=[{kind:'all-untouched',chosen:untouched}];
 for(const axis of ['x','y'])for(let cut=1;cut<(axis==='x'?original.level.width:original.level.height);cut++)for(const before of [true,false]){
  const dimension=axis==='x'?0:1;possible.push({kind:`${axis}-${before?'before':'after'}-${cut}`,chosen:untouched.filter(b=>absolute(b).every(p=>before?p[dimension]<cut:p[dimension]>=cut))});}
 const seen=new Set();for(const r of possible){const key=r.chosen.map(b=>b.id).sort().join('|');if(seen.has(key))continue;seen.add(key);
  const points=r.chosen.flatMap(absolute),fraction=points.length/boardCells(original.level).length;
  const quadrants=[...new Set(points.map(([x,y])=>(x<original.level.width/2?'L':'R')+(y<original.level.height/2?'T':'B')))];
  if(fraction<.35||fraction>.85||r.chosen.length<8||quadrants.length<2||!connected(points))continue;
  rr.regions.push({kind:r.kind,bodyIds:r.chosen.map(b=>b.id),cells:points,areaFraction:fraction,quadrants});
 }
 rr.original=original;rr.prefix=prefix;rr.regions.sort((a,b)=>Math.abs(a.areaFraction-.5)-Math.abs(b.areaFraction-.5));
 if(!rr.regions.length)rr.skip='no-connected-whole-region-at-least35percent-and8-bodies';
}
const eligible=referenceRows.filter(r=>r.regions.length),previousBySource=new Map();
const write=status=>fs.writeFileSync(`${OUT}/report.json`,JSON.stringify({status,accepted:false,formalReady:false,productionChanged:false,
 plan:{path:`${OUT}/plan.json`,sha256:sha(`${OUT}/plan.json`)},staticPartitionAttempts:staticAttempts,colourCalls,prefixCalls,
 newFullLUSearches:0,ledgerClaims:0,newPreviews:candidates.length,newFixedColourInputs:fixedInputs.length,
 combinedFixed64ActualInputs:1+fixedInputs.length,
 referenceRows:referenceRows.map(({original,prefix,...r})=>r),attempts,fixedInputs,candidates,rejections,bindings},null,2)+'\n');
write('STATIC_PREFIX_PREVIEW_RUNNING');
for(let index=0;index<2000&&fixedInputs.length<12&&eligible.length;index++){
 const ref=eligible[index%eligible.length];if(candidates.filter(c=>c.sourceLevelId===ref.source).length>=4){if(eligible.every(r=>candidates.filter(c=>c.sourceLevelId===r.source).length>=4))break;continue;}
 const round=Math.floor(index/eligible.length),region=ref.regions[round%ref.regions.length],original=ref.original,
  regionIds=new Set(region.bodyIds),fixed=original.level.blocks.filter(b=>!regionIds.has(b.id)),seed=284017601+index*7919+ref.source*101;
 staticAttempts++;const a={index,source:ref.source,region:region.kind,seed};attempts.push(a);
 const tiling=retileWholeBoard(original.level,runtime,{seed,maxNodes:4000,maxTransitions:8000,bodyCount:original.level.blocks.length,
  irregular:true,minimumIrregular:0,fixedBlocks:fixed,forbiddenFootprints:original.level.blocks.filter(b=>regionIds.has(b.id)).map(bodyFootprint)});
 a.staticPartition={ok:tiling.ok,nodes:tiling.nodes,transitions:tiling.transitions};
 if(!tiling.ok){reject(`partition:${tiling.reason}`,a);continue;}
 const frozen=new Map(fixed.map(b=>[bodyFootprint(b),b]));
 const level={...structuredClone(original.level),blocks:tiling.blocks.map(b=>frozen.has(bodyFootprint(b))?structuredClone(frozen.get(bodyFootprint(b))):{...b,color:'red'})};
 const key=stock(level);a.partitionSha256=key;if(knownStocks.has(key)){reject('old-or-duplicate-stock',a);continue;}knownStocks.add(key);
 const originalF=fp(original.level),geometryF=fp(level),parent=latestFailures.get(ref.source);
 if(geometryF.shapeSha256===originalF.shapeSha256||geometryF.shapeSha256===parent?.fingerprints.shapeSha256||geometryF.shapeSha256===previousBySource.get(ref.source)?.shapeSha256){reject('shape-inventory-not-new',a);continue;}
 const parentSimilarity=compareLayouts(level,original.level).footprintSimilarity;if(parentSimilarity>.65){reject('parent-near',a);continue;}
 let nearest=0,tooNear=false;for(const r of [...selected,...candidates.map(c=>({path:c.path,stageKey:'basic-combined',difficulty:3,level:read(c.path).level}))]){
  const n=compareLayouts(level,r.level).footprintSimilarity;nearest=Math.max(nearest,n);if(n>((r.stageKey==='basic-combined'&&r.difficulty===3)?.65:.75)){tooNear=true;break;}}
 if(tooNear){reject('selected-near',a);continue;}
 let nearestMacro=0;for(const r of previousMacro){nearestMacro=Math.max(nearestMacro,compareLayouts(level,r.level).footprintSimilarity);if(nearestMacro>.65)break;}
 if(nearestMacro>.65){reject('prior-macro-near',a);continue;}
 let nearestOld=0;for(const r of old450){nearestOld=Math.max(nearestOld,compareLayouts(level,r.level).footprintSimilarity);if(nearestOld>.75)break;}
 if(nearestOld>.75){reject('old450-near',a);continue;}
 const positions=new Map(fixed.map(b=>[b.id,[b.x,b.y]])),parkingPoses={};
 for(const d of ref.prefix){const b=level.blocks.find(b=>b.id===d.blockId);assert(b&&frozen.has(bodyFootprint(b)));
  if(!d.exitSide){parkingPoses[b.id]??=[];parkingPoses[b.id].push(positions.get(b.id),...d.path);}if(d.path.length)positions.set(b.id,d.path.at(-1));}
 const opening=ref.prefix.filter(d=>d.exitSide),preservedGates=[...new Map(opening.map(d=>{const b=original.level.blocks.find(b=>b.id===d.blockId),g=original.level.gates.find(g=>g.color===b.color&&g.side===d.exitSide);assert(g);return[g.id,g];})).values()];
 const mapped={ok:true,drags:structuredClone(ref.prefix),initialClears:ref.initialClears,consecutiveParking:31,
  parkingBodies:Object.keys(parkingPoses),parkingPoses,preservedGates,openingColours:Object.fromEntries(opening.map(d=>[d.blockId,original.level.blocks.find(b=>b.id===d.blockId).color])),
  stats:{staticWholeWorlds:0,unitSteps:0},searchPerformed:false,L:null,U:null};
 colourCalls++;const paint=colourMacroForPrefix(level,runtime,{seed,maxNodes:3000,maxTransitions:6000,paletteSize:8,mappedPrefix:mapped});
 a.colour={ok:paint.ok,reason:paint.reason,nodes:paint.nodes??0,transitions:paint.transitions??0,completeColourAssignments:paint.completeColourAssignments??0};
 if(!paint.ok){reject(`paint:${paint.reason}`,a);continue;}level.blocks=paint.blocks;level.gates=paint.gates;
 const inputFile=`${OUT}/input-${String(fixedInputs.length).padStart(3,'0')}.json`;
 fs.writeFileSync(inputFile,JSON.stringify({status:'NEW_FIXED_COLOUR_CONSTRUCTION_INPUT_NO_PROOF',sourceLevelId:ref.source,
  level,levelSha256:levelSha256(level),reference:ref.path,referenceSha256:ref.sha256,seed,region,
  staticPartition:tiling.nodes,completeColourAssignments:paint.completeColourAssignments,formalReady:false},null,2)+'\n',{flag:'wx'});
 fixedInputs.push({path:inputFile,sha256:sha(inputFile),sourceLevelId:ref.source,levelSha256:levelSha256(level),attemptIndex:index});
 a.fixedInput=inputFile;
 const f=fp(level);if(!changed(originalF,f)||parent&&!changed(parent.fingerprints,f)||previousBySource.has(ref.source)&&!changed(previousBySource.get(ref.source),f)){reject('real-shape-and-shared-colour-change',a);continue;}
 const identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
 if(fs.existsSync(`${ROOT}/proof/attempts/identities/${identity}.json`)){reject('existing-public-identity',a);continue;}
 const inventory=inventorySummary(level,runtime),staticAudit=runtime.auditRevisedCandidate(level,undefined);
 if(inventory.nonNativeOrMissingArtIds.length||staticAudit.issues.some(i=>i.category!=='source'&&i.code!=='wrong-rule-profile')){reject('static-or-original-art',a);continue;}
 const priorWorlds=1+(paint.completeColourAssignments??0);assert(priorWorlds<10000);prefixCalls++;
 const probe=probeMappedMacroPrefix(runtime,level,mapped,{maxFullWorlds:10000-priorWorlds});a.probe={valid:probe.valid,reason:probe.reason,fullWorlds:probe.fullWorlds};
 if(!probe.valid){reject(`actual-prefix:${probe.reason}`,a);continue;}
 assert.equal(probe.consecutiveParking,31);assert.equal(mask(level),mask(runtime.LEVELS.find(l=>l.id===ref.source)));
 const file=`${OUT}/candidate-${String(candidates.length).padStart(3,'0')}.json`;
 const packet={status:'ACTUAL_FIXED31_PARKING_PREFIX_ONLY',accepted:false,formalReady:false,L:null,U:null,drags:null,
  sourceLevelId:ref.source,level,levelSha256:levelSha256(level),sourceMaskSha256:mask(level),inventory,staticAudit,
  prefixBlueprint:mapped,openingProbe:probe,prefixConstructionAccounting:{completeColourAssignments:paint.completeColourAssignments,
   selectedGeometryWorlds:1,actualPrefixWorlds:probe.fullWorlds,totalConservativeWorldBound:priorWorlds+probe.fullWorlds,hardLimit:10000,
   staticPartitionNodesAreNotSolverWorlds:true},unattemptedIdentity:{identity,exists:false},redesignOf:parent?.id??null,
  failedParent:parent?{...parent,fingerprints:undefined}:null,
  provenance:{strategy:'connected-untouched-half-retiling-protected-31-parking',fixedBatchPlan:`${OUT}/plan.json`,fixedBatchMaximum:64,
   previousActualInputs:1,reference:ref.path,referenceSha256:ref.sha256,referenceFullWitness:ref.fullWitness,
   region,sourceMaskExactlyRetained:true,rotationApplied:false,seed,newShapeSha256:f.shapeSha256,newColorSha256:f.colorSha256,
   originalShapeSha256:originalF.shapeSha256,originalColorSha256:originalF.colorSha256,
   realShapeAndColourChangedFromReference:true,realShapeAndColourChangedFromLatestSourceFailure:parent?true:null,
   prefixHintOnlyNotL:true,knownFullRouteNotClaimedForNewObject:true},
  similarity:{parent:parentSimilarity,selected:nearest,priorMacro:nearestMacro,old450:nearestOld},bindings};
 fs.writeFileSync(file,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
 candidates.push({path:file,sha256:sha(file),sourceLevelId:ref.source,levelSha256:packet.levelSha256,regionFraction:region.areaFraction,
  quadrants:region.quadrants,consecutiveParking:31,initialClears:probe.initialClears,worlds:priorWorlds+probe.fullWorlds,redesignOf:packet.redesignOf});
 previousBySource.set(ref.source,f);previousMacro.push({path:file,level});a.saved=file;write('STATIC_PREFIX_PREVIEW_RUNNING');
 console.log(JSON.stringify({staticAttempts,previews:candidates.length,source:ref.source,prefix:31}));
 if(staticAttempts%100===0)console.log(JSON.stringify({staticAttempts,previews:candidates.length,rejections}));
}
for(const b of bindings)assert.equal(sha(b.path),b.sha256,'Bound tool changed during static plan');
write('STATIC_PREFIX_PREVIEW_FINISHED_NO_FULL_SEARCH');
fs.writeFileSync(`${OUT}/index.json`,JSON.stringify({status:'PREFIX_ONLY_WAITING_FOR_FIRST_FULL_PROOF',files:candidates.map(c=>c.path),
 actualNewPreviews:candidates.length,actualNewFixedColourInputs:fixedInputs.length,
 combinedFixed64ActualInputs:1+fixedInputs.length,maximumFixedBatch:64,newFullLUSearches:0,formalReady:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:OUT,staticAttempts,fixedInputs:fixedInputs.length,previews:candidates.length,colourCalls,prefixCalls,rejections}));
