import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {inspectFixedPortalBlocker,VERSION} from './reverse-fixed-portal-blocker-v1.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/',O=process.argv[2];
assert(O&&O.startsWith(V+'proof/reverse-fixed-portal-metadata-private-'));
const sha=b=>createHash('sha256').update(b).digest('hex'),binds={},cases=[];
function bind(p,h){const a=path.resolve(p).replaceAll('\\','/'),s=sha(fs.readFileSync(a));if(h)assert.equal(s,h,p);binds[a]=s;return{path:a,sha256:s};}
const H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],V3=[[0,0],[0,1],[0,2]],S1=[[0,0]];
const atom=(id,color,shape,star=false)=>({id,color,shape,star});
const gate=(id,color,side,offset,size,star=false)=>({id,color,side,offset,size,star});
function base(){const a=atom('fixed-red','red',V3),b=atom('missing-blue','blue',H2);return{width:4,height:4,inventory:[a,b],bodies:[{...a,x:0,y:0}],gates:[gate('red-top','red','top',0,1),gate('blue-left','blue','left',1,1)]};}
function run(f,{limit=100000,failAt=null}={}){const before=JSON.stringify(f),ops=[];let transitions=0,micro=0,calls=0,result=null,error=null;try{result=inspectFixedPortalBlocker({...f,charge(t,m,label){assert(Number.isSafeInteger(t)&&t>=0&&Number.isSafeInteger(m)&&m>=0);if(calls===failAt||transitions+t>limit)throw Error('metadata-budget-before-work');calls++;transitions+=t;micro+=m;ops.push({label,transitions:t,micro:m});}});}catch(e){error=e.message;}assert.equal(JSON.stringify(f),before,'Coordinate input mutated');return{result,error,accounting:{transitions,micro,calls,operations:ops}};}
function check(name,fn){const evidence=fn();cases.push({name,status:'PASS',evidence});}
check('all-four-directions-and-complete-anchor-union',()=>{
 const f=base(),out=[];const transforms=[([x,y])=>[x,y],([x,y])=>[3-y,x],([x,y])=>[3-x,3-y],([x,y])=>[y,3-x]];
 const sideMap=[{top:'top',left:'left'},{top:'right',left:'top'},{top:'bottom',left:'right'},{top:'left',left:'bottom'}];
 for(let t=0;t<4;t++){
  const tr=transforms[t],rotShape=s=>{const p=s.map(tr),minX=Math.min(...p.map(a=>a[0])),minY=Math.min(...p.map(a=>a[1]));return p.map(([x,y])=>[x-minX,y-minY]);};
  const inv=f.inventory.map(b=>({...b,shape:rotShape(b.shape)}));const c=f.bodies[0].shape.map(([x,y])=>tr([x,y]));const a={...inv[0],x:Math.min(...c.map(p=>p[0])),y:Math.min(...c.map(p=>p[1]))};
  const gs=f.gates.map(g=>{const points=Array.from({length:g.size},(_,i)=>g.side==='top'?[g.offset+i,0]:[0,g.offset+i]).map(tr),side=sideMap[t][g.side];return{...g,side,offset:Math.min(...points.map(p=>['top','bottom'].includes(side)?p[0]:p[1]))};});
  const r=run({...f,inventory:inv,bodies:[a],gates:gs});assert.equal(r.error,null);assert.equal(r.result.prunable,true);assert.equal(r.result.blockedMissingBodyId,'missing-blue');assert.equal(r.result.blockedPortals.length,1);out.push({orientation:t,result:r.result,accounting:{transitions:r.accounting.transitions,micro:r.accounting.micro}});
 }
 const wide=base();wide.inventory[1]=atom('missing-blue','blue',V2);wide.gates[1]=gate('blue-left','blue','left',1,3);let r=run(wide);assert.equal(r.result.prunable,true);assert.equal(r.result.blockedPortals.length,2);
 wide.inventory[0]=atom('fixed-red','red',V2);wide.bodies[0]={...wide.inventory[0],x:0,y:0};r=run(wide);assert.equal(r.result.prunable,false,'A second free anchor must prevent pruning');
 return{directions:out,multiAnchorBlocked:2,oneFreeAnchorPreventsPrune:true};
});
check('ordinary-star-double-exit-eligibility-and-fixed-body-predicate',()=>{
 const f=base();f.gates[1].star=true;f.gates.push(gate('blue-right','blue','right',3,1));let r=run(f);assert.equal(r.result.prunable,false,'Ordinary missing body may use the additional ordinary exit');
 f.inventory[1].star=true;r=run(f);assert.equal(r.result.prunable,true,'Star missing body cannot escape through ordinary-only gate');
 f.inventory[0].star=true;f.bodies[0].star=true;r=run(f);assert.equal(r.result.prunable,false,'Star body at ordinary-only gate is not fixed');
 f.gates[0].star=true;r=run(f);assert.equal(r.result.prunable,true);
 f.inventory[0].star=false;f.bodies[0].star=false;r=run(f);assert.equal(r.result.prunable,true,'Ordinary body at its star gate is still fixed');
 return{ordinaryBothGateKinds:true,starStarOnly:true,fixedGateEligibilityUsesSameSemantics:true};
});
check('temporary-blocking-and-unselected-parking-do-not-prove-fixed',()=>{
 const f=base();f.gates[0]=gate('red-top','red','top',3,1);const r=run(f);assert.equal(r.error,null);assert.equal(r.result.prunable,false);assert.equal(r.result.reason,'no-proven-fixed-bodies');
 const full=base();full.bodies.push({...full.inventory[1],x:2,y:3});const a=run(full);assert.equal(a.result.prunable,false);assert.equal(a.result.reason,'inventory-complete-first-full-priority');
 return{occupiedMissingEntryAloneInsufficient:true,noTopTwoOrMobilityArgumentAccepted:true,completeInventoryReturnsNoPrune:true};
});
check('metadata-rectangle-oracle-exhaustive-small-poses',()=>{
 let checked=0,pruned=0;const shapes=[S1,H2,V2,V3];
 // These are local rectangular coordinate fragments with 2 IDs, not LevelSpecs,
 // model inputs, reverse graph runs, or newly generated complete candidates.
 for(const s of shapes)for(const missingShape of shapes){const w=1+Math.max(...s.map(p=>p[0])),h=1+Math.max(...s.map(p=>p[1]));for(let y=0;y<=4-h;y++)for(let x=0;x<=4-w;x++){
  const a=atom('a','red',s),b=atom('b','blue',missingShape),gs=[gate('oracle-red-gate','red','top',0,2),gate('oracle-blue-gate','blue','left',1,2)];const f={width:4,height:4,inventory:[a,b],bodies:[{...a,x,y}],gates:gs};
  const bw=1+Math.max(...missingShape.map(p=>p[0])),bh=1+Math.max(...missingShape.map(p=>p[1]));if(bh>2)continue;
  const fixed=y===0&&x>=0&&x+w<=2;const portals=[];for(let py=1;py+bh<=3;py++)portals.push([0,py]);
  const expected=fixed&&portals.every(([px,py])=>s.some(([dx,dy])=>missingShape.some(([mx,my])=>x+dx===px+mx&&y+dy===py+my)));
  const r=run(f);assert.equal(r.error,null);assert.equal(r.result.prunable,expected);checked++;if(expected)pruned++;
 }}return{checked,pruned,independentCellIntersectionOracle:true};
});
check('all-new-work-is-precharged-and-failure-does-not-return-prune',()=>{
 const f=base(),good=run(f);assert.equal(good.result.prunable,true);let injected=0;
 for(let i=0;i<good.accounting.calls;i++){const r=run(f,{failAt:i});assert.equal(r.error,'metadata-budget-before-work');assert.equal(r.result,null);assert.equal(r.accounting.calls,i);injected++;}
 const exact=run(f,{limit:good.accounting.transitions});assert.equal(exact.error,null);const short=run(f,{limit:good.accounting.transitions-1});assert.equal(short.error,'metadata-budget-before-work');assert.equal(short.result,null);
 return{injectedBeforeChargeCalls:injected,successfulAccounting:good.accounting,oneTransitionShortDoesNotPrune:true,noCounterRefund:true};
});
check('disabled-factory-exact-source-reconstruction-and-graph-placement',()=>{
 const p=V+'proof/reverse-fixed-portal-factory8-source-03/source-changes.json',d=JSON.parse(fs.readFileSync(p));bind(p,'9fccc85664488b42cec241abd9c86361c7aacc5cc666365ab584bea92fe5ed6d');
 const b=fs.readFileSync(d.base.path),f=fs.readFileSync(d.target.path);bind(d.base.path,d.base.sha256);bind(d.target.path,d.target.sha256);let original=f.toString('utf8');for(const c of [...d.changes].reverse()){assert.equal(original.split(c.to).length-1,c.occurrences);original=original.replace(c.to,c.from);}assert.equal(sha(Buffer.from(original)),sha(b));
 const text=f.toString('utf8');assert(text.includes('export const PRODUCTION_DISABLED=true;'));assert(text.includes("function assertFutureFixedPortalProductionReady(){assert.equal(PRODUCTION_DISABLED,false"));
 assert(text.includes('session.visit(level,expanded);if(expanded)'));assert(text.includes('suffixRestoreComplete=true;session.chargeCoordinateWork'));
 for(const head of ['insertionOptions(level,body,node)','parkingOptions(level,node)'])assert(text.includes(head+'{if(firstFull)return[];if(pruneCommittedGraphNode(level,node))return[];'));
 for(const guard of ['node?.level===level','owned.has(level)','expandedLevels.has(level)','auditedGraphLevels.has(level)','Object.isFrozen(level)'])assert(text.includes(guard));
 assert(text.includes("if(audit.valid){session.chargeCoordinateWork(1,0,'fixed-portal-audited-edge-store');auditedGraphLevels.add(audit.reverseAfterLevel)"));
 assert(text.includes("fixed-portal-cache-hit"));assert(text.includes('levelSha256:node.key'));assert(text.includes('maxStates:10000,maxTransitions:30000000,maxMicroStates:3000000,maxMilliseconds:45000'));
 const graph=fs.readFileSync(T+'../formal-v3/design-reverse-interleaved.mjs','utf8');assert(graph.indexOf('if(!todo.length)')<graph.indexOf('for(const body of todo)'));
 return{reversibleChanges:d.changes.length,allOtherSourceBytesEqual:true,productionDisabled:true,currentTask6AndAdapter13StillUnchanged:true,noGraphModelArchiveRawOrLowerChanges:true,firstFullShortCircuitBeforePredicate:true,privateNodeCacheOnly:true,cacheHitChargedTransitions:2,nodeCallChargedTransitions:7,witnessUsesExistingGraphKeyNotNewHash:true,notAnEndToEndConstructorTest:true};
});
check('invalid-or-unknown-metadata-refused',()=>{
 const mutate=[f=>f.inventory.push({...f.inventory[0]}),f=>f.bodies[0].color='pink',f=>f.bodies[0].x=4,f=>f.bodies[0].frozen=1,f=>f.gates[0].frozen=1,f=>f.gates[0].id=f.inventory[0].id,f=>f.gates[1].offset=4];
 for(const fn of mutate){const f=base();fn(f);const r=run(f);assert(r.error);assert.equal(r.result,null);}return{negativeMetadataCases:mutate.length};
});
const built=await build({entryPoints:[T+'reverse-star-suffix-factory-v8.mjs'],bundle:true,platform:'node',format:'esm',write:false,metafile:true,logLevel:'silent'});
for(const p of Object.keys(built.metafile.inputs))bind(p);bind(T+'reverse-fixed-portal-blocker.metadata.test.mjs');
bind(V+'proof/reverse-star-fixed-portal-blocker-readonly-01/report.json','d5a5a290aba69ec8b5fe4863b5efbe18ef6a0b823c5010add581cc78617de6f1');
bind(V+'proof/reverse-star-suffix-task-v6-independent-01/report.json','d2596fbf81e4bc0b01c9f34abdd1a058e81322230074b5eea1ba103799fa16e0');
fs.mkdirSync(O,{recursive:false});
const report={schemaVersion:1,status:'FIXED_PORTAL_DISABLED_DRAFT_METADATA_PASS',helperVersion:VERSION,createdAt:new Date().toISOString(),productionDisabled:true,cases,passed:cases.length,scope:'Coordinate fragments plus exact source checks only. No constructor/runtime/history entry invoked. New helper is neither a game solvability proof nor production authorization.',limitations:['No live graph/model integration test; placement and legacy preservation were checked as source.','Pruning only applies to future truly redesigned input and already audited committed popped inverse nodes; no old source200 input is rerun.','First full capture/goal takes priority, all prior formed records and raw tickets remain; no refunded or uncounted worlds.','Private per-node pure-geometry memoization only. New calls/hits/evaluation/diagnostic bookkeeping are charged; no runtime/API or raw state cache.','Bounded helper geometry matches the immutable normal rectangular/no-dynamics domain; it does not accept temporarily immobile bodies as permanent.'],newModels:0,newConstructions:0,newSearches:0,newReplayCalls:0,newHistoryLoads:0,newPublicClaims:0,oldFilesChanged:false,toolBindings:Object.fromEntries(Object.entries(binds).filter(([p])=>p.includes('/tools/'))),fileBindings:binds,errors:[]};
const p=O+'/report.json';fs.writeFileSync(p,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({path:p,sha256:sha(fs.readFileSync(p)),passed:cases.length,fileBindings:Object.keys(binds).length,toolBindings:Object.keys(report.toolBindings).length}));
