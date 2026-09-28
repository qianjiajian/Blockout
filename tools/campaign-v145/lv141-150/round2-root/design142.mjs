import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {compileLevel,forEachGesture,clearCount,stateKey} from '../../../remake21to30-mask-floor.mjs';
import {checkSymmetryFloor,canonicalStateKey,equivalentBlockGroups} from '../../../remake21to30-symmetry-floor-v139.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {shortenRoute} from '../../../remake21to30-route-shortcuts.mjs';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-root';
const {api}=await loadApi();
const baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json'));
const base=baseline.levels.find(r=>r.level.id===142).level;
const S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],V3=[[0,0],[0,1],[0,2]],H3=[[0,0],[1,0],[2,0]],L3=[[0,0],[0,1],[1,1]];
const shapes={S,H2,V2,V3,H3,L3};
let rng;
function random(){rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;}
function shuffle(a){for(let i=a.length-1;i;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const openSpecs=[['H2','blue'],['H2','green'],['S','yellow'],['H2','yellow'],['S','blue'],['V2','blue','red'],['V3','green'],['V2','red'],['S','yellow'],['S','yellow'],['S','blue'],['H2','green']];
function packOpen(){
 const cells=Array(20).fill(-1),blocks=[];let budget=300000;
 const rec=(remaining)=>{
  if(!remaining.length)return blocks.map(b=>({...b,shape:structuredClone(b.shape)}));
  if(--budget<0)return null;
  const n=cells.indexOf(-1),x=n%4,y=Math.floor(n/4),seen=new Set();
  for(const i of shuffle([...remaining])){
   const spec=openSpecs[i],sig=JSON.stringify(spec);if(seen.has(sig))continue;seen.add(sig);
   const shape=shapes[spec[0]],pts=shape.map(([dx,dy])=>[x+dx,y+dy]);
   if(pts.some(([px,py])=>px>=4||py>=5||cells[py*4+px]!==-1))continue;
   const color=spec[1];
   if(pts.some(([px,py])=>[[px-1,py],[px+1,py],[px,py-1],[px,py+1]].some(([nx,ny])=>nx>=0&&nx<4&&ny>=0&&ny<5&&cells[ny*4+nx]!==-1&&blocks[cells[ny*4+nx]].color===color)))continue;
   const b={id:`r146-142-o${i+1}`,x,y,shape,color,...(spec[2]?{layers:[color,spec[2]]}:{})},bi=blocks.length;
   blocks.push(b);for(const [px,py]of pts)cells[py*4+px]=bi;
   const r=rec(remaining.filter(j=>j!==i));if(r)return r;
   for(const [px,py]of pts)cells[py*4+px]=-1;blocks.pop();
  }
  return null;
 };return rec(openSpecs.map((_,i)=>i));
}
function block(id,shape,color,x,y,shutterId,inner,extra={}){return {id:'r146-142-'+id,x,y,shape:shapes[shape],color,shutterId,...(inner?{layers:[color,inner]}:{}),...extra};}
function make(seed){rng=seed;const opening=packOpen();if(!opening)return null;
 const level={...structuredClone(base),difficulty:'normal',gates:[
  {id:'r146-142-yellow',color:'yellow',side:'left',offset:Math.floor(random()*3),size:3},
  {id:'r146-142-blue',color:'blue',side:'top',offset:0,size:3,frozen:3},
  {id:'r146-142-red',color:'red',side:'top',offset:3,size:3,frozen:9},
  {id:'r146-142-green',color:'green',side:'right',offset:Math.floor(random()*5),size:3,frozen:12},
  {id:'r146-142-purple',color:'purple',side:'bottom',offset:0,size:3,frozen:27},
  {id:'r146-142-cyan',color:'cyan',side:'bottom',offset:3,size:3,frozen:33}],
  shutters:[{id:'r146-142-first',x:4,y:0,width:2,height:5,count:7},{id:'r146-142-second',x:0,y:5,width:3,height:3,count:12},{id:'r146-142-third',x:3,y:5,width:3,height:3,count:22}],
  blocks:[...opening,
   block('a1','V2','yellow',4,0,'r146-142-first',null,{timedBombSeconds:30}),
   block('a2','S','purple',5,0,'r146-142-first'),
   block('a3','V3','green',4,2,'r146-142-first','cyan'),
   block('a4','V2','red',5,1,'r146-142-first','purple'),
   block('a5','V2','yellow',5,3,'r146-142-first'),
   ...shuffle([['yellow','cyan'],['green'],['red'],['cyan'],['red','purple'],['cyan'],['purple'],['yellow'],['green']]).map((s,i)=>block('b'+(i+1),'S',s[0],i%3,5+Math.floor(i/3),'r146-142-second',s[1])),
   block('c1','S','green',4,5,'r146-142-third'),
   block('c2','H3','green',3,6,'r146-142-third','purple'),
   block('c3','H3','purple',3,7,'r146-142-third','cyan'),
   block('c4','S','red',5,5,'r146-142-third'),
   block('c5','S','blue',3,5,'r146-142-third')]
 };return {schemaVersion:1,ruleVersion:'1.73.0',seed,level,design:{primaryMechanism:'Frozen exits with staggered curtains',concreteDecision:'Reserve parking for cyan until 33 clears; free the first-curtain bomb promptly.'},sourceValidated:false,adoptionReady:false};
}
function legal(c,state,i,drag){
 const b=c.blocks[i],value=state[i],stage=value>>7,clears=clearCount(c,state);let at=value&127;
 const exit=pos=>{const g=b.poses[pos].exits[stage];return g&&clears>=g.frozen?g.side:undefined;};
 if(exit(at)&&drag.path.length)return false;
 for(let k=0;k<drag.path.length;k++){const p=drag.path[k];at=p[1]*c.W+p[0];if(exit(at)&&k!==drag.path.length-1)return false;}
 return exit(at)===drag.exitSide;
}
function normalize(c,state){const drags=[];state=state.slice();for(;;){let found;forEachGesture(c,state,(i,v,cost,get)=>{if(!cost&&v===255){const drag=get();if(legal(c,state,i,drag)){found={i,v,drag};return false;}}});if(!found)return {state,drags};state[found.i]=found.v;drags.push(found.drag);}}
function greedy(level,{budget=15000,milliseconds=10000}={}){
 const c=compileLevel(level),groups=equivalentBlockGroups(c),key=s=>canonicalStateKey(s,groups),start=normalize(c,c.initial),nodes=[{...start,cost:0,parent:-1}],queue=[0],seen=new Map([[key(start.state),0]]),deadline=Date.now()+milliseconds;let explored=0,maxCleared=clearCount(c,start.state);
 const score=n=>(c.totalClears-clearCount(c,n.state))*4+n.cost;
 while(queue.length&&explored<budget&&Date.now()<deadline){
  queue.sort((a,b)=>score(nodes[b])-score(nodes[a])||nodes[b].cost-nodes[a].cost);const ni=queue.pop(),n=nodes[ni];explored++;maxCleared=Math.max(maxCleared,clearCount(c,n.state));
  if(clearCount(c,n.state)===c.totalClears){const route=[];let at=ni;while(at!==-1){route.push(nodes[at].drags);at=nodes[at].parent;}return {drags:route.reverse().flat(),explored,discovered:seen.size,cost:n.cost};}
  forEachGesture(c,n.state,(i,v,cost,get)=>{
   if(n.cost+cost>30)return;const drag=get();if(!legal(c,n.state,i,drag))return;
   const next=n.state.slice();next[i]=v;const z=normalize(c,next),k=key(z.state),old=seen.get(k);if(old!==undefined&&old<=n.cost+cost)return;
   seen.set(k,n.cost+cost);nodes.push({state:z.state,drags:[drag,...z.drags],cost:n.cost+cost,parent:ni});queue.push(nodes.length-1);
  });
  if(queue.length>30000){queue.sort((a,b)=>score(nodes[a])-score(nodes[b]));queue.length=30000;}
 }return {status:'unknown',explored,discovered:seen.size,maxCleared};
}
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
let best=Infinity;const run=Date.now();
for(let seed=Number(process.argv[3]??173142001);seed<Number(process.argv[3]??173142001)+Number(process.argv[2]??30);seed++){
 const data=make(seed);if(!data){console.log(JSON.stringify({seed,pack:false}));continue;}
 const l=data.level;api.validateLevel(l);
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden:auditHiddenCoverage(l),spans:auditGateSpanLimits(l),art:api.auditCandidateBlockArt(l),hard:api.auditRevisedCandidate(l,undefined).issues.filter(i=>!omit.has(i.code)),native:l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)};
 if(audit.hard.length||!audit.opening.passed||!audit.hidden.passed||!audit.spans.passed||!audit.art.passed||!audit.native){fs.writeFileSync(`${OUT}/static-fail142-${seed}-${run}.json`,JSON.stringify({data,audit},null,2));console.log(JSON.stringify({seed,static:false,art:audit.art.issues,hard:audit.hard}));break;}
 const draftFile=`${OUT}/candidate142-${seed}-${run}.json`;fs.writeFileSync(draftFile,JSON.stringify({...data,staticAudit:audit,levelSha256:digest(l)},null,2));
 const projection=structuredClone(l);for(const b of projection.blocks)delete b.timedBombSeconds;
 const found=greedy(projection,{budget:Number(process.env.SEARCH_STATES??2500),milliseconds:Number(process.env.SEARCH_MS??550)});
 if(found.drags){const initialReplay=api.replayRevisedRoute(projection,found.drags);if(!initialReplay.valid){console.log(JSON.stringify({seed,invalid:initialReplay.error}));continue;}const shortened=shortenRoute(projection,found.drags,api);Object.assign(found,shortened);const u=shortened.replay.nonClearingDrags;
  let proof;if(u>=11&&u<=15)proof=checkSymmetryFloor(projection,{floor:11,maxStates:800000,maxMilliseconds:30000});
  fs.writeFileSync(`${OUT}/route142-${seed}-${run}.json`,JSON.stringify({...data,staticAudit:audit,levelSha256:digest(l),spatialProjection:{removedOnlyBombDeadlines:true,levelSha256:digest(projection),timeValidated:false},...found,proof,completeOriginalTimedRouteValidated:false},null,2));
  console.log(JSON.stringify({seed,status:'spatial-witness',upper:u,proof:proof?.status,explored:found.explored}));best=Math.min(best,u);
  if(proof?.thresholdProven)break;
 }else {fs.writeFileSync(`${OUT}/search142-${seed}-${run}.json`,JSON.stringify({seed,levelSha256:digest(l),...found,projectionOnly:true,timeValidated:false},null,2));console.log(JSON.stringify({seed,...found}));}
}
console.log(JSON.stringify({best,run}));
