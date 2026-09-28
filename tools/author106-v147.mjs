import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi} from './native-block-repair-v143.mjs';
import {loadSpatialApi,searchSpatial,replayDomain,compileSpatial} from '../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {pack,SHAPES,seededRng,rect} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
export const OUT='deliverables/remake101-110-v146-20260924/pipeline106';
export const SOURCE_FILE='.codex-temp/remaining98-v111/middle/lv106/source-review-106.json';
export const source=JSON.parse(fs.readFileSync(SOURCE_FILE));
const old=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[105];
export const sourceBlocks=source.sourceFacts.pieceLedger.opening.map((b,i)=>{const x=Math.min(...b.cells.map(p=>p[0])),y=Math.min(...b.cells.map(p=>p[1])),shape=b.cells.map(([a,c])=>[a-x,c-y]);return{id:`src106-${i}`,color:b.color,x,y,shape,...(b.star?{star:true}:{}),...(b.axis?{movementAxis:b.axis}:{}),kind:shape.length===1?'SINGLE':shape.length===3?'H3':shape[1][0]?'H2':'V2'};});
export const sourceGates=source.sourceFacts.physicalDoors.map((g,i)=>({...g,id:`src106-g${i}`}));
export const removedGates=sourceGates.filter(g=>g.color==='green'&&(!g.star&&g.frozen===20||g.star&&g.frozen===6));
export const retainedGates=sourceGates.filter(g=>!removedGates.includes(g));
SHAPES.SQ3=[rect(3,3)];SHAPES.RECT6=[rect(3,2)];
export const save=(name,data)=>{fs.mkdirSync(OUT,{recursive:true});const file=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return file;};
export function makeGates(level,rng){
 const legal=new Set(level.playable.map(p=>p.join(','))),opts=[],used=new Set();
 for(const side of ['top','right','bottom','left'])for(const[x,y]of level.playable){const hor=['top','bottom'].includes(side),dx=side==='right'?1:side==='left'?-1:0,dy=side==='bottom'?1:side==='top'?-1:0;
  for(let size=1;size<=3;size++){const cells=Array.from({length:size},(_,i)=>[x+(hor?i:0),y+(hor?0:i)]);if(cells.some(([a,b])=>!legal.has([a,b].join(','))||legal.has([a+dx,b+dy].join(','))))continue;opts.push({side,origin:[x,y],size,keys:cells.map(p=>side+':'+p.join(','))});}}
 const result=[],axis=level.blocks.find(b=>b.movementAxis),sourceOrder=[...retainedGates].sort((a,b)=>a.frozen-b.frozen);
 for(const sg of sourceOrder){const bs=level.blocks.filter(b=>b.color===sg.color&&(!b.star||sg.star)),required=bs.filter(b=>!sg.star||b.star||!retainedGates.some(g=>g.color===b.color&&!g.star));
  let list=opts.filter(o=>!o.keys.some(k=>used.has(k))&&o.size>=Math.max(1,...required.map(b=>1+Math.max(...b.shape.map(p=>p[['top','bottom'].includes(o.side)?0:1])))));
  if(sg.color==='green'&&!sg.star)list=list.filter(o=>['top','bottom'].includes(o.side)&&axis.x>=o.origin[0]&&axis.x<o.origin[0]+o.size);
  const touching=list.filter(o=>bs.some(b=>{const cells=b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]),hor=['top','bottom'].includes(o.side),t=hor?0:1,n=hor?1:0,front=o.side==='top'||o.side==='left'?Math.min(...cells.map(p=>p[n])):Math.max(...cells.map(p=>p[n]));return front===o.origin[n]&&cells.every(p=>p[t]>=o.origin[t]&&p[t]<o.origin[t]+o.size);}));
  if(!sg.frozen||touching.length&&rng.rand()<0.85)list=touching;
  if(!list.length)return false;const o=rng.shuffle(list)[0];o.keys.forEach(k=>used.add(k));result.push({id:`r147-${sg.id}`,color:sg.color,side:o.side,offset:o.origin[['top','bottom'].includes(o.side)?0:1],size:o.size,portals:[{side:o.side,origin:o.origin,size:o.size}],...(sg.frozen?{frozen:sg.frozen}:{}),...(sg.star?{star:true}:{})});
 }level.gates=result;return true;
}
export function make106(seed){
 const rng=seededRng(seed*106147),colors=['orange','purple','blue','green','yellow','red','cyan'];
 if(process.env.BASE106){const data=JSON.parse(fs.readFileSync(process.env.BASE106)),level=structuredClone(data.level),singles=level.blocks.filter(b=>b.shape.length===1);for(let n=0;n<1+seed%3;n++){const a=singles[Math.floor(rng.rand()*singles.length)],b=singles[Math.floor(rng.rand()*singles.length)];[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}if(seed%4===0&&!makeGates(level,rng))return;return level;}
 const fixed=process.env.FILL_COLORS?.split(',');const spec=sourceBlocks.map(b=>({...b,sourceId:b.id}));for(const[i,kind]of['SQ3','RECT6','SQ2'].entries())spec.push({sourceId:`fill106-${i}`,kind,color:fixed?.[i]??(process.env.FIXED_COLORS==='1'?['orange','purple','blue'][i]:colors[Math.floor(rng.rand()*colors.length)])});
 const packed=pack(spec,old.level.playable,rng,Number(process.env.PACK??5000),true);if(!packed)return;
 const blocks=packed.map(b=>({id:`r147-${b.sourceId}`,color:b.color,x:b.x,y:b.y,shape:b.shape,...Object.fromEntries(['movementAxis','star'].filter(k=>b[k]!==undefined).map(k=>[k,b[k]]))}));
 const level={...structuredClone(old.level),difficulty:'easy',preservedMoveTarget:old.starTargets.moveTarget,blocks,gates:[]};
 if(!makeGates(level,rng))return;return level;
}
export function audit106(level,api){
 api.validateLevel(level);assert.equal(level.blocks.length,37);assert.equal(level.blocks.filter(b=>b.star).length,8);assert.equal(level.blocks.filter(b=>b.movementAxis).length,1);
 for(const b of level.blocks)assert.equal(api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns,0);
 for(const src of sourceBlocks){const b=level.blocks.find(b=>b.id===`r147-${src.id}`);assert(b);for(const k of ['color','shape','star','movementAxis'])assert.deepEqual(b[k],src[k]);}
 assert.deepEqual(level.playable,old.level.playable);assert.equal(level.timeSeconds,old.level.timeSeconds);assert.deepEqual(api.levelStarTargets(level),old.starTargets);
 const ignored=['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile'];const issues=api.auditRevisedCandidate(level).issues.filter(i=>!ignored.includes(i.code));assert.deepEqual(issues,[]);
 for(const check of [auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),auditGateSpanLimits(level),api.auditCandidateBlockArt(level)])assert(check.passed,JSON.stringify(check));return true;
}
export function sourceMapping(level){return{file:SOURCE_FILE,sha256:digest(fs.readFileSync(SOURCE_FILE)),knownSourceBodies:34,knownSourceArea:39,baselinePlayableArea:58,sourceBlocks,sourceGates,
 blockMapping:sourceBlocks.map(s=>({sourceId:s.id,candidateId:`r147-${s.id}`,source:s,candidate:level.blocks.find(b=>b.id===`r147-${s.id}`)})),
 gateBindings:retainedGates.map(s=>({sourceId:s.id,candidateId:`r147-${s.id}`,source:s,candidate:level.gates.find(g=>g.id===`r147-${s.id}`)})),
 removedGates:removedGates.map(g=>({...g,reason:'Two source gates of the same green/color category conflict with one ordinary and one star gate per color. Remove one per duplicate category; retained counterparts and all other source doors keep original colors/star/ice.'})),
 ordinaryFillers:level.blocks.filter(b=>b.id.includes('fill106')),adaptation:'Fixed board58 minus source area39 requires19 added cells. Three original-orientation ordinary full images SQ3+RECT6+SQ2 fill19 cells; source34 shapes/colors/8stars/green verticalV2 remain unchanged. No new mechanism or recolored source gate.',
 frames:[400,435,466].map(sec=>{const file=`.codex-temp/video-audit-101-134/101-110/frames-1fps/sec-${String(sec).padStart(4,'0')}.jpg`;return{file,sha256:digest(fs.readFileSync(file))};})};}
async function main(){
 const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');const {api}=await loadApi(),spatial=await loadSpatialApi();
 const stats={pack:0,static:0,search:0,witness:0,proof:0};let maxClears=0;
 for(let seed=Number(process.env.START??1);seed<Number(process.env.END??10000);seed++){
  const level=make106(seed);if(!level){stats.pack++;continue;}try{audit106(level,api);}catch(e){stats.static++;if(stats.static<3)console.log(JSON.stringify({auditError:e.message}));continue;}
  stats.search++;const route=searchSpatial(level,spatial,{floor:11,maxMilliseconds:Number(process.env.SEARCH??400),maxStates:10000,orderSeed:seed%level.blocks.length,diagnosticTrace:true,normalize:process.env.NORMALIZE==='1'});
  if(route.maxClearsSeen>maxClears){maxClears=route.maxClearsSeen;const file=save('partial106-'+seed,{seed,level,result:route});console.log(JSON.stringify({file,maxClears,stats}));}
  if(route.status==='witness'){stats.witness++;if(route.cost<Number(process.env.MIN_UPPER??5))continue;const replay=api.replayRevisedRoute(level,route.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));const measurement=measureRoute(level,route.drags,api),data={activeRuleVersion:lock.activeVersion,seed,level,drags:route.drags,replay,measurement,sourceReview:sourceMapping(level),formalAdopted:false,pointerValidated:false};
   const file=save('candidate106-'+seed,data);console.log(JSON.stringify({file,upper:route.cost,multi:measurement.multiCellDrags,single:measurement.singleCellDrags,stats}));const proof=searchSpatial(level,spatial,{prove:true,floor:5,maxStates:500000,maxMilliseconds:Number(process.env.PROOF??20000),symmetry:true});stats.proof++;const proofFile=save('floor106-'+seed,{candidate:file,levelSha256:digest(level),proof});if(proof.thresholdProven){const replayGraph=replayDomain(compileSpatial(level,spatial),route.drags,spatial);assert(replayGraph.complete);console.log(JSON.stringify({file,proofFile,lower:5,upper:route.cost,stats}));return;}
  }if(seed%100===0)console.log(JSON.stringify({seed,stats,maxClears}));
 }console.log(JSON.stringify({stats,maxClears}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
