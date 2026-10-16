import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadRuntime, verifyCandidate, levelSha256 } from './contract.mjs';
import { expectedDailySlots, catalogProgress } from './catalog-progress.mjs';
import { verifyRulesLock } from '../../verify-rules-lock.mjs';

const [indexFile,output]=process.argv.slice(2);
const finalizeMetadata=process.argv.includes('--finalize-metadata');
if(!indexFile||!output)throw Error('Usage: node qualify-index.mjs selected-index.json new-output-directory');
const lock=verifyRulesLock();if(!lock.ok)throw Error('Rules lock rejected');
const index=JSON.parse(await fs.readFile(indexFile,'utf8'));
const entries=index.selected??index.entries;
if(!Array.isArray(entries)||!entries.length)throw Error('Explicit selected/entries candidate index required');
const runtime=await loadRuntime(),expected=new Map(expectedDailySlots(runtime.MECHANISM_GUIDE).map(row=>[row.formalId,row]));
const ids=new Set();
for(const entry of entries){
  const id=entry.intendedFormalId??entry.formalId;
  if(!expected.has(id)||ids.has(id))throw Error(`Unknown/duplicate formal slot: ${id}`);
  ids.add(id);
}
await fs.mkdir(output,{recursive:false});
const rows=[],files=[];
for(const entry of entries){
  const bytes=await fs.readFile(entry.path),prior=JSON.parse(bytes),formalId=entry.intendedFormalId??entry.formalId;
  const slot=expected.get(formalId);
  const level=structuredClone(prior.level);
  if(finalizeMetadata){
    level.name=`每日挑战 ${slot.newestMechanism} ${slot.difficulty}-${slot.slot}`;
    level.difficulty=slot.difficulty===1?'hard':'super';
  }
  const result=await verifyCandidate(runtime,{...prior,level,levelSha256:levelSha256(level),formalId,stageKey:slot.stageKey,difficulty:slot.difficulty},
    {lowerBudget:{maxStates:250000,maxDragStates:2000,maxTransitions:3000000,maxMilliseconds:10000}});
  result.provenance={...prior.provenance,previousEvidenceFile:entry.path,previousEvidenceSha256:createHash('sha256').update(bytes).digest('hex'),
    ruleVersion:lock.activeVersion,freshQualification:true,finalizeMetadata,
    ...(finalizeMetadata?{metadataChanges:{previousName:prior.level.name,previousDifficulty:prior.level.difficulty,name:level.name,difficulty:level.difficulty}}:{})};
  const file=path.join(output,`${formalId}.json`).replaceAll('\\','/');
  await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});files.push(file);
  const row={formalId,path:file,accepted:result.accepted,status:result.status,L:result.L,U:result.U,reasons:result.reasons};rows.push(row);
  await fs.writeFile(path.join(output,'index.json'),JSON.stringify({scope:450,productionChanged:false,formalReady:false,files,entries:rows},null,2)+'\n');
  console.log(JSON.stringify(row));
}
const progress=await catalogProgress(runtime,files);
await fs.writeFile(path.join(output,'catalog-readiness.json'),JSON.stringify(progress,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({scope:450,counts:progress.counts,duplicates:progress.geometryDuplicates.length,formalReady:false}));
