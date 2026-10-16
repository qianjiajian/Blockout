import fs from'node:fs';import{loadSpatialApi}from'./fifo-witness214.mjs';import{staticFloor}from'./native-static219.mjs';
const OUT='deliverables/continue211-220-20260930/design-new',api=await loadSpatialApi(),report=[];
for(let n=32;n<44;n++){
 const original=JSON.parse(fs.readFileSync(`${OUT}/candidate214-hidden50b-${n}.json`)).level,level=structuredClone(original);delete level.generators;delete level.shutters;level.blocks=level.blocks.filter(b=>b.shutterId).map(b=>{delete b.shutterId;return b});level.mechanismRules='revised-2026-09-23-v1.4';
 const lower=staticFloor(level,api,{floor:7,maxMilliseconds:1000,maxStates:150000});report.push({n,level,lower});console.log(n,lower.status,lower.relaxedNonClearingDrags,lower.frontierCost,lower.exploredStates);
}
fs.writeFileSync(`${OUT}/hidden-cut214-diagnostic.json`,JSON.stringify({status:'DIAGNOSTIC_NOT_CURRENT_LEVEL_CERTIFICATE',report},null,2));
