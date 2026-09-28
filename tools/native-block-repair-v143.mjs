import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadApi as loadBase,geometry} from './remake21to30-v120.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {checkUniqueCurtainSumFloor} from './remake21to30-unique-suffix-v139.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {observeMechanismProcess,verifyDecisions} from './review-remake21to30-decisions.mjs';
export {geometry};
export const VERSION='1.43.0',IDS=[23,26,28,29,30],OUTPUT='deliverables/native-block-repair-v143-20260924',BASELINE=OUTPUT+'/baseline.json';
export const TARGET_IDS={23:['r139-23-17'],26:['r139-26-h10','r139-26-h11'],28:['s28-hidden-1-0','s28-hidden-1-1','s28-hidden-1-2'],29:['s29-open-red-1','s29-open-red-2','s29-hidden-2-4'],30:['s30-open-15','s30-hidden-3','s30-hidden-4']};
export const TARGETS={23:{difficulty:'normal',min:11,max:15},26:{difficulty:'normal',min:11,max:15},28:{difficulty:'easy',min:5,max:10},29:{difficulty:'normal',min:11,max:15},30:{difficulty:'super',min:21,max:30}};
export function ruleGate(){const l=verifyRulesLock();assert(l.ok,l.errors.join('\n'));assert.equal(l.activeVersion,VERSION);return l;}
export const writeNew=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};
export async function loadApi(){
 const base=await loadBase(),r=await build({stdin:{resolveDir:process.cwd(),contents:"export {matchFormalBlockShape,FORMAL_BLOCK_SHAPES} from './src/game/formalBlockShapes.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 const art=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
 return {...base,api:{...base.api,...art},inputs:[...new Set([...base.inputs,'src/game/formalBlockShapes.ts'])]};
}
export function assertBaseline(b){assert.equal(b.ruleVersion,VERSION);assert.deepEqual(b.scope,IDS);assert.equal(b.campaignSha256,'8921d97b65e425c74aa3c6a612c42e2698b1d09014560438aff9d30adea241f1','Baseline is fixed by v1.43, not a self-rehashed replacement');assert.equal(b.levels.length,200);assert.deepEqual(b.levels.map(r=>r.level.id),Array.from({length:200},(_,i)=>i+1));assert.equal(digest(b.levels.map(r=>r.level)),b.campaignSha256);assert.equal(digest(b.levels.filter(r=>!IDS.includes(r.level.id)).map(r=>r.level)),b.other195Sha256);for(const r of b.levels){assert.equal(digest(r.level),r.sha256);assert.deepEqual(geometry(r.level),r.geometry);}}
export async function capture(){const lock=ruleGate(),{api,inputs}=await loadApi();assert.equal(digest(api.LEVELS),'8921d97b65e425c74aa3c6a612c42e2698b1d09014560438aff9d30adea241f1');const levels=structuredClone(api.LEVELS).map(level=>({level,sha256:digest(level),geometry:geometry(level),starTargets:api.levelStarTargets(level)}));const b={ruleVersion:VERSION,createdAt:new Date().toISOString(),scope:IDS,levels,lock,campaignSha256:digest(api.LEVELS),other195Sha256:digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),inputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))]))};assertBaseline(b);writeNew(BASELINE,b);return {path:BASELINE,campaignSha256:b.campaignSha256};}
const points=bs=>bs.flatMap(b=>b.shape.map(([x,y])=>`${b.x+x},${b.y+y}`)).sort();
export function auditCandidate(data,b,api){
 assertBaseline(b);const l=data.level,old=b.levels[l.id-1]?.level,targets=TARGET_IDS[l.id];assert(targets,'Only five levels; Lv5 is explicitly excluded');
 for(const k of new Set([...Object.keys(l),...Object.keys(old)]))if(k!=='blocks')assert.deepEqual(l[k],old[k],`Preserve ${k}`);
 const kept=old.blocks.filter(x=>!targets.includes(x.id)),keptIds=new Set(kept.map(x=>x.id));
 assert.deepEqual(l.blocks.filter(x=>keptIds.has(x.id)),kept,'Every non-target block and relative ordering stays unchanged');
 const added=l.blocks.filter(x=>!keptIds.has(x.id)),rows=data.replacements;assert(Array.isArray(rows)&&rows.length);
 assert.deepEqual(rows.flatMap(r=>r.sourceIds).sort(),[...targets].sort(),'Each authorized original body covered exactly once');
 assert.deepEqual(rows.flatMap(r=>r.blockIds).sort(),added.map(x=>x.id).sort(),'Each replacement bound exactly once');
 for(const r of rows){assert(r.reason?.length>=8);const src=r.sourceIds.map(id=>old.blocks.find(x=>x.id===id)),dst=r.blockIds.map(id=>added.find(x=>x.id===id));assert(dst.length&&dst.every(Boolean));assert.equal(new Set(src.map(x=>x.shutterId??'opening')).size,1);assert(dst.every(x=>x.shutterId===src[0].shutterId));assert.deepEqual(points(dst),points(src),'Replace only the exact original same-stage footprint, with no gaps/overlap');
  for(const block of dst){assert(Object.keys(block).every(k=>['id','x','y','shape','color','shutterId'].includes(k)),'No added mechanisms or metadata');assert(l.gates.some(g=>g.color===block.color));}}
 api.validateLevel(l);assert.deepEqual(api.levelStarTargets(l),b.levels[l.id-1].starTargets);
 const orientation=l.blocks.map(x=>({id:x.id,match:api.matchFormalBlockShape(x.shape)}));assert(orientation.every(x=>x.match?.quarterTurns===0),'Only unrotated original artwork may match the repaired level');
 const art=api.auditCandidateBlockArt(l),opening=auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden=auditHiddenCoverage(l),spans=auditGateSpanLimits(l);
 for(const check of [art,opening,hidden,spans])assert(check.passed,JSON.stringify(check));
 const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);const hard=api.auditRevisedCandidate(l,undefined);assert.deepEqual(hard.issues.filter(i=>!omit.has(i.code)),[]);
 return {passed:true,replacements:rows,allNativeOrientation:true,unchangedOtherBlocks:kept.length,originalTargetCount:targets.length,replacementCount:added.length,art,opening,hidden,spans,starsPreserved:true,otherFieldsPreserved:true};
}
export function checkCandidate(data,b,api,options={}){
 const audit=auditCandidate(data,b,api),l=data.level,t=TARGETS[l.id];assert(data.seed&&data.design?.concreteDecision);
 const replay=api.replayRevisedRoute(l,data.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));assert(replay.nonClearingDrags>=t.min&&replay.nonClearingDrags<=t.max);
 const measurement=measureRoute(l,data.drags,api);assert(measurement.multiCellDrags>measurement.singleCellDrags,'No single-cell dominated repositioning');
 const budget={floor:t.min,maxStates:options.maxStates??2000000,maxMilliseconds:options.maxMilliseconds??180000};let proof=checkUniqueCurtainSumFloor(l,budget);if(proof.status==='unsupported')proof=checkSymmetryFloor(l,budget);assert(proof.thresholdProven,JSON.stringify(proof));
 const decisions=verifyDecisions(data,api),mechanismProcess=observeMechanismProcess(l,data.drags,api);const clearLoad=l.blocks.reduce((n,x)=>n+(x.layers?.length??1),0),stars=b.levels[l.id-1].starTargets;
 return {id:l.id,ruleVersion:VERSION,checkedAt:new Date().toISOString(),levelSha256:digest(l),routeSha256:digest(data.drags),audit,replay,measurement,proof,decisions,mechanismProcess,lowerBound:t.min,upperBound:replay.nonClearingDrags,exactNecessaryRepositions:t.min===replay.nonClearingDrags?t.min:null,target:t,starAssessment:{preservedTargets:stars,clearLoad,guaranteedMinimumDrags:clearLoad+t.min,moveTargetImpossible:clearLoad+t.min>stars.moveTarget,witnessWithinMoveTarget:data.drags.length<=stars.moveTarget},pointerValidated:false,humanBlindTested:false,releaseApproved:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const [mode,...files]=process.argv.slice(2);ruleGate();if(mode==='capture')console.log(JSON.stringify(await capture()));else if(mode==='audit'||mode==='check'){const {api}=await loadApi(),b=JSON.parse(fs.readFileSync(BASELINE));for(const f of files){const d=JSON.parse(fs.readFileSync(f)),r=mode==='audit'?auditCandidate(d,b,api):checkCandidate(d,b,api);if(process.env.REPORT)writeNew(process.env.REPORT,r);console.log(JSON.stringify({file:f,id:d.level.id,status:'PASS',lower:r.lowerBound,upper:r.upperBound}));}}else throw Error('Usage: capture | audit FILES | check FILES');}
