// Second design pass: retain old proofs/maps, bind a new baseline and measure
// actual spatial decisions separately from numerical minimum-action claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {IDS,loadApi,geometry,assertBaseline,checkCandidate,floorFor} from './remake21to30-v120.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {checkFastFloor} from './remake21to30-mask-floor.mjs';
export const OUTPUT='deliverables/remake21-30-quality-20260923';
export const BASELINE=OUTPUT+'/baseline.json';
export function ruleGate(){const result=verifyRulesLock();assert(result.ok,result.errors.join('\n'));assert.equal(result.activeVersion,'1.21.0');return result;}
export const writeNew=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};
export async function capture(){
  const lock=ruleGate(),{api,inputs}=await loadApi();
  const levels=JSON.parse(JSON.stringify(api.LEVELS)).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));
  const result={schemaVersion:1,ruleVersion:'1.20.0',runtimeProfile:'revised-2026-09-23-v1.4',createdAt:new Date().toISOString(),scope:IDS,levels,
    campaignSha256:digest(levels.map(r=>r.level)),other190Sha256:digest(levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),
    lock,inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))]))};
  assertBaseline(result);writeNew(BASELINE,result);return {path:BASELINE,campaignSha256:result.campaignSha256};
}
export function measureRoute(level,drags,api){
  const model=new api.PuzzleModel(structuredClone(level));model.startCountdown();
  const steps=[],byBlock={};let single=0,multi=0;
  for(const [i,drag] of drags.entries()){
    const before=model.snapshot(),block=model.getBlock(drag.blockId),area=block.shape.length;
    const start=[block.x,block.y];model.beginAction();
    for(const p of drag.path)assert(model.moveBlockStep(block.id,...p));
    if(drag.exitSide)assert(model.tryExit(block.id,drag.exitSide).ok);assert(model.commitAction());
    const after=model.snapshot(),clears=after.cleared-before.cleared;
    if(!clears){if(area===1)single++;else multi++;byBlock[block.id]=(byBlock[block.id]??0)+1;}
    steps.push({step:i+1,blockId:block.id,area,start,end:drag.path.at(-1)??start,clears});
  }
  assert(model.snapshot().complete&&!model.snapshot().failed);
  return {totalDrags:drags.length,nonClearingDrags:single+multi,singleCellDrags:single,multiCellDrags:multi,
    multiCellShare:multi/(single+multi||1),singleBlocks:level.blocks.filter(b=>b.shape.length===1).length,totalBlocks:level.blocks.length,
    distinctRepositionedBlocks:Object.keys(byBlock).length,repeatedRepositionedBlocks:Object.entries(byBlock).filter(([,n])=>n>1),steps,
    humanDifficultyValidated:false};
}
export function checkQuality(data,baseline,api,options={}){
  const checked=checkCandidate(data,baseline,api),measurements=measureRoute(data.level,data.drags,api);
  // The capture is the immutable pre-v1.21 baseline, not a new certificate.
  if(data.level.id===22){
    const opening=new api.PuzzleModel(structuredClone(data.level)).snapshot();
    assert(opening.shutters.some(s=>!s.revealed)||opening.blocks.some(b=>!b.shutterId&&(b.layers.length>1||b.frozen>0)),
      'Lv22 must have an actual visible on-board mechanism, not only frozen exits');
  }
  // Internal selection guard for this rework, not a new frozen gameplay rule.
  // The explicit decision review still has to pass independently.
  assert(measurements.multiCellDrags>measurements.singleCellDrags,'Reject single-cell dominated witness');
  assert.notEqual(digest(data.level),baseline.levels[data.level.id-1].sha256,'Must be a genuinely changed map');
  const floor=Math.max(floorFor(data.level.id),options.floor??data.certificationFloor??0);
  assert(Number.isSafeInteger(floor)&&floor<=checked.replay.nonClearingDrags,'Requested proof threshold must be a valid candidate bound');
  const proof=checkFastFloor(data.level,{floor,maxStates:options.maxStates??500000,maxMilliseconds:options.maxMilliseconds??60000});
  assert(proof.thresholdProven,`Lv${data.level.id} unproven: ${JSON.stringify(proof)}`);
  return {...checked,measurements,proof:{...proof,levelSha256:digest(data.level),lowerBound:floor},lowerBoundCertified:true,
    decisionReviewRequired:true,decisionReviewPassed:false,humanBlindTested:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [mode,...files]=process.argv.slice(2);
  if(mode==='capture')console.log(JSON.stringify(await capture()));
  else if(mode==='check'){
    ruleGate();const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
    for(const file of files){const data=JSON.parse(fs.readFileSync(file));const checked=checkQuality(data,baseline,api);
      console.log(JSON.stringify({file,id:data.level.id,proof:checked.proof,measurements:{...checked.measurements,steps:undefined}}));}
  }else throw Error('Usage: node tools/remake21to30-quality.mjs capture | check FILES');
}
