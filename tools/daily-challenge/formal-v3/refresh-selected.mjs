import fs from 'node:fs/promises';
import path from 'node:path';
import {loadV3CatalogRuntime,auditV3Catalog} from './catalog-contract.mjs';
import {verifyBoundedCandidate} from './bounded-proof.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {INTENSITY_VERSION,intensityTargets,auditMechanismParticipation,mechanismInventory} from './mechanism-intensity.mjs';

const [input,label]=process.argv.slice(2);
if(!input||!label||!/^[a-z0-9-]+$/.test(label))throw Error('Usage: refresh-selected.mjs <selection-index> <new-label>');
const output=`deliverables/daily-formal-v3-20261008/selection/${label}`;
await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(output,{recursive:false});
const index=JSON.parse(await fs.readFile(input,'utf8')),runtime=await loadV3CatalogRuntime(),reports=[],files=[],failures=[];
for(const previousReceipt of index.files){
 const previous=JSON.parse(await fs.readFile(previousReceipt,'utf8'));
 if(!previous.accepted||previous.catalogVersion===undefined)throw Error('Only a previously successful v3 receipt may be freshly revalidated');
 let strength;
 if(previous.strength.kind==='foundation-geometry'){
  const irregularBodies=previous.level.blocks.filter(b=>b.shape.length!==(Math.max(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))+1)).length;
  strength={...previous.strength,version:INTENSITY_VERSION,irregularBodies,
   passed:runtime.mechanismsUsedByDailyLevel(previous.level).includes(previous.newestMechanism)
    &&(previous.newestMechanism!=='irregular-block'||irregularBodies>=2)};
 }else{
  const targets=intensityTargets(previous.newestMechanism,previous.difficulty);
  const replay=replayDecorated(runtime,previous.level,previous.drags,previous.timeSchedule);
  const participation=auditMechanismParticipation(previous.level,previous.drags,replay,previous.newestMechanism,targets);
  const prior=runtime.priorDailySlots.get(previous.formalId);
  if(!prior)throw Error(`Missing prior slot ${previous.formalId}`);
  const currentInstances=mechanismInventory(previous.level)[previous.newestMechanism];
  strength={...previous.strength,version:INTENSITY_VERSION,targets,participation,passed:participation.pass,
   priorComparison:{...previous.strength.priorComparison,priorLevelSha256:prior.levelSha256,
    priorInstances:prior.inventory[previous.newestMechanism],currentInstances,
    instanceIncrease:currentInstances.length-prior.inventory[previous.newestMechanism].length}};
 }
 if(!strength.passed){
  const failure={formalId:previous.formalId,previousReceipt,status:'REJECTED_CURRENT_MECHANISM_STRENGTH',strength,searchPerformed:false};
  failures.push(failure);await fs.writeFile(`${output}/${previous.formalId}-strength-failed.json`,JSON.stringify(failure,null,2)+'\n',{flag:'wx'});continue;
 }
 const proof=await verifyBoundedCandidate(runtime,previous,{allowRevalidation:true,
  ledgerDirectory:'deliverables/daily-formal-v3-20261008/proof/attempts',
  lowerBudget:previous.lowerBound.result.budget,routeBudget:previous.route.search?.budget??previous.lowerBound.result.budget});
 const report={...previous,...proof,previousReceipt,strength,design:{...previous.design,
  designBindings:runtime.designBindings,designToolchainSha256:runtime.designToolchainSha256},
  formalReady:false,pointerValidated:false,timeValidated:false,productionChanged:false};
 const file=`${output}/${report.formalId}.json`;
 await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 if(report.accepted){reports.push(report);files.push(file);}else failures.push({formalId:report.formalId,previousReceipt,file,status:report.status});
 process.stdout.write(JSON.stringify({formalId:report.formalId,status:report.status,L:report.L,U:report.U})+'\n');
}
const audit=await auditV3Catalog(runtime,reports,{expectFull:reports.length===450});
await fs.writeFile(`${output}/index.json`,JSON.stringify({schemaVersion:3,previousIndex:input,files,failures,formalReady:false},null,2)+'\n',{flag:'wx'});
await fs.writeFile(`${output}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({output,selected:files.length,rejected:failures.length,verified:audit.verified,formalReady:false})+'\n');
