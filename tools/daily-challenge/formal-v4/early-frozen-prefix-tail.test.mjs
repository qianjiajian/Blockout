import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {makeEarlyFrozenPrefixTailPlan,exploreEarlyFrozenPrefixTail,auditThawedPrefixBridge} from './early-frozen-prefix-tail.mjs';
import {makeEarlyFrozenIcePlan,exploreEarlyFrozenIce,EARLY_FROZEN_ACCOUNTING} from './early-frozen-ice-joint.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {HISTORY_LEDGER_ROOTS} from './native-batch-io.mjs';
import {EARLY_CONSTRUCTION_LEDGER} from './early-frozen-construction-contract.mjs';
const runtime=await loadV4Runtime(),out=process.env.EARLY_PREFIX_TAIL_TEST_OUT;
assert(out,'Fresh private output required');await fs.mkdir(out,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),evidence=[];
const publicBefore=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).sort();
const plain={id:999831,name:'Private thawed-prefix complete-stock fixture',width:2,height:2,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'},
  {id:'g',x:1,y:1,shape:[[0,0]],color:'green'},{id:'y',x:0,y:1,shape:[[0,0]],color:'yellow'}],
 gates:[{id:'gr',side:'top',offset:0,size:1,color:'red'},{id:'gb',side:'bottom',offset:1,size:1,color:'blue'},
  {id:'gg',side:'left',offset:1,size:1,color:'green'},{id:'gy',side:'top',offset:1,size:1,color:'yellow'}]};
const prefix=[{blockId:'r',path:[],exitSide:'top'}];
const defaults={floor:1,searchUpper:8,qualificationOnly:true,upperBudget:{maxStates:100,maxTransitions:100000,maxMicroStates:100000,maxMilliseconds:5000},
 lowerBudget:{maxStates:99,maxTransitions:100000,maxMicroStates:100000,maxMilliseconds:5000}};
async function fixture(label,{worlds=3,count=1,prefixDrags=prefix}={}){
 const dir=`${out}/${label}`;await fs.mkdir(dir);
 const iceDeclaration={regionBlockIds:['y'],count},level=structuredClone(plain);level.blocks.find(b=>b.id==='y').frozen=count;
 const accounting={version:EARLY_FROZEN_ACCOUNTING,placeholderWorldReservations:1,completedColourWorldReservations:worlds-2,icedWorldReservations:1,
  completeWorldReservations:worlds,microStates:3,transitions:5,elapsedMilliseconds:1};
 const plainFile=`${dir}/plain.json`,plainOutput={sourceLevelId:plain.id,level:plain,levelSha256:levelSha256(plain),prefixDrags,prefixSha256:routeSha256(prefixDrags),
  qualificationOnly:true,syntheticPriorAccountingFixture:true,placeholderWorld:plain,paint:{accounting:{completeWorldReservations:worlds-2}},
  constructionAccounting:{version:'late-region-static-construction-v1',completeWorldReservations:worlds-1,microStates:3,transitions:5,elapsedMilliseconds:1}};
 await fs.writeFile(plainFile,JSON.stringify(plainOutput,null,2)+'\n',{flag:'wx'});
 const candidate={sourceLevelId:plain.id,level,prefixDrags,iceDeclaration,constructionAccounting:accounting,plainConstructionEvidence:{path:plainFile,sha256:sha(await fs.readFile(plainFile))}};
 const file=`${dir}/iced.json`;await fs.writeFile(file,JSON.stringify({...candidate,levelSha256:levelSha256(level),prefixSha256:routeSha256(prefixDrags)},null,2)+'\n',{flag:'wx'});
 candidate.constructionEvidence={path:file,sha256:sha(await fs.readFile(file))};return{candidate,dir,ledgerDirectory:`${dir}/private-ledger`};
}
const planFor=(f,options={})=>makeEarlyFrozenPrefixTailPlan(runtime,f.candidate,{...defaults,...options});
const run=(f,plan=planFor(f),rt=runtime)=>exploreEarlyFrozenPrefixTail(rt,f.candidate,{plan,qualificationOnly:true,ledgerDirectory:f.ledgerDirectory});
async function sealed(f,r){
 assert(await fs.stat(`${f.ledgerDirectory}/${r.attempt.id}.blocked.json`));
 assert(await fs.stat(`${f.ledgerDirectory}/identities/${r.attempt.retryIdentitySha256}.blocked.json`));
 const request=JSON.parse(await fs.readFile(`${f.ledgerDirectory}/${r.attempt.id}.request.json`));assert.deepEqual(request,r.attempt);
 assert.equal(request.levelSha256,levelSha256(f.candidate.level));
 const result=JSON.parse(await fs.readFile(`${f.ledgerDirectory}/${r.attempt.id}.result.json`));assert.equal(result.accepted,false);assert.equal(result.status,r.status);
 assert.equal((await fs.readdir(f.ledgerDirectory)).filter(x=>x.endsWith('.request.json')).length,1);
}

test('one actual thawed cut, one plain tail, original iced double U, then original iced L under one private claim',async()=>{
 const f=await fixture('success'),plan=planFor(f),before=levelSha256(f.candidate),r=await run(f,plan);
 assert(r.accepted,JSON.stringify(r));assert.equal(r.L,1);assert.equal(r.U,1);assert.equal(r.bridge.cleared,1);assert.equal(r.bridge.remainingBodies,3);
 assert.equal(r.bridge.icedCutSha256,r.bridge.plainCutSha256);assert.equal(r.upperConstruction.tailSearches,1);assert.equal(r.lowerSearchCalls,1);
 assert.equal(r.upperConstruction.levelSha256,levelSha256(plain));assert.notEqual(r.upperConstruction.levelSha256,r.levelSha256);
 assert.equal(r.proof.sourceLevelSha256,r.levelSha256);assert.equal(r.proof.drags,undefined);assert.equal(r.proof.termination,'below-threshold-exhausted');
 assert.equal(r.route.canonicalReplay.clearEvents,4);assert.equal(r.route.independentReplay.clearEvents,4);assert.equal(r.route.independentReplay.remainingBodies,0);
 assert.equal(r.upperAccounting.conservativeFullBoardStateUpperBound,3+2+2+r.upperConstruction.tailSearch.rawFullBoardStates+1);
 assert.equal(plan.innerPlan.tailBudget.maxStates,92);assert.equal(r.catalogEligible,false);assert.equal(r.formalReady,false);assert.equal(levelSha256(f.candidate),before);
 evidence.push({name:'actual-full-iced-U-and-original-ice-L',passed:true,result:r});
});

test('wrong plain image, missing thaw, and mismatched cut world never start a tail or lower',async()=>{
 const f=await fixture('not-thawed',{count:2}),r=await run(f);assert.equal(r.accepted,false);assert.equal(r.upperConstruction,null);assert.equal(r.lowerSearchCalls,0);
 assert.match(r.reasons.join(';'),/All surviving ice/);await sealed(f,r);
 const bad=structuredClone(plain);bad.blocks[1].color='purple';
 assert.throws(()=>auditThawedPrefixBridge(runtime,f.candidate.level,bad,prefix,f.candidate.iceDeclaration),/only by declared body ice/);
 class Mismatch extends runtime.PuzzleModel{constructor(level,...args){super(level,...args);this.privatePlain=!level.blocks.some(b=>b.frozen);}
  snapshot(){const s=super.snapshot();if(this.privatePlain&&s.cleared>0)s.cleared++;return s;}}
 const good=await fixture('cut-world-mismatch'),wrong=await run(good,planFor(good),{...runtime,PuzzleModel:Mismatch});
 assert.equal(wrong.accepted,false);assert.equal(wrong.upperConstruction,null);assert.equal(wrong.lowerSearchCalls,0);await sealed(good,wrong);
 evidence.push({name:'bridge-domain-thaw-and-full-state-negative',passed:true,notThawed:r,mismatchedWorld:wrong});
});

test('first-contact or false exit in a fixed prefix is terminal with no tail alternatives',async()=>{
 const f=await fixture('bad-prefix',{prefixDrags:[{blockId:'r',path:[[0,1]]}]}),r=await run(f);
 assert.equal(r.accepted,false);assert.equal(r.upperConstruction,null);assert.equal(r.lowerSearchCalls,0);assert.match(r.reasons.join(';'),/Pointer-down clear/);await sealed(f,r);
 const g=await fixture('false-exit',{prefixDrags:[{blockId:'r',path:[],exitSide:'left'}]}),s=await run(g);
 assert.equal(s.accepted,false);assert.equal(s.upperConstruction,null);assert.equal(s.lowerSearchCalls,0);assert.match(s.reasons.join(';'),/canonical clear/);await sealed(g,s);
 evidence.push({name:'fixed-prefix-first-contact-no-fallback',passed:true,results:[r,s]});
});

test('a plain full witness does not bypass an iced original replay rejection',async()=>{
 const f=await fixture('original-U-failure');
 const rt={...runtime,replayRevisedRoute:(level,...args)=>{const r=runtime.replayRevisedRoute(level,...args);return level.blocks.some(b=>b.frozen)?{...r,valid:false}:r;}};
 const r=await run(f,planFor(f),rt);assert(r.upperConstruction.valid);assert.equal(r.accepted,false);assert.equal(r.lowerSearchCalls,0);assert.equal(r.U,null);
 assert.match(r.reasons.join(';'),/Original iced full double replay/);await sealed(f,r);
 evidence.push({name:'no-plain-U-transfer',passed:true,result:r,injection:'Private runtime return negative; actual source bytes unchanged'});
});

test('C plus both prefixes plus tail and terminal guard hits 10000 and seals without L',async()=>{
 const f=await fixture('shared-cap',{worlds:9994}),plan=planFor(f,{upperBudget:{...defaults.upperBudget,maxStates:10000}}),r=await run(f,plan);
 assert.equal(plan.innerPlan.tailBudget.maxStates,1);assert.equal(r.upperConstruction.tailSearch.rawFullBoardStates,1);
 assert.equal(r.upperAccounting.conservativeFullBoardStateUpperBound,10000);assert.equal(r.accepted,false);assert.equal(r.U,null);assert.equal(r.lowerSearchCalls,0);await sealed(f,r);
 await assert.rejects(()=>run(f,plan),/INPUT_ALREADY_ATTEMPTED|FAILED_INPUT/);
 const noRoom=await fixture('no-room',{worlds:9995});assert.throws(()=>planFor(noRoom,{upperBudget:{maxStates:10000}}),/No board budget/);
 assert.equal(await fs.stat(noRoom.ledgerDirectory).then(()=>true,()=>false),false);
 evidence.push({name:'shared-10000-and-preclaim-reserve-boundary',passed:true,result:r});
});

test('canonical or independent original full replay returning late seals before lower',async()=>{
 const rows=[],realNow=Date.now;let now=0;
 try{Date.now=()=>now;
  for(const mode of ['canonical','independent']){
   now=0;const f=await fixture('late-'+mode),plan=planFor(f);
   class LateIndependent extends runtime.PuzzleModel{constructor(level,...args){super(level,...args);this.privateIced=level.blocks.some(b=>b.frozen);}
    snapshot(){const s=super.snapshot();if(this.privateIced&&s.complete)now=5000;return s;}}
   const rt=mode==='canonical'?{...runtime,replayRevisedRoute:(level,...args)=>{const r=runtime.replayRevisedRoute(level,...args);if(level.blocks.some(b=>b.frozen))now=5000;return r;}}
    :{...runtime,PuzzleModel:LateIndependent};
   const r=await run(f,plan,rt);assert(r.upperConstruction.valid);assert.equal(r.accepted,false);assert.equal(r.U,null);assert.equal(r.lowerSearchCalls,0);
   assert.match(r.reasons.join(';'),/deadline/);await sealed(f,r);rows.push({mode,result:r});
  }
 }finally{Date.now=realNow;}
 evidence.push({name:'both-original-replay-late-returns-terminal',passed:true,rows,clock:'private controlled Date.now restored in finally'});
});

test('a failed old original ice joint cannot retry with the new tail strategy',async()=>{
 const f=await fixture('old-joint-failure'),oldPlan=makeEarlyFrozenIcePlan(runtime,f.candidate,{qualificationOnly:true,floor:1,searchUpper:8,budget:{...defaults.upperBudget,maxStates:5}});
 const old=await exploreEarlyFrozenIce(runtime,f.candidate,{plan:oldPlan,qualificationOnly:true,ledgerDirectory:f.ledgerDirectory});
 assert.equal(old.accepted,false);assert.equal(old.proof.rawFullBoardStates,1);await sealed(f,old);
 await assert.rejects(()=>run(f,planFor(f)),/INPUT_ALREADY_ATTEMPTED|FAILED_INPUT/);
 assert.equal((await fs.readdir(f.ledgerDirectory)).filter(x=>x.endsWith('.request.json')).length,1);
 evidence.push({name:'old-joint-failure-new-wrapper-remains-blocked',passed:true,old});
});

test('an original complete U below the fixed floor is terminal without a lower search',async()=>{
 const f=await fixture('below-floor'),r=await run(f,planFor(f,{floor:2}));
 assert.equal(r.U,1);assert.equal(r.accepted,false);assert.equal(r.lowerSearchCalls,0);assert.equal(r.lowerBound,null);
 assert.equal(r.status,'ORIGINAL_ICED_UPPER_BELOW_FLOOR');await sealed(f,r);
 await assert.rejects(()=>run(f,planFor(f,{floor:1})),/INPUT_ALREADY_ATTEMPTED|FAILED_INPUT/);
 evidence.push({name:'actual-short-U-no-lower-or-floor-retry',passed:true,result:r});
});

test('provided U, altered evidence, nonfinite budgets, unsupported gates and production floors reject before claim',async()=>{
 const f=await fixture('preflight');f.candidate.drags=[];assert.throws(()=>planFor(f),/provided route/);delete f.candidate.drags;
 for(const budget of [{maxStates:10001},{maxMilliseconds:30001},{maxMicroStates:3000001},{maxTransitions:NaN}])assert.throws(()=>planFor(f,{upperBudget:budget}));
 assert.throws(()=>planFor(f,{lowerBudget:{maxStates:10000}}),/9999/);
 assert.throws(()=>makeEarlyFrozenPrefixTailPlan(runtime,f.candidate,{floor:1}),/assertion|false|true/i);
 const changed=structuredClone(f.candidate);changed.level.gates[0].frozen=1;assert.throws(()=>makeEarlyFrozenPrefixTailPlan(runtime,changed,defaults),/ordinary exits/);
 const plan=planFor(f);await fs.appendFile(f.candidate.plainConstructionEvidence.path,' ');await assert.rejects(()=>run(f,plan),/Construction bytes changed/);
 assert.equal(await fs.stat(f.ledgerDirectory).then(()=>true,()=>false),false);
 evidence.push({name:'preclaim-finite-domain-evidence-no-provided-U',passed:true});
});

test('private namespace rejects shared roots and real junction descendants',async()=>{
 const f=await fixture('namespace'),plan=planFor(f),alias=path.resolve(f.dir,'public-alias');await fs.symlink(path.resolve(PUBLIC_ATTEMPT_LEDGER),alias,'junction');
 const env=JSON.parse(await fs.readFile('snapshot-environment.json'));
 const early=[EARLY_CONSTRUCTION_LEDGER,path.join(EARLY_CONSTRUCTION_LEDGER,'must-not-create'),path.join(env.sourceWorkspace,EARLY_CONSTRUCTION_LEDGER),path.join(env.sourceWorkspace,EARLY_CONSTRUCTION_LEDGER,'must-not-create')];
 for(const ledgerDirectory of [...HISTORY_LEDGER_ROOTS,...early,alias,path.join(alias,'must-not-create')])
  await assert.rejects(()=>exploreEarlyFrozenPrefixTail(runtime,f.candidate,{plan,qualificationOnly:true,ledgerDirectory}),/private|Private|Qualification/);
 assert.equal(await fs.stat(path.join(alias,'must-not-create')).then(()=>true,()=>false),false);
 evidence.push({name:'shared-history-and-junction-preclaim-guard',passed:true});
});

test.after(async()=>{
 const publicAfter=(await fs.readdir(PUBLIC_ATTEMPT_LEDGER)).filter(x=>x.endsWith('.request.json')).sort(),before=new Set(publicBefore);
 const added=publicAfter.filter(x=>!before.has(x));
 const toolBindings={...runtime.toolchainBindings,[runtime.policyRuntimeBinding.path]:runtime.policyRuntimeBinding.sha256};
 const entries=['tools/daily-challenge/formal-v4/early-frozen-prefix-tail.mjs','tools/daily-challenge/formal-v4/early-frozen-prefix-tail.test.mjs'];
 const compiled=await build({entryPoints:entries,bundle:true,write:false,outdir:'unused',metafile:true,format:'esm',platform:'node',packages:'external',logLevel:'silent'});
 for(const f of Object.keys(compiled.metafile.inputs)){const p=f.replaceAll('\\','/'),h=sha(await fs.readFile(p));if(toolBindings[p])assert.equal(toolBindings[p],h);toolBindings[p]=h;}
 const report={status:evidence.length===10?'EARLY_FROZEN_PREFIX_TAIL_PRIVATE_PASS':'EARLY_FROZEN_PREFIX_TAIL_PRIVATE_INCOMPLETE',evidence,toolBindings,
  publicRequestCountBefore:publicBefore.length,publicRequestCountAfter:publicAfter.length,externallyAddedPublicRequests:added,
  publicLedgerUnchanged:added.length===0,newRealCandidateConstructions:0,newRealCandidateSearches:0,newPublicClaims:0,
  qualificationOnly:true,formalReady:false,proofToolchainSha256:runtime.toolchainSha256};
 await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
