import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {checkFastFloor} from '../remake21to30-mask-floor.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
const source=process.argv[2],raw=JSON.parse(fs.readFileSync(source)),level=raw.level,drags=raw.result.relaxedRoute;
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';export {checkRevisedRepositionFloor} from './src/core/revisedRepositionFloor.ts';export {auditRevisedCandidate} from './src/core/revisedCandidateAudit.ts';export {auditCandidateBlockArt} from './tools/revised-candidate-block-art.mjs';`},bundle:true,write:false,platform:'node',format:'esm',metafile:true});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
api.validateLevel(level);const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));
const floor=checkSymmetryFloor(level,{floor:16,maxStates:1000000,maxMilliseconds:30000});assert(floor.thresholdProven,JSON.stringify(floor));
const noQuotient=checkFastFloor(level,{floor:16,maxStates:1000000,maxMilliseconds:30000});
const art=api.auditCandidateBlockArt(level);
const snapshot=new api.PuzzleModel(level).snapshot(),coverage=auditOpeningCoverage(snapshot);
const cells=new Set(level.playable.map(p=>p.join(','))),neigh=([x,y])=>[[x+1,y],[x-1,y],[x,y+1],[x,y-1]],reached=new Set([level.playable[0].join(',')]),queue=[level.playable[0]];
for(let i=0;i<queue.length;i++)for(const p of neigh(queue[i]))if(cells.has(p.join(','))&&!reached.has(p.join(','))){reached.add(p.join(','));queue.push(p);}
const outside=new Set(['-1,-1']),flood=[[-1,-1]];
for(let i=0;i<flood.length;i++)for(const p of neigh(flood[i]))if(p[0]>=-1&&p[1]>=-1&&p[0]<=level.width&&p[1]<=level.height&&!cells.has(p.join(','))&&!outside.has(p.join(','))){outside.add(p.join(','));flood.push(p);}
const holes=[];for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++)if(!cells.has(x+','+y)&&!outside.has(x+','+y))holes.push([x,y]);
const owners=new Map(snapshot.blocks.flatMap(b=>b.shape.map(([dx,dy])=>[(b.x+dx)+','+(b.y+dy),b]))),adjacency=[];
for(const [cell,b] of owners){const [x,y]=cell.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const other=owners.get(p.join(','));if(other&&other.id!==b.id&&other.layers[0]===b.layers[0])adjacency.push([b.id,other.id]);}}
const geometry={connected:reached.size===cells.size,leftRightSymmetric:level.playable.every(([x,y])=>cells.has((level.width-1-x)+','+y)),holes,adjacency,mask:Array.from({length:level.height},(_,y)=>Array.from({length:level.width},(_,x)=>cells.has(x+','+y)?'#':'.').join(''))};
assert(coverage.passed&&geometry.connected&&geometry.leftRightSymmetric&&!holes.length&&!adjacency.length);
const authoritative=process.argv.includes('--authoritative')?api.checkRevisedRepositionFloor(level,{floor:16,maxStates:100000,maxTransitions:1000000,maxMilliseconds:30000}):null;
const out={source,level,drags,sourceLevelSha256:digest(level),replay,floor,noQuotient,authoritative,art,coverage,geometry,inputs:Object.fromEntries(Object.keys(bundle.metafile.inputs).filter(p=>p!=='<stdin>').map(p=>[p,digest(fs.readFileSync(p))])),proofInputs:Object.fromEntries(['tools/remake21to30-mask-floor.mjs','tools/remake21to30-symmetry-floor-v139.mjs','tools/lv9-remake-20260927/agent-design-validate.mjs'].map(p=>[p,digest(fs.readFileSync(p))])),pointerValidated:false,timeValidated:false};
const target=path.join('deliverables/lv9-remake-20260927','design-validation-'+Date.now()+'.json');fs.writeFileSync(target,JSON.stringify(out,null,2));console.log(JSON.stringify({target,replay:{...replay,finalStateKey:undefined},floor,noQuotient,authoritative,geometry,coverage,artPassed:art.passed}));
