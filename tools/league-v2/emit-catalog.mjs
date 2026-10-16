import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadLeagueProofRuntime,levelSha256} from './proof-contract.mjs';
import {leagueCatalogProgress} from './catalog-progress.mjs';
import {auditLeagueVisual} from './visual-audit.mjs';

const[selectionFile,visualFile,output]=process.argv.slice(2),adopt=process.argv.includes('--adopt');
if(!selectionFile||!visualFile||!output)throw Error('Usage: node emit-catalog.mjs selection.json visual-review.json new-output-directory [--adopt]');
const digest=b=>createHash('sha256').update(b).digest('hex');
const runtime=await loadLeagueProofRuntime(),selection=JSON.parse(await fs.readFile(selectionFile,'utf8'));
const progress=await leagueCatalogProgress(runtime,selection.selections);
assert.equal(progress.counts.MODEL_VERIFIED_AWAITING_POINTER_VISUAL,100,'All 100 fresh same-object model/score/mechanism receipts required');
assert.equal(progress.diversity.status,'DESIGN_NUMERIC_GATES_PASS');
const visual=JSON.parse(await fs.readFile(visualFile,'utf8'));
const visualAudit=await auditLeagueVisual({visualFile,selections:selection.selections});
assert.equal(visualAudit.passed,true,JSON.stringify(visualAudit.errors));
assert.equal(visual.status,'CANDIDATE_ATLAS_MANUALLY_INSPECTED_NOT_FORMAL');
assert.equal(visual.captures,100,'Full 100-level visual review required');
assert.equal(visual.evidence.length,100);assert.equal(new Set(visual.evidence.map(r=>r.index)).size,100);
const entries=[],proofs=[];
for(const row of progress.rows){
 const proof=JSON.parse(await fs.readFile(row.proofFile,'utf8')),v=visual.evidence.find(r=>r.index===row.index);
 assert(v&&v.levelSha256===row.levelSha256,'Visual review must match actual candidate '+row.index);
 assert.equal(digest(await fs.readFile(path.resolve(path.dirname(visualFile),v.image))),v.imageSha256,'Reviewed image changed');
 proofs.push(proof);
 entries.push({index:row.index,level:proof.level,specials:proof.specials,levelSha256:proof.levelSha256,gameplayKey:row.partitionKey,packing:0});
}
for(const mechanism of runtime.MECHANISM_GUIDE.filter(m=>m.unlockLevel<=100)){
 const first=proofs.find(p=>p.index===mechanism.unlockLevel);
 assert(first.staticAudit.mechanisms.includes(mechanism.id),'Missing actual mechanism at campaign unlock slot: '+mechanism.id);
}
const current=await fs.readFile('src/core/leagueLevelData.ts'),baseline=JSON.parse(await fs.readFile('deliverables/league-v2-20261008/baseline/manifest.json','utf8'));
assert.equal(digest(current),baseline.inputSha256['src/core/leagueLevelData.ts'],'Production league changed since independent baseline; inspect before replacing');
for(const file of ['src/core/levels.ts','src/core/leagueLevels.ts'])assert.equal(digest(await fs.readFile(file)),baseline.inputSha256[file],'Unrelated source/selector drift: '+file);
const revision=levelSha256(entries),text='import type {LevelSpec} from "./types";\n'+
 'export interface LeagueLevelEntry {index:number;level:LevelSpec;specials:readonly string[];levelSha256:string;gameplayKey:string;packing:number}\n'+
 `/** Independent 100-level catalog v2. Revision ${revision}. See league-v2-20261008 evidence. */\n`+
 'export const LEAGUE_LEVELS:readonly LeagueLevelEntry[]=[\n'+entries.map(e=>JSON.stringify(e)).join(',\n')+'\n];\n';
await fs.mkdir(output,{recursive:false});
await fs.writeFile(path.join(output,'previous-leagueLevelData.ts'),current,{flag:'wx'});
await fs.writeFile(path.join(output,'leagueLevelData.ts'),text,{flag:'wx'});
await fs.writeFile(path.join(output,'catalog.json'),JSON.stringify({revision,entries},null,2)+'\n',{flag:'wx'});
await fs.writeFile(path.join(output,'progress-before-registry.json'),JSON.stringify(progress,null,2)+'\n',{flag:'wx'});
await fs.writeFile(path.join(output,'visual-audit-before-registry.json'),JSON.stringify(visualAudit,null,2)+'\n',{flag:'wx'});
const admission={status:adopt?'REGISTRY_INSTALLED_AWAITING_FORMAL_POINTER':'STAGED_100_AWAITING_REGISTRY_AND_FORMAL_POINTER',formalReady:false,
 revision,count:100,modelVerified:100,visualReviewed:100,selectionFile,selectionSha256:digest(await fs.readFile(selectionFile)),
 visualFile,visualSha256:digest(await fs.readFile(visualFile)),previousProductionSha256:digest(current),newProductionSha256:digest(text),productionChanged:adopt,
 remaining:['100×two-viewports actual formal registry Pointer','natural-clock completion and real league persistence','final acceptance aggregate']};
if(adopt)await fs.writeFile('src/core/leagueLevelData.ts',text);
await fs.writeFile(path.join(output,'admission.json'),JSON.stringify(admission,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(admission));
