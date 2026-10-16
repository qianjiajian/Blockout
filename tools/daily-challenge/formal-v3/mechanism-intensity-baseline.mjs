import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { mechanismInventory, intensityTargets, STAGES, INTENSITY_VERSION } from './mechanism-intensity.mjs';
const source='deliverables/daily-formal-v2-20261007/final-qualified';
const rows=fs.readdirSync(source).filter(n=>/^daily-.*\.json$/.test(n)).map(file=>{
  const path=source+'/'+file,bytes=fs.readFileSync(path),r=JSON.parse(bytes);
  return {formalId:r.formalId,stageKey:r.stageKey,difficulty:r.difficulty,sourceLevelId:r.sourceLevelId,
    levelSha256:r.levelSha256,sourceReport:path,sourceReportSha256:createHash('sha256').update(bytes).digest('hex'),inventory:mechanismInventory(r.level)};
});
const summary=[];
for(const [mechanism,unlockLevel]of Object.entries(STAGES))for(const difficulty of [1,2,3]){
  const group=rows.filter(r=>r.stageKey===`mechanisms-${mechanism}-${unlockLevel}`&&r.difficulty===difficulty);
  const inventories=group.map(r=>r.inventory[mechanism]??[]);
  summary.push({mechanism,difficulty,rows:group.length,instanceCounts:[...new Set(inventories.map(x=>x.length))],
    numericValues:[...new Set(inventories.flatMap(x=>x.map(v=>v.value).filter(Number.isFinite)))].sort((a,b)=>a-b),
    queueLengths:[...new Set(inventories.flatMap(x=>x.map(v=>v.queue).filter(Number.isFinite)))],
    seconds:[...new Set(inventories.flatMap(x=>x.map(v=>v.seconds).filter(Number.isFinite)))],
    proposal:['color-exit','irregular-block','irregular-board'].includes(mechanism)?{geometryOwnedBy:'global layout factory',noInventedCounter:true}:intensityTargets(mechanism,difficulty)});
}
if(rows.length!==450)throw Error('Expected exactly 450 old complete objects');
const out='deliverables/daily-formal-v3-20261008/mechanisms/old450-baseline.json';fs.mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});
fs.writeFileSync(out,JSON.stringify({schemaVersion:1,createdAt:new Date().toISOString(),ruleVersion:'1.154.0',moduleVersion:INTENSITY_VERSION,scope:450,status:'BASELINE_AND_DESIGN_TARGETS_ONLY',
  notes:['Instance and numeric targets are implementation proposals, not user-confirmed fixed quotas.','No numerical target is invented for star, axis, grid, flip, shell, lift, or foundation geometry. Lift count is not a gameplay strength parameter.','Longer bomb fuse is relaxation, never evidence of increased difficulty.','Original source reports are read-only. New objects require a fresh bounded proof, diversity gate and Pointer/natural-time validation.'],summary,rows},null,2)+'\n');
console.log(JSON.stringify({file:out,objects:rows.length,groups:summary.length}));
