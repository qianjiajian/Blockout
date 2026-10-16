import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadV4StageContract} from './static-contract.mjs';
import {checkLedgerSnapshot,PUBLIC_LEDGER} from './low-twenty-io.mjs';
import {lowTwentySelectionBindings,assertNoFailedDescendant} from './prepare-low-twenty.mjs';
import {lowBandShapeBan,assertLowBandInputDiversity} from './low-twenty-contract.mjs';

const out=process.env.LOW_TWENTY_INDEPENDENT_OUT;
assert(out);await fs.mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex');
const evidence=[],fileBindings={},before=(await fs.readdir(PUBLIC_LEDGER)).filter(f=>f.endsWith('.request.json')).sort();
const read=async p=>{const b=await fs.readFile(p);fileBindings[p]=hash(b);return JSON.parse(b);};
test('actual 300-slot envelope and exact 152 review reject missing selection members or altered receipt bytes',async()=>{
 const api=await loadV4StageContract();Object.assign(fileBindings,api.bindings);
 for(const d of [1,2]){const s=api.DAILY_CHALLENGE_V3_SLOTS.find(s=>s.id===`daily-basic-combined-d${d}-01`);
  assert.deepEqual({formalId:s.id,stageKey:s.stageKey,difficulty:s.difficulty,slot:s.slot,newestMechanism:s.newestMechanism},
   {formalId:`daily-basic-combined-d${d}-01`,stageKey:'basic-combined',difficulty:d,slot:1,newestMechanism:null});}
 const r=await read('deliverables/daily-formal-v4-20261008/proof/completed152-quick-independent-01.json'),index=await read(r.selection.path);
 assert.equal(Object.keys(lowTwentySelectionBindings(r,index,r.selection)).length,Object.keys(r.inputBindings).length);
 assert.throws(()=>lowTwentySelectionBindings(r,{...index,files:index.files.slice(1)},r.selection));
 assert.throws(()=>lowTwentySelectionBindings({...r,original150ExactPrefixAndBytes:false},index,r.selection));
 assert.throws(()=>lowTwentySelectionBindings(r,index,{...r.selection,sha256:'0'.repeat(64)}));
 evidence.push({name:'actual-slot-and-selection-envelope',passed:true,qualificationOnly:true,productionPrepare:false});
});
test('private seven-root snapshot rejects an omitted root, foreign addition and changed existing bytes',async()=>{
 const roots=Array.from({length:7},(_,i)=>path.join(out,`private-root-${i}`));
 for(const r of roots)await fs.mkdir(r);const f=path.join(roots[0],'prior.json');await fs.writeFile(f,'{}');
 const snapshot={roots:roots.map((directory,i)=>({directory,files:i===0?[{path:f,sha256:hash(Buffer.from('{}'))}]:[]}))};
 const opts={qualificationOnly:true,expectedPrivateRoots:roots};await checkLedgerSnapshot(snapshot,opts);
 await assert.rejects(()=>checkLedgerSnapshot({roots:snapshot.roots.slice(1)},opts));
 const added=path.join(roots[6],'foreign.json');await fs.writeFile(added,'{}');
 await assert.rejects(()=>checkLedgerSnapshot(snapshot,opts),/Unreviewed shared history/);
 await checkLedgerSnapshot(snapshot,{...opts,allowedNewFiles:[added]});
 await fs.writeFile(f,'{"changed":true}');
 await assert.rejects(()=>checkLedgerSnapshot(snapshot,{...opts,allowedNewFiles:[added]}));
 evidence.push({name:'seven-root-completeness-additions-and-drift',passed:true,qualificationOnly:true});
});
test('source branches preserve both-change failures while unrelated shape inventory remains allowed',async()=>{
 const parent={source:7,branchId:'fixed',fingerprints:{shapeSha256:'parent-shape'}};
 assert.deepEqual([...lowBandShapeBan({sourceLevelId:7,branchId:'fixed'},[parent],[
  {key:'8:other',fingerprints:{shapeSha256:'unrelated'}},{key:'7:fixed',fingerprints:{shapeSha256:'formed-failed'}}])],['parent-shape','formed-failed']);
 const first={key:'7:fixed',shapeSha256:'newshape',colorSha256:'newcolour',designSha256:'one'};
 assertLowBandInputDiversity([first,{...first,key:'8:other',designSha256:'two'}]);
 assert.throws(()=>assertLowBandInputDiversity([first,{...first,colorSha256:'other',designSha256:'two'}]));
 assert.throws(()=>assertLowBandInputDiversity([first,{...first,shapeSha256:'other',designSha256:'two'}]));
 await assert.rejects(()=>assertNoFailedDescendant('old',[{id:'accepted',redesignOf:'old'},{id:'newfail',redesignOf:'accepted'}],async id=>({accepted:id==='accepted'})),/newer failed descendant/);
 evidence.push({name:'actual-branch-shape-and-colour-and-latest-failure',passed:true,qualificationOnly:true});
});
test.after(async()=>{
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(f=>f.endsWith('.request.json')).sort();assert.deepEqual(after,before);
 for(const name of ['low-twenty-contract.mjs','low-twenty-io.mjs','low-twenty-region-factory.mjs','prepare-low-twenty.mjs','construct-low-twenty.mjs','run-low-twenty.mjs','low-twenty.test.mjs','low-twenty.independent.test.mjs']){
  const p='tools/daily-challenge/formal-v4/'+name;fileBindings[p]=hash(await fs.readFile(p));}
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:evidence.length===3?'LOW_TWENTY_INDEPENDENT_NEGATIVES_PASS':'INCOMPLETE',evidence,errors:[],fileBindings,
  publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,newRealConstructions:0,newSearches:0,publicClaimsStarted:0,preparedActualPlan:false,qualificationOnly:true,formalReady:false},null,2)+'\n',{flag:'wx'});
});
