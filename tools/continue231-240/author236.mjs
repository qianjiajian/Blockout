import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,PROFILE,rect,ruleGate,loadApi,audit,digest,replay,writeNew} from './common.mjs';
import {compile,search} from '../remake191-200/root200/domain.mjs';
import {lower,qualify} from './author236-native.mjs';

ruleGate();const{api}=await loadApi(),out=ROOT+'/author236';fs.mkdirSync(out,{recursive:true});
const source=[
 ['red',rect(1,2),0,0],['pink',rect(1,2),1,0],['purple',rect(1,2),2,0],
 ['cyan',[[0,0],[1,0],[0,1],[0,2]],3,0],['purple',rect(2,1),5,0],['green',rect(2,1),5,1],
 ['red',rect(1,3),4,1],['purple',rect(2,1),0,2],['yellow',rect(1,2),2,2],['purple',rect(2,2),5,2],
 ['green',rect(2,1),0,3],['purple',rect(1,1),3,3],['cyan',rect(1,2),2,4],['green',rect(1,2),4,4],
 ['red',rect(2,2),0,6],['pink',rect(1,3),2,6,7],['blue',rect(1,3),3,6,7],
 ['pink',[[0,0],[0,1],[0,2],[1,2]],4,6],['yellow',[[0,0],[1,0],[0,1]],5,6],['blue',rect(1,3),6,7],
 ['purple',rect(1,2),0,8],['green',rect(1,2),1,8],['red',rect(3,1),2,9],['green',rect(1,1),5,9],
].map(([color,shape,x,y,frozen],i)=>({id:`source236-${i}`,color,shape,x,y,...frozen?{frozen}:{}}));
assert.equal(source.flatMap(b=>b.shape).length,60);assert.equal(new Set(source.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y].join(',')))).size,60);
const sourceFile=out+'/source-block-transcription.json';
if(!fs.existsSync(sourceFile))writeNew(sourceFile,{sourceFrames:[ROOT+'/source/frame-536.png',ROOT+'/source/frame-570.png'],blocks:source,width:7,height:10,occupiedCells:60,
 sourceInternalWallCells:rect(7,10).filter(([x,y])=>[4,5].includes(y)&&[0,1,3,5,6].includes(x)),
 gates:[{color:'blue',side:'top',offset:0,size:2},{color:'green',side:'top',offset:5,size:2},{color:'cyan',side:'left',offset:1,size:3},{color:'purple',side:'right',offset:2,size:2},{color:'red',side:'right',offset:6,size:3,frozen:9},{color:'pink',side:'bottom',offset:0,size:2,frozen:9},{color:'yellow',side:'bottom',offset:5,size:2,frozen:9}],
 clockSeconds:135,completeOpening:true,hiddenInventory:'none',sourceConfirmedBy:'root/video_facts independently inspected thawed frame570; no source instruction treated as authorization'});

const widths=[5,5,7,7,7,7,7,7,5,3],mask=widths.flatMap((w,y)=>Array.from({length:w},(_,x)=>[x+(7-w)/2,y]));assert.equal(mask.length,60);
const palette=['blue','green','cyan','purple','red','pink','yellow'];
function rng(seed){let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
const touch=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));
function make(seed){
 const random=rng(seed),shuffle=a=>a.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(a=>a.v);
 const pieces=source.map((b,i)=>({id:`l236-b${i}`,color:b.color,
  shape:[3,17].includes(i)?rect(2,2):i===18?rect(1,3):b.shape.length===2?(random()<.5?rect(1,2):rect(2,1)):b.shape,
  ...b.frozen?{frozen:b.frozen}:{}}));
 const legal=new Set(mask.map(p=>p.join(','))),occupied=new Set(),placed=[],used=new Set();let budget=12000;
 const fits=(b,x,y)=>b.shape.every(([dx,dy])=>legal.has([x+dx,y+dy].join(','))&&!occupied.has([x+dx,y+dy].join(',')));
 function fill(){if(--budget<0)return false;if(used.size===pieces.length)return true;const p=mask.find(p=>!occupied.has(p.join(','))),tried=new Set();
  for(const i of shuffle(pieces.map((_,i)=>i).filter(i=>!used.has(i))).sort((a,b)=>pieces[b].shape.length-pieces[a].shape.length)){
   const piece=pieces[i],sig=JSON.stringify(piece.shape)+(piece.frozen?piece.color+piece.frozen:'');if(tried.has(sig))continue;tried.add(sig);
   for(const[dx,dy]of piece.shape){const x=p[0]-dx,y=p[1]-dy,b={...piece,x,y};if(!fits(b,x,y))continue;
    placed.push(b);used.add(i);for(const[u,v]of b.shape)occupied.add([x+u,y+v].join(','));if(fill())return true;
    placed.pop();used.delete(i);for(const[u,v]of b.shape)occupied.delete([x+u,y+v].join(','));
   }
  }return false;
 }
 if(!fill())return null;
 const slots=shuffle([['top',1,2],['top',4,2],['bottom',2,3],['left',2,3],['left',5,3],['right',2,3],['right',5,3]]);
 const gates=palette.map((color,i)=>({id:'l236-g-'+color,color,side:slots[i][0],offset:slots[i][1],size:slots[i][2],...['red','pink','yellow'].includes(color)?{frozen:9}:{}}));
 const assigned=new Set(placed.map((b,i)=>b.frozen?i:-1).filter(i=>i>=0));
 const adjacent=placed.map(a=>placed.map((b,i)=>a!==b&&touch(a,b)?i:-1).filter(i=>i>=0));
 if(placed.some((b,i)=>b.frozen&&adjacent[i].some(j=>assigned.has(j)&&placed[j].color===b.color)))return null;
 let colorBudget=6000;
 function color(){if(--colorBudget<0)return false;if(assigned.size===placed.length)return true;
  const i=shuffle(placed.map((_,i)=>i).filter(i=>!assigned.has(i))).sort((a,b)=>adjacent[b].filter(j=>assigned.has(j)).length-adjacent[a].filter(j=>assigned.has(j)).length)[0],b=placed[i];
  for(const col of shuffle(palette)){const gate=gates.find(g=>g.color===col),span=1+Math.max(...b.shape.map(p=>p[['left','right'].includes(gate.side)?1:0]));if(span>gate.size||adjacent[i].some(j=>assigned.has(j)&&placed[j].color===col))continue;
   b.color=col;if(!api.auditCandidateBlockArt({blocks:[b]}).passed)continue;assigned.add(i);if(color())return true;assigned.delete(i);
  }return false;
 }
 if(!color())return null;
 return {id:236,name:'冰廊·错峰回转',difficulty:'normal',width:7,height:10,playable:mask,mechanismRules:PROFILE,timeSeconds:135,reward:200,parMoves:50,preservedMoveTarget:50,
 designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:11,calibratedDifficulty:11},blocks:placed,gates,
 mechanismAdaptation:{sourceReference:sourceFile,change:'源7×10含10个不可玩格、中央孤岛墙；依无内墙硬规则改为同外尺寸60格左右对称削肩原创轮廓，非整体镜转。24本体与各体面积、两V3冰7及三色冰门9保留。两源非原向L4各适配SQ2，黄L3适配V3；普通双格换H2/V2并全局重铺，普通块为原向素材及相邻异色重新配色，两冰体粉/蓝不改。保持七出口唯一色及冰计数，因原创轮廓重新安排出口边界，跨度2–3。'}};
}
const start=Number(process.argv[2]??1),count=Math.min(500,Number(process.argv[3]??80)),run=out+`/run-${start}-${Date.now()}`;fs.mkdirSync(run);const rows=[];let accepted;
for(let seed=start;seed<start+count;seed++){
 const level=make(seed),row={seed,budget:{routeMilliseconds:1500,routeStates:45000,lowerMilliseconds:4000,lowerStates:600000}};
 if(!level){row.status='TILING_BUDGET';rows.push(row);continue;}
 row.levelSha256=digest(level);
 try{
  row.audit=audit(level,api);row.route=search(compile(level,api),{floor:16,maxMilliseconds:1500,maxStates:45000,pointer:true});row.status='ROUTE_'+row.route.status;
  if(row.route.status==='witness'){
   row.replay=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=row.replay.nonClearingDrags;
   if(row.U<11)row.status='BELOW_DIFFICULTY';else if(row.U>15)row.status='ABOVE_DIFFICULTY';else{
    row.lower=lower(level,api,{floor:11,maxMilliseconds:4000,maxStates:600000});row.status=row.lower.thresholdProven?'BOUNDS_MET_PENDING_QUALIFICATION':'LOWER_'+row.lower.status;
    if(row.lower.thresholdProven){row.qualification=qualify(level,row.route.drags,api);level.preservedMoveTarget=row.replay.effectiveDrags;level.parMoves=row.replay.effectiveDrags;
     const proof={...row.lower,originalInputLevelSha256:row.levelSha256,levelSha256:digest(level),binding:'Only final independent total-drag scoring metadata adjusted; mechanical native input deep-equality retained'};
     accepted={status:'HEADLESS_QUALIFIED_PENDING_DUAL_POINTER',level,drags:row.route.drags,levelSha256:digest(level),routeSha256:digest(row.route.drags),sourceFile,proof,qualification:row.qualification,replay:replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true}),audit:audit(level,api),difficultyBand:[11,15],certifiedLowerBound:11,witnessUpperBound:row.U,pointerValidated:false,formalAdopted:false,releaseApproved:false};
     writeNew(run+'/qualified236.json',accepted);
    }
   }
  }
 }catch(e){row.status='REJECTED';row.error=e.stack;}
 writeNew(run+`/candidate-${seed}.json`,{level,row});rows.push(row);
 console.log(JSON.stringify({seed,status:row.status,U:row.U,error:row.error?.split('\n')[0],clears:row.route?.maxClears}));if(accepted)break;
}
writeNew(run+'/report.json',{accepted:accepted?{file:run+'/qualified236.json',levelSha256:accepted.levelSha256}:null,rows});console.log(JSON.stringify({run,accepted:Boolean(accepted),attempted:rows.length}));
