import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
export const rawHash=v=>createHash('sha256').update(Buffer.isBuffer(v)||typeof v==='string'?v:JSON.stringify(v)).digest('hex');
export const currentBaselineFile='deliverables/lv20-remake-20260927/acceptance-current-baseline.json';
export function preserveOther199(api){const b=JSON.parse(fs.readFileSync(currentBaselineFile));const rows=b.levelHashes.filter(x=>x.id!==20).map(row=>({id:row.id,before:row.sha256,now:rawHash(api.LEVELS.find(l=>l.id===row.id))}));assert(rows.every(x=>x.before===x.now),'Current baseline other199 drift');return rows;}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/acceptance-baseline.mjs')){
 const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.89.0');
 const oldFile='deliverables/lv20-remake-20260927/baseline.json',old=JSON.parse(fs.readFileSync(oldFile)),{api}=await loadApi();
 const allowed={122:[42,49],126:[49,61],127:[36,41],131:[50,28],132:[66,49],133:[62,57],134:[50,51],135:[45,36],136:[60,49],137:[54,34],138:[74,47],139:[99,70],140:[37,42]};
 const concurrent=[];
 for(const row of old.levelHashes){const current=api.LEVELS.find(l=>l.id===row.id),now=rawHash(current);if(now===row.sha256)continue;assert(allowed[row.id],`Unexpected changed level ${row.id}`);const[oldTarget,newTarget]=allowed[row.id];assert.equal(current.preservedMoveTarget,newTarget);let restored;
  for(const previous of [oldTarget,undefined]){const check=structuredClone(current);if(previous===undefined)delete check.preservedMoveTarget;else check.preservedMoveTarget=previous;if(rawHash(check)===row.sha256)restored={id:row.id,field:'preservedMoveTarget',old:previous??null,oldFieldAbsent:previous===undefined,new:newTarget,oldSha256:row.sha256,newSha256:now};}
  assert(restored,`Lv${row.id} differs beyond approved score field`);concurrent.push(restored);
 }
 assert.equal(concurrent.length,13);
 for(const[p,h]of Object.entries(old.files).filter(([p])=>p!=='src/core/levels.ts'))assert.equal(rawHash(fs.readFileSync(p)),h,`Shared source ${p} changed`);
 const files={};function tree(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name).replaceAll('\\','/');if(ent.isDirectory())tree(p);else files[p]=rawHash(fs.readFileSync(p));}}tree('src');
 const result={status:'PASS',capturedAt:new Date().toISOString(),activeVersion:lock.activeVersion,implementationRule:'1.87.0',oldBaseline:{file:oldFile,sha256:rawHash(fs.readFileSync(oldFile))},concurrentScoreOnlyChanges:concurrent,levels:JSON.parse(JSON.stringify(api.LEVELS)),levelHashes:api.LEVELS.map(l=>({id:l.id,sha256:rawHash(l)})),files,ruleBindings:Object.fromEntries(['docs/rules/manifest.json','docs/rules/mechanism-rules-v1.87.0.md','docs/rules/mechanism-rules-v1.88.0.md','docs/rules/mechanism-rules-v1.89.0.md'].map(p=>[p,rawHash(fs.readFileSync(p))]))};
 fs.writeFileSync(currentBaselineFile,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({output:currentBaselineFile,status:result.status,concurrent:concurrent.map(x=>x.id)}));
}
