import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {loadApi} from './remake21to30-v120.mjs';
import {campaignCadence} from './campaign31-200-plan-v145.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {SHAPES,rect,pack,seededRng} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {search as graphSearch} from '../deliverables/remake61-70-v146-20260924/author61-64/local-graph.mjs';
import {search as queueSearch} from '../deliverables/remake61-70-v146-20260924/author61-64/queue-search.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const ROOT='deliverables/remake61-70-v146-20260924/author61-64';
const [mode='generate',arg='63']=process.argv.slice(2),id=Number(arg),base=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[id-1];
const target=campaignCadence(70).rows.find(r=>r.id===id),{api}=await loadApi();
const artB=await build({stdin:{contents:'export * from "./src/game/formalBlockShapes.ts";',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),art=await import('data:text/javascript;base64,'+Buffer.from(artB.outputFiles[0].text).toString('base64'));
SHAPES.SQ3=[rect(3,3)];SHAPES.H4=[rect(4,1)];SHAPES.S4=art.FORMAL_BLOCK_SHAPES.filter(s=>[5,11].includes(s.shapeId)).map(s=>s.cells);
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>art.matchFormalBlockShape(s,'native-only'));
const seed=Number(process.env.SEED??146000+id),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)];
const source63={stages:[{id:'opening',items:[
 ['red','SINGLE'],['blue','SINGLE'],['red','H2'],['green','H2'],['blue','H2','horizontal'],['yellow','H2','horizontal'],['purple','H2'],['pink','H2'],['orange','SQ2'],['purple','SQ2',null,['purple','cyan']],
 ['cyan','L3'],['red','L3'],['green','L3'],['pink','L3'],['yellow','L3'],['blue','L3'],['orange','L4','horizontal'],['cyan','L4','vertical']
 ].map(([color,kind,movementAxis,layers],i)=>({sourceId:'opening-'+(i+1),color,kind,...(movementAxis?{movementAxis}:{}),...(layers?{layers}:{})}))}],gates:[['green',0],['pink',1],['yellow',2],['blue',3],['purple',7],['orange',10],['cyan',12],['red',14]].map(([color,frozen])=>({color,...(frozen?{frozen}:{})}))};
const items61=(rows,stage)=>rows.map(([color,kind,movementAxis],i)=>({sourceId:stage+'-'+(i+1),color,kind,...(movementAxis?{movementAxis}:{})}));
const source61={stages:[{id:'opening',items:items61([['cyan','L3'],['purple','L3'],['green','H2'],['green','H2'],['cyan','SINGLE'],['pink','SQ2'],['red','H2'],['red','H2','vertical'],['yellow','H2'],['blue','SQ2','horizontal'],['red','H2']],'opening')},{id:'cover-4',count:4,items:items61([['pink','H2'],['blue','H2'],['orange','H2','horizontal'],['green','H2','horizontal'],['cyan','H2'],['purple','SQ2'],['yellow','H2'],['purple','H2']],'cover-4')}],gates:[['pink',0],['blue',1],['cyan',2],['yellow',3],['orange',4],['green',5],['purple',6],['red',8]].map(([color,frozen])=>({color,...(frozen?{frozen}:{})}))};
const sourceFile=process.env.SOURCE;const source=sourceFile?JSON.parse(fs.readFileSync(sourceFile)):id===63?source63:id===61?source61:null;
assert(source,'Source rows required');
const diagnostics={};const fail=s=>{diagnostics[s]=(diagnostics[s]??0)+1;return null;};
const write=(name,data)=>{fs.mkdirSync(ROOT,{recursive:true});const p=ROOT+'/'+name;fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
function gatesFor(l,machines=[]){const legal=new Set(l.playable.map(p=>p.join(','))),rail=new Set();for(const m of machines)for(let i=m.offset-1;i<=m.offset+1;i++)rail.add(m.side+':'+i);
 const slots=[];for(const side of ['top','right','bottom','left'])for(const size of [2,3,4])for(let offset=0;offset+size<=(['left','right'].includes(side)?l.height:l.width);offset++){
  const cells=Array.from({length:size},(_,i)=>side==='left'?[0,offset+i]:side==='right'?[l.width-1,offset+i]:side==='top'?[offset+i,0]:[offset+i,l.height-1]);if(cells.every(p=>legal.has(p.join(','))))slots.push({side,size,offset});}
 const ordered=rng.shuffle([...source.gates]).sort((a,b)=>Number(l.blocks.some(x=>x.color===b.color&&x.movementAxis))-Number(l.blocks.some(x=>x.color===a.color&&x.movementAxis)));
 const out=[];for(const g of ordered){const bs=l.blocks.filter(b=>(b.layers??[b.color]).includes(g.color)),options=rng.shuffle(slots.filter(p=>{const hor=['left','right'].includes(p.side);const width=Math.max(...bs.map(b=>1+Math.max(...b.shape.map(q=>q[hor?1:0]))));return bs.every(b=>!b.movementAxis||(b.movementAxis==='horizontal')===hor)&&width<=p.size&&(p.size<=3||width===p.size)&&!Array.from({length:p.size},(_,i)=>p.side+':'+(p.offset+i)).some(k=>rail.has(k));}));if(!options.length)return null;const p=options[0];out.push({id:`v146-${id}-gate-${g.color}`,...g,...p});for(let t=p.offset;t<p.offset+p.size;t++)rail.add(p.side+':'+t);}
 return out;
}
function make(){const l=structuredClone(base.level);for(const k of ['blocks','gates','shutters','generators'])delete l[k];l.blocks=[];l.gates=[];l.difficulty=target.difficulty;l.preservedMoveTarget=base.starTargets.moveTarget;const adaptations=[];
 if(id===63){const items=structuredClone(source.stages[0].items);const change=rng.shuffle(items.filter(b=>b.kind==='L3')).slice(0,3);for(const b of change){b.kind='H3';adaptations.push({sourceId:b.sourceId,from:'L3',to:'H3',reason:'源异形8/18超30%，最少3件同面积改矩形；保18体、48格、颜色及轴向/外壳。'});}const packed=pack(items,l.playable,rng,Number(process.env.PACK_TRIES??12000),true);if(!packed)return fail('packing');l.blocks=packed.map(b=>({id:`v146-${id}-${b.sourceId}`,x:b.x,y:b.y,color:b.color,shape:b.shape,...(b.layers?{layers:b.layers}:{}),...(b.movementAxis?{movementAxis:b.movementAxis}:{})}));}
 else if(id===61){
  const covers=[];for(let y=1;y+3<=l.height-1;y++)covers.push({x:0,y,width:6,height:3});
  const cover={id:'v146-61-cover-4',...pick(covers),count:4};l.shutters=[cover];
  const opening=structuredClone(source.stages[0].items),openingColors=[...new Set(opening.map(b=>b.color))];
  opening.push({sourceId:'added-h3',color:pick(openingColors),kind:'H3'},{sourceId:'added-h2',color:pick(openingColors),kind:'H2'});
  const inCover=([x,y])=>x>=cover.x&&x<cover.x+cover.width&&y>=cover.y&&y<cover.y+cover.height;
  const op=pack(opening,l.playable.filter(p=>!inCover(p)),rng,Number(process.env.PACK_TRIES??12000),true);if(!op)return fail('opening-pack');
  const hi=pack(structuredClone(source.stages[1].items),l.playable.filter(inCover),rng,8000,false);if(!hi)return fail('hidden-pack');
  l.blocks=[...op,...hi.map(b=>({...b,shutterId:cover.id}))].map(b=>({id:`v146-${id}-${b.sourceId}`,x:b.x,y:b.y,color:b.color,shape:b.shape,...(b.movementAxis?{movementAxis:b.movementAxis}:{}),...(b.shutterId?{shutterId:b.shutterId}:{})}));
  adaptations.push({from:'opening 27 cells',to:'opening 32 cells',reason:'保留50格原创轮廓、隐藏18格，源开局27格不足，最少补H3+H2两个独立普通块；不增加机关。'});
 }
 else throw Error('Construction not implemented for '+id);
 const gates=gatesFor(l,l.generators);if(!gates)return fail('gates');l.gates=gates;
 try{api.validateLevel(l);if(!l.blocks.every(b=>art.matchFormalBlockShape(b.shape,'native-only')))return fail('native');const a=api.auditCandidateBlockArt(l);if(!a.passed)return fail('art');const issues=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));if(issues.length)return fail(issues[0].code);}catch(e){return fail('invalid:'+e.message);}return {level:l,adaptations};}
if(mode==='generate'){
 const end=Date.now()+Number(process.env.SECONDS??300)*1000;let attempts=0,valid=0,witnesses=0;const outputs=[];
 while(Date.now()<end){attempts++;const made=make();if(!made)continue;valid++;const r=(made.level.generators?.length?queueSearch:graphSearch)(made.level,{floor:target.range[1]+1,maxStates:120000,maxMilliseconds:Number(process.env.SEARCH_MS??1000),weight:1000,orderSeed:attempts%made.level.blocks.length});if(r.status!=='witness'||r.cost<target.range[0])continue;const replay=api.replayRevisedRoute(made.level,r.drags);if(!replay.valid||!replay.complete){fail('replay:'+replay.error);continue;}witnesses++;
 const projected=structuredClone(made.level);for(const b of projected.blocks)delete b.movementAxis;
 const floor=made.level.generators?.length?{status:'unrun'}:checkSymmetryFloor(projected,{floor:target.range[0],maxStates:300000,maxMilliseconds:Number(process.env.FLOOR_MS??4000)});
 const data={activeRuleVersion:lock.activeVersion,generationContract:'1.45.0',seed,attempts,...made,source,drags:r.drags,replay,search:r,axisRemovedFloor:floor,levelSha256:digest(made.level),routeSha256:digest(r.drags),formalAdopted:false,pointerValidated:false};const out=write(`draft${id}-${seed}-${attempts}-${Date.now()}.json`,data);outputs.push(out);console.log(JSON.stringify({out,U:replay.nonClearingDrags,floor:floor.status,valid,attempts}));if(floor.thresholdProven)break;
 }
 const summary={id,seed,attempts,valid,witnesses,diagnostics,outputs};write(`run${id}-${seed}-${Date.now()}.json`,summary);console.log(JSON.stringify(summary));
}else throw Error('Usage generate ID');
