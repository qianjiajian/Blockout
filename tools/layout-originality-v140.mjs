// Fresh four-level layout task. Historical v139 inputs/checkers remain immutable.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,geometry,writeNew,auditCandidate as auditInherited,checkCandidate as checkInherited,assertBaseline as assertInherited} from './remake21to30-v139.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {shapeClass,verifySourceCatalog} from './remake21to30-source-v139.mjs';
export {loadApi,geometry,writeNew};
export const VERSION='1.40.0',IDS=Object.freeze([21,22,23,28]);
export const OUTPUT='deliverables/layout-originality-v140-20260924',BASELINE=OUTPUT+'/baseline.json';
export const INHERITED_BASELINE='deliverables/remake21-30-v139-20260924/baseline.json';
export const BEFORE_BATCH='deliverables/remake21-30-v139-20260924/batch-1790222202466';
export function ruleGate(){const l=verifyRulesLock();assert(l.ok,l.errors.join('\n'));assert.equal(l.activeVersion,VERSION);return l;}
export function assertBaseline(b){
  assert.equal(b.ruleVersion,VERSION);assert.deepEqual(b.scope,IDS);assert.equal(b.levels.length,200);
  assert.deepEqual(b.levels.map(r=>r.level.id),Array.from({length:200},(_,i)=>i+1));
  assert.equal(digest(b.levels.map(r=>r.level)),b.campaignSha256);
  assert.equal(digest(b.levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),b.other196Sha256);
  for(const r of b.levels){assert.equal(digest(r.level),r.sha256);assert.deepEqual(geometry(r.level),r.geometry);}
  verifySourceCatalog(b.sources);
  assert.equal(digest(fs.readFileSync(INHERITED_BASELINE)),b.inheritedBaselineSha256);
  assert.deepEqual(b.beforeCandidates.map(r=>r.id),IDS,'Bind every named before-layout exactly once');
  for(const r of b.beforeCandidates){assert.equal(digest(fs.readFileSync(r.file)),r.sha256);assert.equal(digest(JSON.parse(fs.readFileSync(r.file)).level),b.levels[r.id-1].sha256);}
}
export async function capture(){
  const lock=ruleGate(),{api,inputs}=await loadApi(),inherited=JSON.parse(fs.readFileSync(INHERITED_BASELINE));assertInherited(inherited);
  const levels=structuredClone(api.LEVELS).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));
  const b={schemaVersion:1,ruleVersion:VERSION,createdAt:new Date().toISOString(),scope:IDS,lock,levels,sources:inherited.sources,
    inheritedBaselineSha256:digest(fs.readFileSync(INHERITED_BASELINE)),
    beforeCandidates:IDS.map(id=>({id,file:`${BEFORE_BATCH}/lv${id}.json`,sha256:digest(fs.readFileSync(`${BEFORE_BATCH}/lv${id}.json`))})),
    campaignSha256:digest(levels.map(r=>r.level)),other196Sha256:digest(levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),
    inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))]))};
  assertBaseline(b);writeNew(BASELINE,b);return {path:BASELINE,campaignSha256:b.campaignSha256};
}
const omit=(o,keys)=>Object.fromEntries(Object.entries(o).filter(([k])=>!keys.includes(k)));
const sort=a=>a.sort((a,b)=>a.id.localeCompare(b.id));
export function inventory(level){return {
  blocks:sort(level.blocks.map(b=>({...omit(b,['x','y','shape']),shapeClass:shapeClass(b.shape)}))),
  gates:sort(level.gates.map(g=>omit(g,['side','offset','size']))),
  shutters:sort((level.shutters??[]).map(s=>({...omit(s,['x','y','width','height']),area:s.width*s.height}))),
};}
// Ignore colours and identity: exchanging identical pieces or global colour labels
// must not be mistaken for a different geometric partition. All hidden stages count.
export function partitionKey(level,transform=([x,y])=>[x,y]){
  const points=cells=>cells.map(transform).map(p=>p.join(',')).sort().join(';');
  const rect=s=>Array.from({length:s.width*s.height},(_,i)=>[s.x+i%s.width,s.y+Math.floor(i/s.width)]);
  const regions=(level.shutters??[]).map(s=>`C:${points(rect(s))}`).sort();
  const blocks=level.blocks.map(b=>`${b.shutterId?'H':'O'}:${points(b.shape.map(([x,y])=>[x+b.x,y+b.y]))}`).sort();
  return JSON.stringify({regions,blocks});
}
export function isGlobalIsometry(before,after){
  if(before.width!==after.width||before.height!==after.height)return false;
  const w=before.width,h=before.height,t=[([x,y])=>[x,y],([x,y])=>[w-1-x,y],([x,y])=>[x,h-1-y],([x,y])=>[w-1-x,h-1-y]];
  if(w===h)t.push(([x,y])=>[y,x],([x,y])=>[w-1-y,x],([x,y])=>[y,h-1-x],([x,y])=>[w-1-y,h-1-x]);
  const target=partitionKey(after);return t.some(f=>partitionKey(before,f)===target);
}
export function auditCandidate(data,b,api){
  assertBaseline(b);const level=data.level;assert(IDS.includes(level.id),'Only four named levels authorized');
  const old=b.levels[level.id-1];
  for(const k of new Set([...Object.keys(level),...Object.keys(old.level)]))if(!['blocks','gates','shutters'].includes(k))assert.deepEqual(level[k],old.level[k],`Preserve ${k}`);
  assert.deepEqual(geometry(level),old.geometry);assert.deepEqual(api.levelStarTargets(level),old.starTargets);
  assert.deepEqual(inventory(level),inventory(old.level),'Keep current per-body type/colour/properties/stage and per-mechanism initial value');
  assert(!isGlobalIsometry(old.level,level),'A recolour/global mirror/rotation is not an original arrangement');
  for(const k of ['layoutIntent','alignment','changes','constraints'])assert(typeof data.originality?.[k]==='string'&&data.originality[k].trim().length>=8,`Missing concrete originality review: ${k}`);
  const inherited=JSON.parse(fs.readFileSync(INHERITED_BASELINE));
  const hardRules=auditInherited(level,inherited,api,data.sourceAdaptation);
  return {passed:true,geometryPreserved:true,inventoryPreserved:true,starsPreserved:true,notJustGlobalIsometry:true,
    beforeLevelSha256:old.sha256,afterLevelSha256:digest(level),review:data.originality,
    reviewScope:'Geometric non-isometry is only a guard. Visual originality/alignment requires actual source/before/after inspection; no numeric similarity threshold or user approval claimed.',hardRules};
}
export function checkCandidate(data,b,api,options={}){
  const audit=auditCandidate(data,b,api);
  // Execute the unchanged inherited numerical/mechanical contract now on the NEW
  // level and route. This is NOT a relabelled old certificate. The nested result
  // retains its own verifier version for provenance.
  const inheritedContractExecution=checkInherited(data,JSON.parse(fs.readFileSync(INHERITED_BASELINE)),api,options);
  return {id:data.level.id,ruleVersion:VERSION,checkedAt:new Date().toISOString(),levelSha256:digest(data.level),routeSha256:digest(data.drags),audit,
    inheritedContractExecution,lowerBound:inheritedContractExecution.lowerBound,upperBound:inheritedContractExecution.upperBound,
    target:inheritedContractExecution.target,starAssessment:inheritedContractExecution.starAssessment,
    pointerValidated:false,humanBlindTested:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [mode,...files]=process.argv.slice(2);ruleGate();
  if(mode==='capture')console.log(JSON.stringify(await capture()));
  else if(mode==='check'||mode==='audit'){
    const {api}=await loadApi(),b=JSON.parse(fs.readFileSync(BASELINE));
    for(const file of files){const data=JSON.parse(fs.readFileSync(file));const result=mode==='check'?checkCandidate(data,b,api):auditCandidate(data,b,api);
      if(process.env.REPORT)writeNew(process.env.REPORT,result);
      console.log(JSON.stringify({file,id:data.level.id,status:'PASS',lower:result.lowerBound,upper:result.upperBound}));}
  }else throw Error('Usage: capture | audit FILES | check FILES');
}
