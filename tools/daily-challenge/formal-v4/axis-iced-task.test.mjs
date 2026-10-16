import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {SELF,INPUTS,SLOT,constructAxisIced,withAxisIcedConstruction,assertAxisIcedDelta,assertEarlyTaskEvidence,assertPlainTaskLink,replayReservations} from './axis-iced-task.mjs';
import {createCapacityConstructionBudget} from '../formal-v3/capacity-primary-adapter.mjs';
import {withCapacityConstructionAttempt} from './capacity-construction-ledger.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

const rt=await loadV4CatalogRuntime(),sha=b=>createHash('sha256').update(b).digest('hex'),evidence=[];
const out=process.env.AXIS_ICED_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/axis-iced-private-');await fs.mkdir(out,{recursive:true});
const count=async()=>(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(f=>f.endsWith('.request.json')).length,before=await count();
function fixture(){
 const colors=['red','blue','green','yellow','purple'];
 const level={id:999839,name:'Private axis and four staggered ice',difficulty:'super',reward:0,timeSeconds:120,parMoves:15,mechanismRules:'revised-2026-09-27-v1.5',width:5,height:3,
  blocks:Array.from({length:15},(_,i)=>({id:'b'+i,color:colors[i%5],x:i%5,y:Math.floor(i/5),shape:[[0,0]],...(i>=10&&i<=13?{frozen:2}:{})})),
  gates:colors.map((color,i)=>({id:'g'+i,color,side:'top',offset:i,size:1}))};
 const drags=level.blocks.map(b=>({blockId:b.id,path:Array.from({length:b.y},(_,j)=>[b.x,b.y-j-1]),exitSide:'top'}));
 const configuration={axes:[{id:'b5',axis:'vertical',exitDrag:6,gateId:'g0'},{id:'b6',axis:'vertical',exitDrag:7,gateId:'g1'}],
  ice:[7,8,9,10].map((n,i)=>({id:'b'+(10+i),before:2,count:n,releaseDrag:n})),U:0,clears:15,drags:15};
 const prior=structuredClone(level);for(const b of prior.blocks)delete b.frozen;prior.blocks[5].movementAxis='vertical';
 return{base:{accepted:true,level,drags,levelSha256:levelSha256(level)},prior,configuration};
}
test('exact six fields, actual axes and four release events retain the complete known route',()=>{
 const f=fixture(),before=levelSha256(f.base),meter=createCapacityConstructionBudget(),q=constructAxisIced(rt,f.base,f.prior,meter,f.configuration);
 assert(q.ok&&q.audit.passed);assert.equal(q.audit.replay.nonClearingDrags,0);assert.deepEqual(q.audit.releaseEvents,[7,8,9,10]);assert.equal(q.audit.priorComparison.currentTotal,6);
 assert.equal(q.constructionAccounting.fullWorldReservations,16+6*replayReservations(f.base.drags));assert.equal(levelSha256(f.base),before);
 for(const change of [l=>l.blocks[0].color='orange',l=>l.gates[0].offset=1,l=>l.blocks[5].movementAxis='horizontal',l=>l.blocks[10].frozen=6]){const x=structuredClone(q.level);change(x);assert.throws(()=>assertAxisIcedDelta(f.base.level,x,f.base.drags,f.base.drags,f.configuration));}
 const route=structuredClone(f.base.drags);route[0].path=[[1,0]];assert.throws(()=>assertAxisIcedDelta(f.base.level,q.level,route,f.base.drags,f.configuration));
 evidence.push({test:'exact-six-fields-and-capacity-participation',passed:true,construction:q});
});
test('shared budget covers final replays, budget failure seals the physical base across stages',async()=>{
 const f=fixture(),dir=await fs.mkdtemp(out+'/guard-'),opts={qualificationOnly:true,publicLedgerDirectory:dir+'/public',constructionLedgerDirectory:dir+'/construction',configuration:f.configuration};
 const required=17+6*replayReservations(f.base.drags);const q=await withAxisIcedConstruction(rt,f.base,f.prior,{...opts,maxStates:required});assert(q.ok,q.reason);assert.equal(q.U,0);assert.equal(q.constructionAccounting.fullWorldReservations,required);
 const faildir=await fs.mkdtemp(out+'/failed-'),failedOpts={...opts,publicLedgerDirectory:faildir+'/public',constructionLedgerDirectory:faildir+'/construction',maxStates:required-1};
 const failed=await withAxisIcedConstruction(rt,f.base,f.prior,failedOpts);assert(!failed.ok&&failed.terminalBlocked&&failed.constructionAttemptStarted);assert.equal(failed.canonicalReplay,undefined);
 let calls=0;const again=await withCapacityConstructionAttempt(rt,f.base,{...SLOT,newestMechanism:'colored-grid'},()=>{calls++;throw Error('unreachable');},{qualificationOnly:true,ledgerDirectory:failedOpts.constructionLedgerDirectory,publicLedgerDirectory:failedOpts.publicLedgerDirectory});assert.equal(calls,0);assert(again.terminalBlocked&&!again.constructionAttemptStarted);
 await assert.rejects(()=>withAxisIcedConstruction(rt,f.base,f.prior,{qualificationOnly:true}),/public namespace/);
 evidence.push({test:'budget-and-shared-stage-failure-seal',passed:true,required,complete:q,failed,repeat:again});
});
test('the real task sidecar is read only; missing bridge, changed route/lower or old schema cannot mint readiness',async()=>{
 const base=JSON.parse(await fs.readFile(INPUTS.base.path)),stem=PUBLIC_ATTEMPT_LEDGER+'/'+base.attempt.id;
 const links={request:JSON.parse(await fs.readFile(stem+'.request.json')),result:JSON.parse(await fs.readFile(stem+'.result.json')),sidecar:JSON.parse(await fs.readFile(stem+'.v4-thawed-prefix-task-result.json')),planRecord:JSON.parse(await fs.readFile(stem+'.v4-thawed-prefix-task-plan.json'))};
 assertEarlyTaskEvidence(base,links.request,links.result,links.sidecar,links.planRecord);
 for(const mutate of [l=>delete l.sidecar.bridge,l=>l.sidecar.drags[0].path.push([99,99]),l=>l.result.lower.floor=30,l=>l.planRecord.plan.floor=1,l=>l.request.levelSha256='a'.repeat(64)]){const x=structuredClone(links);mutate(x);assert.throws(()=>assertEarlyTaskEvidence(base,x.request,x.result,x.sidecar,x.planRecord));}
 const old={...base,version:base.version.replace('-task-','-')};assert.throws(()=>assertEarlyTaskEvidence(old,links.request,links.result,links.sidecar,links.planRecord));
 evidence.push({test:'real-new-task-receipt-read-only-and-five-tamper-controls',passed:true,base:INPUTS.base,originalDragsSha256:routeSha256(base.drags)});
});
test('new separate plain receipt permits only four exact task provenance additions',async()=>{
 const b=JSON.parse(await fs.readFile(INPUTS.base.path)),iced=JSON.parse(await fs.readFile(b.plan.constructionEvidence.path)),plain=JSON.parse(await fs.readFile(b.plan.plainConstructionEvidence.path)),input=JSON.parse(await fs.readFile(b.input.path));
 assertPlainTaskLink(iced,input,plain);for(const alter of [p=>p.level.blocks[0].color='orange',p=>p.recipeId='another',p=>p.plan.sha256='a'.repeat(64),p=>p.extra='not-authorized']){const p=structuredClone(plain);alter(p);assert.throws(()=>assertPlainTaskLink(iced,input,p));}
 evidence.push({test:'four-exact-metadata-additions-not-physical-replacement',passed:true,plain:b.plan.plainConstructionEvidence,iced:b.plan.constructionEvidence});
});
test.after(async()=>{
 const fileBindings={...rt.toolchainBindings},compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of [...Object.keys(compiled.metafile.inputs),SELF.replace('.mjs','.test.mjs')])fileBindings[p.replaceAll('\\','/')]=sha(await fs.readFile(p));
 const report={status:evidence.length===4?'AXIS_ICED_TASK_PRIVATE_PASS':'INCOMPLETE_PRIVATE_QUALIFICATION',tests:4,evidence,fileBindings,toolBindings:fileBindings,
  proofToolchainSha256:rt.toolchainSha256,publicRequestCountBeforeAfter:[before,await count()],newRealCandidateConstructions:0,newRealCandidateSearches:0,newPublicClaims:0,
  formalReady:false,oldToolsChanged:false};await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
