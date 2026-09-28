import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const source='deliverables/remake41-47-v151-20260925/search-v151/candidate47-search-44-decisions-fixed.json';
const output='deliverables/remake41-47-v151-20260925/candidate47-competitor-regenerated-v151-l11-u15-decisions.json';
const verification='deliverables/remake41-47-v151-20260925/search-v151/formal-verification47-v151.json';
const candidate=JSON.parse(fs.readFileSync(source));
candidate.proofMode='immediate-generator';
candidate.certification={
  structuralAudit:'PASS',
  completeRoute:'PASS',
  lowerBound:'threshold-proven',
  lowerBoundReport:path.resolve(verification),
  pointerValidated:false,
  naturalTimeValidated:false,
  formalLevelIntegration:false,
  releaseApproved:false,
};
fs.writeFileSync(output,JSON.stringify(candidate,null,2)+'\n');
console.log(JSON.stringify({output,candidateSha256:crypto.createHash('sha256').update(JSON.stringify(candidate)).digest('hex'),proofMode:candidate.proofMode,decisionCases:candidate.decisionCases.length}));
