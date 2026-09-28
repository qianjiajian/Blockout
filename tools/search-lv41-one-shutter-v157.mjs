import fs from 'node:fs';
import { search as queueSearch } from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import { loadApi } from './native-block-repair-v143.mjs';
import { digest } from './revised-preview-validation-v160.mjs';

const input='deliverables/remake41-v157-20260925/candidate41-normal-v157.json';
const outDir='deliverables/remake41-v157-20260925';
const original=JSON.parse(fs.readFileSync(input));
const {api}=await loadApi();
for (const removed of ['41-cover8','41-cover14']) {
  const level=structuredClone(original.level);
  level.shutters=level.shutters.filter(s=>s.id!==removed);
  for (const b of level.blocks) if (b.shutterId===removed) delete b.shutterId;
  level.difficulty='normal';
  try { api.validateLevel(level); } catch(e) { console.log(JSON.stringify({removed,validate:e.message})); continue; }
  let found=null,replay=null;
  for (let seed=41;seed<61 && !(replay?.complete);seed++) {
    const candidate=queueSearch(level,{floor:16,maxStates:3000000,maxMilliseconds:45000,maxTransitions:6000000,weight:1000,orderSeed:seed});
    const rr=candidate.status==='witness'?api.replayRevisedRoute(level,candidate.drags):null;
    if (rr?.complete && rr.nonClearingDrags>=11 && rr.nonClearingDrags<=15) { found=candidate; replay=rr; break; }
    if (!found || (rr?.nonClearingDrags??999)<(replay?.nonClearingDrags??999)) { found=candidate; replay=rr; }
  }
  const report={removed,level,found,replay,levelSha256:digest(level),source:input,activeRuleVersion:'1.57.0',formalAdopted:false};
  const file=`${outDir}/candidate41-one-shutter-${removed.replace('41-','')}-v157.json`;
  fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({removed,file,status:found.status,U:replay?.nonClearingDrags,complete:replay?.complete,states:found.states,levelSha256:report.levelSha256}));
}
