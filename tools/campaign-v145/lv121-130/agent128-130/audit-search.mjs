import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import {loadApi as loadBase} from '../../../native-block-repair-v143.mjs';
import {loadSpatialApi,searchSpatial} from '../../../remake111to120-spatial-floor-v147.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../../revised-generator-queue-colors.mjs';
const root=process.cwd(), dir=path.resolve(root,'deliverables/campaign121-130-v146-20260924/agent128-130');
const base=await loadBase(); const spatial=await loadSpatialApi(); const api={...base.api,...spatial};
const rows=[];
for(const id of [128,129,130]){
 const file=path.join(dir,`candidate${id}-v166-draft.json`), data=JSON.parse(fs.readFileSync(file)); const l=data.level; const r={id,file,static:{}};
 try { api.validateLevel(l); r.static.validateLevel=true; } catch(e){r.static.validateLevel=false;r.static.validateError=e.message;}
 for(const [name,fn] of [['opening',()=>auditOpeningCoverage(new api.PuzzleModel(l).snapshot())],['hidden',()=>auditHiddenCoverage(l)],['gates',()=>auditGateSpanLimits(l)],['queue',()=>auditGeneratorQueueColors(l)],['art',()=>api.auditCandidateBlockArt(l)]]){try{const x=fn();r.static[name]={passed:x.passed??false,report:x};}catch(e){r.static[name]={passed:false,error:e.message};}}
 try {r.static.hard=api.auditRevisedCandidate(l,undefined);} catch(e){r.static.hard={passed:false,error:e.message};}
 try {const s=searchSpatial(l,api,{floor:id===127?5:id===128?11:id===129?11:16,maxStates:25000,maxMilliseconds:12000,normalize:true,diagnosticTrace:true,orderSeed:16601+id}); r.search={status:s.status,cost:s.cost??null,exploredStates:s.exploredStates??null,maxClearsSeen:s.maxClearsSeen??null,drags:s.drags??null}; if(s.drags){try{const rep=api.replayRevisedRoute(l,s.drags);r.search.replay={valid:rep.valid,complete:rep.complete,nonClearingDrags:rep.nonClearingDrags}; fs.writeFileSync(path.join(dir,`route${id}-v166-search-witness.json`),JSON.stringify({activeRuleVersion:'1.66.0',id,levelSha256:crypto.createHash('sha256').update(JSON.stringify(l)).digest('hex'),drags:s.drags,replay:rep,targetRange:id===128?[11,15]:id===129?[11,15]:[16,20],status:rep.nonClearingDrags>= (id===128||id===129?11:16)?'in-band':'below-target'},null,2)+'\n');}catch(e){r.search.replayError=e.message;}}}catch(e){r.search={status:'error',error:e.message};}
 rows.push(r);
}
const out=path.join(dir,'static-search-v166.json'); fs.writeFileSync(out,JSON.stringify({activeRuleVersion:'1.66.0',generatedAt:new Date().toISOString(),rows},null,2)+'\n'); console.log(JSON.stringify({out,summary:rows.map(r=>({id:r.id,valid:r.static.validateLevel,search:r.search?.status,cost:r.search?.cost,hard:r.static.hard?.passed??null}))},null,2));
