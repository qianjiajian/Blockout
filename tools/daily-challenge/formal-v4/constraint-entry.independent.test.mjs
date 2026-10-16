import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {constructRouteConstraint,auditRouteConstraint} from './route-constraint-construction.mjs';
import {withConstraintConstructionAttempt,CONSTRUCTION_LEDGER} from './constraint-attempt-guard.mjs';
import {prepareConstraintDesignContext,CONSTRAINT_SEED139,CONSTRAINT_HISTORICAL_UI_ARCHIVE} from './constraint-design-context.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {qualifyConstraintSlot} from './qualify-constraint-slot.mjs';
import {createAttemptLedger} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';

const out=process.env.CONSTRAINT_INDEPENDENT_OUT;
assert(out,'An explicit new independent output directory is required');
await fs.mkdir(out,{recursive:false});
const runtime=await loadV4CatalogRuntime(),evidence=[],sha=b=>createHash('sha256').update(b).digest('hex');
const slot=m=>runtime.slots.find(s=>s.newestMechanism===m&&s.difficulty===1&&s.slot===10);
function fixture(){
 const colors=['red','blue','green','yellow','purple','orange'];
 const level={id:999983,name:'Independent complete key-flip fixture',difficulty:'hard',reward:0,timeSeconds:120,parMoves:30,
  mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,
  blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
  gates:[['red','top',0],['blue','left',0],['green','top',2],['yellow','right',1],['purple','left',1],['orange','bottom',2]]
   .map(([color,side,offset],i)=>({id:`g${i}`,color,side,offset,size:1}))};
 const drags=[{blockId:'b0',path:[],exitSide:'top'},{blockId:'b1',path:[[0,0]],exitSide:'left'},
  {blockId:'b2',path:[],exitSide:'top'},{blockId:'b5',path:[],exitSide:'bottom'},
  {blockId:'b4',path:[[1,0]]},{blockId:'b3',path:[[1,1],[2,1]],exitSide:'right'},
  {blockId:'b4',path:[[1,1]]},{blockId:'b4',path:[[0,1]],exitSide:'left'}];
 return{accepted:true,qualificationOnly:true,level,drags,levelSha256:levelSha256(level)};
}
function prior(base,m){const level=structuredClone(base.level);
 if(m==='key-lock'){level.blocks[0].keyId='old';level.blocks[1].lockedBy='old';level.blocks[1].lockCount=1;}
 else{level.flipDoors=[{...level.gates[0],initiallyOpen:true}];level.gates=level.gates.slice(1);}return level;
}
function made(m){const base=fixture(),old=prior(base,m),result=constructRouteConstraint(runtime,base,slot(m),old);
 assert(result.ok,JSON.stringify(result));return{base,old,result};}
test('each real primary instance participates on a complete private stock, without new L or route search',()=>{
 for(const m of ['key-lock','flip-door']){
  const {base,old,result}=made(m),audit=auditRouteConstraint(runtime,result.level,result.drags,slot(m),old);
  const independent=independentReplay(runtime,result.level,result.drags);
  assert(audit.passed,JSON.stringify(audit));assert(independent.valid&&independent.complete);
  assert.equal(independent.remainingBodies,0);assert.equal(independent.nonClearingDrags,2);
  assert.equal(audit.actualInstances,2);assert(audit.details.every(d=>d.active));
  assert.equal(result.provenance.fullBoardSearches,0);assert.equal(result.provenance.heldSearches,0);
  assert(result.constructionAccounting.fullWorldReservations<=10000);assert.equal(base.levelSha256,levelSha256(base.level));
  evidence.push({test:'full-private-stock-control',mechanism:m,passed:true,audit,independent,
   constructionAccounting:result.constructionAccounting,mathematicalAcceptance:false});
 }
});
test('an unused same-colour flip cannot borrow a successful ordinary gate exit',()=>{
 const {old,result}=made('flip-door'),level=structuredClone(result.level),blue=level.flipDoors.find(g=>g.color==='blue');
 assert(blue);level.flipDoors=level.flipDoors.filter(g=>g.id!==blue.id);
 const {initiallyOpen,...ordinary}=blue;level.gates.push(ordinary);
 level.flipDoors.push({...blue,id:'unused-blue-flip',side:'bottom',offset:0});
 const audit=auditRouteConstraint(runtime,level,result.drags,slot('flip-door'),old);
 assert(audit.verificationReplay.valid&&audit.verificationReplay.complete,'The negative must still finish the actual model');
 assert.equal(audit.passed,false);assert(audit.issues.includes('inactive-or-closed-flip-portal'));
 const unused=audit.details.find(d=>d.id==='unused-blue-flip');assert.equal(unused.active,false);assert.deepEqual(unused.actualPortalExits,[]);
 assert(audit.verificationReplay.exits.some(e=>e.blockId==='b1'&&e.gateId===blue.id&&e.kind==='ordinary'));
 evidence.push({test:'actual-gate-id-borrowing-rejected',passed:true,audit});
});
test('a complete route with coincident lock releases or a nonincreasing prior counter is rejected',()=>{
 const {old,result}=made('key-lock'),level=structuredClone(result.level);
 const three=level.blocks.find(b=>b.lockCount===3);assert(three);three.lockCount=2;
 const audit=auditRouteConstraint(runtime,level,result.drags,slot('key-lock'),old);
 assert(audit.verificationReplay.complete);assert.equal(audit.passed,false);
 assert(audit.issues.includes('fixed-two-staggered-counters-required'));assert(audit.issues.includes('release-events-not-distinct'));
 const strongerPrior=structuredClone(old);strongerPrior.blocks.find(b=>b.lockedBy).lockCount=2;
 const priorAudit=auditRouteConstraint(runtime,result.level,result.drags,slot('key-lock'),strongerPrior);
 assert.equal(priorAudit.passed,false);assert(priorAudit.issues.includes('counters-not-increased-over-prior'));
 evidence.push({test:'real-release-and-prior-strength-rejected',passed:true,audit,priorAudit});
});
test('private qualification cannot touch production roots; a private failed attempt blocks stage switching',async()=>{
 const base=fixture();let callbacks=0;
 for(const root of [CONSTRUCTION_LEDGER,PUBLIC_ATTEMPT_LEDGER])for(const target of [root,path.join(root,'private-looking-child')]){
  await assert.rejects(withConstraintConstructionAttempt(runtime,base,slot('key-lock'),()=>callbacks++,
   {qualificationOnly:true,ledgerDirectory:target,publicLedgerDirectory:`${out}/unused-public`}),/private ledgers/);
  await assert.rejects(withConstraintConstructionAttempt(runtime,base,slot('key-lock'),()=>callbacks++,
   {qualificationOnly:true,ledgerDirectory:`${out}/unused-construction`,publicLedgerDirectory:target}),/private ledgers/);
 }
 await assert.rejects(withConstraintConstructionAttempt(runtime,base,slot('key-lock'),()=>callbacks++,{qualificationOnly:'true'}),/boolean/);
 assert.equal(callbacks,0);
 const privateRoot=await fs.mkdtemp(`${out}/ledger-`),publicDir=`${privateRoot}/public`,constructionDir=`${privateRoot}/construction`;
 const ledger=await createAttemptLedger(publicDir),request=await ledger.claim(base.level);
 await ledger.finish(request,{accepted:true,status:'PRIVATE_SYNTHETIC_CONTROL',levelSha256:base.levelSha256});
 const options={qualificationOnly:true,ledgerDirectory:constructionDir,publicLedgerDirectory:publicDir};
 const first=await withConstraintConstructionAttempt(runtime,base,slot('key-lock'),b=>{callbacks++;
  return constructRouteConstraint(runtime,b,slot('key-lock'),prior(base,'key-lock'),{worldBudget:{maxStates:1}});},options);
 assert(first.terminalBlocked&&!first.ok&&first.constructionAttemptStarted);assert.equal(first.constructionAccounting.fullWorldReservations,1);
 const second=await withConstraintConstructionAttempt(runtime,base,slot('flip-door'),()=>{callbacks++;throw Error('Must not execute');},options);
 assert(second.terminalBlocked&&!second.constructionAttemptStarted);assert.equal(callbacks,1);
 evidence.push({test:'private-namespace-and-cross-stage-failure-seal',passed:true,first,second,callbacks});
});
test('fixed139 cannot be reduced and the single historical UI mapping names actual archived bytes',async()=>{
 const seedBytes=await fs.readFile(CONSTRAINT_SEED139.path);assert.equal(sha(seedBytes),CONSTRAINT_SEED139.sha256);
 const seed=JSON.parse(seedBytes),files=seed.files.slice(0,138),context={schemaVersion:4,scope:300,seedIndex:CONSTRAINT_SEED139,files,
  fileBindings:Object.fromEntries(files.map(p=>[p,'0'.repeat(64)]))};
 const file=`${out}/omitted-basic-context.json`,bytes=JSON.stringify(context,null,2)+'\n';await fs.writeFile(file,bytes,{flag:'wx'});
 const base=fixture();await assert.rejects(prepareConstraintDesignContext(runtime,{path:'never-read'},base,slot('key-lock'),Array(138).fill(null),
  {path:file,sha256:sha(bytes)},{constructionLedgerDirectory:`${out}/unused-sidecars`,publicLedgerDirectory:`${out}/unused-public`}),/139 cannot be omitted/);
 const archiveBytes=await fs.readFile(CONSTRAINT_HISTORICAL_UI_ARCHIVE.path);assert.equal(sha(archiveBytes),CONSTRAINT_HISTORICAL_UI_ARCHIVE.sha256);
 const archive=JSON.parse(archiveBytes),historical=await fs.readFile(archive.historical.path);
 assert.equal(sha(historical),archive.historical.sha256);assert.equal(archive.historical.sha256,'a79eb13437413cdab9a53c1487ff2808fd1cf2c2defca296cabeb45d3b9ba664');
 assert.equal(archive.currentUICompatibilityClaimed,false);assert.equal(archive.mathSnapshotChanged,false);
 evidence.push({test:'immutable139-floor-and-explicit-archive',passed:true,seed:CONSTRAINT_SEED139,archive:CONSTRAINT_HISTORICAL_UI_ARCHIVE,
  archivedByteSha256:sha(historical),actualRootSha256:sha(await fs.readFile(archive.historical.originalPath)),currentRuntimeValidationClaimed:false});
});
test('root absolute junction aliases and not-yet-created children are refused before reading any base',async()=>{
 const environment=prefixExecutionEnvironment(runtime),baseReceipt={path:`${out}/must-not-read-missing-base.json`,sha256:'0'.repeat(64)};
 const cases=[];
 for(const relative of [CONSTRUCTION_LEDGER,PUBLIC_ATTEMPT_LEDGER]){
  const absolute=path.resolve(environment.sourceWorkspace,relative);
  assert.equal(await fs.realpath(absolute),await fs.realpath(relative),'The test must target the same physical public ledger');
  for(const target of [absolute,path.join(absolute,'independent-uncreated-child','nested')]){
   for(const field of ['constructionLedgerDirectory','publicLedgerDirectory']){
    const options={qualificationOnly:true,constructionLedgerDirectory:`${out}/unused-construction`,publicLedgerDirectory:`${out}/unused-public`,[field]:target};
    await assert.rejects(qualifyConstraintSlot(runtime,baseReceipt,slot('key-lock'),options),/private ledgers/);
    cases.push({field,target});
   }
  }
 }
 evidence.push({test:'real-junction-aliases-rejected-before-base-read',passed:true,cases,baseWasNeverRead:true,ledgerWrites:0});
});
test.after(async()=>{
 const files=['constraint-entry.independent.test.mjs','route-constraint-construction.mjs','constraint-attempt-guard.mjs','constraint-design-context.mjs','qualify-constraint-slot.mjs'];
 const bindings=Object.fromEntries(await Promise.all(files.map(async n=>{const p=`tools/daily-challenge/formal-v4/${n}`;return[p,sha(await fs.readFile(p))];})));
 await fs.writeFile(`${out}/report.json`,JSON.stringify({status:evidence.length===7?'INDEPENDENT_CONSTRAINT_ENTRY_QUALIFICATION_PASS':'INCOMPLETE',
  tests:6,evidence,bindings,executionEnvironment:prefixExecutionEnvironment(runtime),currentRuntimeValidationClaimed:false,
  privateSyntheticConstructionsOnly:true,realCandidateConstructions:0,newMathematicalSearches:0,publicLedgerWrites:0,formalReady:false},null,2)+'\n',{flag:'wx'});
});
