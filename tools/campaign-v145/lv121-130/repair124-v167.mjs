import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../revised-generator-queue-colors.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
const lock=verifyRulesLock(); if(!lock.ok) throw new Error(lock.errors.join('\n'));
const bundle=await build({stdin:{resolveDir:process.cwd(),sourcefile:'repair124-entry.ts',loader:'ts',contents:`
 export {validateLevel,PuzzleModel} from './src/core/PuzzleModel.ts';
 export {searchRevisedLevel,replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
 export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';
`},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const input=JSON.parse(fs.readFileSync('deliverables/campaign121-130-v146-20260924/agent121-124/candidate124-v166.json','utf8'));
const level=structuredClone(input.level);
const occupied=new Set(); for(const b of level.blocks) for(const [dx,dy] of b.shape) occupied.add(`${b.x+dx},${b.y+dy}`);
const colors=['red','blue','orange','yellow','green','pink','purple','cyan'];
let extra=0;
for(const [x,y] of level.playable){const k=`${x},${y}`;if(occupied.has(k))continue;const used=new Set();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const b=level.blocks.find(v=>v.x+v.shape.some(([sx,sy])=>sx===x+dx&&v.y+sy===y+dy));if(b)used.add(b.color);}const color=colors.find(c=>!used.has(c))??colors[extra%colors.length];level.blocks.push({id:`v167-124-filler-${extra++}`,x,y,shape:[[0,0]],color});occupied.add(k);}
level.name='v1.67 fresh adapted candidate Lv124'; level.mechanismRules='revised-2026-09-23-v1.4';
let validation=null,audit=null,search=null,replay=null,error=null;
try{validation=api.validateLevel(level);const snap=new api.PuzzleModel(level).snapshot();audit={opening:auditOpeningCoverage(snap),hidden:auditHiddenCoverage(level),queue:auditGeneratorQueueColors(level),gateSpans:auditGateSpanLimits(level),native:level.blocks.every(b=>api.matchFormalBlockShape(b.shape)?.quarterTurns===0)};search=api.searchRevisedLevel(level,{maxStates:700000,maxDragStates:4096,maxTransitions:8000000,maxMilliseconds:15000});if(search.status==='witness'){replay=api.replayRevisedRoute(level,search.drags);}}catch(e){error=String(e?.stack||e);}
const report={schemaVersion:1,activeRuleVersion:lock.activeVersion,sourceRuleVersion:input.ruleVersion,levelId:124,generatedAt:new Date().toISOString(),candidateVersion:'campaign-v145-agent124-v167',adaptation:['preserve 7x7 geometry and source 23-piece q0 histogram','add one native singleton per uncovered playable cell (five) to satisfy v1.4 opening coverage'],level,validation:{ok:!!validation,error},audit,search:search&&{status:search.status,termination:search.termination,exploredStates:search.exploredStates,drags:search.drags?.length},replay:replay&&{valid:replay.valid,complete:replay.complete,nonClearingDrags:replay.nonClearingDrags,drags:replay.drags?.length},formalAdopted:false,pointerValidated:false,naturalClockValidated:false,releaseApproved:false};
const out='deliverables/campaign121-130-v146-20260924/agent121-124';fs.writeFileSync(path.join(out,`candidate124-v167-${Date.now()}.json`),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file:out,status:search?.status,valid:replay?.valid,complete:replay?.complete,nonClearingDrags:replay?.nonClearingDrags,blocks:level.blocks.length,error},null,2));
