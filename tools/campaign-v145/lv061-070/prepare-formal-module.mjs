import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,auditStructure,OUTPUT,writeNew} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';

// Generate only this batch's reviewed data module; shared pipeline edits are
// separate so another batch's recently installed stage cannot be overwritten.
const lock=ruleGate();
const summaryPath=`${OUTPUT}/summary.json`;
const summary=JSON.parse(fs.readFileSync(summaryPath));
assert.equal(summary.candidateReadyCount,10);
const {api}=await loadApi();
const reviewed={};
for(const row of summary.rows){
 const raw=fs.readFileSync(row.candidate.path);
 assert.equal(digest(raw),row.candidate.sha256);
 const data=JSON.parse(raw);
 assert.equal(digest(data.level),row.candidate.levelSha256);
 assert.equal(digest(data.drags),row.candidate.routeSha256);
 auditStructure(data,api);
 const replay=api.replayRevisedRoute(data.level,data.drags);
 assert(replay.valid&&replay.complete);
 reviewed[row.id]=data.level;
}
const ids=Object.keys(reviewed).map(Number);
assert.deepEqual(ids,Array.from({length:10},(_,i)=>61+i));
const dest='src/core/remake61to70.ts';
assert(!fs.existsSync(dest),'Do not overwrite an existing reviewed module');
const dir=`${OUTPUT}/formal-integration-${Date.now()}`;
fs.mkdirSync(dir,{recursive:true});
writeNew(`${dir}/before-levels.json`,api.LEVELS);
const paths=['src/core/levels.ts','src/game/formalBlockShapes.ts','tests/nativeBlockArtPolicy.test.ts'];
const files=paths.map((p,i)=>{const bytes=fs.readFileSync(p),copy=`${dir}/before-${i}-${p.split('/').at(-1)}`;fs.writeFileSync(copy,bytes,{flag:'wx'});return {path:p,sha256:digest(bytes),copy};});
const source=`// v1.45 batch, independently reviewed under the v1.47 rule lock.\n// Historical candidates and certificates remain in the batch deliverables.\nimport type { LevelSpec } from './types';\n\nexport const REMADE_61_70_IDS: readonly number[] = ${JSON.stringify(ids)};\nconst reviewed: Record<number, LevelSpec> = ${JSON.stringify(reviewed,null,2)};\n\nexport const applyRemake61to70 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n`;
fs.writeFileSync(dest,source,{flag:'wx'});
writeNew(`${dir}/prepared.json`,{status:'MODULE_PREPARED_NOT_YET_WIRED',ruleVersion:lock.activeVersion,summaryPath,summarySha256:digest(fs.readFileSync(summaryPath)),beforeLevelsSha256:digest(api.LEVELS),beforeLevelHashes:api.LEVELS.map(l=>({id:l.id,sha256:digest(l)})),files,module:{path:dest,sha256:digest(source)},ids,formalPointerValidated:false,published:false});
console.log(JSON.stringify({status:'MODULE_PREPARED',dir,module:dest,ids}));
