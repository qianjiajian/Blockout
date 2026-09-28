import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv141-150';
const baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json'));
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.47.0');
const {api}=await loadApi();
const ids=[...Array.from({length:30},(_,i)=>i+1),...Array.from({length:10},(_,i)=>141+i)];
const rows=ids.map(id=>({id,baseline:digest(baseline.levels[id-1].level),current:digest(api.LEVELS[id-1])}));
const drift=rows.filter(r=>r.baseline!==r.current);
const result={createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,rulesLock:'PASS',
  scope:'Current production1-30 and141-150 against the immutable campaign baseline; other parallel ranges excluded.',
  status:drift.length?'FAIL':'PASS',drift,rows,
  productionWrittenByThisTask:false,sharedWorkstateWrittenByThisTask:false,published:false,
  note:'This is preservation evidence, not candidate difficulty or gameplay certification.'};
const file=root+'/preservation-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,status:result.status,checked:ids.length,drift:drift.map(r=>r.id)}));
if(drift.length)process.exitCode=1;
