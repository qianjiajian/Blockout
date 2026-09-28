import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../../native-block-repair-v143.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../../revised-generator-queue-colors.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {createSourceReview139} from '../agent139-140/source-review-current139.mjs';
import {checkDisjointStationaryCuts} from '../root-native/stationary-disjoint-cuts.mjs';
const root='deliverables/remake131-140-v146-20260924/agent136-138',source='deliverables/remake131-140-v146-20260924/agent139-140/horizontal-mixed-cut139-1790485907842.json',d=JSON.parse(fs.readFileSync(source)),{api}=await loadApi();
const shape=i=>api.FORMAL_BLOCK_SHAPES.find(s=>s.shapeId===i).cells,queue=new Set(d.level.generators.flatMap(g=>g.queueBlockIds)),cells=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]),adj=(a,b)=>a.shutterId===b.shutterId&&cells(a).some(([x,y])=>cells(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1)),block=(id,x,y,s,color)=>({id,x,y,shape:shape(s),color}),fixed=d.level.blocks.filter(b=>!b.shutterId&&!queue.has(b.id)&&(b.y<8||b.id==='n139-opening-0'));
const saved=[];
for(let variant=0;variant<3;variant++){
 const purples=[[0,8],[0,10],[3,11],[0,12],[6,12]].map(([x,y],i)=>block('a139-checker-purple-'+i,x,y,9,'purple'));
 const other=[[3,8],[0,9],[3,9],[3,10],[0,11],[6,11],[3,12]].map(([x,y],i)=>block(i===1?'n139-opening-14':i===2?'n139-opening-15':'a139-checker-fill-'+i,x,y,9,'blue'));
 if(variant===1){Object.assign(other[2],{shape:shape(2)});Object.assign(other[3],{x:4,y:9,shape:shape(7)});}
 if(variant===2){Object.assign(other[2],{shape:shape(7)});Object.assign(other[3],{x:5,y:9,shape:shape(2)});}
 const all=[...structuredClone(fixed),...purples,...other],locked=all.filter(b=>!other.includes(b));
 for(const b of other){b.color=['blue','cyan','orange','green','red','pink','yellow'].find(c=>!locked.some(a=>a.color===c&&adj(a,b)));assert(b.color);locked.push(b);}
 const level=structuredClone(d.level);level.blocks=[...all,...d.level.blocks.filter(b=>b.shutterId||queue.has(b.id))];api.validateLevel(level);assert.deepEqual(geometry(level),geometry(d.level));assert.equal(all.filter(b=>b.color==='purple').length,11);
 const on=level.blocks.filter(b=>!queue.has(b.id)),checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),art:api.auditCandidateBlockArt(level),gates:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),gateBodies:{passed:level.gates.every(g=>level.blocks.some(b=>b.color===g.color))},adjacency:{passed:!on.some((a,i)=>on.some((b,j)=>i<j&&a.color===b.color&&adj(a,b)))}};
 assert(Object.values(checks).every(x=>x.passed),JSON.stringify(checks));assert(level.blocks.length<=64);
 const cuts=[...Array.from({length:7},(_,i)=>({targetId:'n139-opening-3',blockerIds:all.filter(b=>b.y===i+1&&b.x<2).map(b=>b.id)})),...[10,11,2,13].map(i=>({targetId:'n139-opening-4',blockerIds:['n139-opening-'+i]}))];
 const sourceReview=createSourceReview139(level,api),cutDiagnostic=checkDisjointStationaryCuts(level,api,{floor:11,cuts});assert(cutDiagnostic.thresholdProven,JSON.stringify(cutDiagnostic));
 const file=root+'/checker-bottom139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({level,levelSha256:digest(level),variant,targetId:d.targetId,sourceCandidate:source,checks,sourceReview,cuts,cutDiagnostic,L:null,thresholdProven:false,formalAdopted:false,sourceDifferences:sourceReview.differences.concat(['Bottom replaced by five purple H3 and seven ordinary rectangle bodies, source14/source15 retained in ordinary bottom. Variant '+variant+' changes central3x2 footprint into two complementary native rectangles where applicable. Upper four split rows/three H2 plus right M11 unchanged. Per-graph U budget capped20s/1M; new graph only.']),status:'SOURCE_STATIC_PASS_CUT_DIAGNOSTIC_ONLY_AWAIT_ROOT_QUALIFICATION_AND_COMPLETE_ROUTE'},null,2)+'\n',{flag:'wx'});const result={file,variant,bodies:level.blocks.length,cutDiagnostic:cutDiagnostic.provedObligations};saved.push(result);console.log(JSON.stringify(result));
}
fs.writeFileSync(root+'/checker-bottom139-report-'+Date.now()+'.json',JSON.stringify({saved},null,2)+'\n',{flag:'wx'});
