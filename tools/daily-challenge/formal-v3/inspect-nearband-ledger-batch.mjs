import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {inspectSearchAccounting} from './catalog-contract.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardCells} from './diversity-layout-factory.mjs';

const [input,output]=process.argv.slice(2);assert(input&&output&&!fs.existsSync(output));
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),binding=p=>({path:p,sha256:hash(p)});
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts',report=read(input),runtime=await loadBoundedRuntime();
assert.equal(report.status,'FINITE_NEARBAND_BATCH_FINISHED');assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
const counts={},ids=new Set(),expectedParent=new Map(),perSeed=new Map(),rows=[];
for(const seed of report.selectedSeeds){const p=read(seed.path);expectedParent.set(seed.path,p.redesignParentId);assert.equal(p.accepted,false);}
for(const row of report.rows){
 const packet=read(row.path),f=designFingerprints(packet.level),requestPath=`${ledger}/${packet.attempt.id}.request.json`,resultPath=`${ledger}/${packet.attempt.id}.result.json`;
 const request=read(requestPath),result=read(resultPath),seedFile=packet.provenance.input,seed=read(seedFile),parentPath=`${ledger}/${request.redesignOf}.request.json`,parentResultPath=`${ledger}/${request.redesignOf}.result.json`,parent=read(parentPath),parentResult=read(parentResultPath);
 assert(!ids.has(packet.attempt.id),'Repeated search input');ids.add(packet.attempt.id);
 assert.equal(packet.attempt.id,f.designSha256);assert.equal(request.id,f.designSha256);
 assert.equal(request.levelSha256,levelSha256(packet.level));assert.equal(packet.levelSha256,request.levelSha256);assert.equal(result.levelSha256,request.levelSha256);
 for(const k of ['shapeSha256','colorSha256','designSha256'])assert.equal(request[k],f[k]);
 assert.equal(levelSha256(result.lower),levelSha256(packet.proof));assert.equal(levelSha256(result.upper),levelSha256(packet.proof));
 assert.equal(packet.accepted,result.accepted);assert.equal(row.accepted,packet.accepted);
 assert.equal(packet.proof.sourceLevelSha256,packet.levelSha256);assert.deepEqual(inspectSearchAccounting(packet.proof,'joint'),[]);
 assert.equal(packet.proof.budget.maxStates,10000);assert.equal(packet.proofToolchainSha256,runtime.toolchainSha256);assert.equal(levelSha256(packet.proofToolchainBindings),levelSha256(runtime.toolchainBindings));
 assert.equal(packet.provenance.inputFileSha256,hash(seedFile));assert.equal(packet.provenance.inputLevelSha256,seed.levelSha256);
 assert.equal(request.redesignOf,expectedParent.get(seedFile),'Failed-parent chain must follow this seed\'s immediately preceding failed search');assert.equal(parentResult.accepted,false);
 const origin=designFingerprints(seed.level);for(const prior of [origin,parent]){assert.notEqual(prior.shapeSha256,f.shapeSha256);assert.notEqual(prior.colorSha256,f.colorSha256);}
 const oldColors=new Map(parent.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),shared=f.colorAssignments.filter(b=>oldColors.has(b.id));
 assert(shared.length>0&&shared.some(b=>oldColors.get(b.id)!==JSON.stringify(b.colors)),'Real shared body colour changed');
 const source=runtime.LEVELS.find(x=>x.id===packet.sourceLevelId);assert.equal(levelSha256(source),packet.sourceLevelSha256);
 assert.equal(packet.level.width,source.width);assert.equal(packet.level.height,source.height);assert.deepEqual(boardCells(packet.level).map(p=>p.join(',')).sort(),boardCells(source).map(p=>p.join(',')).sort());
 const identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});assert.equal(request.retryIdentitySha256,identity);
 const identityPath=`${ledger}/identities/${identity}.json`,blockedPath=`${ledger}/identities/${identity}.blocked.json`;assert.equal(read(identityPath).origin,request.id);
 if(!packet.accepted){assert(fs.existsSync(blockedPath),'Failed physical input must remain blocked');expectedParent.set(seedFile,request.id);}
 else{
  const canonical=runtime.replayRevisedRoute(packet.level,packet.drags),independent=independentReplay(runtime,packet.level,packet.drags);
  for(const r of [canonical,independent])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===packet.U);
  assert(packet.L>=[0,16,21,31][packet.difficulty]&&packet.U>=packet.L);assert.equal(routeSha256(result.lower.drags),routeSha256(packet.drags));
 }
 const group=perSeed.get(seedFile)??{seed:seedFile,sourceLevelId:packet.sourceLevelId,searches:0,accepted:0};assert.equal(group.accepted,0,'No further inputs after this prototype succeeded');group.searches++;group.accepted+=Number(packet.accepted);perSeed.set(seedFile,group);
 const termination=packet.proof.routeTermination??packet.proof.termination;counts[termination]=(counts[termination]??0)+1;
 rows.push({...binding(row.path),id:request.id,seed:seedFile,request:binding(requestPath),result:binding(resultPath),parent:binding(parentPath),parentResult:binding(parentResultPath),identity:binding(identityPath),
  blocked:packet.accepted?null:binding(blockedPath),accepted:packet.accepted,L:packet.L??null,U:packet.U??null,difficulty:packet.difficulty??null,
  raw:packet.proof.rawFullBoardStates,expanded:packet.proof.rawExploredStates,transitions:packet.proof.attemptedTransitions,micro:packet.proof.microDiscoveredStates,termination,shapeAndColourChangedFromRootAndParent:true});
}
for(const g of perSeed.values())assert(g.searches<=report.perSeed&&g.accepted<=1);assert.equal(rows.length,report.rows.length);
const out={status:'READ_ONLY_NEARBAND_LEDGER_HASH_RAW_AND_REDESIGN_AUDIT_PASS',createdAt:new Date().toISOString(),input:binding(input),tool:binding('tools/daily-challenge/formal-v3/inspect-nearband-ledger-batch.mjs'),
 count:rows.length,uniquePhysicalInputs:ids.size,seedCount:perSeed.size,accepted:rows.filter(r=>r.accepted).length,failedBlocked:rows.filter(r=>!r.accepted).length,
 maxima:{raw:Math.max(...rows.map(r=>r.raw)),expanded:Math.max(...rows.map(r=>r.expanded)),transitions:Math.max(...rows.map(r=>r.transitions)),micro:Math.max(...rows.map(r=>r.micro))},
 terminationCounts:counts,perSeed:[...perSeed.values()],rows,newSolverCalls:0,failedInputsReplayed:0,successfulWitnessesReplayed:rows.filter(r=>r.accepted).length,newLedgerWrites:0,formalReady:false};
for(const r of rows)for(const b of [r,r.request,r.result,r.parent,r.parentResult,r.identity,r.blocked].filter(Boolean))assert.equal(hash(b.path),b.sha256);
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,count:out.count,unique:out.uniquePhysicalInputs,accepted:out.accepted,blocked:out.failedBlocked,maxima:out.maxima,terminationCounts:counts}));
