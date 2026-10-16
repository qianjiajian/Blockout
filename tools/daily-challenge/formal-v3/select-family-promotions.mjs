import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {expectedDailySlots} from '../formal-v2/catalog-progress.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {loadV3CatalogRuntime,qualifyV3Slot,auditV3Catalog} from './catalog-contract.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';
import {historicalPromotedFamilies} from './family-promotion-history.mjs';

const [poolFile,label,inputIndex]=process.argv.slice(2);
assert(poolFile&&/^[a-z0-9-]+$/.test(label??'')&&inputIndex);
const root='deliverables/daily-formal-v3-20261008',output=`${root}/selection/${label}`;
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const inputBytes=await fs.readFile(inputIndex),index=JSON.parse(inputBytes),pool=await read(poolFile);
const runtime=await loadV3CatalogRuntime(),slots=expectedDailySlots(runtime.MECHANISM_GUIDE),lineages=createReferenceLineageReader();
const old=(await read('deliverables/daily-formal-v2-20261007/final-qualified/index.json')).entries;
let entries=await Promise.all(index.files.map(async file=>({file,receipt:await read(file)})));
const retiredFamilies=await historicalPromotedFamilies(inputIndex,entries.map(e=>e.receipt));
assert.equal((await auditV3Catalog(runtime,entries.map(e=>e.receipt))).verified,entries.length,'Only a fully current accepted selection may be replaced');
await fs.mkdir(output,{recursive:false});const attempts=[],promotions=[];
for(const item of pool.records){
 const bytes=await fs.readFile(item.path);assert.equal(sha(bytes),item.fileSha256);
 const base=JSON.parse(bytes),replace=base.replacementOf;
 assert(base.accepted&&base.difficulty===3&&replace,'Verified explicit D3 replacement proposal required');
 assert(!retiredFamilies.has(replace.familyRoot),'A previously promoted family cannot re-enter promotion from a retired parent');
 assert.equal(levelSha256(base.level),base.levelSha256);
 const parent=entries.find(e=>e.receipt.formalId===replace.formalId);
 assert(parent,'Original representative must still be live');assert.equal(parent.file,replace.receipt);
 assert.equal(parent.receipt.difficulty,2,'Only a D2 representative can be promoted');
 assert.equal(sha(await fs.readFile(parent.file)),replace.receiptSha256);
 assert.equal(parent.receipt.levelSha256,replace.levelSha256);assert.equal(parent.receipt.baseLevelSha256,replace.baseLevelSha256);
 assert.equal(parent.receipt.baseInputFile,replace.baseInputFile);
 const oldLineage=lineages.inspect(parent.receipt.baseInputFile),newLineage=lineages.inspect(item.path);
 for(const lineage of [oldLineage,newLineage]){
  assert.deepEqual(lineage.roots,[replace.familyRoot],'Exactly one common independent root required');
  assert.equal(lineage.unknownReasons.length,0,'Unknown ancestry cannot be treated as a new family');
 }
 assert(entries.filter(e=>lineages.inspect(e.receipt.baseInputFile).roots.includes(replace.familyRoot)).length===1,'Only a sole representative can be promoted');
 const withoutParent=entries.filter(e=>e!==parent),selected=withoutParent.map(e=>e.receipt);
 const mechanisms=runtime.mechanismsUsedByDailyLevel(base.level),unlocks=new Map(runtime.MECHANISM_GUIDE.map(m=>[m.id,m.unlockLevel]));
 const earliest=Math.max(...mechanisms.map(m=>unlocks.get(m)));
 const candidates=slots.filter(s=>s.difficulty===3&&s.unlockLevel>=earliest&&!selected.some(r=>r.formalId===s.formalId))
  .sort((a,b)=>selected.filter(r=>r.stageKey===a.stageKey&&r.difficulty===3).length-selected.filter(r=>r.stageKey===b.stageKey&&r.difficulty===3).length||b.unlockLevel-a.unlockLevel);
 let adopted=null;
 for(const slot of candidates){
  const prior=old.find(e=>e.formalId===slot.formalId),priorLevel=prior?(await read(prior.path)).level:null;
  const report=await qualifyV3Slot(runtime,base,slot,{selected,intensityOptions:{priorLevel,maxAttempts:12},proofOptions:{ledgerDirectory:`${root}/proof/attempts`,
   lowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},
   routeBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000}}});
  report.baseInputFile=item.path;report.baseInputFileSha256=item.fileSha256;
  const file=`${output}/attempt-${String(attempts.length).padStart(4,'0')}.json`;
  if(report.accepted)report.familyPromotion={familyRoot:replace.familyRoot,retired:replace,proposal:{path:item.path,sha256:item.fileSha256},sourceIndex:{path:inputIndex,sha256:sha(inputBytes)},exactlyOneLiveRepresentative:true};
  await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  attempts.push({file,parent:parent.receipt.formalId,proposal:item.path,formalId:slot.formalId,accepted:report.accepted,status:report.status});
  if(report.accepted){adopted={file,receipt:report};break;}
  if(report.attempt||report.status==='INVALID_ATTEMPT')break;
 }
 // Commit only the complete accepted replacement. Any failed attempt keeps
 // every byte and slot of the original representative in the new index.
 if(adopted){entries=[...withoutParent,adopted];promotions.push(adopted.receipt.familyPromotion);retiredFamilies.set(replace.familyRoot,adopted.receipt.familyPromotion);}
 console.log(JSON.stringify({proposal:item.path,promoted:!!adopted,total:entries.length}));
}
for(const p of promotions){
 const family=entries.filter(e=>lineages.inspect(e.receipt.baseInputFile).roots.includes(p.familyRoot));
 assert.equal(family.length,1);assert(family[0].receipt.familyPromotion,'The sole live object must be the qualified promoted child');
}
const audit=await auditV3Catalog(runtime,entries.map(e=>e.receipt),{expectFull:false});assert.equal(audit.verified,entries.length);
await fs.writeFile(`${output}/index.json`,JSON.stringify({schemaVersion:3,formalReady:false,productionChanged:false,priorIndex:inputIndex,inputSha256:sha(inputBytes),poolFile,familyPromotions:promotions,files:entries.map(e=>e.file)},null,2)+'\n',{flag:'wx'});
await fs.writeFile(`${output}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
await fs.writeFile(`${output}/attempts.json`,JSON.stringify({attempts,promotions:promotions.length,total:entries.length,formalReady:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,total:entries.length,promotions:promotions.length,verified:audit.verified,formalReady:false}));
