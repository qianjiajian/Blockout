import fs from 'node:fs';
const out='deliverables/league-regeneration-20261006/early-repair'; fs.mkdirSync(out,{recursive:true});
const hard=JSON.parse(fs.readFileSync(`${out}/hard-proof-candidates.json`,'utf8'));
const oldEarly=JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261005/round4/early/formal-early-fixes.json','utf8'));
const accepted8=JSON.parse(fs.readFileSync('deliverables/league-regeneration-20261005/round3/early-fixes/accepted-8-13-18.json','utf8')).rows.find(r=>r.index===8);
const baseline=new Map(oldEarly.rows.map(r=>[r.index,r.q0]));
const rows=[];
for(const r of hard.rows){
  const row={...r, difficulty:'hard', formalEligibility:false, status:'BLOCKED', source:'source198 stripped finite repair; proof retry exhausted', sourceLevelId:198, source158BaselineQ0:baseline.get(r.index)??null, finiteBudget:{maxVariants:24, route:{maxStates:800000,maxTransitions:5000000,maxMilliseconds:8000}, lowerProof:{maxStates:2500000,maxTransitions:12000000,maxMilliseconds:20000}, noInfiniteRetry:true}};
  rows.push(row); fs.writeFileSync(`${out}/formal-${r.index}.json`,JSON.stringify(row,null,2)+'\n');
}
for(const index of [13,18]){
  const level=structuredClone(accepted8.level); const drags=structuredClone(accepted8.drags);
  const row={index,difficulty:'super',target:{lower:21,upper:30},sourceLevelId:198,status:'BLOCKED_DUPLICATE_GEOMETRY',formalEligibility:false,source:'source198 stripped exact payload retained for audit only',candidateFrom:'deliverables/league-regeneration-20261005/round3/early-fixes/accepted-8-13-18.json#index8',level,drags,levelSha256:accepted8.levelSha256,routeSha256:accepted8.routeSha256,route:accepted8.route,replay:accepted8.replay,lowerBound:accepted8.lowerBound,q0:accepted8.q0,scoreBlocks:accepted8.scoreBlocks,reasons:['duplicate-normalized-geometry-with-index8','not-eligible-for-unique-100-slot-merge'],finiteBudget:{maxVariants:24,noInfiniteRetry:true}};
  rows.push(row); fs.writeFileSync(`${out}/formal-${index}.json`,JSON.stringify(row,null,2)+'\n');
}
rows.sort((a,b)=>a.index-b.index);
const report={status:'FORMAL_DATA_BLOCKED',generatedAt:new Date().toISOString(),activeRuleVersion:'1.150.0',source:'finite early mechanism repair; isolated evidence only; no production writes',indexes:[1,2,4,5,13,18],accepted:[],blocked:rows.map(r=>r.index),counts:{total:rows.length,accepted:0,blocked:rows.length,fullPayloadRows:rows.filter(r=>r.level&&r.drags).length},rows,productionChanged:false};
fs.writeFileSync(`${out}/formal-early-repair.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,accepted:report.accepted,blocked:report.blocked,fullPayloadRows:report.counts.fullPayloadRows,output:`${out}/formal-early-repair.json`}));
