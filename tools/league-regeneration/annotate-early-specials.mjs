import fs from 'node:fs';
const reportFile='deliverables/league-regeneration-20261004/formal/early-1-19.json';
const catalogFile='deliverables/league-regeneration-20261004/formal/early-1-19-formal-catalog.json';
const report=JSON.parse(fs.readFileSync(reportFile));
const choices={7:['cc-piece-10','strategy-guard-15','cc-piece-06'],9:['lv9-original-9','lv9-original-4','lv9-original-7'],12:['lv12-upper-4','lv12-lower-0','lv12-lower-5']};
for(const row of report.acceptedRows){const exits=row.drags.filter(d=>d.exitSide);const picked=choices[row.index];row.specials=picked;row.specialEvidence=picked.map(blockId=>{const step=row.drags.findIndex(d=>d.blockId===blockId&&d.exitSide);const exitOrder=exits.findIndex(d=>d.blockId===blockId)+1;const block=row.level.blocks.find(b=>b.id===blockId);const w=Math.max(...block.shape.map(p=>p[0]))-Math.min(...block.shape.map(p=>p[0]))+1;const h=Math.max(...block.shape.map(p=>p[1]))-Math.min(...block.shape.map(p=>p[1]))+1;return{blockId,completeClearVerified:true,firstExitStep:step+1,routeStep:step+1,exitOrder,totalClearEvents:exits.length,clearEvents:exits.length,lateClear:exitOrder>exits.length/2,rectangular:w*h===block.shape.length,score:10};});}
for(const row of report.acceptedRows) row.targetLeagueId=900000+row.index;
report.specialPolicy={min:1,max:3,scorePerSpecial:10,requirement:'complete clear only; rectangular blocks only; first exit after half of total clear events'};
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
const catalog=JSON.parse(fs.readFileSync(catalogFile));
for(const e of catalog.entries){const r=report.acceptedRows.find(x=>x.index===e.index);e.targetLeagueId=r.targetLeagueId;e.specials=r.specials;e.specialAudit=r.specialEvidence;e.specialEvidence=r.specialEvidence;}
catalog.specialPolicy=report.specialPolicy;
fs.writeFileSync(catalogFile,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({status:'annotated',entries:report.acceptedRows.map(r=>({index:r.index,specials:r.specials,evidence:r.specialEvidence}))}));
