import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {witness} from '../lv11-remake-20260927/design-witness.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {loadPreviewCore,digest} from '../revised-preview-validation-v160.mjs';

const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.87.0');
const source=JSON.parse(fs.readFileSync('deliverables/lv20-remake-20260927/source-ledger.json'));
const baseline=JSON.parse(fs.readFileSync('deliverables/lv20-remake-20260927/baseline.json'));
const root=`deliverables/lv20-remake-20260927/design-v187-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
let seed=Number(process.argv[2]??201870),limit=Number(process.argv[3]??2000),budget=Number(process.argv[4]??80);
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const W=5,H=6,playable=Array.from({length:30},(_,i)=>[i%W,Math.floor(i/W)]);
const changed=new Map([['source20-b2-02','orange'],['source20-b2-06','purple'],['source20-b2-04','cyan']]);
const bodyList=source.blocks.map(b=>({id:b.id.replace('source20','lv20'),color:changed.get(b.id)??b.color,shape:b.shape,hidden:!!b.shutterId}));
const gateValues={yellow:0,pink:1,blue:2,red:3,orange:6,purple:7,green:8,cyan:10};
const gateOptions=Object.fromEntries(Object.keys(gateValues).map(color=>{
 const same=bodyList.filter(b=>b.color===color),options=[];
 for(const side of ['top','right','bottom','left']){const horizontal=['top','bottom'].includes(side),size=Math.max(...same.map(b=>1+Math.max(...b.shape.map(p=>p[horizontal?0:1]))));assert(size<=3);for(let offset=0;offset+size<=(horizontal?W:H);offset++)options.push({side,offset,size});}
 return[color,options];
}));
const overlaps=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
const touches=(b,g)=>{const bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1]));const horiz=['top','bottom'].includes(g.side),tan=horiz?b.x:b.y,span=horiz?bw:bh;return tan>=g.offset&&tan+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+bh===H:g.side==='left'?b.x===0:b.x+bw===W);};
function make(){
 const shutterY=rnd()<.5?0:3,visibleY=3-shutterY,blocks=[];
 for(const hidden of [false,true]){
  const vx=pick([0,2,4]),y=hidden?shutterY:visibleY,hxs=[0,2,4].filter(x=>x!==vx).map(x=>x>vx?x-1:x);
  const items=bodyList.filter(b=>b.hidden===hidden),v=items.find(b=>b.shape.length===3),hs=shuffle(items.filter(b=>b.shape.length===2));
  const put=(b,x,y)=>blocks.push({id:b.id,color:b.color,shape:b.shape,x,y,...(hidden?{shutterId:'lv20-cover'}:{})});
  put(v,vx,y);for(let row=0;row<3;row++)for(let col=0;col<2;col++)put(hs[row*2+col],hxs[col],y+row);
 }
 const owner=new Map();for(const b of blocks)for(const[dx,dy]of b.shape){const k=`${b.x+dx},${b.y+dy}`;assert(!owner.has(k));owner.set(k,b);}
 for(const[key,b]of owner){const[x,y]=key.split(',').map(Number);for(const[xx,yy]of [[x+1,y],[x,y+1]]){const n=owner.get(`${xx},${yy}`);if(n&&n!==b&&n.color===b.color)return null;}}
 const yellow=gateOptions.yellow.filter(g=>blocks.some(b=>!b.shutterId&&b.color==='yellow'&&touches(b,g)));if(!yellow.length)return null;
 const gates=[{...pick(yellow),id:'lv20-gate-yellow',color:'yellow'}];
 for(const[color,frozen]of shuffle(Object.entries(gateValues).filter(([,v])=>v>0))){
  let options=gateOptions[color].filter(g=>!gates.some(o=>overlaps(g,o)));if(!options.length)return null;
  // Low counters must remain approachable before the six-clear reveal. This
  // biases geometry, but neither removes states nor contributes proof evidence.
  if(frozen<=3&&rnd()<.7){const side=options.filter(g=>g.side==='left'||g.side==='right'?g.offset+g.size>visibleY&&g.offset<visibleY+3:g.side===(visibleY===0?'top':'bottom'));if(side.length)options=side;}
  gates.push({...pick(options),id:'lv20-gate-'+color,color,frozen});
 }
 return{id:20,name:baseline.level.name,difficulty:'easy',timeSeconds:75,reward:85,parMoves:24,preservedMoveTarget:24,featureIntro:baseline.level.featureIntro,width:W,height:H,playable,blocked:[],seams:[],blocks,gates,shutters:[{id:'lv20-cover',x:0,y:shutterY,width:5,height:3,count:6,skin:'shutter'}],mechanismRules:'revised-2026-09-23-v1.4'};
}
const{api}=await loadPreviewCore();let rows=[],selected,solved=0,unknown=0,below=0;
const flush=()=>fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({ruleVersion:lock.activeVersion,seed,selected,solved,unknown,below,rows},null,2));
for(let i=0;i<limit;i++){
 let level,tries=0;const seedBefore=seed;while(!level&&tries++<100)level=make();if(!level)continue;
 const search=witness(level,{maxCost:10,maxStates:35000,maxMilliseconds:budget,weight:20}),drags=search.drags??[],replay=drags.length?api.replayRevisedRoute(level,drags):null;
 const row={i,seedBefore,status:search.status,cost:search.cost,bestClears:search.bestClears};
 if(replay?.valid&&replay.complete){solved++;assert.equal(replay.clearEvents,14);if(search.cost<5)below++;
  if(search.cost>=5){const floor=checkSymmetryFloor(level,{floor:5,maxStates:200000,maxMilliseconds:4000});row.floor=floor.status;
   const file=path.join(root,`candidate-${i}.json`);fs.writeFileSync(file,JSON.stringify({seedBefore,level,levelSha256:digest(level),search,drags,replay,floor},null,2));row.file=file;
   if(floor.thresholdProven){selected=file;rows.push(row);flush();console.log(JSON.stringify({root,selected,cost:search.cost,total:drags.length,status:'CANDIDATE_L5_U_WITH_MODEL_REPLAY'}));process.exit(0);}
  }
 }else unknown++;
 rows.push(row);if(i%100===99){flush();console.log(JSON.stringify({i,solved,below,unknown}));}
}
flush();console.log(JSON.stringify({root,selected,solved,below,unknown,status:'BOUNDED_BATCH_COMPLETE'}));
