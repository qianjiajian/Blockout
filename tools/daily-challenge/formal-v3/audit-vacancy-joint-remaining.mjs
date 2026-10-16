import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardCells,absoluteCells} from './diversity-layout-factory.mjs';
import {auditRetile} from './design-vacancy-retile-candidates.mjs';
import {geometryStockFingerprint} from './design-vacancy-independent-pool.mjs';

// No action/colour/geometry search. Validate existing receipts and stored nodes.
const root='deliverables/daily-formal-v3-20261008',dir=`${root}/design/vacancy-joint-remaining-02`,inputHashes=new Map();
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>{inputHashes.set(p,sha(p));return JSON.parse(fs.readFileSync(p,'utf8'));};
const bound=b=>{assert.equal(sha(b.path),b.sha256);return read(b.path);};
const runtime=await loadBoundedRuntime(),plan=read(`${dir}/plan.json`),report=read(`${dir}/report.json`),index=read(`${dir}/index.json`);
assert.equal(report.geometryCalls,4);assert.equal(report.jointTailSearches,0);assert.equal(report.records.length,0);assert.equal(index.records.length,0);
assert.equal(report.accepted,0);assert.equal(report.proofSearches,0);assert.equal(report.formalReady,false);
const parent=bound(plan.parentFailed),family=bound(plan.wholeBoardFamily),original=bound(plan.originalStockPlan),previous=bound(plan.previousPilot);
assert.equal(levelSha256(parent.level),levelSha256(family.level));assert.equal(parent.attempt.id,plan.parentAttemptId);
assert.equal(original.inputs.length,5);assert.equal(previous.geometryCalls,1);assert.deepEqual(plan.inputs.map(x=>x.index),[1,2,3,4]);
bound(plan.publicFailureBlock);bound(plan.priorCountCorrection);bound(plan.independentPilotAudit);bound(plan.constructorQualification);bound(plan.selected);bound(plan.old450);
for(const b of plan.tools){assert.equal(sha(b.snapshot),b.sha256);assert.equal(sha(b.path),b.sha256);inputHashes.set(b.path,b.sha256);inputHashes.set(b.snapshot,b.sha256);}
const source=runtime.LEVELS.find(l=>l.id===plan.sourceLevelId);assert.equal(levelSha256(source),plan.sourceLevelSha256);
const legal=new Set(boardCells(source).map(p=>p.join(','))),stocks=new Set([previous.rows[0].stock]),diagnostics=[];let nodes=0;
for(const row of report.rows){
 const input=plan.inputs.find(x=>x.index===row.index);assert.deepEqual(input,original.inputs.find(x=>x.index===row.index));assert(auditRetile(parent.level,input.level).pass);
 const fingerprint=geometryStockFingerprint(source,input.level.blocks);assert.deepEqual(fingerprint,input.fingerprint);assert.equal(fingerprint.stockSha256,row.stock);
 assert(!stocks.has(row.stock));stocks.add(row.stock);assert.notEqual(designFingerprints(input.level).shapeSha256,parent.attempt.shapeSha256);
 const request=bound(row.request),g=bound(row.geometry),r=g.result,c=row.construction?bound(row.construction):null;
 bound(request.inputPlan);assert.equal(request.stock,row.stock);assert.equal(request.parentAttemptId,parent.attempt.id);
 const outcome=read(`${root}/design/vacancy-joint-construction-attempts/${row.stock}.result.json`),blocked=read(`${root}/design/vacancy-joint-construction-attempts/${row.stock}.blocked.json`);
 bound(blocked.result);assert.equal(outcome.routeFound,false);assert.equal(blocked.continuedSearchForbidden,true);
 assert.equal(r.rawGeometricStates,r.queue.length);assert(r.queue.length<=9999&&r.expanded<=r.queue.length);
 const bodies=g.built.blocks.slice(1);
 for(const[i,node]of r.queue.entries()){
  const occupied=new Set();for(const[j,b]of bodies.entries())for(const[dx,dy]of b.shape){const k=[node.positions[j][0]+dx,node.positions[j][1]+dy].join(',');assert(legal.has(k)&&!occupied.has(k));occupied.add(k);}
  assert.equal(legal.size-occupied.size,2);
  if(i===0){assert.equal(node.parent,-1);assert.equal(node.depth,0);}else{assert(node.parent>=0&&node.parent<i);const p=r.queue[node.parent];assert.equal(node.depth,p.depth+1);
   const changed=node.positions.flatMap((xy,j)=>JSON.stringify(xy)!==JSON.stringify(p.positions[j])?[j]:[]);assert.equal(changed.length,1);
   assert.equal(node.move.blockId,bodies[changed[0]].id);assert.deepEqual(node.move.from,p.positions[changed[0]]);assert.deepEqual(node.move.to,node.positions[changed[0]]);}
  nodes++;
 }
 const account=c?.accounting??row.geometryAccounting;assert(account.rawFullBoardStates<=10000&&account.rawExploredStates<=account.rawFullBoardStates);
 assert(account.microDiscoveredStates<=3000000&&account.attemptedTransitions<=10000000&&account.elapsedMilliseconds<30000);
 const diagnostic={index:row.index,changedIds:input.changedIds,stock:row.stock,geometryRaw:r.rawGeometricStates,depthReached:r.maxReached,
  earliestLatePairs32:row.latePairs32,constructionRaw:account.rawFullBoardStates,reason:row.reason??'No body/aperture first becomes available at geometric depth >=32',
  actualU:null,actualL:null,blocked:true};
 if(c){assert.equal(c.status,'CONSTRUCTION_UNKNOWN');assert.equal(c.reason,'no-fixed-static-gate-domain');assert.equal(c.U,null);assert.equal(c.level,null);
  assert.equal(c.fixedDomainSha256,undefined);assert.equal(c.tail,undefined);assert.equal(c.staticGateLayouts,200);
  assert.equal(c.accounting.kinds.priorGeometry,r.rawGeometricStates);assert.equal(c.accounting.rawFullBoardStates,Object.values(c.accounting.kinds).reduce((a,b)=>a+b,0));
  const target=bodies[c.fixedTarget.i],gate=r.apertures[c.fixedTarget.g],targetCells=absoluteCells(target),
   overlap=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
  diagnostic.fixedTarget={bodyId:target.id,gate,depth:c.fixedTarget.depth};diagnostic.thirdClearBodies=c.secondClearEarlyEligible.map(x=>{
   const body=bodies[x.index],apertures=x.gateIndices.map(j=>r.apertures[j]),adjacent=absoluteCells(body).some(([x,y])=>targetCells.some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1));
   return{bodyId:body.id,apertures,allAperturesOverlapTarget:apertures.every(a=>overlap(a,gate)),initiallyAdjacentToTarget:adjacent};});
  assert(diagnostic.thirdClearBodies.every(x=>x.allAperturesOverlapTarget&&x.initiallyAdjacentToTarget));
  diagnostic.staticConflict='Both possible third-clear bodies touch the second-clear body in the opening (must use different colours), while every reachable early-qualified aperture overlaps its fixed top[5,6) gate. This fixed prefix cannot receive a disjoint different-colour third-clear gate.';
 }else{assert.equal(row.latePairs32,0);assert.equal(row.status,'NO_COMPLETE_EARLY_DOMAIN');}
 assert(Object.values(row.comparisons).every(x=>x.pass));diagnostics.push(diagnostic);
}
for(const[p,h]of inputHashes)assert.equal(sha(p),h);
const qa={status:'COMPLETION_AUDIT_PASS_ALL_FOUR_FAILURES_SEALED',accepted:0,formalReady:false,originalPlannedStocks:5,priorExecuted:1,executedNow:4,unexecutedOriginalStocks:0,
 geometryCalls:4,jointTailSearches:0,originalLowerCalls:0,completeU:0,auditedGeometryNodes:nodes,diagnostics,
 limitations:['Prior messages said seven remained; actual immutable plan had five total and four remaining. The independent correction retains old bytes.',
 'No finished full-colour candidate exists, so these are construction failures, not four formal full-puzzle solver attempts.',
 'The fixed target/gate obstruction does not prove all target choices or all puzzle colourings unsolvable. No old failed stock was searched again.'],
 inputs:Object.fromEntries(inputHashes)};
fs.writeFileSync(`${dir}/completion-audit.json`,JSON.stringify(qa,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:qa.status,auditedGeometryNodes:nodes,diagnostics,path:`${dir}/completion-audit.json`}));
