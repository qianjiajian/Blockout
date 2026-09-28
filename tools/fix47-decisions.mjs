import fs from 'node:fs';
const src='deliverables/remake41-47-v151-20260925/search-v151/candidate47-search-44-decisions.json';
const out='deliverables/remake41-47-v151-20260925/search-v151/candidate47-search-44-decisions-fixed.json';
const d=JSON.parse(fs.readFileSync(src));
for(const c of d.decisionCases){
  const prefix=d.drags.slice(0,c.atStep-1);
  delete c.beforeDrag;
  c.blockedNextAction=d.drags[c.atStep];
  c.fullRecoveredRoute=[...prefix,c.legalWrongParking,c.recoveryDrag,...d.drags.slice(c.atStep-1)];
}
d.decisionEvidenceCorrection={source:src,reason:'Align blockedNextAction and recovered route to the immutable base route index required by verifyDecisions.'};
fs.writeFileSync(out,JSON.stringify(d,null,2)+'\n');
console.log(JSON.stringify({out,cases:d.decisionCases.length}));
