import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {icedFlipPrivateFixture} from './iced-flip-private-fixture.mjs';
import {constructFixedIcedFlip,auditFixedIcedFlip,inspectFixedIcedFlipObject,ICED_FLIP_SLOT,ICED_FLIP_BASE,ICED_FLIP_BASE_AUDIT} from './fixed-iced-flip-construction.mjs';
import {assertAcceptedIcedPrefixBase,inspectAcceptedIcedLinkage} from './accepted-iced-prefix-base.mjs';
import {inspectAcceptedIcedHistory} from './accepted-iced-prefix-history.mjs';
import {qualifyFixedIcedFlip,FIXED_ICED_FLIP_ENTRY_VERSION,assertFixedIcedFlipPlan,assertIcedTerminalHistoryMembership} from './qualify-fixed-iced-flip.mjs';
import {prepareIcedFlipContext,ICED_FLIP_SELECTION_ANCHOR} from './fixed-iced-flip-context.mjs';
import {assertLowBandBatchPrivateNamespace} from './low-band-advanced-batch-contract.mjs';
import {HISTORY_ROOTS} from './early-prefix-four-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
const rt=await loadV4CatalogRuntime(),slot=rt.slots.find(s=>s.formalId===ICED_FLIP_SLOT),sha=b=>createHash('sha256').update(b).digest('hex');
const out=process.env.ICED_FLIP_TEST_OUT??await fs.mkdtemp('deliverables/daily-formal-v4-20261008/proof/iced-flip-private-');await fs.mkdir(out,{recursive:true});
const evidence=[],publicRoot='deliverables/daily-formal-v3-20261008/proof/attempts',before=(await fs.readdir(publicRoot)).filter(f=>f.endsWith('.request.json')).length;
const put=async(p,q)=>{const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};};
function toy(long=false){const f=icedFlipPrivateFixture();const c={flips:f.configuration.doors,ice:f.level.blocks.filter(b=>b.frozen).map(b=>({id:b.id,count:b.frozen}))};
 for(const b of f.level.blocks)if(b.frozen)b.frozen=2;
 if(long){const parks=Array.from({length:32},(_,i)=>({blockId:'ice-r3',path:[[2,i%2===0?0:1]]}));f.drags.splice(4,0,...parks);}
 const prior={...structuredClone(f.level),blocks:f.level.blocks.map(b=>{const x={...b};delete x.frozen;return x;}),gates:f.level.gates.slice(1),flipDoors:[{...f.level.gates[0],initiallyOpen:true}]};
 return{base:{level:f.level,drags:f.drags},c,prior};}
async function entryFixture(long){const t=toy(long),dir=await fs.mkdtemp(`${out}/entry-`),pub=`${dir}/public`,con=`${dir}/construction`;
 const source={...structuredClone(t.base.level),blocks:[{id:'source-r',color:'red',x:0,y:0,shape:[[0,0],[1,0],[2,0],[3,0],[4,0]]},{id:'source-b',color:'blue',x:0,y:1,shape:[[0,0],[1,0],[2,0],[3,0],[4,0]]}]};
 const prior={...structuredClone(source),gates:source.gates.slice(1),flipDoors:[{...source.gates[0],initiallyOpen:true}]};
 const priorD=await put(`${dir}/prior.json`,{formalId:slot.formalId,level:prior}),runtime={...rt,LEVELS:[source],priorDailySlots:new Map([[slot.formalId,{sourceReport:priorD.path,sourceReportSha256:priorD.sha256,levelSha256:levelSha256(prior),inventory:mechanismInventory(prior)}]])};
 const ledger=await createAttemptLedger(pub),request=await ledger.claim(t.base.level),status='SYNTHETIC_ACCEPTED_CONTROL_NOT_DIFFICULTY_PROOF',lower={qualificationControl:true};
 await ledger.finish(request,{accepted:true,status,levelSha256:levelSha256(t.base.level),lowerBound:{result:lower},route:{search:null}});
 const base={...t.base,accepted:true,status,attempt:request,levelSha256:levelSha256(t.base.level),routeSha256:routeSha256(t.base.drags),sourceLevelId:source.id,lowerBound:{result:lower},route:{search:null}};
 const d=await put(`${dir}/base.json`,base),unused={path:`${dir}/not-used-private`,sha256:'0'.repeat(64)};
 const plan={version:FIXED_ICED_FLIP_ENTRY_VERSION,scope:300,maximumBaseAdaptations:1,slot,base:d,independentActualAudit:unused,inputSelection:unused,priorBaseline:priorD,
  configuration:t.c,failedBaseFallbackAllowed:false,routeRepairAllowed:false,freshOriginalLowerRequired:true,floor:31,maximumConstructionWorlds:10000,maximumProofWorlds:10000};
 return{...t,base,dir,pub,con,runtime,plan,descriptor:await put(`${dir}/plan.json`,plan),options:{qualificationOnly:true,selected:[],publicLedgerDirectory:pub,constructionLedgerDirectory:con}};}

test('private complete inventory uses all four actual gate IDs and three actual thaw events, preserving original bytes',()=>{
 const f=toy(),h=levelSha256(f.base),q=constructFixedIcedFlip(rt,f.base,slot,f.prior,{configuration:f.c,qualificationOnly:true});assert(q.ok,q.reason);
 assert.equal(q.audit.flips.length,4);assert(q.audit.flips.every(x=>x.active&&x.actualGateExits.length===2));assert.equal(q.audit.ice.length,6);assert.equal(new Set(q.audit.ice.map(x=>x.releaseDrag)).size,3);
 assert.equal(q.independentReplay.remainingBodies,0);assert.equal(q.independentReplay.nonClearingDrags,0);assert.equal(q.audit.numericIceUniformMinimumSevenClaimed,false);
 const per=1+f.base.drags.reduce((n,d)=>n+d.path.length+2+2*Number(!!d.exitSide),0);assert.equal(q.constructionAccounting.fullWorldReservations,3*per+1);assert.equal(levelSha256(f.base),h);
 assert(auditFixedIcedFlip(rt,f.base,q.level,q.drags,f.prior,{configuration:f.c,qualificationOnly:true}).passed);evidence.push({test:'whole-inventory-gate-id-and-thaw',passed:true,construction:q});
});
test('wrong phase, same-colour unused portal, omitted ice and unexpected mutation fail closed',()=>{
 const f=toy(),q=constructFixedIcedFlip(rt,f.base,slot,f.prior,{configuration:f.c,qualificationOnly:true});
 const c=structuredClone(f.c);c.flips[0].initiallyOpen=false;assert.equal(constructFixedIcedFlip(rt,f.base,slot,f.prior,{configuration:c,qualificationOnly:true}).ok,false);
 const wrong=structuredClone(q.level);wrong.flipDoors[0].id='unused-same-colour';assert.throws(()=>inspectFixedIcedFlipObject(f.base.level,wrong,f.c));
 const ice=structuredClone(q.level);ice.blocks.find(b=>b.frozen).frozen=1;assert.throws(()=>inspectFixedIcedFlipObject(f.base.level,ice,f.c));
 const renamed={...q.level,name:'only presentation changed'};assert.throws(()=>inspectFixedIcedFlipObject(f.base.level,renamed,f.c));
 assert.throws(()=>constructFixedIcedFlip(rt,f.base,slot,f.prior,{configuration:f.c}),/production configuration/);evidence.push({test:'exact-one-configuration-and-actual-portals',passed:true});
});
test('shared construction reservation includes deferred replay and refuses before exceeding the cap',()=>{
 const f=toy(),full=constructFixedIcedFlip(rt,f.base,slot,f.prior,{configuration:f.c,qualificationOnly:true}),max=full.constructionAccounting.fullWorldReservations;
 const q=constructFixedIcedFlip(rt,f.base,slot,f.prior,{configuration:f.c,qualificationOnly:true,worldBudget:{maxStates:max-1}});assert(!q.ok&&q.budgetExhausted);assert(q.constructionAccounting.fullWorldReservations<max);
 for(const maxStates of [0,NaN,Infinity,10001])assert.throws(()=>constructFixedIcedFlip(rt,f.base,slot,f.prior,{configuration:f.c,qualificationOnly:true,worldBudget:{maxStates}}));
 evidence.push({test:'construction-before-mutation-budget',passed:true,maximum:max,result:q});
});
test('all seven production roots and their junction descendants are forbidden private namespaces',async()=>{
 for(const root of HISTORY_ROOTS)for(const dir of [root,path.resolve(root,'new-private-child')])await assert.rejects(()=>assertLowBandBatchPrivateNamespace(true,dir),/public namespace/);
 await assert.rejects(()=>assertLowBandBatchPrivateNamespace('true',`${out}/private`));evidence.push({test:'seven-physical-namespace-guards',passed:true});
});
test('real accepted iced evidence remains read-only and full linkage mutations cannot mint a new final proof',async()=>{
 const base=JSON.parse(await fs.readFile(ICED_FLIP_BASE.path)),input=JSON.parse(await fs.readFile(base.input.path)),stem=path.join(publicRoot,base.attempt.id);
 const links={request:JSON.parse(await fs.readFile(stem+'.request.json')),result:JSON.parse(await fs.readFile(stem+'.result.json')),sidecar:JSON.parse(await fs.readFile(stem+'.v4-thawed-prefix-result.json')),planRecord:JSON.parse(await fs.readFile(stem+'.v4-thawed-prefix-plan.json'))};
 assert(inspectAcceptedIcedLinkage(base,input,links));for(const mutate of [l=>l.request.colorSha256='f'.repeat(64),l=>l.result.upper={},l=>l.result.lower.floor=30,l=>delete l.sidecar.bridge,l=>l.planRecord.plan.floor=1]){const x=structuredClone(links);mutate(x);assert.throws(()=>inspectAcceptedIcedLinkage(base,input,x));}
 const ready=await assertAcceptedIcedPrefixBase(rt,ICED_FLIP_BASE);assert.equal(ready.facts.L,31);assert.equal(ready.newSearches,0);assert.equal(ready.newLedgerClaims,0);assert.equal(ready.catalogEligible,false);
 evidence.push({test:'real-readonly-base-and-linkage-negative-controls',passed:true,base:ICED_FLIP_BASE,audit:ICED_FLIP_BASE_AUDIT,facts:ready.facts,bindings:ready.fileBindings});
});
test('own iced plus exactly bound plain are accepted, a second same physical stock remains blocked',async()=>{
 const dir=await fs.mkdtemp(`${out}/history-`),roots=Array.from({length:7},(_,i)=>`${dir}/root${i}`);for(const r of roots)await fs.mkdir(r);const output=`${dir}/construct`;await fs.mkdir(output);
 const f=toy(),plainLevel=structuredClone(f.base.level);for(const b of plainLevel.blocks)delete b.frozen;
 const plain={level:plainLevel,levelSha256:levelSha256(plainLevel)},pd=await put(`${output}/plain.json`,plain),plan={path:`${dir}/plan.json`,sha256:'a'.repeat(64)};
 const iced={level:f.base.level,plain,plainConstructionEvidence:pd,plan},id=await put(`${output}/iced.json`,iced);
 const input={level:f.base.level,plain,constructionEvidence:id,plainConstructionEvidence:pd},inputd=await put(`${output}/candidate.json`,input);
 await put(`${roots[6]}/one.claim.json`,{plan,outputDirectory:output});await put(`${roots[6]}/one.result.json`,{plan,outputDirectory:output,constructionFiles:[id]});await put(`${output}/index.json`,{plan,attempts:[{constructionEvidence:id}]});
 const base={accepted:true,level:f.base.level,levelSha256:levelSha256(f.base.level),input:inputd,plan:{constructionEvidence:id,plainConstructionEvidence:pd,plainLevelSha256:levelSha256(plainLevel)}};
 const q=await inspectAcceptedIcedHistory(base,{qualificationOnly:true,privateRoots:roots});assert(q.passed&&q.ownMatches.length>=3);
 await put(`${roots[2]}/foreign-failed-stock.json`,{level:structuredClone(f.base.level),accepted:false});await assert.rejects(()=>inspectAcceptedIcedHistory(base,{qualificationOnly:true,privateRoots:roots}),/collides/);
 evidence.push({test:'precise-owned-history-not-physical-whitelist',passed:true,own:q.own,privateRoots:roots});
});
test('complete short U seals construction without invoking final lower; no alternate configuration or stage retry',async()=>{
 const f=await entryFixture(false),q=await qualifyFixedIcedFlip(f.runtime,{plan:f.descriptor,...f.options});assert.equal(q.status,'REJECTED_CONSTRUCTED_U_BELOW_D3',JSON.stringify(q.reasons));assert(q.construction.ok&&q.mechanismStrengthValidated);assert(!q.finalProofStarted&&!q.accepted&&q.terminalBlocked);
 assert.equal((await fs.readdir(f.pub)).filter(x=>x.endsWith('.request.json')).length,1);assert.equal((await fs.readdir(f.con)).filter(x=>x.endsWith('.request.json')).length,1);
 const again=await qualifyFixedIcedFlip(f.runtime,{plan:f.descriptor,...f.options});assert(!again.accepted&&!again.constructionAttemptStarted);assert.equal((await fs.readdir(f.con)).filter(x=>x.endsWith('.request.json')).length,1);
 evidence.push({test:'below-band-terminal-without-lower-and-no-retry',passed:true,result:q,repeat:again.status});
});
test('new final object invokes a fresh ice-preserving lower; long supplied U cannot prove L31',async()=>{
 const f=await entryFixture(true),q=await qualifyFixedIcedFlip(f.runtime,{plan:f.descriptor,...f.options,proofOptions:{lowerBudget:{maxStates:200,maxMilliseconds:3000}}});
 assert.equal(q.status,'REJECTED_FINAL_FRESH_ICED_FLIP_PROOF',JSON.stringify(q.reasons));assert(q.construction.ok&&q.finalProofStarted&&q.designValidated&&q.mechanismStrengthValidated);
 assert.equal(q.mathematicalProof.lowerBound.method,'v3-ice-preserving-constraints');assert.equal(q.mathematicalProof.lowerBound.inputLevelSha256,q.levelSha256);assert.notEqual(q.levelSha256,f.base.levelSha256);
 assert(!q.accepted&&!q.catalogEligible&&q.terminalBlocked);assert.equal(q.mathematicalProof.lowerBound.result.thresholdProven,false);
 assert.equal(q.mathematicalProof.route.search,null);assert.equal(q.U,32);assert(q.mathematicalProof.lowerBound.result.guardAllowance.conservativeFullBoardStateUpperBound<=201);
 const count=(await fs.readdir(f.pub)).filter(x=>x.endsWith('.request.json')).length;assert.equal(count,2);
 const again=await qualifyFixedIcedFlip(f.runtime,{plan:f.descriptor,...f.options});assert(!again.finalProofStarted);assert.equal((await fs.readdir(f.pub)).filter(x=>x.endsWith('.request.json')).length,count);
 evidence.push({test:'fresh-original-final-ice-proof-private-counterexample',passed:true,result:q});
});
test('fixed plan cannot substitute third base, different slot or production configuration',async()=>{
 const f=await entryFixture(false);assertFixedIcedFlipPlan(f.plan,rt.slots,{qualificationOnly:true});assert.throws(()=>assertFixedIcedFlipPlan(f.plan,rt.slots));
 for(const change of [p=>p.floor=16,p=>p.maximumBaseAdaptations=2,p=>p.slot={...slot,slot:4},p=>p.failedBaseFallbackAllowed=true]){const p=structuredClone(f.plan);change(p);assert.throws(()=>assertFixedIcedFlipPlan(p,rt.slots,{qualificationOnly:true}));}
 evidence.push({test:'one-fixed-production-plan',passed:true});
});

test('actual current selection preserves its exact prefix, verifies both appended public receipts, and rejects stale or altered contexts',async()=>{
 const read=async p=>JSON.parse(await fs.readFile(p)),base=await read(ICED_FLIP_BASE.path),index=await read(ICED_FLIP_SELECTION_ANCHOR.path),selected=await Promise.all(index.files.map(read));
 const context=await prepareIcedFlipContext(rt,ICED_FLIP_BASE,base,slot,selected,ICED_FLIP_SELECTION_ANCHOR),check=context.inspect(base.level);
 assert(check.passed,check.issues.join(';'));assert.equal(check.completeSelectedCount,index.files.length);assert.equal(context.family.sourceClassification.directWholeBoard,false);assert.equal(context.family.sourceClassification.actualAncestry.roots.length,1);
 assert(check.selectedComparisons.some(q=>q.formalId==='daily-mechanisms-key-lock-59-d1-10'));assert(check.selectedComparisons.some(q=>q.formalId==='daily-mechanisms-axis-block-50-d2-05'));
 const stale={path:'deliverables/daily-formal-v4-20261008/selection/completed-basic-and-advanced-150-01/index.json',sha256:'ecb22b82c7a31575421df66369e8f4d22796d85ffb88ceff4c34abdd0d03ebdc'};
 await assert.rejects(()=>prepareIcedFlipContext(rt,ICED_FLIP_BASE,base,slot,selected.slice(0,-2),stale),/selection prefix/);
 const changed=structuredClone(selected);changed.at(-1).mathematicalProof.accepted=false;
 await assert.rejects(()=>prepareIcedFlipContext(rt,ICED_FLIP_BASE,base,slot,changed,ICED_FLIP_SELECTION_ANCHOR));
 const badBytes={...ICED_FLIP_SELECTION_ANCHOR,sha256:'0'.repeat(64)};await assert.rejects(()=>prepareIcedFlipContext(rt,ICED_FLIP_BASE,base,slot,selected,badBytes),/Context file changed/);
 evidence.push({test:'current-selection-actual-appends-and-negative-controls',passed:true,selection:ICED_FLIP_SELECTION_ANCHOR,check,bindings:context.bindings});
});

test('terminal seven-root membership permits only exact own output paths and rejects unrelated late files',async()=>{
 const dir=await fs.mkdtemp(`${out}/terminal-`),roots=Array.from({length:7},(_,i)=>`${dir}/root${i}`);for(const d of roots)await fs.mkdir(d);
 const pub=roots[0],con=roots[4],old=await put(`${roots[6]}/original.json`,{frozenOriginal:true}),snapshot={roots:roots.map(directory=>({directory,files:directory===roots[6]?[old]:[]}))};
 const r={id:'one',identityOrigin:'one',retryIdentitySha256:'physical'},report={construction:{constructionAttempt:r,planFile:`${con}/plan.json`,resultFile:`${con}/one.construction-result.json`}};
 for(const file of [report.construction.planFile,report.construction.resultFile,`${con}/one.request.json`,`${con}/one.result.json`])await put(file,{own:true});
 const q=await assertIcedTerminalHistoryMembership(snapshot,report,{publicLedgerDirectory:pub,constructionLedgerDirectory:con});assert(q.passed&&q.additions.length===4);
 const intruder=await put(`${roots[5]}/unrelated-new-static.json`,{level:toy().base.level});await assert.rejects(()=>assertIcedTerminalHistoryMembership(snapshot,report,{publicLedgerDirectory:pub,constructionLedgerDirectory:con}),/Unrelated ledger addition/);
 evidence.push({test:'terminal-membership-exact-own-only',passed:true,allowed:q.additions,intruder});
});
test.after(async()=>{const after=(await fs.readdir(publicRoot)).filter(f=>f.endsWith('.request.json')).length,files=['fixed-iced-flip-construction.mjs','fixed-iced-flip-attempt.mjs','fixed-iced-flip-context.mjs','accepted-iced-prefix-base.mjs','accepted-iced-prefix-history.mjs','qualify-fixed-iced-flip.mjs','fixed-iced-flip.test.mjs','iced-flip-private-fixture.mjs'];const fileBindings={};for(const f of files){const p='tools/daily-challenge/formal-v4/'+f;fileBindings[p]=sha(await fs.readFile(p));}
 assert.equal(after,before,'Private qualification cannot add a public request');
 await put(`${out}/report.json`,{status:evidence.length===11?'FIXED_ICED_FLIP_PRIVATE_QUALIFICATION_PASS':'FIXED_ICED_FLIP_PRIVATE_INCOMPLETE',testsPassed:evidence.length,expectedTests:11,evidence,fileBindings,publicRequests:{before,after},newRealConstructions:0,newRealSearches:0,publicClaimsStarted:0,realInputChanged:false,formalReady:false});});
