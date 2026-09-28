// Targeted v1.29 data repair, not a runtime recoloring mechanism.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,checkCandidate as checkHistoricalContracts,BASELINE as ORIGINAL_BATCH_BASELINE,writeNew} from './remake31to40-rhythm.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
export {loadApi};
export const VERSION='1.29.0';
export const OUTPUT='deliverables/generator-color-repair-21-40-20260924';
export const BASELINE=OUTPUT+'/baseline.json';
export function ruleGate(){const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,VERSION);return lock;}
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export async function capture(){
  const lock=ruleGate(),{api}=await loadApi();
  const rows=api.LEVELS.filter(l=>l.id>=21&&l.id<=40).map(auditGeneratorQueueColors);
  assert.deepEqual(rows.filter(r=>!r.passed).map(r=>r.levelId),[35]);
  const b={ruleVersion:VERSION,createdAt:new Date().toISOString(),scope:[21,40],actualChangedIds:[35],lock,
    campaignSha256:digest(api.LEVELS),levels:api.LEVELS.map(l=>({id:l.id,sha256:digest(l),starTargets:api.levelStarTargets(l)})),
    originalLevel35:structuredClone(api.LEVELS[34]),beforeColorAudit:rows};
  writeNew(BASELINE,b);return {path:BASELINE,campaignSha256:b.campaignSha256};
}
export function checkCandidate(data,baseline,api,options={}){
  ruleGate();assert.equal(baseline.ruleVersion,VERSION);assert.equal(data.level.id,35);
  const old=baseline.originalLevel35,level=data.level;
  assert.equal(digest(old),baseline.levels.find(r=>r.id===35).sha256);
  const queueIds=new Set(old.generators.flatMap(g=>g.queueBlockIds));
  assert.equal(level.blocks.length,old.blocks.length);
  const restored=structuredClone(level),changes=[];
  for(const [index,b]of level.blocks.entries()){
    const previous=old.blocks[index];assert.equal(b.id,previous.id);
    if(b.color!==previous.color){assert(queueIds.has(b.id),'Only authored queue colors may change');changes.push({blockId:b.id,from:previous.color,to:b.color});restored.blocks[index].color=previous.color;}
  }
  assert.equal(changes.length,1,'This repair must change exactly one cargo color');
  assert.deepEqual(restored,old,'No other map/queue/shape/exit/count/evaluation changes');
  assert.deepEqual(api.levelStarTargets(level),baseline.levels.find(r=>r.id===35).starTargets);
  const colors=auditGeneratorQueueColors(level);assert(colors.passed,JSON.stringify(colors));
  // Re-run inherited tests/proof on the NEW data. The legacy batch baseline
  // remains the original geometry/evaluation reference, not a new certificate.
  const fresh=checkHistoricalContracts(data,read(ORIGINAL_BATCH_BASELINE),api,options);
  return {...fresh,ruleVersion:VERSION,inheritedCheckerContractVersion:fresh.ruleVersion,queueColors:colors,changes,
    otherLevelMutationAuthorized:false,scope:[21,40],actualChangedIds:[35]};
}
export function verifyFormal(data,baseline,api){
  const checks=checkCandidate(data,baseline,api);assert.deepEqual(api.LEVELS[34],data.level);
  assert.equal(api.LEVELS.length,200);assert.equal(baseline.levels.length,200);
  const changed=api.LEVELS.filter((l,i)=>{assert.equal(l.id,baseline.levels[i].id);return digest(l)!==baseline.levels[i].sha256;}).map(l=>l.id);
  assert.deepEqual(changed,[35]);
  for(const l of api.LEVELS)assert.deepEqual(api.levelStarTargets(l),baseline.levels[l.id-1].starTargets);
  const colorAudit=api.LEVELS.filter(l=>l.id>=21&&l.id<=40).map(auditGeneratorQueueColors);
  assert(colorAudit.every(r=>r.passed));
  return {ruleVersion:VERSION,createdAt:new Date().toISOString(),campaignSha256:digest(api.LEVELS),changedIds:changed,
    other199Unchanged:true,all200StarsPreserved:true,colorAudit,checks,pointerValidated:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [mode,file]=process.argv.slice(2);ruleGate();
  if(mode==='capture')console.log(JSON.stringify(await capture()));
  else if(mode==='check'||mode==='verify'){
    assert(file);const {api}=await loadApi(),data=read(file),baseline=read(BASELINE);
    const result=mode==='check'?checkCandidate(data,baseline,api):verifyFormal(data,baseline,api);
    const output=path.join(OUTPUT,`${mode}-${Date.now()}.json`);writeNew(output,result);
    console.log(JSON.stringify({output,levelSha256:digest(data.level),lower:(result.checks??result).lowerBound,upper:(result.checks??result).upperBound}));
  }else throw Error('Usage: capture | check CANDIDATE | verify CANDIDATE');
}
