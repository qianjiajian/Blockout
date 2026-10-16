import fs from 'node:fs';
const input='deliverables/league-regeneration-20261004/formal/early-1-19.json';
const source=JSON.parse(fs.readFileSync(input));
const levels=source.acceptedRows.map(row=>({index:row.index,level:row.level,specials:row.specials,specialScore:10,levelSha256:row.levelSha256,route:row.drags,replay:{valid:row.replay.valid,complete:row.replay.complete,nonClearingDrags:row.replay.nonClearingDrags,effectiveDrags:row.replay.effectiveDrags},lowerProof:row.proof}));
const output={status:source.status,range:[1,19],accepted:levels.length,entries:levels,finiteBudget:source.finiteBudget,unresolved:source.unresolved,sourceReport:input};
fs.writeFileSync('deliverables/league-regeneration-20261004/formal/early-1-19-formal-catalog.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({accepted:levels.map(x=>x.index),output:'deliverables/league-regeneration-20261004/formal/early-1-19-formal-catalog.json'}));
