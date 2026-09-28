import test,{after} from'node:test';
import assert from'node:assert/strict';
import fs from'node:fs';
import os from'node:os';
import path from'node:path';
import{createHash}from'node:crypto';
import{auditJointCurtainSource,projectJointCurtainFacts,verifyJointRevealReplay}from'./revised-joint-curtain-cohorts-v111.mjs';
import{loadReviewedDesignSource}from'./revised-design-review-joint-curtains-v111.mjs';
import{loadPreviewCore,digest as canonicalDigest}from'./revised-preview-validation-v160.mjs';
import{deriveDesignPolicy as deriveJointPolicy}from'./revised-design-policy-joint-curtains-v111.mjs';
Error.stackTraceLimit=0; // Bundled model data URLs are not useful assertion stacks.

// Immutable independently reviewed real evidence; mutations below are isolated
// in-memory negative fixtures, never replacements for the source or candidates.
const sourcePath='.codex-temp/remaining98-v111/late/new194/source-review-194-joint-v2.json';
const SOURCE_SHA='666b9d92c734ff14f8298ef8389944a9d9202e5495b2e737a68ce6df197caf31';
const digest=x=>createHash('sha256').update(x).digest('hex');
const sourceBytes=fs.readFileSync(sourcePath);assert.equal(digest(sourceBytes),SOURCE_SHA);
const original=JSON.parse(sourceBytes),clone=()=>structuredClone(original);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'blockout-joint194-tests-'));let sequence=0;
const tempResolved=fs.realpathSync(temp);
async function loadMutation(change){const r=clone();change(r);r.testFixtureOnly=true;const p=path.join(temp,`negative-${sequence++}.json`),bytes=JSON.stringify(r);fs.writeFileSync(p,bytes,{flag:'wx'});return loadReviewedDesignSource(p,digest(bytes));}
after(()=>{assert.equal(digest(fs.readFileSync(sourcePath)),SOURCE_SHA,'Tests must never alter real source');assert.equal(fs.realpathSync(temp),tempResolved);assert(tempResolved.startsWith(fs.realpathSync(os.tmpdir())+path.sep)&&path.basename(tempResolved).startsWith('blockout-joint194-tests-'));fs.rmSync(tempResolved,{recursive:true});});
const design=()=>{const d=structuredClone(original.sourceNormalizedFacts);d.mechanisms.covers={count:4,values:[5,7,7,10],hiddenBatchCounts:[2,2,3,14],pairedBatches:[{value:5,hidden:2},{value:7,hidden:2},{value:7,hidden:3},{value:10,hidden:14}]};return d;};
const rejectSource=(name,change)=>test(name,()=>{const r=clone();change(r);assert.throws(()=>auditJointCurtainSource(r));});
const rejectDesign=(name,change)=>test(name,()=>{const d=design();change(d.mechanisms.covers);assert.throws(()=>projectJointCurtainFacts(original.sourceNormalizedFacts,d));});

test('real Lv194 has four physical frames, three reveal groups and31 distinct bodies without invented per-frame counts',()=>{const before=clone(),result=auditJointCurtainSource(original);assert.deepEqual(original,before);assert.equal(result.groups.length,3);assert.equal(result.joint.length,1);assert.equal(result.allBodies.length,31);assert.deepEqual(result.groups.map(g=>[g.clearCount,g.coverIds.length,g.hiddenCount]),[[5,1,2],[7,2,5],[10,1,14]]);assert.equal(original.sourceNormalizedFacts.mechanisms.covers.hiddenBatchCounts,null);assert.equal(original.sourceNormalizedFacts.mechanisms.covers.pairedBatches,null);assert.deepEqual(original.sourceBoard.internalWallCells,[[3,2],[4,2]]);});
test('real source loader verifies bound bytes and retains source nulls instead of replacing with design allocation',async()=>{const result=await loadReviewedDesignSource(sourcePath,SOURCE_SHA);assert.equal(result.source.levelId,194);assert.equal(result.source.facts.full,31);assert.equal(result.source.facts.mechanisms.covers.hiddenBatchCounts,null);assert.equal(result.source.sourceContract.mechanisms.shutterHiddenBatchCounts,null);assert.deepEqual(result.source.jointCurtainSource,original);assert.equal(result.bindings[sourcePath].sha256,SOURCE_SHA);});
test('source hash mismatch rejects before any projected normalization',async()=>{await assert.rejects(loadReviewedDesignSource(sourcePath,'0'.repeat(64)),/Source review drift/);});
test('design partition2+3 conserves the jointly observed five and does not mutate either input',()=>{const d=design(),before=structuredClone(d),sourceBefore=clone();const p=projectJointCurtainFacts(original.sourceNormalizedFacts,d);assert.deepEqual(p.assignments.map(g=>g.designHiddenBatchCounts),[[2],[2,3],[14]]);assert.equal(p.assignments[1].sourceIndividualCountsDefined,false);assert.equal(p.assignments[0].sourceIndividualCountsDefined,true);assert.deepEqual(p.effectiveFacts.mechanisms.covers.hiddenBatchCounts,[2,2,3,14]);assert.deepEqual(d,before);assert.deepEqual(original,sourceBefore);const sourceOther=structuredClone(original.sourceNormalizedFacts),effectiveOther=structuredClone(p.effectiveFacts);delete sourceOther.mechanisms.covers;delete effectiveOther.mechanisms.covers;assert.deepEqual(effectiveOther,sourceOther,'No non-cover source fact may be projected away');});
test('a different positive design split1+4 is explicit design data, never retroactively source fact',()=>{const d=design();d.mechanisms.covers.hiddenBatchCounts=[2,1,4,14];d.mechanisms.covers.pairedBatches=[{value:5,hidden:2},{value:7,hidden:1},{value:7,hidden:4},{value:10,hidden:14}];assert.deepEqual(projectJointCurtainFacts(original.sourceNormalizedFacts,d).assignments[1].designHiddenBatchCounts,[1,4]);assert.equal(original.sourceNormalizedFacts.mechanisms.covers.hiddenBatchCounts,null);});
test('actual measurement may omit pairedBatches but cannot supply a contradictory list',()=>{const d=design();delete d.mechanisms.covers.pairedBatches;assert.deepEqual(projectJointCurtainFacts(original.sourceNormalizedFacts,d).effectiveFacts.mechanisms.covers.pairedBatches,design().mechanisms.covers.pairedBatches);});
rejectSource('duplicate independent opening body is rejected',r=>{r.sourceCohorts.opening[1]=structuredClone(r.sourceCohorts.opening[0]);});
rejectSource('duplicated hidden body is not two separate bodies',r=>{r.sourceCohorts.joint7[4]=structuredClone(r.sourceCohorts.joint7[1]);});
rejectSource('missing physical curtain cannot be hidden by a group',r=>{r.sourceCoverRegions.pop();});
rejectSource('lowering a source region counter disagrees with independently observed groups',r=>{r.sourceCoverRegions[0].value=9;});
rejectSource('cross-frame exception without any body crossing the two source partitions is rejected',r=>{r.sourceCohorts.joint7[2].shape=[[0,0],[1,0]];});
rejectSource('unknown group hidden count cannot be inferred from body length',r=>{r.sourceRevealGroups[1].hiddenCount=null;});
rejectSource('unknown group clear count cannot be inferred from matching regions',r=>{r.sourceRevealGroups[1].clearCount=null;});
rejectSource('unknown individual counts must be explicit null, not omitted',r=>{delete r.sourceNormalizedFacts.mechanisms.covers.hiddenBatchCounts;});
rejectSource('invented source individual batches are rejected even if their sum matches',r=>{r.sourceNormalizedFacts.mechanisms.covers.hiddenBatchCounts=[2,2,3,14];r.sourceNormalizedFacts.mechanisms.covers.pairedBatches=design().mechanisms.covers.pairedBatches;});
rejectSource('body footprint outside the entire joint reveal union is rejected',r=>{r.sourceCohorts.joint7[2].x=0;});
rejectSource('duplicate cells within a body cannot inflate its footprint',r=>{r.sourceCohorts.joint7[2].shape.push([0,0]);});
rejectSource('disconnected body geometry is rejected even when count and M11 remain unchanged',r=>{r.sourceCohorts.opening[6]={...r.sourceCohorts.opening[6],x:0,y:11,shape:[[0,0],[1,1],[0,2]]};});
rejectSource('physical source curtains cannot overlap',r=>{r.sourceCoverRegions[2].y=6;});
rejectSource('source internal wall exception cannot excuse another unspecified missing floor cell',r=>{r.sourceBoard.cells=r.sourceBoard.cells.filter(([x,y])=>!(x===7&&y===5));});
rejectSource('missing explicit source wall evidence cannot silently fill its two known holes',r=>{delete r.sourceBoard.internalWallCells;});
rejectSource('source wall list cannot overlap playable floor',r=>{r.sourceBoard.internalWallCells.push([0,0]);});
rejectSource('source region may not leave declared width/height even with forged wall coordinates',r=>{r.sourceCoverRegions[0].x=-1;r.sourceBoard.internalWallCells.push(...Array.from({length:6},(_,y)=>[-1,y]));});
rejectSource('unbound joint representation evidence is rejected',r=>{r.sourceRepresentationConstraints[0].evidencePaths=['nonexistent-frame'];});
rejectSource('unbound reveal group evidence is rejected',r=>{r.sourceRevealGroups[1].evidencePaths=['nonexistent-frame'];});
rejectSource('extra original cohort key is not discarded',r=>{r.sourceCohorts.unreviewedExtra=[];});
rejectSource('missing original cohort is not silently treated as empty',r=>{delete r.sourceCohorts.cover10;});
rejectSource('group reassignment cannot borrow a body from a different reveal count',r=>{r.sourceRevealGroups[1].cohortKey='cover5';});
rejectSource('duplicate group IDs are rejected',r=>{r.sourceRevealGroups[1].id=r.sourceRevealGroups[0].id;});
rejectSource('a source curtain cannot appear in two groups',r=>{r.sourceRevealGroups[1].coverIds.push('cover5');});
rejectSource('source full body total must exactly reconcile independent cohorts',r=>{r.sourceNormalizedFacts.full=30;});
rejectSource('source M11 total cannot omit a nonrectangular body',r=>{r.sourceNormalizedFacts.mechanisms.irregularBlocks.fullCount=3;});
rejectSource('complete source body ledger cannot omit the observed vertical-axis carrier',r=>{delete r.sourceCohorts.cover10.find(b=>b.movementAxis).movementAxis;});
rejectSource('complete source body ledger cannot omit one of the two observed shells',r=>{delete r.sourceCohorts.cover10.find(b=>b.innerColor).innerColor;});
rejectSource('facts joint allocation cannot contradict physical group ledger',r=>{r.sourceNormalizedFacts.mechanisms.covers.jointCohorts[1].hidden=6;});
rejectSource('generator or lift combination cannot pass this no-generator/no-lift source adapter',r=>{r.sourceNormalizedFacts.mechanisms.generators.count=1;});
for(const key of ['unresolved','unsupported','blockingIssues','evidenceGaps'])test(`source loader rejects nonempty ${key} instead of inferring zero`,async()=>{await assert.rejects(loadMutation(r=>{r[key]=['unreviewed source fact'];}),new RegExp(`Unresolved source (review )?${key}`));});
test('source loader rejects unknown mechanism count and missing one of15 explicit observations',async()=>{await assert.rejects(loadMutation(r=>{r.sourceNormalizedFacts.mechanisms.numericIce.count=null;}));await assert.rejects(loadMutation(r=>{delete r.sourceInventory.M14;}));});
test('source loader rejects corrupted bound evidence without changing original frame',async()=>{await assert.rejects(loadMutation(r=>{const p=r.evidence[0].path;r.bindings[p]={sha256:'0'.repeat(64)};}),/Source evidence drift/);});
rejectDesign('missing design curtain cannot conserve physical source inventory',d=>{d.count=3;d.values.pop();d.hiddenBatchCounts.pop();});
rejectDesign('design lowering a curtain counter is not an authorized cohort projection',d=>{d.values[3]=9;});
rejectDesign('preserving total21 while borrowing between5/7/10 groups is rejected',d=>{d.hiddenBatchCounts=[3,2,3,13];d.pairedBatches=d.values.map((value,i)=>({value,hidden:d.hiddenBatchCounts[i]}));});
rejectDesign('changing only same-count group total is rejected',d=>{d.hiddenBatchCounts=[2,1,3,14];d.pairedBatches=d.values.map((value,i)=>({value,hidden:d.hiddenBatchCounts[i]}));});
rejectDesign('empty individual design curtain is not an actual physical reveal batch',d=>{d.hiddenBatchCounts=[2,0,5,14];d.pairedBatches=d.values.map((value,i)=>({value,hidden:d.hiddenBatchCounts[i]}));});
rejectDesign('null hidden design count cannot become zero by arithmetic',d=>{d.hiddenBatchCounts[1]=null;});
rejectDesign('sparse hidden design array is not a complete source projection',d=>{delete d.hiddenBatchCounts[1];});
rejectDesign('arbitrary contradictory pairedBatches cannot be normalized out',d=>{d.pairedBatches=[{value:1,hidden:999}];});
rejectDesign('pairedBatches with right totals but wrong reveal assignment are rejected',d=>{d.pairedBatches=[{value:5,hidden:3},{value:7,hidden:2},{value:7,hidden:2},{value:10,hidden:14}];});

test('facade explicitly declares only the joint design partition, preserving complete independent source hash',()=>{const before=clone(),p=deriveJointPolicy(original.sourceNormalizedFacts,design(),194);assert.equal(p.sourceFactsSha256,canonicalDigest(original.sourceNormalizedFacts));assert.equal(p.exactMatch,false);assert.equal(p.sourceIndividualPartitionDefined,false);assert.equal(p.differences.length,1);assert.equal(p.differences[0].field,'mechanisms.covers.individualPartition');assert.equal(p.differences[0].sourceValue,null);assert.deepEqual(original,before);});
for(const[field,change]of[
 ['width',d=>d.width--],['height',d=>d.height--],['opening',d=>d.opening--],['full',d=>d.full--],
 ['axis',d=>{d.mechanisms.axisBlocks={count:0,axes:[]};}],['shell',d=>d.mechanisms.shells.count--],
 ['ice value',d=>d.mechanisms.exits.frozenValues[0]=1],['ice mouth',d=>{d.mechanisms.exits.frozenCount--;d.mechanisms.exits.frozenValues.pop();}],
 ['star',d=>d.mechanisms.starBlocks.count=1],['unknown key',d=>d.mechanisms.keysLocks.keyCount=null],['M11',d=>d.mechanisms.irregularBlocks.fullCount--]
])test(`facade cannot hide changed non-cover ${field} while projecting source cohorts`,()=>{const d=design();change(d);assert.throws(()=>deriveJointPolicy(original.sourceNormalizedFacts,d,194));});

const{api}=await loadPreviewCore();
function replayFixture(){return{level:{id:194,name:'UNIT FIXTURE ONLY joint two-frame reveal',mechanismRules:'revised-2026-09-21-v1.2',difficulty:'normal',width:3,height:2,timeSeconds:300,reward:0,playable:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],blocks:[{id:'open',x:0,y:0,color:'red',shape:[[0,0]]},{id:'hidden-blue',x:1,y:0,color:'blue',shape:[[0,0]],shutterId:'a'},{id:'hidden-green',x:2,y:0,color:'green',shape:[[0,0]],shutterId:'b'}],shutters:[{id:'a',x:1,y:0,width:1,height:1,count:1},{id:'b',x:2,y:0,width:1,height:1,count:1}],gates:[{id:'red',color:'red',side:'top',offset:0,size:1},{id:'blue',color:'blue',side:'top',offset:1,size:1},{id:'green',color:'green',side:'top',offset:2,size:1}]},drags:[{blockId:'open',path:[],exitSide:'top'},{blockId:'hidden-blue',path:[],exitSide:'top'},{blockId:'hidden-green',path:[],exitSide:'top'}],source:{jointCurtainSource:{sourceRevealGroups:[{clearCount:1,coverIds:['source-a','source-b'],hiddenCount:2}]}}};}
test('actual PuzzleModel reveals both separate design curtains together and completes fresh route',()=>{const{level,drags,source}=replayFixture();const before=structuredClone({level,drags,source});const result=verifyJointRevealReplay(level,drags,source,api);assert(result.passed&&result.complete);assert.equal(result.groups.length,1);assert.deepEqual({level,drags,source},before);});
test('fresh replay rejects truncated route even though joint opening was successful',()=>{const{level,drags,source}=replayFixture();assert.throws(()=>verifyJointRevealReplay(level,drags.slice(0,2),source,api),/finish|complete/i);});
test('missing all target curtains cannot pass by vacuous every on an empty state list',()=>{const{level,drags,source}=replayFixture();level.shutters=[];for(const b of level.blocks)delete b.shutterId;assert.throws(()=>verifyJointRevealReplay(level,drags,source,api));});
test('omitting one physical curtain is rejected even with same total independent blocks',()=>{const{level,drags,source}=replayFixture();level.shutters.pop();delete level.blocks[2].shutterId;assert.throws(()=>verifyJointRevealReplay(level,drags,source,api));});
test('joint replay must preserve hidden body membership count, not only simultaneous flags',()=>{const{level,drags,source}=replayFixture();source.jointCurtainSource.sourceRevealGroups[0].hiddenCount=3;assert.throws(()=>verifyJointRevealReplay(level,drags,source,api));});
test('different counter creates a different reveal event and is rejected',()=>{const{level,drags,source}=replayFixture();level.shutters[1].count=2;assert.throws(()=>verifyJointRevealReplay(level,drags,source,api));});
