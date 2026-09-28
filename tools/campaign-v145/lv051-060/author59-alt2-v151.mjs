import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
import {checkFullGeneratorFloor} from './campaign-generator-axis-floor-v146.mjs';
import {search,compile,each} from './campaign-generator-axis-search-v146.mjs';
import {search as monotoneSearch} from '../../../.codex-temp/remake31-40-v141/agent31-34/search-monotone.mjs';
import {SHAPES,rect,pack,seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent58-59';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.51.0');
const {api}=await loadApi();
SHAPES.SQ3=[rect(3,3)];
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only'));
const base=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json'));
const [mode='generate',arg='59',file]=process.argv.slice(2),id=Number(arg),seed=Number(process.env.SEED??146000+id),rng=seededRng(seed);
assert([58,59].includes(id));
fs.mkdirSync(OUT,{recursive:true});
const save=(name,value)=>{const p=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return p;};
const choose=a=>a[Math.floor(rng.rand()*a.length)];
const diagnostics={};const fail=(k)=>{diagnostics[k]=(diagnostics[k]??0)+1;return null;};
const spec=(sourceId,kind,color,props={})=>({sourceId,kind,color,...props});
const facts={
 58:{opening:[spec('o01','SINGLE','purple'),spec('o02','H3','yellow'),spec('o03','H3','pink'),spec('o04','H2','blue'),spec('o05','SINGLE','pink'),spec('o06','H2','purple'),spec('o07','SINGLE','green'),spec('o08','V2','red'),spec('o09','SINGLE','yellow'),spec('o10','SINGLE','blue'),spec('i03','SQ2','yellow',{frozen:3}),spec('i09','SQ2','yellow',{frozen:9}),spec('i05a','H2','green',{frozen:5}),spec('i05b','H2','green',{frozen:5}),spec('i12a','V3','cyan',{frozen:12}),spec('i12b','SQ3','blue',{frozen:12}),spec('i12c','V3','red',{frozen:12,layers:['red','blue']}),spec('i07','T4','cyan',{frozen:7})],
 queue:[spec('q01','SINGLE','green'),spec('q02','SQ2','cyan'),spec('q03','H2','red'),spec('q04','V2','red'),spec('q05','H3','purple')], gates:{yellow:0,pink:1,purple:2,cyan:4,blue:7,green:14,red:16},
 corrections:['Source frame 0535 is the untouched 02:05 opening; 537 has already cleared one block. Right-lower ice gate is 14, not truth-v6 16.','Opening ice12 carriers are cyan V3, blue SQ3, red V3 shell with blue core (frame0572). Ice7 is cyan T4. These are distinct from the generator second cargo cyan SQ2.','The two source red frozen16 exits duplicate color; keep one red16 complete-width exit under the hard unique-color rule.','Source queue green SINGLE, cyan SQ2, red H2, red V2, purple H3; fourth red V2 minimally recolored blue to satisfy adjacent generated colors.']},
 59:{opening:[spec('o01','H2','yellow'),spec('o02','H2','blue'),spec('o03','H2','pink'),spec('o04','SINGLE','orange'),spec('o05','H2','purple'),spec('o06','H2','yellow'),spec('o07','V2','blue'),spec('o08','H2','green'),spec('o09','H2','red'),spec('o10','SQ2','blue'),spec('o11','H2','red'),spec('o12','H2','yellow'),spec('o13','H2','green'),spec('o14','H2','blue',{layers:['blue','yellow']}),spec('o15','H2','pink'),spec('o16','SINGLE','yellow')],
 covers:[{count:6,specs:[spec('c6-purple','SQ2','purple'),spec('c6-red-key','H2','red'),spec('c6-red-lock','T4','red'),spec('c6-pink-large','SQ3','pink'),spec('c6-pink-single','SINGLE','pink')]},{count:12,specs:[spec('c12-yellow','H2','yellow'),spec('c12-blue-key','H2','blue'),spec('c12-blue','SQ2','blue'),spec('c12-yellow-lock','SQ2','yellow')]}],
 gates:{blue:0,pink:4,yellow:6,red:12,green:13,orange:14,purple:14},
 corrections:['Untouched opening frame0601 has 16 bodies and one blue/yellow H2 shell.','Cover6 frame0625 includes purple SQ2, red H2 key, red sideways T4 lock, pink SQ3 and pink SINGLE: five bodies/20 cells, not four/18. Its source rectangle includes an internal wall; retained game board has none, so use real 4x5 filled cover region.','Key/lock attributes removed only because key-lock unlock remains level60; all four carrier bodies retain their source color, shape class and hidden batch.','Cover12 frame0657 has yellow H2, blue H2 key, blue SQ2, yellow SQ2 lock.']}
};
function audit(level){
 api.validateLevel(level);
 assert(level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));
 const results={art:api.auditCandidateBlockArt(level),opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gateSpan:auditGateSpanLimits(level)};
 for(const r of Object.values(results))assert(r.passed,JSON.stringify(r));
 const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
 const hard=api.auditRevisedCandidate(level,undefined);assert.deepEqual(hard.issues.filter(i=>!omit.has(i.code)),[]);
 return results;
}
function gateSlots(level,machine){
 const allowed=new Set(level.playable.map(p=>p.join(','))),out=[];
 for(const side of ['top','right','bottom','left'])for(const size of [2,3])for(let offset=0;offset+size<=(['top','bottom'].includes(side)?level.width:level.height);offset++){
  if(machine&&machine.side===side&&Array.from({length:size},(_,i)=>offset+i).some(t=>Math.abs(t-machine.offset)<=1))continue;
  const pts=Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,level.height-1]:side==='left'?[0,offset+i]:[level.width-1,offset+i]);
  if(pts.every(p=>allowed.has(p.join(','))))out.push({side,offset,size});
 }return out;
}
function make(){
 const old=base.levels[id-1],l=structuredClone(old.level),f=facts[id];
 for(const k of ['shutters','generators','featureIntro','hint','solution','staging','designTargets','flipDoors','coloredGrids','elevators','conveyors'])delete l[k];
 l.blocks=[];l.gates=[];l.difficulty=id===58?'normal':'hard';l.preservedMoveTarget=old.starTargets.moveTarget;
 const colors=Object.keys(f.gates),asBlock=b=>({id:`v146-${id}-${b.sourceId}`,x:b.x,y:b.y,shape:b.shape,color:b.color,...(b.frozen?{frozen:b.frozen}:{}),...(b.layers?{layers:b.layers}:{}),...(b.shutterId?{shutterId:b.shutterId}:{})});
 let remaining=[...l.playable],machine;
 if(id===59){l.shutters=[];for(const [j,c]of f.covers.entries()){
  const dims=j===0?[[4,5],[5,4]]:[[4,3],[3,4],[6,2],[2,6]],options=[];
  for(const[w,h]of dims)for(let y=0;y+h<=l.height;y++)for(let x=0;x+w<=l.width;x++){const cells=rect(w,h).map(([a,b])=>[x+a,y+b]);if(cells.every(p=>remaining.some(q=>p.join(',')===q.join(','))))options.push({x,y,width:w,height:h,cells});}
  if(!options.length)return null;const reg=id===59?(j===0?(options.find(o=>o.x===1&&o.y===0&&o.width===5&&o.height===4)||options.find(o=>o.x===0&&o.y===0&&o.width===5&&o.height===4)):options.find(o=>o.x===1&&o.y===8&&o.width===4&&o.height===3)):choose(options);if(!reg)return null;const cover={id:`v146-59-cover${c.count}`,x:reg.x,y:reg.y,width:reg.width,height:reg.height,count:c.count};
  const packed=pack(c.specs,reg.cells,rng,Number(process.env.PACK_TRIES??5000),false);if(!packed)return fail('hidden-pack');l.shutters.push(cover);l.blocks.push(...packed.map(b=>asBlock({...b,shutterId:cover.id})));const used=new Set(reg.cells.map(p=>p.join(',')));remaining=remaining.filter(p=>!used.has(p.join(',')));
 }}
 const openingArea=f.opening.reduce((n,b)=>n+SHAPES[b.kind][0].length,0),extra=remaining.length-openingArea;
 const extras=[];let extraLeft=extra;for(let i=0;extraLeft>0;i++){const n=extraLeft>=3?3:extraLeft>=2?2:1,kind=n===3?'BAR3':n===2?'H2':'SINGLE';extras.push(spec(`fill${i}`,kind,choose(colors)));extraLeft-=n;}
 if(id===59){extras.splice(0,extras.length,...['SINGLE','V2','V2','V2','V2'].map((kind,i)=>spec(`fill${i}`,kind,choose(colors))));}
 const fixed59={o10:[5,0],o02:[5,3],o03:[5,2],o07:[6,5],o14:[3,4],o16:[5,4],o04:[6,4]};
 const fixed58={o02:[0,0],o03:[3,0],o06:[0,1],o01:[6,0],i12b:choose([[2,7],[2,4],[0,3],[3,3]]),i12c:[6,4]};
 const fixed=id===59?fixed59:fixed58;
 let specs=[...f.opening,...extras];for(const b of specs.filter(b=>fixed[b.sourceId])){const[x,y]=fixed[b.sourceId],shape=SHAPES[b.kind][0];l.blocks.push(asBlock({...b,x,y,shape}));const used=new Set(shape.map(([a,c])=>[x+a,y+c].join(',')));remaining=remaining.filter(p=>!used.has(p.join(',')));}specs=specs.filter(b=>!fixed[b.sourceId]);
 const packed=pack(specs,remaining,rng,Number(process.env.PACK_TRIES??5000),true);if(!packed)return fail('opening-pack');l.blocks.push(...packed.map(asBlock));
 if(id===58){machine={side:'left',offset:3,spawn:[0,3]};l.generators=[{id:'v146-58-generator',...machine,rimMount:'rim',rimSpan:3,queueBlockIds:f.queue.map(b=>`v146-58-${b.sourceId}`)}];l.blocks.push(...f.queue.map(b=>asBlock({...b,color:b.sourceId==='q04'?'blue':b.color,shape:SHAPES[b.kind][0],x:0,y:machine.offset})));}
 const slots=gateSlots(l,machine),used=new Set();
 const entries=rng.shuffle(Object.entries(f.gates));if(id===59)entries.sort((a,b)=>{const rank=c=>({blue:0,pink:1,yellow:2}[c]??3);return rank(a[0])-rank(b[0]);});
 for(const [color,frozen]of entries){const bs=l.blocks.filter(b=>b.color===color||b.layers?.includes(color)),options=rng.shuffle(slots.filter(g=>!Array.from({length:g.size},(_,i)=>`${g.side}:${g.offset+i}`).some(k=>used.has(k))&&bs.every(b=>Math.max(...b.shape.map(p=>['top','bottom'].includes(g.side)?p[0]:p[1]))<g.size)));
  if(!options.length)return null;const forced=id===59?{blue:['right',0,3],pink:['right',3,3],yellow:['right',6,3]}[color]:{yellow:['top',0,3],pink:['top',3,3],purple:['left',0,2],cyan:['right',0,3],blue:['bottom',2,3],green:['left',5,2],red:['right',4,3]}[color];const g=forced?options.find(g=>g.side===forced[0]&&g.offset===forced[1]&&g.size===forced[2]):options[0];if(!g)return null;l.gates.push({id:`v146-${id}-gate-${color}`,color,...g,...(frozen?{frozen}:{})});for(let i=g.offset;i<g.offset+g.size;i++)used.add(`${g.side}:${i}`);
 }
 try{audit(l);}catch(error){return fail('audit-'+error.message.slice(0,180));}
 return {level:l,seed,sourceReview:`${OUT}/source-review.json`,sourceFacts:f,sourceAdaptation:{extraOpeningCells:extra,addedOrdinaryBlocks:extras,corrections:f.corrections},originality:{layoutIntent:'保留原棋盘，将已知开局与隐藏清单重排为新的规整行列分区，出口同步重配。',alignment:'全部足迹使用原朝向整图，隐藏矩形逐层铺满；开局边界按横竖条带对齐。',changes:'重排真实区域和邻接，不使用来源坐标的镜转或换色。'},design:{primaryMechanism:id===58?'保全部冰计数与完整五件固定队列，让位与释放库存推动解冰。':'两片6/12卷帘与冰门形成先后清场，解封20格及12格后续工作区。',concreteDecision:'多格块停车位置决定后继出门及机关揭示后的空间。'}};
}
if(mode==='generate'){
 const deadline=Date.now()+Number(process.env.SECONDS??240)*1000;let attempts=0,valid=0,witness=0;
 while(Date.now()<deadline){attempts++;const data=make();if(!data)continue;valid++;const r=(id===59?monotoneSearch:search)(data.level,{floor:id===58?16:21,maxStates:Number(process.env.SEARCH_STATES??60000),maxMilliseconds:Number(process.env.SEARCH_MS??900),orderSeed:valid%data.level.blocks.length,weight:1000});
  if(process.env.SAVE_STATIC){const p=save(`probe${id}`,{...data,search:r});console.log(JSON.stringify({probe:p,search:r.status,states:r.states,cost:r.cost}));break;}
  if(r.status!=='witness')continue;const replay=api.replayRevisedRoute(data.level,r.drags);if(!replay.valid||!replay.complete){fail('route-'+replay.error);continue;}witness++;if(r.cost<(id===58?11:16))continue;
  const p=save(`candidate${id}-${seed}-${attempts}`,{...data,drags:r.drags,replay,search:r,activeRuleVersion:lock.activeVersion});console.log(JSON.stringify({candidate:p,id,upper:r.cost,attempts,valid,witness}));
  const proof=id===58?checkFullGeneratorFloor(data.level,api,{floor:11,maxStates:200000,maxMilliseconds:2000}):checkSymmetryFloor(data.level,{floor:16,maxStates:200000,maxMilliseconds:2000});
  const q=save(`proof${id}`,{candidate:p,levelSha256:digest(data.level),proof});console.log(JSON.stringify({proof:q,status:proof.status,states:proof.discoveredStates}));if(proof.thresholdProven)break;
 }
 console.log(JSON.stringify({id,attempts,valid,witness,diagnostics}));
}else if(mode==='solve'){
 const data=JSON.parse(fs.readFileSync(file)),r=(id===59?monotoneSearch:search)(data.level,{floor:Number(process.env.FLOOR??(id===58?16:21)),maxStates:Number(process.env.SEARCH_STATES??500000),maxMilliseconds:Number(process.env.SEARCH_MS??30000),weight:Number(process.env.WEIGHT??1000)});
 const replay=r.drags?api.replayRevisedRoute(data.level,r.drags):null,p=save(`solve${id}`,{...data,drags:r.drags,search:r,replay});console.log(JSON.stringify({file:p,status:r.status,cost:r.cost,states:r.states,clears:r.maxClears,replay}));
}else if(mode==='check'){
 const data=JSON.parse(fs.readFileSync(file));const a=audit(data.level),replay=api.replayRevisedRoute(data.level,data.drags);assert(replay.valid&&replay.complete);
 const opts={floor:id===58?11:16,maxStates:Number(process.env.STATES??3000000),maxMilliseconds:Number(process.env.MS??180000)},proof=id===58?checkFullGeneratorFloor(data.level,api,opts):checkSymmetryFloor(data.level,opts);
 const p=save(`checked${id}`,{candidate:file,activeRuleVersion:lock.activeVersion,levelSha256:digest(data.level),routeSha256:digest(data.drags),audit:a,replay,proof,lowerBound:proof.thresholdProven?opts.floor:null,upperBound:replay.nonClearingDrags,pointerValidated:false,formalAdopted:false});console.log(JSON.stringify({report:p,status:proof.status,upper:replay.nonClearingDrags}));
}else if(mode==='facts'){
 fs.writeFileSync(`${OUT}/source-review.json`,JSON.stringify({activeRuleVersion:lock.activeVersion,sourceVideo:'C:/Users/Administrator/Desktop/block out/参考视频/51-60.mp4',videoSha256:'56863ed784598a04f455896d1d2719e823317b8e514d258cf1e356f79b7b1b38',frameRoot:'.codex-temp/video-audit-41-70/frames-51-60',frames:{58:[535,555,557,559,561,572,581,589],59:[601,625,657,676]},facts},null,2)+'\n');
}else throw Error('generate ID | check ID FILE | facts');
