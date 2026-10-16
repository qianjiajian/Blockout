import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {digest} from './diversity-layout-factory.mjs';
import {reconstructReverseBlueprint} from './design-reverse-blueprint.mjs';
import {inverseInsertionAudit,inverseParkingAudit,auditCompleteReverseWitness} from './reverse-route-audit.mjs';

const root='deliverables/daily-formal-v3-20261008/design',label=process.env.DESIGN_BLUEPRINT_QUALIFICATION_LABEL??'reverse-blueprint-qualification-01';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid new qualification label');
const directory=`${root}/${label}`;
if(fs.existsSync(directory))throw Error('Preserve historical qualification');
fs.mkdirSync(directory);
const screen=process.env.DESIGN_BLUEPRINT_SCREEN_INDEX?JSON.parse(fs.readFileSync(process.env.DESIGN_BLUEPRINT_SCREEN_INDEX)):null;
const files=screen?screen.records.map(x=>x.path.slice(root.length+1)):process.env.DESIGN_BLUEPRINT_REFS?.split(',')??['global-pilot-02/candidate-0300.json','wide-rect-06/candidate-0379.json','global-pilot-02/candidate-0180.json',
 'broad-rect-04/candidate-0533.json','bar-gen3-09/candidate-0388.json','generator-berths-05/candidate-0057.json',
 'bar-global-09/candidate-0477.json','broad-rect-04/candidate-0682.json'];
if(files.length>8)throw Error('At most eight known successful blueprints per qualification');
const runtime=await loadBoundedRuntime(),records=[];
const bodyKey=l=>digest(l.blocks.map(b=>({id:b.id,shape:b.shape,color:b.color,x:b.x,y:b.y})).sort((a,b)=>a.id.localeCompare(b.id)));
for(const file of files){
 const path=`${root}/${file}`,bytes=fs.readFileSync(path),packet=JSON.parse(bytes),raw=new Set(),expanded=new Set();
 const input=screen?.records.find(x=>x.path===path);
 let micro=0,transitions=0;
 const blueprint=reconstructReverseBlueprint(runtime,packet,{prefixClearCount:input?.blueprintPrefixClearCount??null,maximumPrefixArea:input?.blueprintMaximumPrefixArea??8,
  charge:(l,expand=false)=>{raw.add(bodyKey(l));if(expand)expanded.add(bodyKey(l));assert(raw.size<=10000);},micro:()=>micro++,transition:()=>transitions++});
 let current=blueprint.level;const reverse=[...blueprint.reverseOperations];
 for(const op of blueprint.withheldReferenceInverseOperations){
  const audit=op.kind==='insertion'?inverseInsertionAudit(runtime,current,op.body,op.reversePath,op.exitSide):inverseParkingAudit(runtime,current,op.blockId,op.reversePath);
  assert(audit.valid,audit.error);current=audit.reverseAfterLevel;reverse.push({forwardDrag:audit.forwardDrag});
 }
 assert.equal(bodyKey(current),bodyKey(packet.level));
 const final=auditCompleteReverseWitness(runtime,current,reverse.map(x=>x.forwardDrag).reverse());assert(final.valid,final.error);
 assert.equal(final.U,packet.U);
 records.push({path,fileSha256:createHash('sha256').update(bytes).digest('hex'),sourceLevelId:packet.sourceLevelId??packet.level.id,
  originalU:packet.U,reconstructedU:final.U,initialPrefixClearCount:blueprint.initialPrefixClearCount,initialVacancyArea:blueprint.initialVacancyArea,
  blueprintPrefixClearCount:input?.blueprintPrefixClearCount??null,blueprintMaximumPrefixArea:input?.blueprintMaximumPrefixArea??8,
  prefixDragCount:blueprint.prefixDragCount,withheldOriginalParkingCount:blueprint.withheldOriginalParkingCount,
  inverseGestures:blueprint.reverseOperations.length,rawDiscoveredStates:raw.size,rawExpandedStates:expanded.size,micro,transitions,
  originalWorldRestored:true,completeActualDoubleReplay:true,newConstructionSearch:false,lowerSearch:false});
}
const inputs=['design-reverse-blueprint.mjs','design-reverse-construction-factory.mjs','reverse-route-audit.mjs','design-reverse-blueprint-qualification.mjs'].map(name=>{
 const path=`tools/daily-challenge/formal-v3/${name}`;return{path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')};});
if(process.env.DESIGN_BLUEPRINT_SCREEN_INDEX){const path=process.env.DESIGN_BLUEPRINT_SCREEN_INDEX;inputs.push({path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')});}
fs.writeFileSync(`${directory}/index.json`,JSON.stringify({status:'KNOWN_ROUTE_INVERSE_BLUEPRINT_QUALIFIED_NOT_NEW_CANDIDATES',formalReady:false,
 proofToolchainSha256:runtime.toolchainSha256,inputs,records},null,2)+'\n');
console.log(JSON.stringify({qualified:records.length,records}));
