import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,baseline,ROOT,ruleGate,save,auditSpatial,digest} from './remake101to110-v146.mjs';
import {SHAPES,pack,rect,seededRng} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {search} from '../.codex-temp/remake21-30-quality/agent25-27/graph.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
const lock=ruleGate(),{api}=await loadApi(),old=baseline().levels[104],out=ROOT+'/root105';
const sourcePath='.codex-temp/remaining98-v111/middle/lv105/source-review-105.json',source=JSON.parse(fs.readFileSync(sourcePath));
const seed=Number(process.env.SEED??147105),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)];
for(const kind of Object.keys(SHAPES))SHAPES[kind]=SHAPES[kind].filter(s=>api.matchFormalBlockShape(s,'native-only'));
const specs=Object.fromEntries(Object.entries(source.sourceFacts.pieceLedger).map(([stage,rows])=>[stage,rows.map((b,i)=>({sourceId:`${stage}-${i+1}`,kind:b.shape,color:b.color,inner:b.inner}))]));
// Four unsupported shell carriers retain area and exact outer/core pairing.
// Two L3 shells use bars of area 3; the T4/L4 shells use area-4 SQ2.
for(const s of specs.cover2)if(s.inner)s.kind='BAR3';
for(const s of specs.cover5)s.kind='SQ2';
const seen={},bump=k=>{seen[k]=(seen[k]??0)+1;};
const playable=old.level.playable,points=s=>rect(s.width,s.height).map(([x,y])=>[x+s.x,y+s.y]);
const gateFacts=[['blue',0],['pink',1],['red',2],['green',3],['yellow',5],['cyan',5],['purple',6]];
const slots=[];for(const side of ['top','bottom','left','right'])for(const size of [1,2,3])for(let offset=0;offset+size<=(['top','bottom'].includes(side)?6:8);offset++)slots.push({side,size,offset});
function make(){
 const vertical=rng.rand()<.5,reverse=rng.rand()<.5;let covers,opening;
 if(vertical){covers=[{id:'n105-c2',x:0,y:reverse?2:0,width:6,height:4,count:2},{id:'n105-c5',x:0,y:reverse?0:4,width:6,height:2,count:5}];opening=rect(6,2).map(([x,y])=>[x,y+6]);}
 else{const x=reverse?0:4;covers=[{id:'n105-c2',x:reverse?2:0,y:0,width:4,height:6,count:2},{id:'n105-c5',x,y:0,width:2,height:6,count:5}];opening=rect(6,2).map(([x,y])=>[x,y+6]);}
 const groups=[pack(specs.opening,opening,rng,3000,true),pack(specs.cover2,points(covers[0]),rng,3000,false),pack(specs.cover5,points(covers[1]),rng,1000,false)];if(groups.some(g=>!g)){bump('packing');return;}
 const level=structuredClone(old.level);level.difficulty='super';level.preservedMoveTarget=old.starTargets.moveTarget;level.shutters=covers;
 level.blocks=groups.flatMap((group,j)=>group.map(b=>({id:'n105-'+b.sourceId,x:b.x,y:b.y,shape:b.shape,color:b.color,...(b.inner?{layers:[b.color,b.inner]}:{}),...(j?{shutterId:covers[j-1].id}:{})})));
 level.gates=[];const used=new Set();
 for(const [color,frozen]of [gateFacts[0],...rng.shuffle(gateFacts.slice(1))]){
  const bs=level.blocks.filter(b=>b.color===color||b.layers?.includes(color));
  let options=slots.filter(g=>bs.every(b=>Math.max(...b.shape.map(p=>['top','bottom'].includes(g.side)?p[0]:p[1]))<g.size)&&!Array.from({length:g.size},(_,i)=>g.side+':'+(g.offset+i)).some(k=>used.has(k)));
  if(color==='blue'){const b=level.blocks.find(b=>b.id==='n105-opening-5');options=options.filter(g=>g.side==='bottom'&&g.offset<=b.x&&g.offset+g.size>=b.x+2);}
  if(!options.length){bump('gates');return;}if(rng.rand()<.85){const min=Math.min(...options.map(g=>g.size));options=options.filter(g=>g.size===min);}const g=pick(options);for(let i=0;i<g.size;i++)used.add(g.side+':'+(g.offset+i));level.gates.push({id:'n105-g-'+color,color,...g,...(frozen?{frozen}:{})});
 }
 try{auditSpatial(level,api);}catch(e){bump('static '+e.message.slice(0,100));return;}
 return level;
}
const start=Date.now(),deadline=start+Number(process.env.SECONDS??240)*1000;let attempts=0,valid=0,solved=0,best=-1;
while(Date.now()<deadline){
 attempts++;const level=make();if(!level)continue;valid++;
 const result=search(level,{floor:31,maxStates:100000,maxMilliseconds:500,weight:1000,orderSeed:attempts%17});if(result.status!=='witness'){bump(result.status);continue;}
 const replay=api.replayRevisedRoute(level,result.drags);if(!replay.valid||!replay.complete){bump('replay rejected');continue;}solved++;
 if(result.cost<best&&result.cost<21)continue;best=Math.max(best,result.cost);
 const proof=checkSymmetryFloor(level,{floor:21,maxStates:300000,maxMilliseconds:result.cost>=21?3000:500});
 const file=save(`${out}/draft-${seed}-${attempts}-${Date.now()}.json`,{activeRuleVersion:lock.activeVersion,seed:`${seed}/${attempts}`,level,drags:result.drags,replay,proof,source:{file:sourcePath,sha256:digest(fs.readFileSync(sourcePath))},adaptations:['四个已知外壳载体需原向完整外壳图：两L3改同面积条3、T4/L4各改SQ2，外内颜色/阶段/计数均保。','末帘三块面积12，两个已适配SQ2与原向T4不能矩形满铺；第三红T4同面积改SQ2；不新增或移除机关。'],formalAdopted:false});
 console.log(JSON.stringify({file,attempts,valid,solved,cost:result.cost,proof:proof.status,relaxed:proof.relaxedNonClearingDrags}));
 if(proof.thresholdProven&&result.cost<=30)break;
}
save(`${out}/run-${Date.now()}.json`,{seed,attempts,valid,solved,best,elapsed:Date.now()-start,diagnostics:seen});console.log(JSON.stringify({attempts,valid,solved,best,diagnostics:seen}));
