import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadV4Runtime,assertV4Runtime,FROZEN_MATH_SHA} from './runtime.mjs';
import {auditV4StaticCandidate,loadV4StageContract} from './static-contract.mjs';
import {qualifyBoundedCandidateV4} from './bounded-qualify.mjs';
import {guardedPlainTask,guardedNativeUpper} from '../formal-v3/reserved-guard-budget.mjs';
import {independentReplay,levelSha256} from '../formal-v2/contract.mjs';

const runtime=await loadV4Runtime(),stages=await loadV4StageContract();
const out=process.env.V4_QUALIFICATION_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/qualification-');
await fs.mkdir(out,{recursive:true});
const evidence=[];
const source=()=>({id:999931,name:'ISOLATED v4 qualification only',difficulty:'hard',reward:0,timeSeconds:120,parMoves:4,
 mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
 blocks:[['a','red',0,0],['b','blue',1,0],['c','green',0,1],['d','yellow',1,1]].map(([id,color,x,y])=>({id,color,x,y,shape:[[0,0]]})),
 gates:[{id:'red',color:'red',side:'left',offset:0,size:1},{id:'blue',color:'blue',side:'top',offset:1,size:1},
  {id:'green',color:'green',side:'bottom',offset:0,size:1},{id:'yellow',color:'yellow',side:'right',offset:1,size:1}]});
const fixtureRuntime=level=>({...runtime,LEVELS:[level]});
function slot(stage='basic-combined',difficulty=1,index=1){const s=stages.DAILY_CHALLENGE_V3_SLOTS.find(s=>s.stageKey===stage&&s.difficulty===difficulty&&s.slot===index);return{formalId:s.id,stageKey:s.stageKey,unlockLevel:s.stageUnlockLevel,newestMechanism:s.newestMechanism,difficulty:s.difficulty,slot:s.slot};}
const candidate=(level=source(),target=slot())=>({...target,sourceLevelId:level.id,level});
const fullRoute=()=>['left','top','bottom','right'].map((exitSide,i)=>({blockId:['a','b','c','d'][i],path:[],exitSide}));

test('current 156 policy is separate from immutable 154 mathematics and the real mainline guide',()=>{
 assert.equal(runtime.policyRuleVersion,'1.156.0');assert.equal(runtime.mathRuleVersion,'1.154.0');assert.equal(runtime.toolchainSha256,FROZEN_MATH_SHA);
 assert.equal(runtime.MECHANISM_GUIDE.length,15);assert.equal(stages.DAILY_CHALLENGE_STAGES_V3.length,10);assert.equal(stages.DAILY_CHALLENGE_V3_SLOTS.length,300);
 assert.equal(runtime.MECHANISM_GUIDE.find(m=>m.id==='shutter').unlockLevel,20);
 assert.throws(()=>assertV4Runtime({...runtime,toolchainBindings:{}}));assert.throws(()=>assertV4Runtime({...runtime,policyRuleVersion:'1.155.0'}));
 evidence.push({test:'separate-policy-and-math',passed:true,policy:runtime.policyRuleVersion,math:runtime.mathRuleVersion,core:runtime.toolchainSha256});
});

test('new basic slot accepts actual ice without requiring every one of the six mechanisms',async()=>{
 const level=source();level.gates[3].frozen=2;level.blocks[3].frozen=2;
 const audit=await auditV4StaticCandidate(fixtureRuntime(source()),candidate(level));
 assert(audit.passed,JSON.stringify(audit.issues));assert.deepEqual(audit.supersededStageFindings,['stage-not-in-mechanism-guide']);
 assert(audit.mechanisms.includes('numeric-ice')&&audit.mechanisms.includes('frozen-exit'));
 evidence.push({test:'basic-actual-ice',passed:true,level,audit});
});

test('shell stage can include the newly early-authorized shutter while retaining all physical checks',async()=>{
 const level=source();level.blocks[0].layers=['red','yellow'];level.blocks[1].shutterId='cover';
 level.shutters=[{id:'cover',x:1,y:0,width:1,height:1,count:1}];
 const audit=await auditV4StaticCandidate(fixtureRuntime(source()),candidate(level,slot('mechanisms-multilayer-shell-15')));
 assert(audit.passed,JSON.stringify(audit.issues));assert(audit.supersededStageFindings.includes('mechanism-before-unlock:shutter'));
 const basic=await auditV4StaticCandidate(fixtureRuntime(source()),candidate(level));
 assert(!basic.passed);assert(basic.issues.includes('mechanism-outside-current-daily-stage:multilayer-shell'));
 evidence.push({test:'advanced-with-base-six-exception-only',passed:true,level,audit,basicRejected:basic.issues});
});

test('unknown slots, missing newest and later advanced mechanisms never disappear in stage filtering',async()=>{
 const level=source();
 const absent=await auditV4StaticCandidate(fixtureRuntime(level),{...candidate(level),formalId:'daily-basic-combined-d1-11'});assert(!absent.passed);
 const mismatch=await auditV4StaticCandidate(fixtureRuntime(level),{...candidate(level),slot:2});assert(!mismatch.passed);assert.deepEqual(mismatch.supersededStageFindings,[]);
 const missing=await auditV4StaticCandidate(fixtureRuntime(level),candidate(level,slot('mechanisms-generator-35')));
 assert(missing.issues.includes('missing-current-stage-mechanism:generator'));
 const star=structuredClone(level);star.blocks[0].star=true;star.gates[0].star=true;
 const advanced=await auditV4StaticCandidate(fixtureRuntime(level),candidate(star));
 assert(!advanced.passed);assert(advanced.issues.includes('mechanism-outside-current-daily-stage:star'));
 evidence.push({test:'slot-and-advanced-negative',passed:true,issues:[absent.issues,mismatch.issues,missing.issues,advanced.issues]});
});

test('baseline, coverage, original orientation assets and source hashes remain fail-closed',async()=>{
 const initial=source(),cases=[];
 for(const change of [l=>l.blocks.pop(),l=>l.timeSeconds++,l=>l.width++,l=>l.reward=1,l=>l.blocks[0].shape=[[0,0],[2,0]]]){
  const level=structuredClone(initial);change(level);const audit=await auditV4StaticCandidate(fixtureRuntime(initial),candidate(level));assert(!audit.passed);cases.push(audit.issues);
 }
 const badHash=await auditV4StaticCandidate(fixtureRuntime(initial),{...candidate(initial),sourceLevelSha256:'0'.repeat(64)});assert(badHash.issues.includes('declared-source-sha-mismatch'));
 const noArt=structuredClone(runtime.GAME_ART);noArt.gameplay.formalBlocks.red.solid={};
 const art=await auditV4StaticCandidate({...fixtureRuntime(initial),GAME_ART:noArt},candidate(initial));assert(art.issues.some(i=>i.startsWith('missing-art:')));
 evidence.push({test:'physical-and-asset-negative',passed:true,cases,hash:badHash.issues,art:art.issues});
});

test('provided full actual route is replay only; below-band result blocks renamed or restaged retry',async()=>{
 const level=source(),dir=await fs.mkdtemp(`${out}/ledger-`),rt=fixtureRuntime(level),input={...candidate(level),drags:fullRoute()};
 const result=await qualifyBoundedCandidateV4(rt,input,{ledgerDirectory:dir,qualificationOnly:true});
 assert.equal(result.status,'COUNTEREXAMPLE_BELOW_BAND',JSON.stringify(result.reasons));assert.equal(result.U,0);
 assert(result.route.canonicalReplay.complete&&result.route.independentReplay.complete);assert.equal(result.route.search,null);assert.equal(result.lowerBound,undefined);
 assert.equal(result.catalogEligible,false);assert.equal(result.redesignRequired,true);
 const retry=await qualifyBoundedCandidateV4(rt,{...input,...slot('basic-combined',1,2),level:{...level,name:'Changed metadata'}},{ledgerDirectory:dir,qualificationOnly:true});
 assert.equal(retry.status,'INVALID_ATTEMPT');assert(retry.reasons.some(r=>r.includes('INPUT_ALREADY_ATTEMPTED')));assert.equal(retry.lowerBound,undefined);
 const saved=JSON.parse(await fs.readFile(`${dir}/${result.attempt.id}.result.json`));assert.equal(saved.accepted,false);
 await assert.rejects(()=>qualifyBoundedCandidateV4(rt,input,{ledgerDirectory:dir}),/historical public/);
 evidence.push({test:'complete-route-zero-search-and-failure-ledger',passed:true,result,retry});
});

test('bad static never claims; bad complete route claims once and seals a failed physical identity',async()=>{
 const level=source(),dir=await fs.mkdtemp(`${out}/invalid-`),rt=fixtureRuntime(level);
 const badStatic=await qualifyBoundedCandidateV4(rt,{...candidate(level),formalId:'unknown'},{ledgerDirectory:dir,qualificationOnly:true});
 assert.equal(badStatic.status,'BLOCKED_STATIC');assert.equal(badStatic.attempt,undefined);
 const incomplete=await qualifyBoundedCandidateV4(rt,{...candidate(level),drags:fullRoute().slice(0,3)},{ledgerDirectory:dir,qualificationOnly:true});
 assert.equal(incomplete.status,'REJECTED_ORIGINAL_ROUTE');assert(incomplete.attempt&&incomplete.redesignRequired);assert.equal(incomplete.lowerBound,undefined);
 evidence.push({test:'preclaim-static-and-full-route-negative',passed:true,badStatic,incomplete});
});

test('unchanged held-turn primitive has an actual complete route and one-world-reserve stopping bound',()=>{
 const level={...source(),blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],
  gates:[{id:'r',side:'right',offset:0,size:1,color:'red'},{id:'b-out',side:'left',offset:0,size:1,color:'blue'}]};
 const proof=guardedPlainTask(level,runtime,{floor:1,searchUpper:3});assert.equal(proof.cost,1);assert(proof.thresholdProven);
 const replay=independentReplay(runtime,level,proof.drags);assert(replay.complete&&replay.valid);assert.equal(replay.nonClearingDrags,1);
 const stopped=guardedPlainTask(level,runtime,{floor:2,maxStates:1});assert.equal(stopped.status,'unknown');assert.equal(stopped.guardAllowance.conservativeFullBoardStateUpperBound,2);
 assert.throws(()=>guardedPlainTask(level,runtime,{floor:1,maxStates:10000}));
 const unsupported=guardedNativeUpper(runtime,{...level,generators:[{id:'uninstantiated'}]});
 assert.equal(unsupported.status,'unsupported');assert.equal(unsupported.rawFullBoardStates,0);assert.equal(unsupported.microDiscoveredStates,0);
 evidence.push({test:'frozen-primitive-budget-and-native-domain',passed:true,proof,replay,stopped,unsupported});
});

test.after(async()=>{
 const files=['runtime.mjs','static-contract.mjs','bounded-qualify.mjs','qualification.test.mjs'].map(f=>`tools/daily-challenge/formal-v4/${f}`);
 const bindings=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await fs.readFile(f)).digest('hex')])));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===8&&evidence.every(e=>e.passed)?'V4_FROZEN_MATH_WRAPPER_QUALIFIED':'INCOMPLETE_QUALIFICATION',
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,mathRuleVersion:runtime.mathRuleVersion,
  toolchainSha256:runtime.toolchainSha256,bindings,stageBindings:stages.bindings,evidence,
  physicalCandidateSearchInvocations:0,syntheticQualificationSearchesOnly:true,productionChanged:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});
