import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {localRetiles} from '../formal-v2/design-layout-factory.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {singleVacancyGraph} from './design-single-vacancy.mjs';
import {colourDelayedVacancy} from './design-vacancy-colouring.mjs';
import {boardCells,absoluteCells} from './diversity-layout-factory.mjs';
import {compareLayouts} from './diversity.mjs';

export const VERSION='single-opening-retile-colour-construction-v1';
const ROOT='deliverables/daily-formal-v3-20261008';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fileSha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bind=p=>({path:p,sha256:fileSha(p)});
const write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const shapeKey=s=>JSON.stringify([...s].sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const BAR_KEYS=new Set([[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]]].map(shapeKey));
const geometryBlock=b=>({id:b.id,x:b.x,y:b.y,shape:b.shape});

/** No action search: require a real changed stock, unchanged opening, full mask. */
export function auditRetile(original,candidate){
 const first=original.blocks[0];
 assert.equal(first.id,'opening');
 const changedInventory=designFingerprints(original).shapeSha256!==designFingerprints(candidate).shapeSha256;
 const openingUnchanged=levelSha256(geometryBlock(first))===levelSha256(geometryBlock(candidate.blocks[0]));
 const barsOnly=candidate.blocks.every(b=>BAR_KEYS.has(shapeKey(b.shape)));
 const cells=boardCells(original).map(p=>p.join(',')).sort(),actual=candidate.blocks.flatMap(absoluteCells).map(p=>p.join(',')).sort();
 const fullCoverage=JSON.stringify(cells)===JSON.stringify(actual);
 const sameMask=JSON.stringify(boardCells(original))===JSON.stringify(boardCells(candidate));
 const idsUnchanged=JSON.stringify(original.blocks.map(b=>b.id))===JSON.stringify(candidate.blocks.map(b=>b.id));
 return{pass:changedInventory&&openingUnchanged&&barsOnly&&fullCoverage&&sameMask&&idsUnchanged,
  changedInventory,openingUnchanged,barsOnly,fullCoverage,sameMask,idsUnchanged};
}

/** A cap can interrupt the last popped node. Never claim that layer complete. */
export function layerCoverage(result,through=31){
 assert(Number.isSafeInteger(through)&&through>=0);
 const interrupted=result.termination==='construction-state-budget';
 const completelyProcessed=Math.max(0,result.expanded-(interrupted?1:0));
 const remainingAtOrBefore=result.queue.slice(completelyProcessed).filter(n=>n.depth<=through).length;
 const depthLimitedAtOrBefore=result.termination==='construction-depth-limit'&&result.maxReached<=through;
 return{through,complete:remainingAtOrBefore===0&&!depthLimitedAtOrBefore,
  completelyProcessed,remainingAtOrBefore,depthLimitedAtOrBefore,
  terminalPoppedDepth:result.queue[result.expanded-1]?.depth??null};
}

/** One finite candidate list; second-order is at most two pair-union retiles. */
export function buildRetilePlan(original,{limit=20}={}){
 assert(Number.isSafeInteger(limit)&&limit>=1&&limit<=20);
 const originalFingerprint=designFingerprints(original),seen=new Set(),first=[];
 const insert=(v,chain,target)=>{
  if(seen.has(v.partition)||!auditRetile(original,v.level).pass)return;
  seen.add(v.partition);target.push({...v,chain,fingerprints:designFingerprints(v.level)});
 };
 for(const v of localRetiles(original,{maxUnion:6}))insert(v,[{changedIds:v.changedIds,partition:v.partition}],first);
 const rows=first.slice(0,limit);
 if(rows.length<limit)for(const parent of first){
  const children=[];
  for(const v of localRetiles(parent.level,{maxUnion:6}))insert(v,[...parent.chain,{changedIds:v.changedIds,partition:v.partition}],children);
  // Prefer inventory counts not previously represented, then stable partition.
  children.sort((a,b)=>Number(rows.some(x=>x.fingerprints.shapeSha256===a.fingerprints.shapeSha256))-Number(rows.some(x=>x.fingerprints.shapeSha256===b.fingerprints.shapeSha256))||a.partition.localeCompare(b.partition));
  rows.push(...children.slice(0,limit-rows.length));if(rows.length>=limit)break;
 }
 assert(rows.every(r=>r.fingerprints.shapeSha256!==originalFingerprint.shapeSha256));
 return{rows,firstOrderEligible:first.length,maximumGeometryInputs:limit};
}

export function targetGeometryChain(geometry,target){
 const {result,built}=geometry,g=result.apertures[target.g],body=built.blocks[target.i+1];
 const width=1+Math.max(...body.shape.map(p=>p[0])),height=1+Math.max(...body.shape.map(p=>p[1]));
 const {width:boardWidth,height:boardHeight}=geometry.sourceBoard;
 const queueIndex=result.queue.findIndex(node=>{
  if(node.depth!==target.depth)return false;
  const[x,y]=node.positions[target.i],horizontal=['top','bottom'].includes(g.side),at=horizontal?x:y,span=horizontal?width:height;
  return at>=g.offset&&at+span<=g.offset+g.size&&(g.side==='top'?y===0:g.side==='bottom'?y+height===boardHeight:g.side==='left'?x===0:x+width===boardWidth);
 });
 assert(queueIndex>=0,'Colour target must have a retained geometry node');
 const indices=[];let n=queueIndex;
 while(n>=0){indices.push(n);n=result.queue[n].parent;}
 indices.reverse();assert.equal(indices[0],0);
 return{queueIndex,indices,moves:indices.slice(1).map(i=>result.queue[i].move),targetBodyId:body.id,aperture:g,
  parkingPoseDepth:target.depth,minimumNonClearingBeforeSecondClear:target.depth-1,
  actualPuzzleRoute:false,scope:'Parent/endpoint geometry witness only. Held paths and mandatory exits need original-model replay.'};
}

function nearest(level,rows,limit){
 let maximum=0,path=null;
 for(const row of rows){const value=compareLayouts(level,row.level).footprintSimilarity;if(value>maximum){maximum=value;path=row.path;}}
 return{pass:maximum<=limit,maximum,path,limit};
}

async function main(){
 const[label='delayed-vacancy-retile-01']=process.argv.slice(2);assert(/^[a-z0-9-]+$/.test(label));
 const output=`${ROOT}/design/${label}`;assert(!fs.existsSync(output),'Never overwrite a previous construction batch');
 const parentPath=`${ROOT}/design/delayed-vacancy-proof-01/candidate-0000.json`,parent=read(parentPath);
 const rootPath=`${ROOT}/design/delayed-vacancy-01/construction.json`,root=read(rootPath),rootGeometry=read(root.sourceGeometry.path);
 assert.equal(parent.accepted,false);assert.equal(parent.status,'FIRST_INPUT_NOT_QUALIFIED');
 assert.equal(levelSha256(parent.level),levelSha256(root.level));
 const requestPath=`${ROOT}/proof/attempts/${parent.attempt.id}.request.json`,blockedPath=`${ROOT}/proof/attempts/${parent.attempt.id}.blocked.json`;
 assert(fs.existsSync(blockedPath),'Old failed proof must remain blocked');
 assert.equal(read(requestPath).levelSha256,levelSha256(parent.level));
 const colourTool='tools/daily-challenge/formal-v3/design-vacancy-colouring.mjs';
 assert.equal(fileSha(colourTool),'0f23ec15ca9ffc714683a5be7e74d0451ef86f0b5233706df97c1cab5e8534af','Bind reviewed earliest >= floor + 1 colouring');
 const runtime=await loadBoundedRuntime(),source=runtime.LEVELS.find(l=>l.id===parent.sourceLevelId);
 const selectedPath=`${ROOT}/selection/nearband21-selected/index.json`,selected=read(selectedPath).files.map(path=>({path,level:read(path).level}));
 const oldPath='deliverables/daily-formal-v2-20261007/final-qualified/index.json',old=read(oldPath).entries.map(r=>({path:r.path,level:read(r.path).level}));
 const planned=buildRetilePlan(root.level),rows=[],records=[];
 fs.mkdirSync(output,{recursive:true});fs.mkdirSync(`${output}/snapshots`);
 const toolPaths=['tools/daily-challenge/formal-v3/design-vacancy-retile-candidates.mjs','tools/daily-challenge/formal-v3/design-single-vacancy.mjs',colourTool,
  'tools/daily-challenge/formal-v2/design-layout-factory.mjs','tools/daily-challenge/formal-v3/diversity.mjs'];
 const tools=toolPaths.map((p,i)=>{const snapshot=`${output}/snapshots/${i}-${p.split('/').at(-1)}`;fs.copyFileSync(p,snapshot,fs.constants.COPYFILE_EXCL);return{...bind(p),snapshot,snapshotSha256:fileSha(snapshot)};});
 const plan={version:VERSION,scope:'Only new geometric inventories and static colours; no full-puzzle solver or proof claim',
  familyMaximumAccepted:1,accepted:0,formalReady:false,proofSearches:0,maximumGeometryInputs:20,maximumColouredPackets:4,
  geometryBudget:{maxStates:9999,maxDepth:45},colourBudget:{floor:31,minimumGeometricPoseDepth:32,maxLayouts:200,maxColourNodes:10000},
  parentFailure:{...bind(parentPath),attemptId:parent.attempt.id,request:bind(requestPath),blocked:bind(blockedPath)},wholeBoardRoot:bind(rootPath),rootGeometry:bind(root.sourceGeometry.path),
  selected:bind(selectedPath),old450:bind(oldPath),tools,firstOrderEligible:planned.firstOrderEligible,
  inputs:planned.rows.map((v,i)=>({index:i,chain:v.chain,partition:v.partition,shapeSha256:v.fingerprints.shapeSha256,level:v.level,staticGeometryAudit:auditRetile(root.level,v.level)}))};
 write(`${output}/plan.json`,plan);
 for(const [index,v]of planned.rows.entries()){
  const suffix=String(index).padStart(4,'0'),built={ok:true,blocks:v.level.blocks.map(geometryBlock),opening:rootGeometry.built.opening,openingArea:rootGeometry.built.openingArea,
   method:'one-or-two-localRetiles-preserving-opening',retileChain:v.chain};
  const shapeFingerprint=designFingerprints(v.level).shapeSha256;
  assert.notEqual(shapeFingerprint,parent.attempt.shapeSha256,'Check before every geometry call');
  const started=performance.now(),result=singleVacancyGraph(source,built.blocks,{maxStates:9999,maxDepth:45});
  assert(result.rawGeometricStates<=9999&&result.expanded<=9999);
  const coverage=layerCoverage(result,31),geometry={sourceLevelId:source.id,sourceBoard:{width:source.width,height:source.height,cells:boardCells(source)},built,result,
   inputShapeSha256:shapeFingerprint,parentFailure:plan.parentFailure,wholeBoardRoot:plan.wholeBoardRoot,geometryOnly:true,puzzleProof:false,
   budget:plan.geometryBudget,layerCoverage:coverage,elapsedMilliseconds:performance.now()-started};
  const geometryPath=`${output}/geometry-${suffix}.json`;write(geometryPath,geometry);
  const row={index,shapeSha256:shapeFingerprint,retileChain:v.chain,geometry:bind(geometryPath),
   rawGeometricStates:result.rawGeometricStates,expanded:result.expanded,maxReached:result.maxReached,latePairs:result.latePairs,
   latePairsAtLeast32:result.earliest.reduce((n,ds)=>n+ds.filter(d=>d>=32).length,0),layerCoverage:coverage,termination:result.termination,coloured:false};
  if(coverage.complete&&row.latePairsAtLeast32>0&&result.termination!=='construction-state-budget'){
   const made=colourDelayedVacancy(geometry,source,runtime,{floor:31,seed:8283921+index*78791,maxLayouts:200,maxColourNodes:10000});
   row.colouring={ok:made.ok,reason:made.reason,layouts:made.layouts,nodes:made.totalNodes};
   if(made.ok){
    const fingerprints=designFingerprints(made.level),changedSharedIds=made.level.blocks.filter(b=>parent.level.blocks.find(p=>p.id===b.id)?.color!==b.color).map(b=>b.id);
    assert.notEqual(fingerprints.shapeSha256,parent.attempt.shapeSha256);assert.notEqual(fingerprints.colorSha256,parent.attempt.colorSha256);assert(changedSharedIds.length>0);
    assert(auditRetile(root.level,made.level).pass);
    const comparisons={selected:nearest(made.level,selected,.65),old450:nearest(made.level,old,.75),source:nearest(made.level,[{path:`mainline:${source.id}`,level:source}],.55)};
    const packet={...made,accepted:false,formalReady:false,proofSearches:0,status:'NEW_COLOURED_CONSTRUCTION_PENDING_FIRST_PROOF',sourceLevelId:source.id,sourceLevelSha256:levelSha256(source),
     levelSha256:levelSha256(made.level),fingerprints,actualColorSha256:fingerprints.colorSha256,changedSharedIds,sourceGeometry:bind(geometryPath),
     geometryChain:targetGeometryChain(geometry,made.geometryTarget),parentFailure:plan.parentFailure,redesignOf:parent.attempt.id,
     wholeBoardRoot:plan.wholeBoardRoot,familyMaximumAccepted:1,staticGeometryAudit:auditRetile(root.level,made.level),comparisons,
     provenance:{strategy:VERSION,independentWholeBoardConstruction:false,descendantOfIndependentWholeBoardRoot:true,sourceBoardExactlyRetained:true,
      rootGeometry:plan.rootGeometry,retileChain:v.chain,toolBindings:tools,geometryNotDifficultyProof:true,onlyOneAcceptedDescendantPermitted:true}};
    const candidatePath=`${output}/candidate-${suffix}.json`;write(candidatePath,packet);row.coloured=true;row.candidate=bind(candidatePath);row.comparisons=comparisons;
    row.changedSharedIds=changedSharedIds;row.target=made.geometryTarget;
    if(Object.values(comparisons).every(c=>c.pass))records.push({path:candidatePath,fileSha256:fileSha(candidatePath),sourceLevelId:source.id,levelSha256:packet.levelSha256,
     shapeSha256:fingerprints.shapeSha256,colorSha256:fingerprints.colorSha256,geometry:packet.sourceGeometry,geometryTarget:made.geometryTarget,redesignOf:parent.attempt.id,
     accepted:false,pendingFirstProof:true,familyMaximumAccepted:1});
   }
  }
  rows.push(row);console.log(JSON.stringify(row));
  if(rows.filter(r=>r.coloured).length>=4)break;
 }
 const summary={version:VERSION,status:records.length?'NEW_INVENTORIES_COLOURED_PENDING_FIRST_PROOF':'NO_NEW_COLOURED_PACKET',
  accepted:0,formalReady:false,proofSearches:0,geometryCalls:rows.length,colouredPackets:rows.filter(r=>r.coloured).length,eligiblePackets:records.length,
  familyMaximumAccepted:1,parentFailure:plan.parentFailure,wholeBoardRoot:plan.wholeBoardRoot,plan:bind(`${output}/plan.json`),
  maximumRawGeometricStates:Math.max(...rows.map(r=>r.rawGeometricStates)),records,rows};
 write(`${output}/report.json`,summary);write(`${output}/index.json`,{accepted:0,formalReady:false,proofSearches:0,familyMaximumAccepted:1,report:bind(`${output}/report.json`),records});
 console.log(JSON.stringify({output,geometryCalls:rows.length,eligiblePackets:records.length,accepted:0,proofSearches:0}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
