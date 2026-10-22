import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,PROFILE,rect,ruleGate,loadApi,audit,digest,replay} from './common.mjs';
import {searchSpatial} from '../continuation211-colored-witness.mjs';
import {liftPayload,runNativeLift} from './author234-native.mjs';
ruleGate();
const {api}=await loadApi(),out=ROOT+'/author234';fs.mkdirSync(out,{recursive:true});
const start=Number(process.argv[2]??1),count=Math.min(500,Number(process.argv[3]??100));
const run=out+`/run-${start}-${Date.now()}`;fs.mkdirSync(run);fs.copyFileSync(new URL(import.meta.url),run+'/author-source.mjs');
const native=Object.fromEntries(api.FORMAL_BLOCK_SHAPES.map(s=>[s.shapeId,s.cells]));
function rng(seed){let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
const touching=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(x+a.x-u-b.x)+Math.abs(y+a.y-v-b.y)===1));
function make(seed){
 const random=rng(seed),shuffle=a=>a.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);
 const shutters=[{id:'left9',x:0,y:0,width:3,height:3,count:9},{id:'right9',x:4,y:0,width:3,height:3,count:9},{id:'bottom6',x:0,y:6,width:7,height:2,count:6},{id:'lift',x:1,y:3,width:3,height:3,count:0,skin:'lift'}];
 const shapes=[native[3],...shuffle([native[9],native[9],native[9],...Array(6).fill(native[8])])];
 const colors=start>=200?['green',...shuffle(['yellow','purple','yellow','purple','yellow','purple','blue','green','cyan'])]:shuffle(['yellow','purple','yellow','purple','yellow','purple','blue','green','cyan','green']);
 const pieces=shapes.map((shape,i)=>({id:'l234-v'+i,shape,color:colors[i]}));
 const legal=rect(7,8).filter(([x,y])=>!shutters.slice(0,3).some(s=>x>=s.x&&x<s.x+s.width&&y>=s.y&&y<s.y+s.height));
 const set=new Set(legal.map(p=>p.join(','))),used=new Set(),occupied=new Set(),placed=[];let budget=15000;
 function fill(){if(--budget<0)return false;if(used.size===pieces.length)return true;const p=legal.find(p=>!occupied.has(p.join(',')));for(const i of shuffle(pieces.map((_,i)=>i).filter(i=>!used.has(i)))){const q=pieces[i];for(const [dx,dy]of q.shape){const b={...q,x:p[0]-dx,y:p[1]-dy};if(!b.shape.every(([u,v])=>set.has([b.x+u,b.y+v].join(','))&&!occupied.has([b.x+u,b.y+v].join(',')))||placed.some(a=>a.color===b.color&&touching(a,b)))continue;placed.push(b);used.add(i);for(const[u,v]of b.shape)occupied.add([b.x+u,b.y+v].join(','));if(fill())return true;placed.pop();used.delete(i);for(const[u,v]of b.shape)occupied.delete([b.x+u,b.y+v].join(','));}}return false;}
 if(!fill())return null;
 const hidden=[];const add=(id,color,shape,x,y,shutterId,extra={})=>hidden.push({id:'l234-'+id,color,shape,x,y,shutterId,...extra});
 if(seed%2){add('left-cyan','cyan',native[21],0,0,'left9');add('left-green','green',native[9],0,2,'left9');}else{add('left-green','green',native[9],0,0,'left9');add('left-cyan','cyan',native[21],0,1,'left9');}
 add('right-red','red',native[14],4,0,'right9',{frozen:6});
 const hc=shuffle(['cyan','pink']);add('bottom-square0',hc[0],native[7],0,6,'bottom6');add('bottom-square1',hc[1],native[7],2,6,'bottom6');add('bottom-yellow','yellow',native[9],4,6,'bottom6');add('bottom-orange','orange',native[9],4,7,'bottom6');
 if(seed%3){add('lift-red','red',native[21],1,3,'lift');add('lift-yellow','yellow',native[9],1,5,'lift');}else{add('lift-yellow','yellow',native[9],1,3,'lift');add('lift-red','red',native[21],1,4,'lift');}
 const free=shuffle(['yellow','purple']);
 const frozen=shuffle([['pink',9],['green',9],['blue',6],['orange',6],['red',6],['cyan',6]]);
 const slots=[['top',0,3],['top',4,3],['bottom',0,3],['bottom',4,3],['left',0,3],['right',0,3]];
 const gates=[...free.map((color,i)=>({id:'g-'+color,color,side:i?'right':'left',offset:start>=200?4:3,size:start>=200?1:3})),...frozen.map(([color,frozen],i)=>({id:'g-'+color,color,frozen,side:slots[i][0],offset:slots[i][1],size:slots[i][2]}))];
 return {id:234,name:'三幕·双层回廊',difficulty:'hard',timeSeconds:75,reward:200,parMoves:45,preservedMoveTarget:45,mechanismRules:PROFILE,width:7,height:8,blocks:[...placed,...hidden],gates,shutters,designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:16,calibratedDifficulty:16},mechanismAdaptation:{sourceReference:ROOT+'/source/source-facts.json',change:'保源7×8外框、10开局+4底帘+2左帘+1右冰6+2升降隐藏共19本体、三帘9/9/6、3×3升降台、六冰门9/9/6/6/6/6。源帘内嵌套升降与实际门禁冲突，按同关机制可提前显露许可将升降移到中部开局体下面，未减少隐藏库存。源重复红普通口移除，绿冰6改橙且底部绿体映橙；原可早清红开局两体改黄/紫以保持六次解冻启动，未改计数。源底部2格孤墙删去，源空开局扩至24格、左帘8→9格、升降6→9格、底帘10→14格；保持各层独立本体数，用q0合法矩形适配并全重排。右帘redSQ3原数字冰6保留，显露后才扣数；全部隐藏层真实满铺。'}};
}
const rows=[];let accepted=null;
for(let seed=start;seed<start+count;seed++){
 const level=make(seed),row={seed};if(!level){row.status='TILING_BUDGET';rows.push(row);continue;}
 row.levelSha256=digest(level);
 try{row.audit=audit(level,api);row.route=searchSpatial(level,api,{floor:21,maxMilliseconds:1800,maxStates:60000,maxTransitions:500000,normalize:true,orderSeed:seed%19});row.status='ROUTE_'+row.route.status;
 if(row.route.status==='witness'){
  const rt=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=rt.nonClearingDrags;row.totalDrags=rt.effectiveDrags;
  if(row.U<16)row.status='BELOW_DIFFICULTY';else{const{p}=liftPayload(level,api,{floor:16,maxMilliseconds:8000,maxStates:500000});row.lower=runNativeLift(p);row.status=row.lower.thresholdProven?'BOUNDS_MET_VALIDATION_PENDING':'LOWER_'+row.lower.status;if(row.lower.thresholdProven){level.preservedMoveTarget=rt.effectiveDrags;accepted={level,drags:row.route.drags,row,qualification:'PENDING_NATIVE_DOMAIN_QUALIFICATION_AND_POINTER'};}}
 }
 }catch(e){row.status='REJECTED';row.error=e.message;}
 fs.writeFileSync(run+`/candidate-${seed}.json`,JSON.stringify({level,row},null,2));rows.push(row);
 if(seed%5===0||row.U!==undefined||row.error)console.log(JSON.stringify({seed,status:row.status,U:row.U,error:row.error,clears:row.route?.maxClearsSeen}));if(accepted)break;
}
fs.writeFileSync(run+'/report.json',JSON.stringify({accepted,rows},null,2));console.log(JSON.stringify({run,accepted:Boolean(accepted),attempted:rows.length}));
