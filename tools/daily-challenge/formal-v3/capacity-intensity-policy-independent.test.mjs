import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {auditCapacityIntensity,addCapacitySupport} from './capacity-intensity-policy.mjs';
import {mechanismInventory} from './mechanism-intensity.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {intensify,createCapacityConstructionBudget,findHeldExit} from './capacity-primary-adapter.mjs';
import {generatorMountFixture} from './mechanism-intensity-fixtures.mjs';

const runtime=await loadBoundedRuntime(),evidence=[];
const tool='tools/daily-challenge/formal-v3/capacity-intensity-policy.mjs';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),toolSha=hash(tool);
const output=process.env.CAPACITY_POLICY_AUDIT_OUT??fs.mkdtempSync('deliverables/daily-formal-v3-20261008/proof/capacity-policy-independent-');
if(process.env.CAPACITY_POLICY_AUDIT_OUT)fs.mkdirSync(output);
function unusedFrozenPortalFixture(){
 const colors=['blue','green','yellow','orange','purple','cyan','pink','red'];
 const level={id:999944,name:'Unused ice portal qualification',width:4,height:2,difficulty:'hard',reward:0,timeSeconds:100,parMoves:8,
  mechanismRules:'revised-2026-09-27-v1.5',blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%4,y:Math.floor(i/4),shape:[[0,0]],...(color==='red'?{star:true}:{})})),
  gates:[{id:'unused-red-ice',color:'red',side:'top',offset:0,size:1,frozen:3},
   {id:'actual-red-star',color:'red',side:'top',offset:3,size:1,star:true},
   {id:'blue',color:'blue',side:'left',offset:0,size:1},{id:'green',color:'green',side:'top',offset:1,size:1},
   {id:'yellow',color:'yellow',side:'top',offset:2,size:1},{id:'orange',color:'orange',side:'right',offset:0,size:1},
   {id:'purple',color:'purple',side:'left',offset:1,size:1},{id:'cyan',color:'cyan',side:'bottom',offset:1,size:1},
   {id:'pink',color:'pink',side:'bottom',offset:2,size:1}],coloredGrids:[{id:'red-grid',color:'red',cells:[[3,1]]}]};
 const sides=['left','top','top','right','left','bottom','bottom','top'];
 const drags=colors.map((_,i)=>({blockId:`b${i}`,path:i===7?[[3,0]]:[],exitSide:sides[i]}));
 return{level,drags};
}
test('a thawed unused ordinary portal cannot borrow a same-side star portal exit',()=>{
 const {level,drags}=unusedFrozenPortalFixture();runtime.validateLevel(level);
 const model=new runtime.PuzzleModel(level),actualExits=[],nativeTry=model.tryExit.bind(model);
 model.tryExit=(id,side)=>{const result=nativeTry(id,side);if(result.ok)actualExits.push({id,side,gateId:result.gateId});return result;};
 model.startCountdown();for(const drag of drags)applyNativeDrag(model,drag);
 assert(model.snapshot().complete);assert(actualExits.every(e=>e.gateId!=='unused-red-ice'));
 assert.equal(actualExits.at(-1).gateId,'actual-red-star');
 const prior=Object.fromEntries(Object.keys(mechanismInventory(level)).map(k=>[k,[]]));
 const audit=auditCapacityIntensity(runtime,level,drags,'colored-grid',1,prior);
 const ice=audit.rows.find(r=>r.mechanism==='frozen-exit').details.find(d=>d.id==='unused-red-ice');
 evidence.push({test:'same-side-other-portal',level,drags,actualExits,audit,passed:ice.active===false&&audit.passed===false});
 assert.equal(ice.active,false,'Unused thawed gate borrowed a same-colour/side exit from the star gate');
 assert.equal(audit.passed,false);
});
test('an unused flipping portal cannot borrow a real star-portal exit after toggling',()=>{
 const {level,drags}=unusedFrozenPortalFixture();
 level.gates=level.gates.filter(g=>g.id!=='unused-red-ice');
 level.flipDoors=[{id:'unused-red-flip',color:'red',side:'top',offset:0,size:1,initiallyOpen:false}];
 runtime.validateLevel(level);
 const model=new runtime.PuzzleModel(level),actualExits=[],nativeTry=model.tryExit.bind(model);
 model.tryExit=(id,side)=>{const result=nativeTry(id,side);if(result.ok)actualExits.push({id,side,gateId:result.gateId});return result;};
 model.startCountdown();for(const drag of drags)applyNativeDrag(model,drag);
 assert(model.snapshot().complete);assert(actualExits.every(e=>e.gateId!=='unused-red-flip'));
 assert.equal(actualExits.at(-1).gateId,'actual-red-star');
 const prior=Object.fromEntries(Object.keys(mechanismInventory(level)).map(k=>[k,[]]));
 const audit=auditCapacityIntensity(runtime,level,drags,'colored-grid',1,prior);
 const flip=audit.rows.find(r=>r.mechanism==='flip-door').details.find(d=>d.id==='unused-red-flip');
 evidence.push({test:'unused-flip-other-portal',level,drags,actualExits,audit,passed:flip.active===false&&audit.passed===false});
 assert.equal(flip.active,false,'Unused flip door borrowed an exit from a different physical portal');
 assert.equal(audit.passed,false);
});
test('the actual inner shell colour binds its own frozen portal and duplicate grids reject',()=>{
 const {level,drags}=unusedFrozenPortalFixture();
 delete level.coloredGrids;
 level.blocks.at(-1).star=false;level.blocks.at(-1).layers=['red','blue'];
 level.gates.find(g=>g.id==='actual-red-star').star=false;
 level.gates=level.gates.filter(g=>g.id!=='unused-red-ice');
 level.gates.find(g=>g.id==='blue').frozen=3;
 // The opening blue body cannot leave until three other clears thaw its gate.
 const route=[drags[1],drags[2],drags[3],drags[0],...drags.slice(4),
  {blockId:'b7',path:[[2,0],[1,0],[0,0]],exitSide:'left'}];
 const audit=auditCapacityIntensity(runtime,level,route,'axis-block',1,Object.fromEntries(Object.keys(mechanismInventory(level)).map(k=>[k,[]])));
 const blue=audit.rows.find(r=>r.mechanism==='frozen-exit').details[0];
 assert(blue.active);assert.deepEqual(blue.evidence.realExitDrags,[4,9]);
 assert.equal(blue.evidence.actualPortalExits.at(-1).color,'blue');
 const duplicate=unusedFrozenPortalFixture();duplicate.level.coloredGrids.push({...duplicate.level.coloredGrids[0],id:'duplicate-grid'});
 assert.throws(()=>auditCapacityIntensity(runtime,duplicate.level,duplicate.drags,'colored-grid',1,mechanismInventory(duplicate.level)),/overlap/);
 evidence.push({test:'inner-colour-and-duplicate-grid',passed:true,actualPortalExits:blue.evidence.actualPortalExits});
});
test('a later unlocked mechanism cannot pad an earlier stage',()=>{
 const {level,drags}=unusedFrozenPortalFixture(),prior=Object.fromEntries(Object.keys(mechanismInventory(level)).map(k=>[k,[]]));
 const audit=auditCapacityIntensity(runtime,level,drags,'axis-block',1,prior);
 assert(audit.issues.includes('not-unlocked:star'));assert(audit.issues.includes('not-unlocked:colored-grid'));
 assert.equal(audit.passed,false);evidence.push({test:'not-unlocked',passed:true,issues:audit.issues});
});
test('a real generator remains one instance and all FIFO inventory clears before two distinct base bodies',async()=>{
 const fixture=generatorMountFixture(),r=await intensify(fixture.level,fixture.drags,'generator',{runtime,difficulty:1,targets:{instances:1},maxAttempts:1});
 assert(r.ok,JSON.stringify(r.failedAttempts));
 const prior=Object.fromEntries(Object.keys(mechanismInventory(r.level)).map(k=>[k,[]]));
 const audit=auditCapacityIntensity(runtime,r.level,r.drags,'generator',1,prior),row=audit.rows.find(r=>r.mechanism==='generator');
 assert.equal(row.instanceCount,1);assert.equal(row.details[0].queue,3);assert(row.capacityPass&&row.allParticipate);
 assert(row.details[0].evidence.baseBodiesRemainingAtCargoClear.every(n=>n>=2));
 assert(audit.issues.includes('too-few-total-instances'),'Cargo is not three generator instances');
 assert(r.searchAccounting.construction.conservativeFullBoardStateUpperBound<=10000);
 const small=await intensify(fixture.level,fixture.drags,'generator',{runtime,difficulty:1,targets:{instances:1,queuePerGenerator:2},maxAttempts:1});
 assert(small.ok,JSON.stringify(small.failedAttempts));
 const rejected=auditCapacityIntensity(runtime,small.level,small.drags,'generator',1,prior);
 assert.equal(rejected.rows.find(r=>r.mechanism==='generator').capacityPass,false);
 evidence.push({test:'real-generator-capacity',passed:true,audit,accounting:r.searchAccounting.construction});
});
test('a real lift requires its full area and every hidden body, not just a revealed marker',async()=>{
 const fixture=generatorMountFixture(),r=await intensify(fixture.level,fixture.drags,'layered-lift',{runtime,difficulty:1,targets:{instances:1},maxAttempts:1});
 assert(r.ok,JSON.stringify(r.failedAttempts));
 const prior=Object.fromEntries(Object.keys(mechanismInventory(r.level)).map(k=>[k,[]]));
 const audit=auditCapacityIntensity(runtime,r.level,r.drags,'layered-lift',1,prior),row=audit.rows.find(r=>r.mechanism==='layered-lift');
 assert.equal(row.instanceCount,1);assert(row.details[0].area>=2);assert(row.capacityPass&&row.allParticipate);
 const hidden=new Set(r.level.blocks.filter(b=>b.shutterId).map(b=>b.id));
 assert.throws(()=>auditCapacityIntensity(runtime,r.level,r.drags.filter(d=>!hidden.has(d.blockId)),'layered-lift',1,prior),/full real inventory/);
 evidence.push({test:'real-lift-inventory',passed:true,audit,accounting:r.searchAccounting.construction});
});
test('dynamic held spawn is charged and a shared cap stops before the next model mutation',()=>{
 const level={id:999945,name:'Dynamic held-world qualification',difficulty:'hard',reward:0,width:6,height:6,timeSeconds:100,parMoves:1,
  mechanismRules:'revised-2026-09-27-v1.5',blocks:[{id:'owner',x:1,y:2,color:'red',shape:[[0,0]]},
   {id:'cargo',x:0,y:1,color:'blue',shape:[[0,0],[1,0],[0,1],[1,1]]}],
  gates:[{id:'r',color:'red',side:'top',offset:2,size:1},{id:'b',color:'blue',side:'bottom',offset:2,size:2}],
  generators:[{id:'machine',side:'left',offset:2,rimSpan:3,rimMount:'rim',spawn:[0,1],queueBlockIds:['cargo']}]};
 const Native=runtime.PuzzleModel,original=Native.prototype.moveBlockStep;let mutations=0,spawns=0;
 Native.prototype.moveBlockStep=function(...args){mutations++;const before=this.snapshot().queuedBlocks.length,result=original.apply(this,args);if(this.snapshot().queuedBlocks.length<before)spawns++;return result;};
 let budget;try{
  const model=new Native(level);model.startCountdown();budget=createCapacityConstructionBudget({maxStates:9});
  assert.throws(()=>findHeldExit(model,'owner',{constructionBudget:budget}),/construction-board-budget/);
  assert(spawns>0);assert.equal(budget.report().fullWorldReservations,9);
  const before=mutations;assert.throws(()=>findHeldExit(model,'owner',{constructionBudget:budget}),/construction-board-budget/);
  assert.equal(mutations,before,'An exhausted shared meter must refuse before clone/mutation');
 }finally{Native.prototype.moveBlockStep=original;}
 evidence.push({test:'dynamic-world-shared-budget',passed:true,spawns,mutations,accounting:budget.report()});
});
test('a single release is rejected and deterministic support adds a different real event beyond the minimum total',()=>{
 const {level,drags}=unusedFrozenPortalFixture();delete level.coloredGrids;
 level.blocks.at(-1).star=false;level.blocks.at(-1).movementAxis='vertical';
 level.gates=level.gates.filter(g=>g.id!=='unused-red-ice');
 Object.assign(level.gates.find(g=>g.id==='actual-red-star'),{star:false,frozen:3});
 const prior=Object.fromEntries(Object.keys(mechanismInventory(level)).map(k=>[k,[]]));
 const single=auditCapacityIntensity(runtime,level,drags,'axis-block',1,prior);
 assert(single.rows.every(r=>r.allParticipate));assert.deepEqual(single.releaseEvents,[3]);
 assert(single.issues.includes('unstaggered-combined-release-events'));assert.equal(single.passed,false);
 const r=addCapacitySupport(runtime,level,drags,'axis-block',1,prior);
 assert(r.ok,JSON.stringify(r.audit.issues));assert.deepEqual(r.audit.releaseEvents,[3,7]);
 assert.equal(r.audit.priorComparison.currentTotal,3);assert.equal(r.audit.targets.minimumTotalInstances,2);
 evidence.push({test:'two-actual-release-events',passed:true,original:single,adapted:r.audit});
});
test.after(()=>{
 assert.equal(hash(tool),toolSha);
 fs.writeFileSync(`${output}/report.json`,JSON.stringify({status:evidence.length===8&&evidence.every(e=>e.passed)?'INDEPENDENT_POLICY_FIXTURE_PASS':'INDEPENDENT_POLICY_FIXTURE_FAIL',
  tool,toolSha256:toolSha,evidence,fullBoardSolverInvocations:0,formalReady:false},null,2)+'\n',{flag:'wx'});
});
