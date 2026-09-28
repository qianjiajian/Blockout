import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {validateQueueObligationPrefix} from '../root-native/stationary-queue-obligations.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';import {auditGeneratorQueueColors} from '../../../revised-generator-queue-colors.mjs';
import {createSourceReview139} from './source-review-current139.mjs';
Error.stackTraceLimit=0;const {api}=await loadApi();assert(verifyRulesLock().ok);
const source='deliverables/remake131-140-v146-20260924/root-native/draft-wide139-1790484526041.json',d=JSON.parse(fs.readFileSync(source)),level=structuredClone(d.level),get=id=>level.blocks.find(b=>b.id===id);
const splits=[];
for(let i=9;i<=15;i++){const b=get('n139-opening-'+i);assert.deepEqual(b.shape,[[0,0],[1,0]]);b.shape=[[0,0]];const added={id:'cut139-row-'+b.y,x:1,y:b.y,shape:[[0,0]],color:'yellow'};level.blocks.push(added);splits.push([b.id,added.id]);}
get('n139-opening-3').shape=[[0,0]];level.blocks.push({id:'cut139-top-fill',x:1,y:0,shape:[[0,0]],color:'yellow'});
function merge(ids,shape,color){const blocks=ids.map(get),first=blocks[0];first.shape=shape;first.color=color;const remove=new Set(ids.slice(1));level.blocks=level.blocks.filter(b=>!remove.has(b.id));}
merge(['a139-wide-fill-38','a139-wide-fill-39','a139-wide-fill-40'],[[0,0],[1,0],[2,0]],'blue');
merge(['a139-wide-fill-41','a139-wide-fill-42','a139-wide-fill-43'],[[0,0],[1,0],[2,0]],'orange');
merge(['a139-wide-fill-35','a139-wide-fill-36','a139-wide-fill-37'],[[0,0],[1,0],[2,0]],'blue');
merge(['a139-wide-fill-27','a139-wide-fill-28'],[[0,0],[1,0]],'orange');
merge(['a139-wide-fill-29','a139-wide-fill-30'],[[0,0],[1,0]],'cyan');
assert.equal(level.blocks.length,64);
const queue=new Set(level.generators.flatMap(g=>g.queueBlockIds)),active=level.blocks.filter(b=>!b.shutterId&&!queue.has(b.id));
const adjacent=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
const palette=['blue','orange','yellow','red','cyan','green','pink'];
for(const b of active){if(b.color==='purple')continue;const used=new Set(active.filter(a=>a.id!==b.id&&adjacent(a,b)).map(a=>a.color));if(used.has(b.color))b.color=palette.find(c=>!used.has(c));assert(b.color);delete b.layers;}
const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),art:api.auditCandidateBlockArt(level),gates:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),adjacency:{passed:!active.some((a,i)=>active.some((b,j)=>i<j&&a.color===b.color&&adjacent(a,b)))},allColors:{passed:level.gates.every(g=>level.blocks.some(b=>(b.layers??[b.color]).includes(g.color)))}};
assert(Object.values(checks).every(c=>c.passed));const contract=validateQueueObligationPrefix(level,api),sourceReview=createSourceReview139(level,api);
const file='deliverables/remake131-140-v146-20260924/agent139-140/split-cut139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({level,targetId:'n139-opening-3',sourceCandidate:source,checks,contract,sourceReview,splits,unqualifiedCutIdea:'Each of seven disjoint rows contains two distinct nongordinary singletons; at least one move per row plus four right H3. This is a design hypothesis pending independent proof qualification; no L certificate.',formalAdopted:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,count:level.blocks.length,checks:Object.fromEntries(Object.entries(checks).map(([k,v])=>[k,v.passed]))}));
