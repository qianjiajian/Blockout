import fs from 'node:fs';
import path from 'node:path';
import {loadRuntime,levelSha256,routeSha256} from './contract.mjs';
import {independentPartitionSha256} from './geometry.mjs';

const output=process.argv[2];if(!output||fs.existsSync(output))throw new Error('New output path required');
const runtime=await loadRuntime();
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):entry.name.endsWith('.json')?[path.join(dir,entry.name)]:[]);
const dirs=['deliverables/daily-formal-v2-20261007/design-lab','deliverables/daily-formal-v2-20261007/design-d3-proof'];
const byPartition=new Map(),rejected=[],duplicates=[];
for(const file of dirs.flatMap(walk)) {
  let packet;try{packet=JSON.parse(fs.readFileSync(file,'utf8'));}catch{continue;}
  if(!packet.accepted||packet.difficulty!==3||!packet.level)continue;
  const actual=levelSha256(packet.level),route=routeSha256(packet.drags),lower=packet.lowerBound;
  const errors=[];
  if(packet.levelSha256!==actual||packet.routeSha256!==route)errors.push('object-route-hash');
  const source=runtime.LEVELS.find(x=>x.id===packet.sourceLevelId);
  if(!source||levelSha256(source)!==packet.sourceLevelSha256)errors.push('source-hash');
  if(packet.L!==31||!Number.isSafeInteger(packet.U)||packet.U<31)errors.push('band');
  if(!packet.staticAudit?.passed||packet.staticAudit.levelSha256!==actual)errors.push('static-binding');
  if(lower?.inputLevelSha256!==actual||lower?.requiredFloor!==31||lower?.result?.status!=='threshold-proven'||lower?.result?.floor!==31||lower?.result?.thresholdProven!==true||lower?.result?.termination!=='below-threshold-exhausted')errors.push('lower-binding');
  if(packet.route?.inputLevelSha256!==actual||packet.route?.routeSha256!==route)errors.push('replay-binding');
  for(const kind of ['canonicalReplay','independentReplay'])if(!packet.route?.[kind]?.valid||!packet.route?.[kind]?.complete||packet.route?.[kind]?.nonClearingDrags!==packet.U)errors.push(`${kind}-incomplete`);
  if(errors.length){rejected.push({file,errors});continue;}
  const partition=independentPartitionSha256(packet.level),row={file:file.replaceAll('\\','/'),formalId:packet.formalId,
    stageKey:packet.stageKey,sourceLevelId:packet.sourceLevelId,L:packet.L,U:packet.U,totalDrags:packet.drags.length,
    levelSha256:actual,routeSha256:route,partitionSha256:partition,toolchainSha256:packet.toolchainSha256,
    receiptStatus:packet.toolchainSha256===runtime.toolchainSha256?'CURRENT_TOOLCHAIN_SPATIAL_RECEIPT':'AWAITING_FRESH_TOOLCHAIN_REVALIDATION'};
  const old=byPartition.get(partition);
  if(old){duplicates.push({partition,first:old.file,other:row.file});if(row.receiptStatus===old.receiptStatus?row.U<old.U:row.receiptStatus==='CURRENT_TOOLCHAIN_SPATIAL_RECEIPT')byPartition.set(partition,row);}
  else byPartition.set(partition,row);
}
const records=[...byPartition.values()].sort((a,b)=>a.sourceLevelId-b.sourceLevelId||a.U-b.U||a.file.localeCompare(b.file));
const report={schemaVersion:1,producedAt:new Date().toISOString(),productionChanged:false,formalReady:false,
  notice:'Integrity/index only. Final slot assignment, actual newest mechanism, fresh final-object proof and natural Pointer/time validation remain separate.',
  uniqueD3Layouts:records.length,currentToolchainReceipts:records.filter(x=>x.receiptStatus==='CURRENT_TOOLCHAIN_SPATIAL_RECEIPT').length,
  currentToolchainSha256:runtime.toolchainSha256,byEarliestStage:Object.fromEntries([...new Set(records.map(x=>x.stageKey))].map(stage=>[stage,records.filter(x=>x.stageKey===stage).length])),records,duplicates,rejected};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,uniqueD3Layouts:report.uniqueD3Layouts,currentToolchainReceipts:report.currentToolchainReceipts,byEarliestStage:report.byEarliestStage,rejected:rejected.length,duplicates:duplicates.length}));
