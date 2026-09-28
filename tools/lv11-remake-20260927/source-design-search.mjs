import fs from 'node:fs';
import path from 'node:path';
import {runStaticNative} from './design-native.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import assert from 'node:assert/strict';

const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.79.0');
const root='deliverables/lv11-remake-20260927';
const out=path.join(root,'source-design-search-'+Date.now());fs.mkdirSync(out,{recursive:true});
const ledger=JSON.parse(fs.readFileSync(path.join(root,'source-ledger.json')));
let state=Number(process.argv[2]??271101),seed=state;
const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
const pick=a=>a[Math.floor(random()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const families=[[0,0,2,2,2,0,0],[0,1,2,2,2,1,0],[0,0,1,1,1,0,0],[2,2,0,0,0,2,2],[0,2,2,0,2,2,0],[0,1,1,1,1,1,0],[1,0,0,0,0,0,1],[0,0,1,0,1,0,0]];
const ice=ledger.blocks.filter(b=>b.frozen),plainBars=ledger.blocks.filter(b=>b.shape.length===3&&!b.frozen);
const H3=[[0,0],[1,0],[2,0]],S=[[0,0]],point=p=>p.join(',');
function make(iteration){
 const starts=families[Number(process.argv[5]??Math.floor(iteration/100)%families.length)],W=Math.max(...starts)+6,H=7,flip=random()<.5;
 const playable=starts.flatMap((start,y)=>Array.from({length:6},(_,i)=>[start+i,y]));
 const cells=new Set(playable.map(point)),sourceBars=random()<.45?ice:shuffle(ice),sourceFree=random()<.5?plainBars:shuffle(plainBars),blocks=[];
 const position=(x,y,len)=>[flip?W-(x+len):x,y];
 for(let y=0;y<7;y++){
  const b=sourceBars[y],[x,yy]=position(starts[y]+3,y,3);blocks.push({id:b.id,x,y:yy,color:b.color,shape:H3,frozen:b.frozen});
 }
 for(let i=0;i<3;i++){
  const y=[0,1,6][i],b=sourceFree[i],[x,yy]=position(starts[y],y,3);blocks.push({id:b.id,x,y:yy,color:b.color,shape:H3});
 }
 const board=flip?playable.map(([x,y])=>[W-1-x,y]):playable;
 const own=new Map(blocks.flatMap(b=>b.shape.map(([dx,dy])=>[`${b.x+dx},${b.y+dy}`,b])));
 for(const[cell,b]of own){const[x,y]=cell.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const c=own.get(point(p));if(c&&c.id!==b.id&&c.color===b.color)return;}}
 const spaces=board.filter(p=>!own.has(point(p))).sort((a,b)=>a[1]-b[1]||a[0]-b[0]),count={cyan:6,purple:6};
 const singles=[];
 function fill(i){if(i===spaces.length)return true;const[x,y]=spaces[i];for(const color of shuffle(['cyan','purple'])){
   if(!count[color])continue;
   if([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(p=>own.get(point(p))?.color===color))continue;
   const b={id:`source-design-single-${i}`,x,y,color,shape:S};own.set(point([x,y]),b);singles[i]=b;count[color]--;if(fill(i+1))return true;count[color]++;own.delete(point([x,y]));
  }return false;
 }
 if(!fill(0))return;
 blocks.push(...singles);
 const boardSet=new Set(board.map(point)),gates=[];
 const overlap=g=>gates.some(h=>h.side===g.side&&g.offset<h.offset+h.size&&h.offset<g.offset+g.size);
 const sideMouths=(size,verticalToo)=>{
  const a=[];for(const side of ['left','right'])for(let offset=0;offset+size<=H;offset++){
   const x=side==='left'?0:W-1;if(Array.from({length:size},(_,i)=>[x,offset+i]).every(p=>boardSet.has(point(p))))a.push({side,offset,size});
  }
  if(verticalToo)for(const side of ['top','bottom'])for(let offset=0;offset+size<=W;offset++){
   const y=side==='top'?0:H-1;if(Array.from({length:size},(_,i)=>[offset+i,y]).every(p=>boardSet.has(point(p))))a.push({side,offset,size});
  }
  return a.filter(g=>!overlap(g));
 };
 let mouths=sideMouths(3,true);if(!mouths.length)return;
 gates.push({...pick(mouths),id:'source-design-green',color:'green'});
 const greenGate=gates[0],greenOpens=blocks.some(b=>b.color==='green'&&!b.frozen&&(
  greenGate.side==='top'?b.y===0&&b.x>=greenGate.offset&&b.x+3<=greenGate.offset+3:
  greenGate.side==='bottom'?b.y===H-1&&b.x>=greenGate.offset&&b.x+3<=greenGate.offset+3:
  greenGate.side==='left'?b.x===0&&b.y>=greenGate.offset&&b.y<greenGate.offset+3:
  b.x+3===W&&b.y>=greenGate.offset&&b.y<greenGate.offset+3));
 // Source-derived rows can need a green first clear to expose cyan singles.
 mouths=sideMouths(1,false).filter(g=>{const b=own.get(`${g.side==='left'?0:W-1},${g.offset}`);return greenOpens||(b?.color==='cyan'&&!b.frozen&&b.shape.length===1);});
 if(!mouths.length)return;gates.push({...pick(mouths),id:'source-design-cyan',color:'cyan'});
 for(const[color,frozen]of shuffle([['purple',7],['pink',6],['red',13]])){
   mouths=sideMouths(1,false);if(!mouths.length)return;gates.push({...pick(mouths),id:'source-design-'+color,color,frozen});
 }
 return{id:11,name:'冻域排序',difficulty:'hard',timeSeconds:120,reward:40,width:W,height:H,playable:board,blocked:[],seams:[],mechanismRules:'revised-2026-09-23-v1.4',parMoves:36,preservedMoveTarget:36,gates,blocks};
}
const rows=[];let valid=0,solved=0,best=-1;
for(let i=0;i<Number(process.argv[3]??4000);i++){
 const level=make(i);if(!level)continue;valid++;
 const r=runStaticNative(level,{artifactRoot:out,maxMilliseconds:Number(process.argv[4]??350),maxStates:250000,floor:21});
 const row={iteration:i,levelSha256:digest(level),status:r.status,cost:r.relaxedNonClearingDrags??null,states:r.discoveredStates,ms:r.milliseconds};rows.push(row);
 fs.writeFileSync(path.join(out,'attempt-'+i+'.json'),JSON.stringify({level,native:r,sourceLedger:root+'/source-ledger.json'}),{flag:'wx'});
 if(row.cost!==null){solved++;if(row.cost>best){best=row.cost;fs.writeFileSync(path.join(out,'best-'+best+'.json'),JSON.stringify({level,native:r},null,2),{flag:'wx'});console.log(JSON.stringify({best,...row,out}));}}
 if(row.cost>=16&&row.cost<=20){
  const route=checkSymmetryFloor(level,{floor:21,maxStates:500000,maxMilliseconds:20000}),drags=route.relaxedRoute??[],nonclear=drags.filter(d=>!d.exitSide),multi=nonclear.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length>1).length;
  const target=path.join(out,'route-'+i+'.json');fs.writeFileSync(target,JSON.stringify({level,result:route,drags,multi,single:nonclear.length-multi},null,2),{flag:'wx'});
  console.log(JSON.stringify({target,cost:route.relaxedNonClearingDrags,multi,single:nonclear.length-multi}));if(drags.length&&multi>nonclear.length-multi)break;
 }
 if(valid%20===0){fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({seed,out,rows,valid,solved,best,screeningOnly:true},null,2));console.log(JSON.stringify({i,valid,solved,best}));}
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({seed,out,rows,valid,solved,best,screeningOnly:true},null,2));
console.log(JSON.stringify({out,valid,solved,best}));
