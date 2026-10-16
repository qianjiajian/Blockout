import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {qualifyBoundedCandidateV4} from './bounded-qualify.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const root='deliverables/daily-formal-v4-20261008';
const poolFile=`${root}/design/macro-prefix-half300-01/index.json`;
const selectedFile=`${root}/selection/merged-116-v2/index.json`;
const own='tools/daily-challenge/formal-v4/solve-half-prefix-pool.mjs';
const [label]=process.argv.slice(2);assert(/^[a-z0-9-]+$/.test(label??''),'New output label required');
const runtime=await loadV4CatalogRuntime(),poolBytes=await fs.readFile(poolFile),selectionBytes=await fs.readFile(selectedFile);
assert.equal(sha(poolBytes),'f19e975ff8f51c5bd1bb47d005dc97aa91c8897479d12902568e497e6f81cceb');
assert.equal(sha(selectionBytes),'80cf245a78f9b45e5697c1957524ba32cd42f1e944d87e6d4def516431776006');
const qaFile=`${root}/design/macro-prefix-half300-01/completion-audit.json`,qaBytes=await fs.readFile(qaFile);
assert.equal(sha(qaBytes),'333582ec777836de41825239805abb841294c1c72ca009d23bf29f26a3a2b3cb');
for(const item of JSON.parse(qaBytes).fileBindings)assert.equal(sha(await fs.readFile(item.path)),item.sha256);
const pool=JSON.parse(poolBytes),selection=JSON.parse(selectionBytes);assert.equal(pool.files.length,4);
const selected=await Promise.all(selection.files.map(async f=>JSON.parse(await fs.readFile(f))));
assert.equal(selected.length,116);
const inputs=await Promise.all(pool.files.map(async file=>{const bytes=await fs.readFile(file);return{file,sha256:sha(bytes),candidate:JSON.parse(bytes)};}));
assert.equal(new Set(inputs.map(r=>designFingerprints(r.candidate.level).shapeSha256)).size,4,'Four actually different shape inventories');
assert.equal(new Set(inputs.map(r=>designFingerprints(r.candidate.level).colorSha256)).size,4,'Four actually different cell-colour assignments');
const old450=await Promise.all([...runtime.priorDailySlots.values()].map(async x=>JSON.parse(await fs.readFile(x.sourceReport))));
const built=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const bindings={...runtime.toolchainBindings,...runtime.designBindings};
for(const file of Object.keys(built.metafile.inputs)){const p=file.replaceAll('\\','/');bindings[p]=sha(await fs.readFile(p));}
const options={searchUpper:128,routeBudget:{maxStates:9999,maxMilliseconds:30000,maxTransitions:1000000,maxMicroStates:500000,maxDragStates:2000},
 lowerBudget:{maxStates:9999,maxMilliseconds:30000,maxTransitions:1000000,maxMicroStates:500000,maxDragStates:2000}};
const output=`${root}/design/${label}`;await fs.mkdir(output,{recursive:false});
await fs.writeFile(`${output}/plan.json`,JSON.stringify({status:'FIRST_FULL_JOINT_D3_ONLY_FOUR_FRESH_STOCKS',
 pool:{path:poolFile,sha256:sha(poolBytes)},selection:{path:selectedFile,sha256:sha(selectionBytes)},
 visualAndStaticAudit:{path:qaFile,sha256:sha(qaBytes)},
 inputs:inputs.map(({file,sha256,candidate})=>({file,sha256,levelSha256:candidate.levelSha256})),
 options,bindings,targetStage:'basic-combined',floor:31,
 stageSelection:'First still-empty basic D3 slot; prior accepted provisional candidates count for diversity.',
 noSecondBandOrStrategySearch:true,gateGeometryMaximumPerGroup:2,formalReady:false},null,2)+'\n',{flag:'wx'});
const results=[],provisional=[];
for(const [i,{file,sha256:inputSha,candidate:raw}]of inputs.entries()){
 for(const [file,digest]of Object.entries(bindings))assert.equal(sha(await fs.readFile(file)),digest,`Frozen solver task changed: ${file}`);
 assert.equal(sha(await fs.readFile(file)),inputSha);assert.equal(levelSha256(raw.level),raw.levelSha256);
 const slot=runtime.slots.find(s=>s.stageKey==='basic-combined'&&s.difficulty===3&&!selected.some(r=>r.formalId===s.formalId));
 if(!slot){results.push({file,status:'UNSEARCHED_BASIC_STAGE_FULL'});continue;}
 const candidate={...slot,sourceLevelId:raw.sourceLevelId,level:raw.level,levelSha256:raw.levelSha256};
 const staticAudit=await auditV4StaticCandidate(runtime,candidate),diversity=auditV4Diversity([...selected,candidate],runtime.slots);
 const source=runtime.LEVELS.find(r=>r.id===raw.sourceLevelId),sourceScore=compareLayouts(raw.level,source).footprintSimilarity;
 const closestOld450=Math.max(...old450.map(r=>compareLayouts(raw.level,r.level).footprintSimilarity));
 const preflight={staticAudit,diversity,sourceScore,closestOld450};
 if(!staticAudit.passed||diversity.reasons.length||sourceScore>.55||closestOld450>.75){
  results.push({file,status:'UNSEARCHED_DESIGN_PREFLIGHT_REJECTED',preflight});continue;
 }
 // No prefix is supplied as an upper witness. The only search must establish
 // both a real full U and exhaustion below floor31 on this exact new stock.
 const proof=await qualifyBoundedCandidateV4(runtime,candidate,options);
 const report={...proof,prefixOnlyInput:{path:file,sha256:inputSha},preflight,
  designValidated:false,mechanismStrengthValidated:false,
  finalAdmissionStatus:'MATHEMATICS_ONLY_PENDING_BASIC_DESIGN_ADMISSION',formalReady:false,productionChanged:false};
 const outFile=`${output}/candidate-${String(i).padStart(3,'0')}.json`;
 await fs.writeFile(outFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 results.push({input:file,file:outFile,formalId:slot.formalId,status:proof.status,accepted:proof.accepted,L:proof.L,U:proof.U,
  rawStates:proof.lowerBound?.result?.rawFullBoardStates??proof.route?.search?.rawFullBoardStates??null});
 if(proof.accepted){selected.push(report);provisional.push(outFile);}
 console.log(JSON.stringify(results.at(-1)));
}
await fs.writeFile(`${output}/completion.json`,JSON.stringify({status:'FINITE_FIRST_JOINT_TASKS_FINISHED',results,
 provisionalMathematicalCandidates:provisional,provisionalCount:provisional.length,
 formallyAdopted:0,selectionIndexUnchanged:true,formalReady:false},null,2)+'\n',{flag:'wx'});
