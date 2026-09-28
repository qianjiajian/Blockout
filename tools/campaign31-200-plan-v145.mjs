import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {loadApi} from './native-block-repair-v143.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';

export const PLAN_VERSION='1.45.0';
export const PLAN_ROOT='deliverables/remake31-200-v145-20260924/agent41-200';
export const SOURCE_FILES=Object.freeze([
 'deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json',
 'deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json',
]);
export const UNLOCKS=Object.freeze({35:'generator',50:'axis',60:'keys',65:'lift',100:'star',120:'bomb',150:'flip',200:'grid'});
export const BANDS=Object.freeze({easy:[5,10],normal:[11,15],hard:[16,20],super:[21,30]});
const BASE_CYCLE=['easy','normal','normal','hard','easy','normal','hard','easy','normal','super'];

/** Execution-derived schedule, not 170 individually user-approved choices.
 * Teaching never consumes a baseline slot. The following baseline easy/normal
 * slot can provide low-pressure practice; a hard/super slot waits behind one
 * inserted easy practice. Thus no challenge is deleted or reset at a decade.
 */
export function campaignCadence(end=200){
 assert(Number.isInteger(end)&&end>=31&&end<=200);
 let cursor=0,practiceFor=null,latest=null,ordinaryPractices=0;
 const rows=[];
 for(let id=31;id<=end;id++){
  const baselineDifficulty=BASE_CYCLE[cursor%10],baselineSlot=31+cursor;
  let difficulty,role,consumesBaseline;
  if(UNLOCKS[id]){
   latest={id,mechanism:UNLOCKS[id]};ordinaryPractices=0;practiceFor=latest;
   difficulty='easy';role='first-teaching';consumesBaseline=false;
  }else if(practiceFor&&['hard','super'].includes(baselineDifficulty)){
   difficulty='easy';role='inserted-low-pressure-practice';consumesBaseline=false;practiceFor=null;
  }else{
   difficulty=baselineDifficulty;consumesBaseline=true;cursor++;
   role=practiceFor?'baseline-low-pressure-practice':'baseline';practiceFor=null;
   if(difficulty==='normal'&&latest&&ordinaryPractices<2){ordinaryPractices++;role='ordinary-mechanism-practice';}
  }
  rows.push({id,difficulty,range:[...BANDS[difficulty]],role,baselineSlot,baselineDifficulty,
   consumesBaseline,latestMechanism:latest,ordinaryPracticeNumber:role==='ordinary-mechanism-practice'?ordinaryPractices:null});
 }
 assert.deepEqual(rows.slice(0,10).map(r=>r.difficulty),['easy','normal','normal','hard','easy','easy','normal','hard','easy','normal']);
 if(end>=41)assert.equal(rows[10].difficulty,'super');
 return {rows,nextUnconsumedBaselineSlot:31+cursor,nextUnconsumedDifficulty:BASE_CYCLE[cursor%10],
  pendingLowPressurePractice:practiceFor,tailPolicy:'No level 201 generated; pending baseline/practice is explicitly left unassigned.'};
}

const has=(value)=>Array.isArray(value)?value.length>0:value&&typeof value==='object'?Number(value.count??value.key_count??value.keyCount??0)>0:false;
export function sourceMechanisms(row){
 const m=row?.mechanisms??{};
 return {generator:has(m.generators),axis:has(m.axis_blocks),keys:has(m.keys_locks)||has(m.key_locks),
  lift:has(m.lifts)||has(m.elevators),star:has(m.stars)||has(m.star_blocks),bomb:has(m.bombs),flip:has(m.flip_doors),grid:has(m.colored_grid)||has(m.colored_grids)};
}
export function sourceGaps(row){
 if(!row)return ['source-row-absent'];
 const gaps=[...(row.required_exact_fields_missing??[]),...(row.provenance?.unclear_fields??[])];
 if(!Number.isInteger(row.composition?.opening_piece_count))gaps.push('composition.opening_piece_count');
 if(!row.composition?.opening_shape_histogram||typeof row.composition.opening_shape_histogram!=='object')gaps.push('composition.opening_shape_histogram');
 if(!Number.isInteger(row.composition?.opening_color_count))gaps.push('composition.opening_color_count');
 return [...new Set(gaps)];
}
function nativeSummary(level,api){
 const missing=[],rotated=[];
 for(const block of level.blocks){const match=api.matchFormalBlockShape(block.shape);if(!match)missing.push(block.id);else if(match.quarterTurns!==0)rotated.push({id:block.id,quarterTurns:match.quarterTurns,shapeId:match.shapeId,stage:block.shutterId??((level.generators??[]).find(g=>g.queueBlockIds.includes(block.id))?.id??'opening')});}
 return {missing,rotated};
}
export async function buildCampaignPlan(){
 const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
 assert(['1.45.0','1.46.0'].includes(lock.activeVersion),'Only reviewed campaign contract and its preserved refill successor qualified');
 const {api}=await loadApi(),cadence=campaignCadence(),truth=SOURCE_FILES.map(p=>JSON.parse(fs.readFileSync(p))),sources=new Map(truth.flatMap(d=>d.levels).map(l=>[l.level,l]));
 const rows=cadence.rows.map(schedule=>{
  const level=api.LEVELS.find(l=>l.id===schedule.id),source=sources.get(level.id),sourceKinds=sourceMechanisms(source),knownConflicts=[];
  for(const [unlock,kind]of Object.entries(UNLOCKS))if(level.id<Number(unlock)&&sourceKinds[kind])knownConflicts.push({kind:'source-before-unlock',mechanism:kind,sourceLevel:level.id,earliestPermittedLevel:Number(unlock),resolution:'Keep source facts unchanged; only minimal necessary authored removal/adaptation is permitted and must be explicitly reviewed.'});
  if(UNLOCKS[level.id]&&!sourceKinds[UNLOCKS[level.id]])knownConflicts.push({kind:'teaching-source-absence-or-unknown',mechanism:UNLOCKS[level.id],resolution:'Do not invent a source instance or silently move an earlier source instance; resolve source/design teaching conflict before adoption.'});
  const hidden=auditHiddenCoverage(level),queue=auditGeneratorQueueColors(level),opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot());
  return {...schedule,status:'not-generated',levelSha256:digest(level),geometry:{width:level.width,height:level.height,playableCells:level.playable?.length??level.width*level.height,seams:level.seams??[],blocked:level.blocked??[]},
   protectedMetadata:{name:level.name,timeSeconds:level.timeSeconds,stars:api.levelStarTargets(level),historicalReward:level.reward},
   source:{file:level.id<=100?SOURCE_FILES[0]:SOURCE_FILES[1],recordLevel:source?.level??null,opening:source?.composition??null,mechanisms:source?.mechanisms??null,stages:source?.stage_seeds??null,
    requiredGaps:sourceGaps(source),otherUnclear:source?.source_unclear_fields??[],provenance:source?.provenance??null,knownConflicts},
   currentAudit:{openingPassed:opening.passed,hiddenPassed:hidden.passed,hiddenIssues:hidden.issues??[],queuePassed:queue.passed,queueIssues:queue.issues??[],art:nativeSummary(level,api)},
   newEvidenceRequired:['source-and-minimal-adaptation','native-q0-full-art','hidden-each-layer','complete-no-booster-route','fresh-lower-bound','mechanism-decisions','pointer-natural-time','final-levels-binding']};
 });
 return {schemaVersion:1,designContract:PLAN_VERSION,activeRuleVersion:lock.activeVersion,createdAt:new Date().toISOString(),scope:[31,200],
  campaignSha256:digest(api.LEVELS),protected1to30Sha256:digest(api.LEVELS.filter(l=>l.id<=30)),
  sourceBindings:Object.fromEntries(SOURCE_FILES.map(p=>[p,digest(fs.readFileSync(p))])),
  cadencePolicy:'Execution-derived continuation, teaching insertion, compatible easy/normal practice; no deleted challenge or decade reset.',
  sourceBoundary:'Source data is quoted as evidence, never silently filled from formal designs. Hidden unknowns permit labeled authored filling; opening or mechanism initial-count unknowns remain unresolved.',
  rows,tail:{nextUnconsumedBaselineSlot:cadence.nextUnconsumedBaselineSlot,nextUnconsumedDifficulty:cadence.nextUnconsumedDifficulty,pendingLowPressurePractice:cadence.pendingLowPressurePractice,policy:cadence.tailPolicy}};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const plan=await buildCampaignPlan();const out=process.argv[2];
 if(out){assert(path.resolve(out).startsWith(path.resolve(PLAN_ROOT)+path.sep),'Only agent-owned output');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});}
 console.log(JSON.stringify({output:out??null,rows:plan.rows.length,missingSource:plan.rows.filter(r=>r.source.requiredGaps.length).map(r=>r.id),conflicts:plan.rows.flatMap(r=>r.source.knownConflicts.map(c=>({level:r.id,...c}))),tail:plan.tail},null,2));
}
