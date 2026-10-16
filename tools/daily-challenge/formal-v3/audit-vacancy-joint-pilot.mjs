import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {boardCells,absoluteCells} from './diversity-layout-factory.mjs';
import {geometryStockFingerprint} from './design-vacancy-independent-pool.mjs';
import {auditRetile,layerCoverage} from './design-vacancy-retile-candidates.mjs';

// Read-only audit: this file calls no geometry constructor, held BFS or solver.
const root='deliverables/daily-formal-v3-20261008',dir=`${root}/design/vacancy-joint-pilot-01`,inputs=new Map();
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>{inputs.set(p,sha(p));return JSON.parse(fs.readFileSync(p,'utf8'));};
const bound=b=>{assert.equal(sha(b.path),b.sha256);return read(b.path);};
const runtime=await loadBoundedRuntime(),plan=read(`${dir}/plan.json`),report=read(`${dir}/report.json`),index=read(`${dir}/index.json`);
assert.equal(report.geometryCalls,1);assert.equal(report.jointTailSearches,1);assert.equal(report.records.length,0);
assert.equal(report.proofSearches,0);assert.equal(report.accepted,0);assert.equal(report.formalReady,false);assert.equal(index.records.length,0);
const parent=bound(plan.parentFailed),family=bound(plan.wholeBoardFamily),qualification=bound(plan.constructorQualification);
assert.equal(levelSha256(parent.level),levelSha256(family.level));assert.equal(parent.attempt.id,plan.parentAttemptId);
bound(plan.publicFailureBlock);assert.equal(qualification.status,'INDEPENDENT_CONSTRUCTOR_QUALIFICATION_COMPLETE');
assert(qualification.evidence.every(e=>e.passed));bound(plan.selected);bound(plan.old450);
for(const b of plan.tools){assert.equal(sha(b.snapshot),b.sha256);assert.equal(b.snapshotSha256,b.sha256);assert.equal(sha(b.path),b.sha256);inputs.set(b.path,b.sha256);inputs.set(b.snapshot,b.sha256);}
const source=runtime.LEVELS.find(s=>s.id===plan.sourceLevelId),oldStocks=new Set();
assert.equal(levelSha256(source),plan.sourceLevelSha256);
for(const file of fs.readdirSync(`${root}/design`,{recursive:true}).map(p=>String(p).replaceAll('\\','/')).filter(p=>/^geometry[^/]*\.json$/.test(p.split('/').at(-1))&&!p.startsWith('vacancy-joint-pilot-'))){
 const g=read(`${root}/design/${file}`);if(g.built?.ok&&g.sourceLevelId){const s=runtime.LEVELS.find(l=>l.id===g.sourceLevelId);oldStocks.add(geometryStockFingerprint(s,g.built.blocks).stockSha256);}
}
for(const name of fs.readdirSync(`${root}/design`).filter(p=>p.startsWith('single-vacancy-independent-'))){const path=`${root}/design/${name}/plan.json`;if(!fs.existsSync(path))continue;
 for(const x of read(path).inputs??[])if(x.built?.ok)oldStocks.add(x.fingerprint.stockSha256);}
const planned=new Set();for(const x of plan.inputs){assert(auditRetile(parent.level,x.level).pass);const fp=geometryStockFingerprint(source,x.level.blocks);
 assert.deepEqual(fp,x.fingerprint);assert(!oldStocks.has(fp.stockSha256));assert(!planned.has(fp.stockSha256));planned.add(fp.stockSha256);
 assert.notEqual(designFingerprints(x.level).shapeSha256,parent.attempt.shapeSha256);}
let auditedGraphNodes=0;
for(const row of report.rows){
 const request=bound(row.request),g=bound(row.geometry),c=bound(row.construction),stock=row.stock;
 const result=read(`${root}/design/vacancy-joint-construction-attempts/${stock}.result.json`),blocked=read(`${root}/design/vacancy-joint-construction-attempts/${stock}.blocked.json`);
 bound(blocked.result);assert.equal(result.routeFound,false);assert.equal(blocked.continuedSearchForbidden,true);
 assert.equal(request.parentAttemptId,parent.attempt.id);assert.equal(request.stock,g.stockFingerprint.stockSha256);bound(request.inputPlan);
 assert.equal(c.status,'CONSTRUCTION_UNKNOWN');assert.equal(c.reason,'fixed-domain-zero-parking-tail-exhausted');
 assert.equal(c.level,null);assert.equal(c.U,null);assert.equal(c.drags,null);assert.equal(c.tail.completeAssignments,0);
 assert.equal(c.fixedDomainSha256,levelSha256(c.fixedDomain));assert.equal(c.fixedTarget.depth,32);
 const r=g.result,bodies=g.built.blocks.slice(1),legal=new Set(boardCells(source).map(p=>p.join(',')));
 assert.equal(r.rawGeometricStates,r.queue.length);assert(r.rawGeometricStates<=9999&&r.expanded<=9999);assert(layerCoverage(r,31).complete);
 for(const[i,node]of r.queue.entries()){
  const occupied=new Set();for(const[j,b]of bodies.entries())for(const[dx,dy]of b.shape){const k=[node.positions[j][0]+dx,node.positions[j][1]+dy].join(',');assert(legal.has(k)&&!occupied.has(k));occupied.add(k);}
  assert.equal(legal.size-occupied.size,2);
  if(i===0){assert.equal(node.parent,-1);assert.equal(node.depth,0);}else{
   assert(node.parent>=0&&node.parent<i);const p=r.queue[node.parent];assert.equal(node.depth,p.depth+1);
   const changed=node.positions.flatMap((xy,j)=>JSON.stringify(xy)!==JSON.stringify(p.positions[j])?[j]:[]);assert.equal(changed.length,1);
   assert.equal(node.move.blockId,bodies[changed[0]].id);assert.deepEqual(node.move.from,p.positions[changed[0]]);assert.deepEqual(node.move.to,node.positions[changed[0]]);
  }auditedGraphNodes++;
 }
 const current=structuredClone(g.built.blocks),opening=current.shift();assert.equal(opening.id,'opening');assert.equal(c.prefix.drags[0].blockId,'opening');
 for(const drag of c.prefix.drags.slice(1)){
  const body=current.find(b=>b.id===drag.blockId),others=new Set(current.filter(b=>b!==body).flatMap(absoluteCells).map(p=>p.join(',')));
  for(const point of drag.path){assert.equal(Math.abs(point[0]-body.x)+Math.abs(point[1]-body.y),1);for(const[dx,dy]of body.shape){const k=[point[0]+dx,point[1]+dy].join(',');assert(legal.has(k)&&!others.has(k));}body.x=point[0];body.y=point[1];}
  if(drag.exitSide){assert.equal(body.id,c.prefix.targetBodyId);current.splice(current.indexOf(body),1);}
 }
 assert.deepEqual(current,c.prefix.tailBodies);
 const a=c.accounting;assert.equal(a.rawFullBoardStates,Object.values(a.kinds).reduce((n,v)=>n+v,0));assert.equal(a.kinds.priorGeometry,r.rawGeometricStates);
 assert.equal(a.conservativeFullBoardStateUpperBound,a.rawFullBoardStates);assert(a.rawFullBoardStates<=10000&&a.rawExploredStates<=a.rawFullBoardStates);
 assert(a.microDiscoveredStates<=3000000&&a.attemptedTransitions<=10000000&&a.elapsedMilliseconds<30000);
 assert.deepEqual(c.priorGeometryAccounting,{rawFullBoardStates:r.rawGeometricStates,rawExploredStates:r.expanded,microDiscoveredStates:r.attempted/4,
  microExpandedStates:r.attempted/4,attemptedTransitions:r.attempted,elapsedMilliseconds:Math.ceil(g.elapsedMilliseconds)});
 assert(Object.values(row.comparisons).every(x=>x.pass));
}
for(const[p,digest]of inputs)assert.equal(sha(p),digest,'Read-only input changed');
const qa={status:'COMPLETION_AUDIT_PASS_FAILURE_REMAINS_UNKNOWN',accepted:0,formalReady:false,geometryCalls:1,jointTailSearches:1,proofSearches:0,
 completeU:0,wholeBoardFamilyMaximumAccepted:1,plannedNewStocks:plan.inputs.length,executedNewStocks:1,unexecutedNewStocks:plan.inputs.length-1,
 auditedGraphNodes,checks:['actual failed parent 0074 matches first claim e235','source normal mask/shape inventory/old stock dedup','original and snapshot tool hashes',
 'qualification receipt and selected149 snapshot','geometry occupancy and ordered parent chain','stored fixed prefix unit paths without search',
 'combined prior geometry and all joint branches <=10000','failed stock request/result/blocked closed','no original lower task or accepted final object'],
 limitations:['The fixed tail domain was exhausted, not all colourings or all original puzzle routes.','No final complete colour assignment exists; no actual U or L is claimed.',
 'The stored geometric prefix is not an actual full-colour puzzle witness.','Other seven planned stocks were not searched; no automatic expansion is authorized by this audit.'],
 inputs:Object.fromEntries(inputs)};
fs.writeFileSync(`${dir}/completion-audit.json`,JSON.stringify(qa,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:qa.status,auditedGraphNodes,readOnlyInputs:inputs.size,path:`${dir}/completion-audit.json`}));
