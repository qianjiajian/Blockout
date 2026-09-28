import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {loadApi} from '../../remake21to30-v120.mjs';
import {campaignCadence} from '../../campaign31-200-plan-v145.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
import {SHAPES,rect,pack,seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {search as graphSearch} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
import {search as queueSearch} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/queue-search.mjs';
import {checkSymmetryFloor as checkAxisFloor} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/axis-symmetry-floor.mjs';
import {checkFullGeneratorFloor} from './remake61to70-full-generator-floor-v146.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const ROOT='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64';
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
const source62={stages:[{id:'opening',items:[['yellow','SQ2'],['blue','H2'],['purple','H2'],['green','L3',['green','blue']],['green','H2'],['purple','H2'],['red','V2'],['cyan','H3'],['green','H2'],['blue','SQ2'],['green','SQ2',['green','pink']],['cyan','V2'],['yellow','V2']].map(([color,kind,layers],i)=>({sourceId:'opening-'+(i+1),color,kind,...(layers?{layers}:{})}))},{id:'cover-4',count:4,items:[['blue','V3',5],['blue','H2'],['pink','H2'],['green','H2'],['yellow','H2'],['red','V2'],['yellow','V2']].map(([color,kind,frozen],i)=>({sourceId:'cover-4-'+(i+1),color,kind,...(frozen?{frozen}:{})}))},{id:'generator-1',items:[['pink','H3'],['blue','SQ2'],['pink','L4']].map(([color,kind],i)=>({sourceId:'cargo-'+(i+1),color,kind}))}],gates:[['yellow',0],['purple',1],['green',3],['pink',5],['cyan',7],['blue',8],['red',11]].map(([color,frozen])=>({color,...(frozen?{frozen}:{})}))};
const source64={paletteMapping:{lime:'orange',darkGreen:'green'},stages:[{id:'opening',items:[['yellow','SINGLE'],['red','SINGLE'],['yellow','SINGLE'],['red','SINGLE'],['blue','SINGLE'],['purple','SINGLE'],['red','SINGLE'],['green','H2'],['purple','V2'],['yellow','V2'],['blue','L3']]},{id:'cover-5',count:5,items:[['yellow','H2'],['green','V2'],['purple','L3'],['orange','L3'],['blue','V2']]},{id:'cover-8',count:8,items:[['cyan','V3'],['green','SQ3'],['blue','L4'],['green','L4',['green','orange']],['red','S4']]},{id:'cover-13',count:13,items:[['cyan','L3',null,3],['purple','T4',['purple','green']],['blue','L4',['blue','cyan']],['purple','L4'],['green','V3']]}].map(s=>({...s,items:s.items.map(([color,kind,layers,frozen],i)=>({sourceId:s.id+'-'+(i+1),color,kind,...(layers?{layers}:{}),...(frozen?{frozen}:{})}))})),gates:[['red',0],['purple',3],['green',6],['yellow',8],['orange',16],['blue',17],['cyan',22]].map(([color,frozen])=>({color,...(frozen?{frozen}:{})}))};
const sourceFile=process.env.SOURCE;const source=sourceFile?JSON.parse(fs.readFileSync(sourceFile)):id===63?source63:id===61?source61:id===62?source62:id===64?source64:null;
assert(source,'Source rows required');
const diagnostics={};const fail=s=>{diagnostics[s]=(diagnostics[s]??0)+1;return null;};
const mutationBase=process.env.MUTATE_FILE?JSON.parse(fs.readFileSync(process.env.MUTATE_FILE)):null;
const write=(name,data)=>{fs.mkdirSync(ROOT,{recursive:true});const p=ROOT+'/'+name;fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
function gatesFor(l,machines=[]){const legal=new Set(l.playable.map(p=>p.join(','))),rail=new Set();for(const m of machines)for(let i=m.offset-1;i<=m.offset+1;i++)rail.add(m.side+':'+i);
 const slots=[];for(const side of ['top','right','bottom','left'])for(const size of [2,3,4])for(let offset=0;offset+size<=(['left','right'].includes(side)?l.height:l.width);offset++){
  const cells=Array.from({length:size},(_,i)=>side==='left'?[0,offset+i]:side==='right'?[l.width-1,offset+i]:side==='top'?[offset+i,0]:[offset+i,l.height-1]);if(cells.every(p=>legal.has(p.join(','))))slots.push({side,size,offset});}
 const ordered=rng.shuffle([...source.gates]).sort((a,b)=>Number(!b.frozen)-Number(!a.frozen)||Number(l.blocks.some(x=>x.color===b.color&&x.movementAxis))-Number(l.blocks.some(x=>x.color===a.color&&x.movementAxis)));
 const out=[];for(const g of ordered){const bs=l.blocks.filter(b=>(b.layers??[b.color]).includes(g.color)),options=rng.shuffle(slots.filter(p=>{const hor=['left','right'].includes(p.side);const width=Math.max(...bs.map(b=>1+Math.max(...b.shape.map(q=>q[hor?1:0]))));if(!g.frozen&&!bs.some(b=>!b.shutterId&&!machines.some(m=>m.queueBlockIds?.includes(b.id))&&b.color===g.color&&((p.side==='left'&&b.x===0)||(p.side==='right'&&b.x+1+Math.max(...b.shape.map(q=>q[0]))===l.width)||(p.side==='top'&&b.y===0)||(p.side==='bottom'&&b.y+1+Math.max(...b.shape.map(q=>q[1]))===l.height))&&(hor?b.y:b.x)>=p.offset&&(hor?b.y:b.x)+1+Math.max(...b.shape.map(q=>q[hor?1:0]))<=p.offset+p.size))return false;return bs.every(b=>!b.movementAxis||((b.movementAxis==='horizontal')===hor&&(hor?b.y:b.x)>=p.offset&&(hor?b.y:b.x)+1+Math.max(...b.shape.map(q=>q[hor?1:0]))<=p.offset+p.size))&&width<=p.size&&(p.size<=3||width===p.size)&&!Array.from({length:p.size},(_,i)=>p.side+':'+(p.offset+i)).some(k=>rail.has(k));}));if(!options.length)return null;const p=options[0];out.push({id:`v146-${id}-gate-${g.color}`,...g,...p});for(let t=p.offset;t<p.offset+p.size;t++)rail.add(p.side+':'+t);}
 return out;
}
function make(){
 if(mutationBase){const l=structuredClone(mutationBase.level);
  if(rng.rand()<.8){const pairs=[];for(let i=0;i<l.blocks.length;i++)for(let j=0;j<i;j++){const a=l.blocks[i],b=l.blocks[j];if(a.shutterId===b.shutterId&&JSON.stringify(a.shape)===JSON.stringify(b.shape)&&!l.generators?.some(g=>g.queueBlockIds.includes(a.id)||g.queueBlockIds.includes(b.id)))pairs.push([a,b]);}const[a,b]=pick(pairs);[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}else{const gate=pick(l.gates);gate.offset+=pick([-2,-1,1,2]);if(rng.rand()<.2)gate.size=gate.size===2?3:2;}
  try{api.validateLevel(l);const issues=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));if(issues.length)return fail(issues[0].code);}catch{return fail('invalid-mutation');}return{level:l,adaptations:mutationBase.adaptations};}
 const l=structuredClone(base.level);for(const k of ['blocks','gates','shutters','generators'])delete l[k];l.blocks=[];l.gates=[];l.difficulty=target.difficulty;l.preservedMoveTarget=base.starTargets.moveTarget;const adaptations=[];
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
 else if(id===62){
  const cover={id:'v146-62-cover-4',x:pick([0,1]),y:pick([1,2,3,4,5]),width:5,height:3,count:4};l.shutters=[cover];
  const opening=structuredClone(source.stages[0].items);opening.find(b=>b.sourceId==='opening-4').kind='H3';opening.push({sourceId:'added-single',color:pick(source.gates.map(g=>g.color)),kind:'SINGLE'});
  const inCover=([x,y])=>x>=cover.x&&x<cover.x+cover.width&&y>=cover.y&&y<cover.y+cover.height;
  const op=pack(opening,l.playable.filter(p=>!inCover(p)),rng,Number(process.env.PACK_TRIES??1500),true);if(!op)return fail('opening-pack');
  const hi=pack(structuredClone(source.stages[1].items),l.playable.filter(inCover),rng,8000,false);if(!hi)return fail('hidden-pack');
  const machine={id:'v146-62-machine',side:'left',offset:pick([2,3,4,5,6]),rimSpan:3,rimMount:'rim'};machine.spawn=[0,machine.offset];
  const cargo=source.stages[2].items.map(b=>({...b,x:machine.spawn[0],y:machine.spawn[1],shape:SHAPES[b.kind][0]}));
  l.blocks=[...op,...hi.map(b=>({...b,shutterId:cover.id})),...cargo].map(b=>({id:`v146-${id}-${b.sourceId}`,x:b.x,y:b.y,color:b.color,shape:b.shape,...(b.layers?{layers:b.layers}:{}),...(b.frozen?{frozen:b.frozen}:{}),...(b.shutterId?{shutterId:b.shutterId}:{})}));
  machine.queueBlockIds=cargo.map(b=>`v146-${id}-${b.sourceId}`);l.generators=[machine];
  adaptations.push({from:'source opening34+hidden15=49 cells',to:'retained50 cells',reason:'保棋盘50格比实帧源多一格，补1普通单格；保持确帧源7藏块含冰5和3货队列。'});
  adaptations.push({sourceId:'opening-4',from:'L3',to:'H3',reason:'green原向L3缺整块外壳图，独立art审计确证missing-whole-block-art；同面积H3保green外blue内、层数和独立块数。'});
 }
 else if(id===64){
  const cells=new Set(l.playable.map(p=>p.join(','))),used=new Set(),covers=[];
  for(const[count,w,h]of[[5,3,4],[13,3,6],[8,4,5]]){const options=[];for(let y=0;y+h<=l.height;y++)for(let x=0;x+w<=l.width;x++){const points=rect(w,h).map(([dx,dy])=>[x+dx,y+dy].join(','));if(points.every(p=>cells.has(p)&&!used.has(p)))options.push({x,y,width:w,height:h,points});}if(!options.length)return fail('cover-layout');const p=pick(options);p.points.forEach(c=>used.add(c));const{points,...r}=p;covers.push({id:`v146-64-cover-${count}`,...r,count});}
  l.shutters=covers;
  const op=pack(structuredClone(source.stages[0].items),l.playable.filter(p=>!used.has(p.join(','))),rng,Number(process.env.PACK_TRIES??1500),true);if(!op)return fail('opening-pack');
  const available=new Set(l.playable.filter(p=>!used.has(p.join(','))).map(p=>p.join(','))),red=op.find(b=>b.color==='red'),connected=new Set([[red.x,red.y].join(',')]);for(const p of connected){const[x,y]=p.split(',').map(Number);for(const q of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].map(p=>p.join(',')))if(available.has(q))connected.add(q);}if(op.filter(b=>['red','purple'].includes(b.color)).some(b=>!connected.has([b.x,b.y].join(','))))return fail('opening-five-clear-component');
  const all=[...op];for(const stage of source.stages.slice(1)){const items=structuredClone(stage.items),cover=covers.find(c=>c.count===stage.count);
   if(stage.count===8){for(const[sid,to]of[['cover-8-4','SQ2'],['cover-8-2','RECT6'],['cover-8-1','V2']]){const b=items.find(b=>b.sourceId===sid),from=b.kind;b.kind=to;adaptations.push({sourceId:sid,from,to,reason:sid==='cover-8-4'?'原向L4整块外壳图不存在，同面积SQ2保green外orange内；同时满足异形比例。':'保66格比源70格少4格，优先普通矩形同体缩面积：SQ3减3格、V3减1格，保机制实例和计数，4×5区域真实铺满。'});}}
   if(stage.count===13){for(const sid of['cover-13-2','cover-13-3']){const b=items.find(b=>b.sourceId===sid),from=b.kind;b.kind='SQ2';adaptations.push({sourceId:b.sourceId,from,to:'SQ2',reason:'原向T4/L4整块外壳图不存在，换同面积SQ2保原外内颜色、层数和隐藏批次；三壳原向修复同时满足异形比例。'});}}
   const bs=pack(items,rect(cover.width,cover.height).map(([dx,dy])=>[cover.x+dx,cover.y+dy]),rng,8000,false);if(!bs)return fail('hidden-pack-'+stage.count);all.push(...bs.map(b=>({...b,shutterId:cover.id})));
  }
  l.blocks=all.map(b=>({id:`v146-${id}-${b.sourceId}`,x:b.x,y:b.y,color:b.color,shape:b.shape,...(b.layers?{layers:b.layers}:{}),...(b.frozen?{frozen:b.frozen}:{}),...(b.shutterId?{shutterId:b.shutterId}:{})}));
 }
 else throw Error('Construction not implemented for '+id);
 const gates=gatesFor(l,l.generators);if(!gates)return fail('gates');l.gates=gates;
 try{api.validateLevel(l);if(!l.blocks.every(b=>art.matchFormalBlockShape(b.shape,'native-only')))return fail('native');const a=api.auditCandidateBlockArt(l);if(!a.passed){if(!diagnostics.art)write(`art-failure-${id}-${Date.now()}.json`,{level:l,audit:a});return fail('art');}const issues=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));if(issues.length)return fail(issues[0].code);}catch(e){return fail('invalid:'+e.message);}return {level:l,adaptations};}
if(mode==='reproduce'){
 const finalAttempt=Number(process.env.ATTEMPT);assert(finalAttempt>0);let made;for(let i=1;i<=finalAttempt;i++)made=make();assert(made);const expected=process.env.EXPECT_SHA;const actual=digest(made.level);assert(!expected||expected===actual,`Reproduction mismatch ${actual}`);const out=write(`reproduction${id}-${seed}-${finalAttempt}-${Date.now()}.json`,{id,seed,attempts:finalAttempt,levelSha256:actual,expectedSha256:expected,matched:!expected||expected===actual,...made});console.log(JSON.stringify({out,actual,matched:true}));
}else if(mode==='generate'){
 const end=Date.now()+Number(process.env.SECONDS??300)*1000;let attempts=0,valid=0,witnesses=0;const outputs=[];
 while(Date.now()<end){attempts++;if(attempts%500===0)console.log(JSON.stringify({id,attempts,valid,witnesses,diagnostics}));const made=make();if(!made)continue;valid++;if(valid===1)write(`prototype${id}-${seed}-${Date.now()}.json`,{activeRuleVersion:lock.activeVersion,...made,source,seed,attempts,status:'static-only-no-complete-route'});const r=(made.level.generators?.length?queueSearch:graphSearch)(made.level,{floor:target.range[1]+1,maxStates:120000,maxMilliseconds:Number(process.env.SEARCH_MS??1000),weight:1000,orderSeed:attempts%made.level.blocks.length});if(r.status!=='witness'){fail('search-'+r.status);continue;}if(r.cost<target.range[0]){fail('below-band-'+r.cost);continue;}const replay=api.replayRevisedRoute(made.level,r.drags);if(!replay.valid||!replay.complete){fail('replay:'+replay.error);continue;}witnesses++;
 const projected=structuredClone(made.level);for(const b of projected.blocks)delete b.movementAxis;
 const floor=made.level.generators?.length?checkFullGeneratorFloor(made.level,api,{floor:target.range[0],maxStates:300000,maxMilliseconds:Number(process.env.FLOOR_MS??4000)}):checkAxisFloor(made.level,{floor:target.range[0],maxStates:300000,maxMilliseconds:Number(process.env.FLOOR_MS??4000)});
 const data={activeRuleVersion:lock.activeVersion,generationContract:'1.45.0',seed,attempts,...made,source,drags:r.drags,replay,search:r,axisRemovedFloor:floor,levelSha256:digest(made.level),routeSha256:digest(r.drags),formalAdopted:false,pointerValidated:false};const out=write(`draft${id}-${seed}-${attempts}-${Date.now()}.json`,data);outputs.push(out);console.log(JSON.stringify({out,U:replay.nonClearingDrags,floor:floor.status,valid,attempts}));if(floor.thresholdProven)break;
 }
 const summary={id,seed,attempts,valid,witnesses,diagnostics,outputs};write(`run${id}-${seed}-${Date.now()}.json`,summary);console.log(JSON.stringify(summary));
}else if(mode==='source'){
 const frames=id===64?['0236','0254','0269','0283','0285','0290','0295']:id===62?['0097','0107','0111','0148','0152','0153']:['0172'];
 const bindings=Object.fromEntries(frames.map(n=>{const p=`.codex-temp/video-audit-41-70/frames-61-70/frame-${n}.jpg`;return[p,digest(fs.readFileSync(p))];}));
 console.log(write(`source-inventory${id}-${Date.now()}.json`,{activeRuleVersion:lock.activeVersion,id,source,bindings,sourceFactNotCandidate:true}));
}else throw Error('Usage generate|source ID');
