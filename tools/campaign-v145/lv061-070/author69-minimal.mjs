import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {searchStage} from './stage-search69.mjs';
import {compile} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {checkCanonicalLiftFloor} from './canonical-lift-floor.mjs';
import {checkLiftFloor} from './lift-floor.mjs';
import {pack,rect,SHAPES,seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const id=69,root='deliverables/remake31-200-v145-20260924/batches/lv061-070',out=root+'/author68-69';fs.mkdirSync(out,{recursive:true});
const src=JSON.parse(fs.readFileSync(`${root}/source-audit/source-review${id}.json`));
const {api}=await loadApi(),base=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[id-1];
const seed=Number(process.env.SEED??14769002),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)],key=p=>p.join(',');
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only'));
SHAPES.BAR2=[...SHAPES.H2,...SHAPES.V2];
const issues={},bad=k=>{issues[k]=(issues[k]??0)+1;return null;};
function fillColors(bs,colors){const adj=bs.map(()=>new Set()),own=new Map();bs.forEach((b,i)=>b.shape.forEach(([x,y])=>own.set(key([x+b.x,y+b.y]),i)));for(const[p,i]of own){const[x,y]=p.split(',').map(Number);for(const q of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const j=own.get(key(q));if(j!==undefined&&j!==i)adj[i].add(j);}}const cs=bs.map(b=>b.color==='fill'?null:b.color),order=bs.map((_,i)=>i).filter(i=>!cs[i]).sort((a,b)=>adj[b].size-adj[a].size);function go(n){if(n===order.length)return true;const i=order[n];for(const color of rng.shuffle([...colors])){if([...adj[i]].some(j=>cs[j]===color))continue;cs[i]=color;if(go(n+1))return true;}cs[i]=null;return false;}if(!go(0))return false;bs.forEach((b,i)=>b.color=cs[i]);return true;}
function make(){
 const l=structuredClone(base.level);l.blocks=[];l.gates=[];l.shutters=[];l.generators=[];l.difficulty=id===68?'hard':'easy';l.preservedMoveTarget=base.starTargets.moveTarget;
 const stageSpecs=structuredClone(src.stages),opening=structuredClone(src.opening.items),regions={};
 if(id===68){
  regions.cover10={x:0,y:pick([3,6]),width:7,height:4};regions.lift2=regions.cover10;
  const fillKind=pick(['SQ2','BAR2','SINGLE','H3']),fillCount={SQ2:3,BAR2:6,SINGLE:12,H3:4}[fillKind];
  for(let i=0;i<fillCount;i++)opening.push({sourceId:'opening-fill-'+i,kind:fillKind,color:'fill',adaptation:'Preserved 68-cell board needs twelve extra visible cells above the 28-cell source opening and 28-cell real curtain. Native dominoes may bridge the odd-width retained outline.'});
  stageSpecs[0].items.push({sourceId:'cover10-fill-0',kind:'SQ2',color:'fill',adaptation:'The original first hidden batch covers 24 of the true 28-cell region; add one ordinary SQ2, preserving every known source block.'});
  const adapt=stageSpecs[1].items.find(b=>b.sourceId==='lift2-7');adapt.kind='V3';adapt.adaptation='Native-only whole art makes the unchanged 28-cell second-layer inventory untileable in either 7x4 or 4x7. Exhaustive tiling68-native-proof rejects every zero-edit inventory; yellow L3 to native V3 is one equal-area edit and tiles the actual 7x4 region, preserving its color and every other body.';
 }else{
  regions.cover18={x:0,y:0,width:4,height:4};regions.lift2=regions.cover18;
  regions.cover6={x:0,y:7,width:4,height:3};regions.cover9={x:4,y:7,width:3,height:3};regions.cover11={x:4,y:0,width:3,height:4};
  opening.find(b=>b.sourceId==='opening-2').kind='SINGLE';opening.find(b=>b.sourceId==='opening-2').adaptation='Blue L3 shell lacks native whole shell art. Replace only this body by a native SINGLE shell (3 to 1 cells), simultaneously resolving the exact two-cell capacity excess while preserving blue/cyan layers, every other source body and all mechanics.';
  
  stageSpecs.find(s=>s.id==='cover6').items.push({sourceId:'cover6-fill-0',kind:'SINGLE',color:'blue',adaptation:'Known source batch leaves one of its twelve cells empty; fill one ordinary cell.'});
 }
 const physical=stageSpecs.filter(s=>s.kind==='countdown_cover').map(s=>regions[s.id]);
 const ocells=l.playable.filter(([x,y])=>!physical.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height));
 const packed=pack(opening,ocells,rng,Number(process.env.PACK??2000),true);if(!packed)return bad('pack-opening');
 const colors=[...new Set(src.mechanisms.gates.items.map(g=>g.color))];if(!fillColors(packed,colors))return bad('fill-colors');
 const bindings=[],added=[];
 const put=(bs,stage)=>{for(const b of bs){const block={id:`v147-${id}-${b.sourceId}`,x:b.x,y:b.y,shape:b.shape,color:b.color,...(b.layers?{layers:b.layers}:{}),...(b.frozen?{frozen:b.frozen}:{}),...(stage?{shutterId:`v147-${id}-${stage}`}:{})};l.blocks.push(block);(b.sourceId.includes('fill')?added:bindings).push({sourceId:b.sourceId,blockId:block.id,sourceStage:stage??'opening',adaptation:b.adaptation??null});}};
 put(packed);
 for(const s of stageSpecs){const r=regions[s.id],cells=rect(r.width,r.height).map(([x,y])=>[x+r.x,y+r.y]);const bs=pack(s.items,cells,rng,Number(process.env.PACK??2000),false);if(!bs)return bad('pack-'+s.id);fillColors(bs,colors);put(bs,s.id);l.shutters.push({id:`v147-${id}-${s.id}`,...r,count:s.kind==='lift'?1:s.count,...(s.kind==='lift'?{skin:'lift'}:{})});}
 const gateSources=id===68?src.mechanisms.gates.items.filter(g=>g.region==='upper'):src.mechanisms.gates.items,occupied=new Set(),slots=[];
 for(const side of ['top','bottom','left','right'])for(const size of [2,3])for(let offset=0;offset+size<=(['left','right'].includes(side)?l.height:l.width);offset++){
  const cells=Array.from({length:size},(_,i)=>side==='left'?[0,offset+i]:side==='right'?[l.width-1,offset+i]:[offset+i,side==='top'?0:l.height-1]);if(cells.every(p=>l.playable.some(q=>key(p)===key(q))))slots.push({side,offset,size});
 }
 const gateBindings=[];
 const fixed69={red:['left',3,3],blue:['right',3,3],green:['left',7,3],yellow:['right',7,3],purple:pick([['top',4,3],['right',0,3]]),cyan:['bottom',0,3]};
 const fixed68={red:['left',1,2],yellow:['top',1,3],green:['top',4,2],blue:['right',1,3],purple:['left',3,3]};
 for(const g of rng.shuffle([...gateSources]).sort((a,b)=>(id===69?['red','blue'].includes(b.color)-['red','blue'].includes(a.color):0))){
  const f=(id===69?fixed69:fixed68)[g.color],options=slots.filter(s=>(id===68||s.side===f[0]&&s.offset===f[1]&&s.size===f[2])&&!Array.from({length:s.size},(_,k)=>s.side+':'+(s.offset+k)).some(k=>occupied.has(k))&&l.blocks.filter(b=>(b.layers??[b.color]).includes(g.color)).every(b=>1+Math.max(...b.shape.map(p=>['left','right'].includes(s.side)?p[1]:p[0]))<=s.size));
  if(!options.length)return bad('gate');const s=pick(options);for(let k=0;k<s.size;k++)occupied.add(s.side+':'+(s.offset+k));const gid=`v147-${id}-${g.sourceId}`;l.gates.push({id:gid,...s,color:g.color,...(g.frozen?{frozen:g.frozen}:{})});gateBindings.push({sourceId:g.sourceId,gateId:gid});
 }
 try{api.validateLevel(l);for(const result of [api.auditCandidateBlockArt(l),auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),auditHiddenCoverage(l),auditGateSpanLimits(l)])if(!result.passed)return bad('audit:'+JSON.stringify(result).slice(0,180));const issues=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');if(issues.length)return bad(issues[0].code);}catch(e){return bad(e.message);}
 return {level:l,sourceReview:`${root}/source-audit/source-review${id}.json`,sourceAdaptation:{blockBindings:bindings,added,gateBindings,removedGates:id===68?src.mechanisms.gates.items.filter(g=>g.region==='lower').map(g=>({sourceId:g.sourceId,reason:'The disconnected source lower board duplicates all five upper exit colors; this connected preserved board permits one same-color entity only. Retain the five opening exits and their exact initial values; remove the five duplicate lower instances.'})):[],regionMapping:regions},originality:{layoutIntent:id===68?'Central vertical hidden band with a side working corridor and aligned ordinary fill squares.':'Four corner curtain zones surround a three-row working corridor; sequential lift lies under the upper-left curtain.',alignment:'Use native whole-block row/column boundaries and retain exact physical board geometry.',sourceDifference:'Repartition regions and block adjacency; source coordinates are not copied.'},design:{primaryMechanism:'Curtain release and a later region-empty lift reveal constrain working space and clear order.',concreteDecision:'Keep the lift region occupied until other movable blocks leave a recovery corridor; route decisions still need separately checked examples.'}};
}

let attempts=0,valid=0,best=0;const deadline=Date.now()+Number(process.env.SECONDS??180)*1000;
while(Date.now()<deadline){attempts++;const data=make();if(!data)continue;valid++;let state,drags=[],cost=0,last=0,ok=true,searches=[];
 for(const [goal,cap]of [[6,4],[11,7],[18,9],[24,10],[Infinity,10]]){const result=searchStage(data.level,{startState:state,goalClears:goal,floor:cap-cost+1,maxStates:100000,maxMilliseconds:1500,orderSeed:attempts%data.level.blocks.length});searches.push({...result,state:undefined,drags:undefined});if(result.status!=='witness'){ok=false;break;}state=result.state;cost+=result.cost;drags.push(...result.drags);last=goal;if(goal>best){best=goal;fs.writeFileSync(`${out}/minimal69-best-${Date.now()}.json`,JSON.stringify({...data,drags,cost,goal,searches},null,2));console.log(JSON.stringify({attempts,valid,goal,cost}));}}
 if(!ok)continue;const replay=api.replayRevisedRoute(data.level,drags);if(!replay.valid||!replay.complete){bad('replay');continue;}const lower=checkCanonicalLiftFloor(data.level,api,{floor:5,maxStates:500000,maxMilliseconds:15000});const file=`${out}/minimal69-complete-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify({...data,drags,replay,lowerBound:lower,levelSha256:digest(data.level),searches,activeRuleVersion:lock.activeVersion},null,2));console.log(JSON.stringify({file,U:replay.nonClearingDrags,L:lower.floor,status:lower.status}));if(lower.thresholdProven)break;
}
console.log(JSON.stringify({attempts,valid,best,issues}));
