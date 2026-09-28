import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {checkQueueStationaryObligations} from '../root-native/stationary-queue-obligations.mjs';
import {createSourceReview139} from './source-review-current139.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGeneratorQueueColors} from '../../../revised-generator-queue-colors.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
Error.stackTraceLimit=0;
const source='deliverables/remake131-140-v146-20260924/agent131-134/wide3-m11channel139-1790484748986.json';
const old=JSON.parse(fs.readFileSync(source)),base=old.level,{api}=await loadApi();assert(verifyRulesLock().ok);
const queueIds=new Set(base.generators.flatMap(g=>g.queueBlockIds));
const opening=base.blocks.filter(b=>!b.shutterId&&!queueIds.has(b.id));
const adjacent=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
const fixedPurple=opening.filter(b=>b.color==='purple'&&(b.y<8||b.id==='n139-opening-0'));
const eligible=opening.filter(b=>b.y>=8&&b.id!=='n139-opening-0'&&!fixedPurple.some(a=>adjacent(a,b)));
const need=11-fixedPurple.length,sets=[];
function choose(at,selected){if(selected.length===need){const area=selected.reduce((n,b)=>n+b.shape.length,0);const changes=selected.filter(b=>b.color!=='purple').length;if(changes)sets.push({ids:selected.map(b=>b.id),area,changes,score:area*10+selected.reduce((n,b)=>n+(b.id==='m139-fill11m'?5:0)+(b.id==='m139-gap2'?5:0),0)});return;}if(eligible.length-at<need-selected.length)return;for(let i=at;i<eligible.length;i++){const b=eligible[i];if(selected.some(a=>adjacent(a,b)))continue;choose(i+1,[...selected,b]);}}
choose(0,[]);sets.sort((a,b)=>b.score-a.score||a.changes-b.changes);
const out='deliverables/remake131-140-v146-20260924/agent139-140',results=[];
for(const set of sets){if(results.filter(r=>r.file).length>=6)break;const level=structuredClone(base),purple=new Set([...fixedPurple.map(b=>b.id),...set.ids]);
const active=level.blocks.filter(b=>!b.shutterId&&!queueIds.has(b.id));
for(const b of active){if(purple.has(b.id)){b.color='purple';delete b.layers;}else if(b.color==='purple'){b.color='blue';delete b.layers;}}
const palette=['blue','orange','yellow','red','cyan','pink','green'];
for(const b of active){if(b.color==='purple')continue;const forbidden=new Set(active.filter(a=>a.id!==b.id&&adjacent(a,b)).map(a=>a.color));if(forbidden.has(b.color))b.color=palette.find(c=>!forbidden.has(c));assert(b.color);}
const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),art:api.auditCandidateBlockArt(level),gates:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),adjacency:{passed:!active.some((a,i)=>active.some((b,j)=>i<j&&a.color===b.color&&adjacent(a,b)))},allColors:{passed:level.gates.every(g=>level.blocks.some(b=>(b.layers??[b.color]).includes(g.color)))}};
assert(Object.values(checks).every(c=>c.passed));const proof=checkQueueStationaryObligations(level,api,{floor:11});
const row={...set,L:proof.provedObligations};if(proof.thresholdProven&&proof.provedObligations<=12){const file=out+'/wide-recolor139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({level,targetId:old.targetId,sourceCandidate:source,designChange:'Bottom ordinary-color independent set replaced to increase early clear area and remove trace-identified extra blockers; all source facts retained separately.',checks,proof,sourceReview:createSourceReview139(level,api),colorChoice:row,formalAdopted:false},null,2)+'\n',{flag:'wx'});row.file=file;}results.push(row);}
const file=out+'/wide-recolor-report139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({source,need,combinations:sets.length,results},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,results}));
