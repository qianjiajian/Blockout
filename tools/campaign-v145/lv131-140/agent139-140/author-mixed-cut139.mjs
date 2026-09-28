import fs from 'node:fs';import assert from'node:assert/strict';
import {loadApi} from '../../../native-block-repair-v143.mjs';import{verifyRulesLock}from'../../../verify-rules-lock.mjs';
import {createSourceReview139} from './source-review-current139.mjs';import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';import{auditHiddenCoverage}from'../../../revised-hidden-coverage.mjs';import{auditGeneratorQueueColors}from'../../../revised-generator-queue-colors.mjs';import{auditGateSpanLimits}from'../../../revised-gate-span-limits.mjs';
Error.stackTraceLimit=0;const{api}=await loadApi();assert(verifyRulesLock().ok);
const source=process.argv[2]??'deliverables/remake131-140-v146-20260924/agent139-140/split-cut139-1790485526727.json',base=JSON.parse(fs.readFileSync(source));
const root='deliverables/remake131-140-v146-20260924/agent139-140',results=[];
for(const mergedRows of [[1,2,3],[3,4,5],[5,6,7],[1,3,5],[2,4,6],[1,4,7]]){
 const level=structuredClone(base.level);
 for(const y of mergedRows){const b=level.blocks.find(b=>b.id==='n139-opening-'+(y+8));assert(b.shape.length===1);b.shape=[[0,0],[1,0]];level.blocks=level.blocks.filter(b=>b.id!=='cut139-row-'+y);}
 const queue=new Set(level.generators.flatMap(g=>g.queueBlockIds)),active=level.blocks.filter(b=>!b.shutterId&&!queue.has(b.id));
 const adjacent=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
 const palette=['blue','orange','yellow','red','cyan','green','pink'];for(const b of active){if(b.color==='purple')continue;const used=new Set(active.filter(a=>a.id!==b.id&&adjacent(a,b)).map(a=>a.color));if(used.has(b.color))b.color=palette.find(c=>!used.has(c));delete b.layers;}
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),art:api.auditCandidateBlockArt(level),gates:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),adjacency:{passed:!active.some((a,i)=>active.some((b,j)=>i<j&&a.color===b.color&&adjacent(a,b)))},allColors:{passed:level.gates.every(g=>level.blocks.some(b=>(b.layers??[b.color]).includes(g.color)))}};assert(Object.values(checks).every(c=>c.passed));
 const cuts=[];for(let y=1;y<=7;y++)cuts.push({targetId:'n139-opening-3',blockerIds:mergedRows.includes(y)?['n139-opening-'+(y+8)]:['n139-opening-'+(y+8),'cut139-row-'+y]});for(let i=5;i<=8;i++)cuts.push({targetId:'n139-opening-4',blockerIds:['n139-opening-'+i]});
 const file=root+'/mixed-cut139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({level,targetId:base.targetId,sourceCandidate:source,checks,sourceReview:createSourceReview139(level,api),mergedRows,cuts,L:null,thresholdProven:false,formalAdopted:false},null,2)+'\n',{flag:'wx'});results.push({file,mergedRows});
}
const file=root+'/mixed-cut-report139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({results},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,results}));
