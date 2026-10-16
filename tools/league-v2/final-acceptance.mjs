import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadLeagueProofRuntime,levelSha256,RULE_VERSION} from './proof-contract.mjs';
import {leagueCatalogProgress} from './catalog-progress.mjs';
import {auditLeaguePointerAcceptance} from './pointer-acceptance.mjs';
import {auditLeagueVisual} from './visual-audit.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
/** Read-only final acceptance. Candidate screenshots and model proofs cannot
 * substitute for the 200 current formal-registry Pointer executions. */
export async function finalLeagueAcceptance({selectionFile,mappingFile,visualFile,admissionFile}){
 const hashes={},errors=[];
 const read=async file=>{const b=await fs.readFile(file);hashes[file]=sha(b);return JSON.parse(b);};
 const selected=await read(selectionFile),visual=await read(visualFile),admission=await read(admissionFile);
 const baseline=await read('deliverables/league-v2-20261008/baseline/manifest.json');
 const runtime=await loadLeagueProofRuntime(),model=await leagueCatalogProgress(runtime,selected.selections);
 const visualAudit=await auditLeagueVisual({visualFile,selections:selected.selections});
 if(!visualAudit.passed)errors.push(...visualAudit.errors.map(e=>'visual:'+e));
 if(model.counts.MODEL_VERIFIED_AWAITING_POINTER_VISUAL!==100)errors.push('not-all-100-current-model-mechanism-score-proofs');
 if(model.diversity.status!=='DESIGN_NUMERIC_GATES_PASS')errors.push('layout-diversity-not-complete');
 if(visual.status!=='CANDIDATE_ATLAS_MANUALLY_INSPECTED_NOT_FORMAL'||visual.captures!==100||visual.evidence?.length!==100||new Set(visual.evidence?.map(r=>r.index)).size!==100)errors.push('full-100-manual-visual-review-required');
 const captureFile=path.join(path.dirname(visualFile),'report.json'),capture=await read(captureFile);
 if(capture.rows?.length!==100||capture.errors?.length||capture.status!=='CANDIDATE_OPENINGS_CAPTURED_NOT_FORMAL'||!capture.realGameplayRenderer)errors.push('full-real-game-captures-required');
 for(const row of model.rows){
  const v=visual.evidence?.find(r=>r.index===row.index),c=capture.rows?.find(r=>r.index===row.index);
  if(!v||!c||v.levelSha256!==row.levelSha256||c.levelSha256!==row.levelSha256||c.image!==v.image||c.imageSha256!==v.imageSha256||c.status!=='CANDIDATE_OPENING_CAPTURED'||c.storageViolations?.length||!c.drawAudit?.calls||c.drawAudit.rotated||c.drawAudit.canvasRotationCalls){errors.push('visual-object-binding:'+row.index);continue;}
  const file=path.join(path.dirname(visualFile),v.image);hashes[file]=sha(await fs.readFile(file));
  if(hashes[file]!==v.imageSha256)errors.push('visual-image-changed:'+row.index);
 }
 for(const mechanism of runtime.MECHANISM_GUIDE.filter(m=>m.unlockLevel<=100)){
  const s=selected.selections.find(r=>r.index===mechanism.unlockLevel);
  if(!s){errors.push('missing-unlock-slot:'+mechanism.id);continue;}
  const proof=await read(s.proofFile);
  if(!proof.staticAudit?.mechanisms?.includes(mechanism.id))errors.push('mechanism-missing-at-unlock:'+mechanism.id);
 }
 for(const file of ['src/core/levels.ts','src/core/leagueLevels.ts','src/core/mechanismCatalog.ts']){
  hashes[file]=sha(await fs.readFile(file));if(hashes[file]!==baseline.inputSha256[file])errors.push('protected-source-changed:'+file);
 }
 hashes['src/core/leagueLevelData.ts']=sha(await fs.readFile('src/core/leagueLevelData.ts'));
 if(admission.status!=='REGISTRY_INSTALLED_AWAITING_FORMAL_POINTER'||admission.count!==100||admission.modelVerified!==100||admission.visualReviewed!==100||admission.selectionSha256!==hashes[selectionFile]||admission.visualSha256!==hashes[visualFile]||admission.previousProductionSha256!==baseline.inputSha256['src/core/leagueLevelData.ts']||admission.newProductionSha256!==hashes['src/core/leagueLevelData.ts'])errors.push('registry-admission-not-bound');
 const pointer=await auditLeaguePointerAcceptance({selectionFile,mappingFile,identity:'formal'});
 if(!pointer.formalPointerAccepted||pointer.passedLevels!==100||pointer.passedScreens!==200)errors.push('full-formal-pointer-natural-clock-settlement-required');
 for(const[file,hash]of Object.entries(hashes))if(sha(await fs.readFile(file))!==hash)errors.push('input-changed-during-final-audit:'+file);
 const formalReady=errors.length===0;
 return {schemaVersion:1,ruleVersion:RULE_VERSION,createdAt:new Date().toISOString(),status:formalReady?'FORMAL_100_ACCEPTED_NOT_PUBLISHED':'INCOMPLETE_OR_REJECTED',formalReady,
  count:100,modelVerified:model.counts.MODEL_VERIFIED_AWAITING_POINTER_VISUAL??0,formalPointerLevels:pointer.passedLevels,formalPointerScreens:pointer.passedScreens,
  playerSaveTouched:false,published:false,errors,model,pointer,visualAudit,visualFile,admissionFile,inputSha256:hashes,evidenceRevision:levelSha256(hashes)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const[selectionFile,mappingFile,visualFile,admissionFile,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: node final-acceptance.mjs selection.json pointer-map.json visual-review.json admission.json new-output.json');
 const r=await finalLeagueAcceptance({selectionFile,mappingFile,visualFile,admissionFile});
 const base=path.resolve('deliverables/league-v2-20261008'),target=path.resolve(output),relative=path.relative(base,target);
 if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Output must stay in league-v2 deliverables');
 await fs.writeFile(target,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:r.status,formalReady:r.formalReady,models:r.modelVerified,pointerLevels:r.formalPointerLevels,pointerScreens:r.formalPointerScreens,errors:r.errors,output}));
 if(!r.formalReady)process.exitCode=1;
}
