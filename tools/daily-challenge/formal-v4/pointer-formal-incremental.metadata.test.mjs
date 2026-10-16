import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {incrementalPointerReceipt} from './pointer-incremental-receipt.mjs';
const V='deliverables/daily-formal-v4-20261008',T='tools/daily-challenge/formal-v4/';
const out=process.argv[2];assert(out);await fs.mkdir(out,{recursive:false});
const H=b=>createHash('sha256').update(b).digest('hex'),bindings={},checks=[];
async function read(p){const b=await fs.readFile(p);bindings[p]=H(b);return b;}
async function check(name,fn){await fn();checks.push({name,passed:true});}
const summary={};let error=null;
try{
 const indexPath=V+'/selection/completed-basic-and-advanced-162-01/index.json',idx=JSON.parse(await read(indexPath));
 const receipts=[];
 await check('original schema4 selected receipts normalize without byte/object mutation',async()=>{
  const fields={};
  for(const p of idx.files){const b=await read(p),q=JSON.parse(b);assert.equal(H(b),idx.fileBindings[p]);if(q.schemaVersion!==4)continue;
   const before=JSON.stringify(q),v=incrementalPointerReceipt(q);assert.equal(JSON.stringify(q),before);assert.equal(v.receipt,q);assert.equal(v.receipt.level,q.level);assert.equal(v.receipt.drags,q.drags);
   fields[v.independentReplayField]=(fields[v.independentReplayField]??0)+1;receipts.push(q);
  }
  assert.equal(receipts.length,161);assert(fields.freshIndependentReplay>0&&fields['route.independentReplay']>0);
  summary.compatibleOriginalReceipts=receipts.length;summary.selectedEvidenceFields=fields;
  summary.compatibilityOnly='Includes held/undecided receipts solely to test field compatibility; no design or new mathematical acceptance is assigned';
 });
 await check('malformed metadata is rejected without a model or replay',async()=>{
  const q=receipts[0],r=q.freshIndependentReplay;
  const cases=[{...q,schemaVersion:3},{...q,accepted:false},{...q,qualificationOnly:true},{...q,levelSha256:'0'.repeat(64)},
   {...q,routeSha256:'0'.repeat(64)},{...q,L:15},{...q,U:21},{...q,freshIndependentReplay:undefined},
   {...q,freshIndependentReplay:{...r,valid:false}},
   {...q,freshIndependentReplay:{...r,trace:r.trace.map((t,i)=>i? t:{...t,blockId:'not-the-original-body'})}},
   {...q,freshIndependentReplay:{...r,trace:r.trace.map((t,i)=>i? t:{...t,moves:99})}},
   {...q,route:{independentReplay:{...r,trace:r.trace.map((t,i)=>i? t:{...t,clearDelta:0})}}}];
  for(const c of cases)assert.throws(()=>incrementalPointerReceipt(c));summary.rejectionCases=cases.length;
 });
 await check('runner/browser exact declared changes reconstruct the original N20 tools',async()=>{
  const diff=JSON.parse(await read('.codex-temp/incremental-pointer-source-changes.json'));
  for(const item of [diff.runner,diff.browser]){const old=String(await read(item.source.path)),next=String(await read(item.target.path));assert.equal(H(old),item.source.sha256);assert.equal(H(next),item.target.sha256);
   let undo=next;for(const c of [...item.changes].reverse())undo=c.all?undo.replaceAll(c.after,c.before):undo.replace(c.after,c.before);assert.equal(undo,old);}
  await read(diff.html.path);
 });
 await check('formal Pointer entry and removed noncontractual quotas are explicit; execution stays disabled',async()=>{
  const runner=String(await read(T+'pointer-formal-incremental-dual.mjs')),browser=String(await read(T+'pointer-formal-incremental-browser.mjs'));
  assert(runner.includes('const EXECUTION_ENABLED=false;'));assert(runner.includes('await page.mouse.click('));assert(runner.includes('q.drags.length+1'));
  assert(browser.includes('game.openDailyChallenge()'));assert(!browser.includes('game.loadLevel(')&&!browser.includes('game.startDailyChallenge('));
  assert(browser.includes('getDailyChallengeStageV3(entry.stageKey)'));assert(browser.includes('expected.difficulty'));
  assert(browser.includes("kind:'existing-frozen-day-pool'"));assert(browser.includes('naturalNewDaySelectionClaimed:false'));
  assert(!runner.includes("'Real midgame FIFO'")&&!runner.includes("'Actual FIFO clear order'"));
  assert(!runner.includes('new Set(report.keyParticipation.map'));assert(!runner.includes("assert(steps>0)"));
  assert(runner.includes('before:{blocks:before.blocks,gates:before.gates'));
  const old=String(await read(T+'pointer-formal-n20-browser.mjs'));
  const section=s=>s.slice(s.indexOf('class MemoryHost'),s.indexOf('const host ='));
  assert.equal(section(browser),section(old));
 });
}catch(e){error=e.stack??String(e);}
for(const p of [T+'pointer-incremental-receipt.mjs',T+'pointer-formal-incremental.metadata.test.mjs','tools/daily-challenge/formal-v2/contract.mjs','docs/rules/mechanism-rules-v1.185.0.md','docs/rules/mechanism-rules-v1.186.0.md'])await read(p);
const report={status:error?'FAIL':'INCREMENTAL_FORMAL_POINTER_METADATA_PASS',checks,summary,error,
 bindingWorkingDirectory:process.cwd(),fileBindings:bindings,
 newBrowserRuns:0,newModels:0,newReplays:0,newSearches:0,newFormalEntries:0,realPlayerSaveTouched:false,
 limitations:['Pure metadata and source-boundary checks only; no browser or formal page has been run with these new tools','Old N20 original receipt has no schemaVersion and remains supported solely by its immutable dedicated tool']};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,checks:checks.length,bindings:Object.keys(bindings).length,report:path.join(out,'report.json'),sha256:H(await fs.readFile(path.join(out,'report.json'))),error}));if(error)process.exitCode=1;
