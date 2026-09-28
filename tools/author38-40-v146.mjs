// Isolated authoring and fresh v1.47 verification for 38-40; historical files are read-only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,BASELINE,auditCandidate,checkCandidate,proveFloor,TARGETS} from './remake31to40-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {shapeClass} from './remake31to40-source-v141.mjs';
import {search,compile,each} from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {SHAPES,rect,pack,seededRng} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';

const lock=ruleGate(),{api}=await loadApi(),base=JSON.parse(fs.readFileSync(BASELINE));
const catalog=JSON.parse(fs.readFileSync('deliverables/remake31-40-v141-20260924/source-catalog.json'));
const root='deliverables/remake31-40-v146-20260924/agent38-40';
const write=(name,data)=>{fs.mkdirSync(root,{recursive:true});const p=root+'/'+name;fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
const [mode,arg,file]=process.argv.slice(2),id=Number(arg??38),target=TARGETS[id],source=catalog.records[id];
for(const kind of Object.keys(SHAPES))SHAPES[kind]=SHAPES[kind].filter(s=>api.matchFormalBlockShape(s,'native-only'));
SHAPES.CROSS5=api.FORMAL_BLOCK_SHAPES.filter(s=>s.shapeId===12).map(s=>s.cells);
const seed=Number(process.env.SEED??146000+id),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)];
const colors=source.fullColors.map(c=>c==='magenta'?'pink':c),colorMapping=Object.fromEntries(source.fullColors.map(c=>[c,c==='magenta'?'pink':c]));
const item=s=>({sourceId:s.id,kind:s.shape,color:colorMapping[s.color],frozen:s.frozen});
const diagnostics={},fail=k=>{diagnostics[k]=(diagnostics[k]??0)+1;return null;};
const asBlock=(b,shutterId)=>({id:`v147-${id}-${b.sourceId}`,x:b.x,y:b.y,shape:b.shape,color:b.color,...(b.frozen?{frozen:b.frozen}:{}),...(shutterId?{shutterId}:{})});
function gatesFor(l,machine){
 const occupied=new Set(Array.from({length:3},(_,i)=>machine.side+':'+(machine.offset-1+i))),slots=[];
 for(const side of ['top','right','bottom','left'])for(const size of [2,3])for(let offset=0;offset+size<=(['top','bottom'].includes(side)?l.width:l.height);offset++){
  const pts=Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,l.height-1]:side==='left'?[0,offset+i]:[l.width-1,offset+i]);
  if(pts.every(p=>l.playable.some(q=>q[0]===p[0]&&q[1]===p[1]))&&!Array.from({length:size},(_,i)=>side+':'+(offset+i)).some(k=>occupied.has(k)))slots.push({side,offset,size});
 }
 const selected=source.gates.filter(g=>!source.gates.some(h=>h.color===g.color&&h.frozen<g.frozen));
 const chosen=[],bindings=[];
 for(const g of [...selected].sort((a,b)=>a.frozen-b.frozen)){const col=colorMapping[g.color];
  const opts=slots.filter(p=>l.blocks.filter(b=>b.color===col).every(b=>Math.max(...b.shape.map(q=>['left','right'].includes(p.side)?q[1]:q[0]))<p.size)&&!Array.from({length:p.size},(_,i)=>p.side+':'+(p.offset+i)).some(k=>occupied.has(k))&&
   (id!==39||Array.from({length:p.size},(_,i)=>p.side==='top'?[p.offset+i,0]:p.side==='bottom'?[p.offset+i,l.height-1]:p.side==='left'?[0,p.offset+i]:[l.width-1,p.offset+i]).every(([x,y])=>!(l.shutters??[]).some(s=>s.count>g.frozen&&x>=s.x&&x<s.x+s.width&&y>=s.y&&y<s.y+s.height)))&&
   (g.frozen>0||l.blocks.some(b=>!b.shutterId&&!b.frozen&&!l.generators[0].queueBlockIds.includes(b.id)&&b.color===col&&
    (p.side==='top'?b.y===0:p.side==='left'?b.x===0:p.side==='bottom'?b.y+Math.max(...b.shape.map(q=>q[1]))===l.height-1:b.x+Math.max(...b.shape.map(q=>q[0]))===l.width-1)&&
    b.shape.every(([x,y])=>{const t=['left','right'].includes(p.side)?b.y+y:b.x+x;return t>=p.offset&&t<p.offset+p.size;}))));
  if(!opts.length)return null;const p=pick(opts);Array.from({length:p.size},(_,i)=>occupied.add(p.side+':'+(p.offset+i)));
  const gid=`v147-${id}-gate-${col}`;chosen.push({id:gid,color:col,...p,...(g.frozen?{frozen:g.frozen}:{})});bindings.push({sourceId:g.id,gateId:gid});
 }
 return {gates:chosen,bindings,omitted:source.gates.filter(g=>!selected.includes(g)).map(g=>({sourceId:g.id,reason:'源同色多个非星实体口与每色唯一硬规则冲突，只移除重复门；保留该色现有最早可用实例及其原始冰值。'}))};
}
function rectangles(l,w,h){const a=[];for(let y=0;y+h<=l.height;y++)for(let x=0;x+w<=l.width;x++){const cells=rect(w,h).map(([dx,dy])=>[x+dx,y+dy]);if(cells.every(p=>l.playable.some(q=>p[0]===q[0]&&p[1]===q[1])))a.push({x,y,width:w,height:h,cells});}return a;}
function components(cells){const left=new Set(cells.map(String)),out=[];while(left.size){const q=[[...left][0]];left.delete(q[0]);for(let i=0;i<q.length;i++){const[x,y]=q[i].split(',').map(Number);for(const p of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].map(String))if(left.delete(p))q.push(p);}out.push(q);}return out.sort((a,b)=>b.length-a.length);}
let configurations=null;
function configs39(l){if(configurations)return configurations;const twelves=rectangles(l,3,4).concat(rectangles(l,4,3),rectangles(l,2,6),rectangles(l,6,2));const lists=[rectangles(l,4,5).concat(rectangles(l,5,4)),twelves,twelves],out=[];
 const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 for(const a of lists[0])for(const b of lists[1])if(!overlap(a,b))for(const c of lists[2])if(!overlap(a,c)&&!overlap(b,c))out.push([a,b,c]);
 configurations=out.filter(cs=>components(l.playable.filter(([x,y])=>!cs.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height)))[0].length>=12);console.log(JSON.stringify({id,geometries:configurations.length}));return configurations;
}
export function make(){
 const old=base.levels[id-1],l=structuredClone(old.level);l.blocks=[];l.gates=[];delete l.shutters;delete l.generators;l.difficulty=target.difficulty;l.preservedMoveTarget=old.starTargets.moveTarget;
 const adaptations={colorMapping,stageMapping:{},blockMapping:{},stages:{},carrierShapeRationales:{},queueColorRationales:{}};
 let covers,openSpec=source.stages.find(s=>s.id==='opening').items.map(item),hiddenSpecs=source.stages.filter(s=>s.kind==='countdown_cover').map(s=>s.items.map(item));
 if(id===38){
  const y=process.env.COVER_Y===undefined?pick([0,3]):Number(process.env.COVER_Y);covers=[{x:0,y,width:6,height:5,cells:rect(6,5).map(([x,dy])=>[x,y+dy])}];
  // 26 source hidden cells have no rectangular footprint within 6x8; the 6x5
  // carrier retains all known bodies, adding exactly four cells as two H2 bodies.
  if(process.env.FILL_SINGLES==='1'){
   hiddenSpecs[0].push(...[0,1,2,3].map(i=>({sourceId:'added-hidden-'+i,kind:'SINGLE',color:process.env.HARD_GREEN==='1'?'green':pick(colors)})));
   adaptations.stages['cover-1']={rationale:'源8件隐藏26格位于30格帘区，四个散缺格须真实补满；保全部已知七H3与CROSS5原向形状和颜色配对，仅添四独立原向单格，源机关及帘15保持。'};
  }else{
   hiddenSpecs[0].push(...[0,1].map(i=>({sourceId:'added-hidden-'+i,kind:'H2',color:process.env.HARD_GREEN==='1'?'green':pick(colors)})));
   pick(hiddenSpecs[0].filter(b=>b.kind==='H3'&&(process.env.HARD_GREEN!=='1'||b.color!=='green'))).kind='L3';
   adaptations.stages['cover-1']={rationale:'源8件隐藏26格位于30格帘区，补两件H2四格。原向CROSS5+七H3+两H2无法平铺6×5：横十字中排可供H3填充时两外排必留1格边隙；仅一H3同面积换原向L3解冲突，源颜色/批次/计数15不变。'};
  }
 }else if(id===39){
  covers=pick(configs39(l));if(!covers)return fail('no-geometry');
  hiddenSpecs[1].find(b=>b.kind==='SINGLE').kind=pick(['H2','V2']);
  hiddenSpecs[2].find(b=>b.kind==='SQ2'&&!b.frozen).kind='SINGLE';
  // Source review recommends this minimal two-carrier adaptation: preserve all
  // opening shapes and all mechanism-carrier shapes; 20+12+12+16 = 60.
  adaptations.stages['cover-2']={rationale:'源11格隐藏批次不能在8×8内形成矩形；唯一普通SINGLE扩为2格，保持六件颜色配对、冰1载体和帘22，形成12格真矩形。'};
  adaptations.stages['cover-3']={rationale:'保四角裁切60格、原开局16格与第一仓20格，第二仓补至12格后本仓须从15减至12；仅普通紫SQ2缩为SINGLE，所有冰载体形状、初值1、五件颜色/帘5保持。'};
 }
 const coverSources=source.stages.filter(s=>s.kind==='countdown_cover');
 l.shutters=covers.map((r,i)=>({id:`v147-${id}-${coverSources[i].id}`,x:r.x,y:r.y,width:r.width,height:r.height,count:coverSources[i].counter}));
 const packBudget=Number(process.env.PACK_TRIES??3000);
 for(let j=0;j<covers.length;j++){
  const packed=pack(hiddenSpecs[j],covers[j].cells,rng,packBudget,false);if(!packed)return fail('hidden-'+j);
  l.blocks.push(...packed.map(b=>asBlock(b,l.shutters[j].id)));adaptations.stageMapping[coverSources[j].id]=l.shutters[j].id;
 }
 const remaining=l.playable.filter(p=>!covers.some(r=>p[0]>=r.x&&p[0]<r.x+r.width&&p[1]>=r.y&&p[1]<r.y+r.height));
 const packed=pack(openSpec,remaining,rng,packBudget,true);if(!packed)return fail('opening');l.blocks.unshift(...packed.map(b=>asBlock(b)));
 if(id===39){const largest=components(remaining)[0],inside=packed.filter(b=>largest.includes([b.x,b.y].join(',')));if(inside.filter(b=>b.color==='yellow').length<3||inside.filter(b=>b.color==='purple').length<2)return fail('initial-colour-components');}
 for(const st of source.stages.filter(s=>s.kind!=='side_generator'))for(const s of st.items){const b=l.blocks.find(b=>b.id===`v147-${id}-${s.id}`);assert(b);adaptations.blockMapping[s.id]=[b.id];if(shapeClass(b.shape)!==s.shape)adaptations.carrierShapeRationales[b.id]=adaptations.stages[st.id].rationale;}
 const possible=[];for(const side of ['top','left','right','bottom'])for(let offset=1;offset<(['top','bottom'].includes(side)?l.width:l.height)-1;offset++){
  const center=side==='top'?[offset,0]:side==='bottom'?[offset,l.height-1]:side==='left'?[0,offset]:[l.width-1,offset];
  if(id===38&&covers.some(r=>center[0]>=r.x&&center[0]<r.x+r.width&&center[1]>=r.y&&center[1]<r.y+r.height))continue;
  const cargo=source.stages.find(s=>s.kind==='side_generator');const shape=SHAPES[cargo.items[0].shape][0];
  for(const [ax,ay]of shape){const spawn=[center[0]-ax,center[1]-ay];if(cargo.items.every(it=>SHAPES[it.shape][0].every(([dx,dy])=>l.playable.some(p=>p[0]===spawn[0]+dx&&p[1]===spawn[1]+dy)))&&cargo.items.every(it=>SHAPES[it.shape][0].some(([dx,dy])=>spawn[0]+dx===center[0]&&spawn[1]+dy===center[1])))possible.push({side,offset,spawn});}
 }
 if(!possible.length)return fail('machine');const machine=pick(possible),qsrc=source.stages.find(s=>s.kind==='side_generator'),ids=[];
 for(const [n,s]of qsrc.items.entries()){const b=asBlock({...item(s),x:machine.spawn[0],y:machine.spawn[1],shape:SHAPES[s.shape][0]});
  if(id===38&&n===0)b.color='yellow';l.blocks.push(b);ids.push(b.id);}
 const gid=`v147-${id}-generator-1`;l.generators=[{id:gid,...machine,rimSpan:3,rimMount:'rim',queueBlockIds:ids}];adaptations.stageMapping[qsrc.id]=gid;
 if(id===38)adaptations.queueColorRationales[qsrc.id]='源队列前两件均blue与相邻异色硬规则冲突，仅首件换yellow；共1件为最少编辑，六件库存、原形与固定顺序不变。';
 const g=gatesFor(l,machine);if(!g)return fail('gates');l.gates=g.gates;adaptations.gateBindings=g.bindings;adaptations.omittedGates=g.omitted;
 const data={ruleVersion:lock.activeVersion,generationContract:'1.45.0',seed:`147-${id}-${seed}`,level:l,sourceAdaptation:adaptations,
  originality:{layoutIntent:id===38?'隐藏库采用规整六列五行仓，开局三行操作区围绕固定补货口组织。':'三片独立矩形仓沿棋盘对齐边界分区，外围错列初始块形成解锁通路。',alignment:'各真实帘区采用完整矩形，色块组沿行列与区域边界对齐，不覆盖裁角或假墙。',changes:'重新安排开局与所有隐藏块邻接关系、帘区和出口，在原棋盘内构建原创空间通路，非全局镜转或仅换色。',constraints:'已知机制、逐块配色及原计数保留；无法矩形满铺的源库存只作逐项记录的必要面积适配。'},
  design:{primaryMechanism:id===38?'冰门顺序与卷帘、固定生成器共同控制通路':'三片计数卷帘和分批隐藏冰，辅以两件固定生成货物',concreteDecision:'先清除可用色块推进冰门与帘区，给后续隐藏多格块预留转移工作位，避免在补货口和出门通路误停。'}};
 try{api.validateLevel(l);const issues=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));if(issues.length)return fail('hard-'+issues[0].code);if(!api.auditCandidateBlockArt(l).passed)return fail('art');if(!l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0))return fail('native');}
 catch(e){return fail('invalid-'+e.message);}return data;
}
function enrich(data){
 const {level,drags}=data,apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
 const from=(c,s)=>Uint16Array.from(c.blocks.map(b=>{const a=s.blocks.find(a=>a.id===b.id);return a?(a.y*c.W+a.x)|((b.layers.length-a.layers.length)<<7):s.queuedBlocks.some(a=>a.id===b.id)?510:511;}));
 const c=compile(level),m=new api.PuzzleModel(level),found=[],queued=new Set((level.generators??[]).flatMap(g=>g.queueBlockIds));m.startCountdown();
 for(let step=0;step<drags.length-1;step++){
  const snap=m.snapshot(),d=drags[step];let local=0;
  each(c,from(c,snap),(_n,cost,get)=>{if(cost!==1)return;const wrong=get(),body=snap.blocks.find(b=>b.id===wrong.blockId);if(body.id===d.blockId||body.shape.length<2)return;
   const prefix=drags.slice(0,step),blocked=api.replayRevisedRoute(level,[...prefix,wrong,d]);if(blocked.valid||!blocked.error?.startsWith('Rejected move'))return;
   if(!api.replayRevisedRoute(level,[...prefix,wrong]).valid)return;const recovery={blockId:body.id,path:[[body.x,body.y],...wrong.path.slice(0,-1)].reverse()};
   const restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]),initial=api.replayRevisedRoute(level,prefix);if(!restored.valid||restored.finalStateKey!==initial.finalStateKey)return;
   const full=[...prefix,wrong,recovery,...drags.slice(step)],r=api.replayRevisedRoute(level,full);if(!r.valid||!r.complete)return;
   found.push({atStep:step+1,beforeDrag:step+1,blockId:body.id,area:body.shape.length,correctDrag:d,legalWrongParking:wrong,blockedNextAction:d,recoveryDrag:recovery,fullRecoveredRoute:full,mechanismContext:{cleared:snap.cleared,isGeneratorCargo:queued.has(body.id),nextActionIsCargo:queued.has(d.blockId),machineRemaining:snap.generators.map(g=>g.remaining)},consequence:'合法多格误停堵住下一拖；恢复原状态后完整路线可完成，不宣称全局唯一解或最优错误代价。',score:body.shape.length+(queued.has(body.id)?35:0)+(queued.has(d.blockId)?25:0)});if(++local>=4)return false;
  });apply(m,d);
 }
 found.sort((a,b)=>b.score-a.score||a.atStep-b.atStep);data.decisionCases=[];
 for(const x of found)if(!data.decisionCases.some(c=>c.blockId===x.blockId||c.atStep===x.atStep)){delete x.score;data.decisionCases.push(x);if(data.decisionCases.length===3)break;}assert(data.decisionCases.length);
 data.curtainLocalChoices=[];
 for(const curtain of level.shutters??[]){let result=null;for(let i=1;i<drags.length&&!result;i++){
  const prefix=drags.slice(0,i),start=api.replayRevisedRoute(level,prefix);if(!start.valid||start.complete||start.clearEvents<1||start.clearEvents>=curtain.count)continue;
  const changed=structuredClone(level);changed.shutters.find(s=>s.id===curtain.id).count=start.clearEvents;if(!api.replayRevisedRoute(changed,prefix).valid)continue;
  const model=new api.PuzzleModel(changed);model.startCountdown();prefix.forEach(d=>apply(model,d));const cc=compile(changed);
  each(cc,from(cc,model.snapshot()),(_n,_cost,get)=>{const d=get();if(level.blocks.find(b=>b.id===d.blockId).shape.length<2)return;if(api.replayRevisedRoute(level,[...prefix,d]).valid||!api.replayRevisedRoute(changed,[...prefix,d]).valid)return;
   result={curtainId:curtain.id,originalCount:curtain.count,relaxedCount:start.clearEvents,beforeDrag:i+1,prefix,cleared:start.clearEvents,formalRemaining:JSON.parse(start.finalStateKey).shutters.find(s=>s.id===curtain.id).count,blockedAction:d,interpretation:'单独放宽该帘计数令多格动作可用，作为局部机制作用，非全局难度证明。'};return false;});
 }assert(result,'Need local curtain effect '+curtain.id);data.curtainLocalChoices.push(result);}
 return data;
}
if(mode==='generate'){
 let attempts=0,valid=0,solved=0;const deadline=Date.now()+Number(process.env.SECONDS??180)*1000;
 while(Date.now()<deadline){attempts++;if(attempts%100===0)console.log(JSON.stringify({id,attempts,valid,solved,diagnostics}));const data=make();if(!data)continue;valid++;
  if(process.env.SAVE_STATIC==='1'&&valid<=3)write(`static${id}-${seed}-${attempts}-${Date.now()}.json`,data);
  const r=search(data.level,{floor:Number(process.env.WITNESS_MAX??target.max)+1,maxStates:Number(process.env.SEARCH_STATES??80000),maxMilliseconds:Number(process.env.SEARCH_MS??1200),orderSeed:attempts%data.level.blocks.length,weight:Number(process.env.WEIGHT??1000)});
  if(r.status!=='witness'||r.cost<target.min){fail(r.status==='witness'?'short-witness-'+r.cost:'search-'+r.stop);continue;}const replay=api.replayRevisedRoute(data.level,r.drags);if(!replay.valid||!replay.complete)throw Error(JSON.stringify(replay));solved++;
  data.drags=r.drags;data.search=r;data.replay=replay;data.seed+=`-${attempts}`;
  const proof=proveFloor(data.level,api,{maxStates:Number(process.env.PROOF_STATES??150000),maxMilliseconds:Number(process.env.PROOF_MS??1500)});data.constructionProof=proof;
  const out=write(`draft${id}-${seed}-${attempts}-${Date.now()}.json`,data);console.log(JSON.stringify({out,id,U:r.cost,proof:proof.status,attempts,valid,solved}));if(proof.thresholdProven||solved>=Number(process.env.STOP_SOLVED??1000000))break;
 }console.log(JSON.stringify({id,attempts,valid,solved,diagnostics}));
}else if(mode==='mutate38'){
 const initial=JSON.parse(fs.readFileSync(file)),cut=initial.drags.findIndex((_,i)=>api.replayRevisedRoute(initial.level,initial.drags.slice(0,i+1)).clearEvents>=15)+1,prefix=initial.drags.slice(0,cut);
 const pre=api.replayRevisedRoute(initial.level,prefix),prefixCost=pre.nonClearingDrags,until=Date.now()+Number(process.env.SECONDS??180)*1000;let attempts=0,solved=0;
 const curtain=initial.level.shutters[0],cells=rect(curtain.width,curtain.height).map(([x,y])=>[x+curtain.x,y+curtain.y]);
 while(Date.now()<until){attempts++;const data=structuredClone(initial),hidden=data.level.blocks.filter(b=>b.shutterId),spec=hidden.map(b=>({sourceId:b.id,kind:shapeClass(b.shape),color:b.id.includes('added')?(process.env.HARD_GREEN==='1'?'green':pick(colors)):b.color}));
  const packed=pack(spec,cells,rng,3000,false);if(!packed)continue;for(const p of packed){const b=data.level.blocks.find(b=>b.id===p.sourceId);b.x=p.x;b.y=p.y;b.shape=p.shape;b.color=p.color;}
  const m=new api.PuzzleModel(data.level);m.startCountdown();for(const d of prefix){m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());}
  const s=m.snapshot(),suffix={...structuredClone(data.level),generators:[],shutters:[],blocks:s.blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,color:b.layers[0]})),gates:data.level.gates.map(g=>{const b=s.gates.find(b=>b.id===g.id),q=structuredClone(g);if(b.frozen>0)q.frozen=b.frozen;else delete q.frozen;return q;})};
  const r=search(suffix,{floor:target.max-prefixCost+1,maxStates:60000,maxMilliseconds:500,orderSeed:attempts%suffix.blocks.length,weight:1000});if(r.status!=='witness')continue;
  data.drags=[...prefix,...r.drags];data.replay=api.replayRevisedRoute(data.level,data.drags);assert(data.replay.valid&&data.replay.complete);if(data.replay.nonClearingDrags<target.min)continue;
  delete data.decisionCases;delete data.curtainLocalChoices;delete data.constructionProof;data.seed=`147-38-mutation-${seed}-${attempts}`;solved++;
  data.constructionProof=proveFloor(data.level,api,{maxStates:150000,maxMilliseconds:1000});const out=write(`mutation38-${seed}-${attempts}-${Date.now()}.json`,data);console.log(JSON.stringify({out,U:data.replay.nonClearingDrags,proof:data.constructionProof.status,attempts,solved}));
  if(data.constructionProof.thresholdProven||solved>=Number(process.env.MAX_SOLVED??5))break;
 }console.log(JSON.stringify({mode,attempts,solved}));
}else if(mode==='enrich'){
 const data=enrich(JSON.parse(fs.readFileSync(file)));auditCandidate(data,base,api);const out=write(`candidate${id}-${Date.now()}.json`,data);console.log(JSON.stringify({out}));
}else if(mode==='check'){
 const data=JSON.parse(fs.readFileSync(file)),r=checkCandidate(data,base,api,{maxStates:Number(process.env.PROOF_STATES??3000000),maxMilliseconds:Number(process.env.PROOF_MS??240000)});const out=write(`check${id}-${Date.now()}.json`,r);console.log(JSON.stringify({out,id,L:r.lowerBound,U:r.upperBound}));
}else if(mode==='solve'){
 const data=JSON.parse(fs.readFileSync(file));let best=null;for(let order=0;order<data.level.blocks.length;order++){
  const r=search(data.level,{floor:Math.min(best?.cost??target.max+1,target.max+1),maxStates:Number(process.env.SEARCH_STATES??300000),maxMilliseconds:Number(process.env.SEARCH_MS??10000),orderSeed:order,weight:Number(process.env.WEIGHT??1000)});
  if(r.status==='witness'&&(!best||r.cost<best.cost)){best=r;console.log(JSON.stringify({order,cost:r.cost}));if(r.cost<target.min)break;}}
 if(best){data.drags=best.drags;data.search=best;data.replay=api.replayRevisedRoute(data.level,best.drags);const out=write(`route${id}-${Date.now()}.json`,data);console.log(JSON.stringify({out}));}
}else if(mode!=='library')throw Error('Usage: generate ID | enrich ID FILE | check ID FILE | solve ID FILE');
