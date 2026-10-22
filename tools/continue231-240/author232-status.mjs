import fs from 'node:fs';
import {createHash} from 'node:crypto';
const base='deliverables/continue231-240-20261019/author232';
const runs=[];
for(const name of fs.readdirSync(base).filter(n=>n.startsWith('run-'))){
 const file=base+'/'+name+'/report.json';if(!fs.existsSync(file))continue;
 const d=JSON.parse(fs.readFileSync(file)),rows=d.rows??[];
 runs.push({file,attempted:rows.length,accepted:!!d.accepted,pending:!!d.pending,statuses:Object.fromEntries([...new Set(rows.map(r=>r.status))].map(s=>[s,rows.filter(r=>r.status===s).length])),completeRoutes:rows.filter(r=>r.U!==undefined).map(r=>({seed:r.seed,U:r.U,total:r.totalDrags,status:r.status,L:r.lower?.provenLowerBound??null,sha256:r.levelSha256})),validLower:rows.filter(r=>r.lower?.thresholdProven).map(r=>({seed:r.seed,L:r.lower.provenLowerBound,U:r.U??null,status:r.status,sha256:r.levelSha256})),maxClearsSeen:Math.max(0,...rows.map(r=>r.route?.maxClearsSeen??0))});
}
const facts=base+'/source-second-view.json',packet={status:'LEVEL_232_NOT_QUALIFIED',ruleVersion:'1.198.0',band:[11,15],sourceFacts:facts,sourceFactsSha256:createHash('sha256').update(fs.readFileSync(facts)).digest('hex'),inventory:{openingBodies:26,openingCells:54,hiddenBatches:4,hiddenBodiesEach:4,hiddenCellsEach:12,totalBodies:42,playableCells:78},runs,productionTouched:false,searchRunning:false,nextStep:'New geometry family only: consider retaining two distinct central 4x3 curtain11/lift pairs to keep left/right corridors, with genuinely new source-adapted arrangement, or parent SQ3 family. Do not rerun failed objects, increase their budgets, lower difficulty, or claim a partial route as full.'};
const file=base+'/status-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(packet,null,2),{flag:'wx'});console.log(JSON.stringify({file,runs:runs.length,attempted:runs.reduce((s,r)=>s+r.attempted,0),last:runs.filter(r=>r.file.includes('run-7801-')||r.file.includes('run-8101-')||r.file.includes('run-8401-')||r.file.includes('run-8701-'))},null,2));
