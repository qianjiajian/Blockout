import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {levelSha256,routeSha256} from './proof-contract.mjs';
import {inspectPointerReport,inspectPointerFiles,auditLeaguePointerAcceptance,REQUIRED_VIEWPORTS} from './pointer-acceptance.mjs';

// Explicitly synthetic validation fixtures, never real Pointer acceptance data.
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const fixtureParent=path.join(root,'deliverables/league-v2-20261008/proof/pointer-audit');
function fixture(index=1,viewport='320x568',identity='formal') {
  const level={id:900000+index,timeSeconds:180,blocks:[{id:'a'},{id:'b'}]},drags=[{blockId:'a',path:[[1,0]]},{blockId:'a',path:[[1,0]],exitSide:'top'},{blockId:'b',path:[[2,0]],exitSide:'top'}];
  const trace=[{index:0,blockId:'a',moves:1,clearDelta:0},{index:1,blockId:'a',moves:2,clearDelta:1},{index:2,blockId:'b',moves:3,clearDelta:1}];
  const replay={valid:true,complete:true,failed:false,effectiveDrags:3,clearEvents:2,nonClearingDrags:1,trace,remainingBodies:0,remainingQueued:0};
  const proof={accepted:true,index,level,drags,levelSha256:levelSha256(level),routeSha256:routeSha256(drags),U:1,specials:['b'],scoring:{passed:true,successPoints:10},route:{canonicalReplay:structuredClone(replay),independentReplay:structuredClone(replay)},staticAudit:{assetBindings:{'test-sprite.png':sha('synthetic-sprite')}}};
  const entryBaseline={coins:1200,currentLevel:6,highestLevel:200,bestStars:{},bestMoves:{},rewardedLevels:[1,2,3,4,5],lifeState:{lives:5},boosters:{time:0,rocket:0,pulse:0},dailyChallenge:{untouched:true},league:{season:{index:0,startMs:1,endMs:10000,joinedMs:2,tier:0,stars:0,score:0,cleared:Array.from({length:index-1},(_,i)=>i+1)}}};
  const save=structuredClone(entryBaseline);save.league.season.score=10;save.league.season.cleared.push(index);
  const [width,height]=viewport.split('x').map(Number),formal=identity==='formal';
  const report={schemaVersion:2,mode:'league',index,levelSha256:proof.levelSha256,routeSha256:proof.routeSha256,viewport:{width,height},status:formal?'FORMAL_POINTER_NATURAL_TIME_PASS':'CANDIDATE_POINTER_NATURAL_TIME_PASS',formalRegistryIdentity:formal,candidateInjection:!formal,naturalClock:true,clockMocked:false,pointerValidated:true,timeValidated:true,playerSaveTouched:false,errors:[],storageViolations:[],initialPuzzle:{moves:0,cleared:0,remainingSeconds:180},naturalClockProbe:{beforeClock:180,afterClock:179.8},actions:trace.map((t,i)=>({...t,remainingSeconds:179-i})),finalPuzzle:{complete:true,failed:false,moves:3,cleared:2,remainingSeconds:177,blocks:0,queuedBlocks:0},U:1,totalDrags:3,wallSeconds:3,playableSeconds:3,entryBaseline,settlement:{save,result:{persistence:'committed',status:'credited',points:10},points:10},memoryPersistence:{backend:'MemoryHost',operations:[{kind:'read',key:'color-escape-save-v1'},{kind:'write',key:'color-escape-save-v1'}],persistedSave:structuredClone(save)},drawAudit:{calls:40,rotated:0,canvasRotationCalls:0},files:{}};
  return {proof,report};
}
const inspect=(r,p,identity='formal')=>inspectPointerReport(r,p,{index:p.index,viewport:'320x568',identity});

test('strict observation gate accepts a complete synthetic contract and distinguishes candidate identity',()=>{
  const {proof,report}=fixture();assert.deepEqual(inspect(report,proof).errors,[]);
  const candidate=fixture(1,'320x568','candidate');assert.equal(inspect(candidate.report,candidate.proof).passed,false);assert.equal(inspect(candidate.report,candidate.proof,'candidate').passed,true);
});

test('PASS labels cannot hide broken per-drag commits, clears, route IDs, inventory or time',()=>{
  const cases=[
    ['drag-1-not-one-commit',r=>r.actions[1].moves=3],
    ['drag-1-clear-delta',r=>r.actions[1].clearDelta=0],
    ['drag-1-identity',r=>r.actions[1].blockId='different-body'],
    ['incomplete-pointer-actions',r=>r.actions.pop()],
    ['actual-clear-total',r=>r.finalPuzzle.cleared=1],
    ['actual-non-clearing-drags',r=>r.U=2],
    ['remaining-full-inventory',r=>r.finalPuzzle.queuedBlocks=1],
    ['natural-clock-probe-not-advanced',r=>r.naturalClockProbe.afterClock=180],
    ['drag-1-natural-clock',r=>r.actions[1].remainingSeconds=180],
    ['not-complete-with-positive-natural-time',r=>r.finalPuzzle.remainingSeconds=0],
    ['natural-clock-accounting',r=>r.playableSeconds=999],
    ['final-clock-does-not-match-last-drag',r=>r.finalPuzzle.remainingSeconds=177.5],
    ['wrong-viewport',r=>r.viewport.height=900],
  ];
  for(const [expected,mutate] of cases){const{proof,report}=fixture();mutate(report);assert.ok(inspect(report,proof).errors.includes(expected),expected);}
});

test('missing old-driver baseline and MemoryHost backend proof are rejected',()=>{
  for(const mutate of [r=>delete r.entryBaseline,r=>delete r.initialPuzzle,r=>delete r.finalPuzzle.cleared,r=>delete r.memoryPersistence,r=>delete r.memoryPersistence.persistedSave]){
    const{proof,report}=fixture();mutate(report);assert.equal(inspect(report,proof).passed,false);
  }
});

test('cache-only score, backend cleared mismatch, mainline/coin/life mutation and storage access fail',()=>{
  const cases=[
    r=>r.memoryPersistence.persistedSave.league.season.score=0,
    r=>r.memoryPersistence.persistedSave.league.season.cleared=[],
    r=>r.memoryPersistence.operations=[],
    r=>r.settlement.result.persistence='unknown',
    r=>r.settlement.result.status='expired',
    r=>r.settlement.save.coins++,
    r=>{r.settlement.save.highestLevel++;r.memoryPersistence.persistedSave.highestLevel++;},
    r=>{r.settlement.save.lifeState.lives--;r.memoryPersistence.persistedSave.lifeState.lives--;},
    r=>{r.settlement.save.dailyChallenge.untouched=false;r.memoryPersistence.persistedSave.dailyChallenge.untouched=false;},
    r=>r.storageViolations.push('getItem'),
    r=>r.drawAudit.rotated++,
    r=>r.drawAudit.canvasRotationCalls++,
  ];
  for(const mutate of cases){const{proof,report}=fixture();mutate(report);assert.equal(inspect(report,proof).passed,false);}
});

async function makeWorkspace(t,indices=[1],identity='formal'){
  await fs.mkdir(fixtureParent,{recursive:true});const directory=await fs.mkdtemp(path.join(fixtureParent,'test-fixture-'));
  t.after(async()=>{const relative=path.relative(fixtureParent,directory);assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));await fs.rm(directory,{recursive:true,force:true});});
  const write=async(file,data)=>{const target=path.join(directory,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);};
  const registry=Object.fromEntries(indices.map(i=>{const p=fixture(i).proof;return[i,{index:i,level:p.level,specials:p.specials}];}));
  await write('src/core/leagueLevels.ts',`const data=${JSON.stringify(registry)};export function getLeagueLevel(index:number){return data[index];}`);
  for(const f of ['pointer.mjs','pointer-browser.mjs','pointer.html'])await write('tools/league-v2/'+f,'synthetic-test-driver');
  await write('public/test-sprite.png','synthetic-sprite');
  const selection={selections:indices.map(index=>({index,proofFile:`proofs/${index}.json`}))};await write('selection.json',JSON.stringify(selection));
  const mapping={selectionFileSha256:sha(await fs.readFile(path.join(directory,'selection.json'))),reports:[]};
  for(const index of indices){
    const proof=fixture(index).proof;await write(`proofs/${index}.json`,JSON.stringify(proof));
    const files={};for(const file of ['src/core/leagueLevels.ts','tools/league-v2/pointer.mjs','tools/league-v2/pointer-browser.mjs','tools/league-v2/pointer.html','public/test-sprite.png',`proofs/${index}.json`])files[file]=sha(await fs.readFile(path.join(directory,file)));
    const row={index,viewports:{}};
    for(const viewport of REQUIRED_VIEWPORTS){const{report}=fixture(index,viewport,identity);report.files=files;const file=`reports/${index}-${viewport}.json`;await write(file,JSON.stringify(report));row.viewports[viewport]={file,sha256:sha(await fs.readFile(path.join(directory,file)))};}
    mapping.reports.push(row);
  }
  await write('mapping.json',JSON.stringify(mapping));
  return {directory,write,mapping,selection,options:{workspaceRoot:directory,selectionFile:'selection.json',mappingFile:'mapping.json',identity}};
}

test('a complete supplied partial list remains false, even with both screens passing',async t=>{
  const ws=await makeWorkspace(t);const result=await auditLeaguePointerAcceptance(ws.options);
  assert.equal(result.passedLevels,1);assert.equal(result.passedScreens,2);assert.equal(result.pointerGatePassed,false);assert.equal(result.accepted,false);assert.equal(result.formalReady,false);assert.equal(result.rows.length,100);
});

test('current source/sprite hashes and externally bound report bytes fail independently',async t=>{
  const ws=await makeWorkspace(t),{proof,report}=fixture();
  const file='reports/1-320x568.json',bound=ws.mapping.reports[0].viewports['320x568'].sha256;
  const actual=JSON.parse(await fs.readFile(path.join(ws.directory,file)));
  const options={workspaceRoot:ws.directory,proofFile:'proofs/1.json',reportFile:file,reportSha256:bound};
  assert.deepEqual(await inspectPointerFiles(actual,proof,options),[]);
  await fs.appendFile(path.join(ws.directory,file),' ');
  assert.ok((await inspectPointerFiles(actual,proof,options)).includes('pointer-report-file-sha-mismatch'));
  await ws.write('public/test-sprite.png','wrong-colour-sprite');
  assert.ok((await inspectPointerFiles(actual,proof,options)).some(x=>x.startsWith('sprite-file-hash-mismatch')));
  await ws.write('src/core/leagueLevels.ts','changed-source');
  assert.ok((await inspectPointerFiles(actual,proof,options)).some(x=>x==='stale-or-invalid-input-hash: src/core/leagueLevels.ts'));
  delete actual.files['tools/league-v2/pointer.html'];
  assert.ok((await inspectPointerFiles(actual,proof,options)).includes('missing-input-binding: tools/league-v2/pointer.html'));
});

test('tampered mapped report is refused even when its internal PASS metrics remain valid',async t=>{
  const ws=await makeWorkspace(t);const file=ws.mapping.reports[0].viewports['320x568'].file;
  await fs.appendFile(path.join(ws.directory,file),'\n');
  const result=await auditLeaguePointerAcceptance(ws.options);
  assert.equal(result.passedLevels,0);assert.ok(result.rows[0].screens[0].errors.includes('pointer-report-file-sha-mismatch'));
});

test('duplicate screen reports, selection drift and registry substitution cannot pass',async t=>{
  const ws=await makeWorkspace(t);
  ws.mapping.reports[0].viewports['496x1078']=ws.mapping.reports[0].viewports['320x568'];
  ws.mapping.selectionFileSha256='0'.repeat(64);await ws.write('mapping.json',JSON.stringify(ws.mapping));
  let result=await auditLeaguePointerAcceptance(ws.options);
  assert.ok(result.errors.includes('mapping-selection-sha-mismatch'));assert.ok(result.rows[0].screens[1].errors.includes('report-reused-for-another-slot-or-viewport'));
  await ws.write('src/core/leagueLevels.ts','export const getLeagueLevel=(index:number)=>({index,level:{id:1},specials:[]});');
  result=await auditLeaguePointerAcceptance(ws.options);assert.ok(result.rows[0].errors.includes('current-formal-registry-differs'));
});

test('all 100 synthetic formal rows exercise the full gate; removal of one screen fails it',async t=>{
  const ws=await makeWorkspace(t,Array.from({length:100},(_,i)=>i+1));
  const full=await auditLeaguePointerAcceptance(ws.options);
  assert.deepEqual(full.errors,[]);assert.equal(full.passedLevels,100);assert.equal(full.passedScreens,200);assert.equal(full.accepted,true);assert.equal(full.formalPointerAccepted,true);assert.equal(full.formalReady,false);
  delete ws.mapping.reports[99].viewports['496x1078'];await ws.write('mapping.json',JSON.stringify(ws.mapping));
  const missing=await auditLeaguePointerAcceptance(ws.options);assert.equal(missing.passedScreens,199);assert.equal(missing.accepted,false);assert.equal(missing.pointerGatePassed,false);
});
