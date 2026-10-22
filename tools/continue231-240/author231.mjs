import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, PROFILE, rect, ruleGate, loadApi, audit, digest, replay } from './common.mjs';
import { searchSpatial } from '../continuation211-colored-witness.mjs';
import { proveSymmetric } from '../continuation211-colored-proof.mjs';
import { compile, search } from '../remake191-200/root200/domain.mjs';

ruleGate();
const { api } = await loadApi();
const out = ROOT + '/author231';
fs.mkdirSync(out, { recursive: true });
const native = Object.fromEntries(api.FORMAL_BLOCK_SHAPES.map(s => [s.shapeId, s.cells]));
// Manual transcription of the untouched 2:00 frame at 10 seconds. Coordinates
// describe the competitor; they are never used as the new authored placement.
const source = [
  ['blue', [[0,0],[1,0],[2,0],[1,1]],0,0,'yellow'],
  ['red',rect(2,2),3,0,'blue'],
  ['blue',[[0,0],[1,0],[1,1]],5,0],
  ['yellow',[[0,0],[0,1],[1,1]],0,1],
  ['green',rect(1,2),2,1],['yellow',rect(2,1),3,2],
  ['green',[[0,0],[0,1],[1,1]],5,1],['red',rect(3,1),0,3],
  ['cyan',rect(1,1),3,3],['yellow',rect(1,1),4,3],
  ['cyan',rect(1,1),5,3],['red',rect(1,1),6,3],
  ['yellow',rect(2,1),1,4],['cyan',rect(1,1),4,4],['yellow',rect(1,1),5,4],
  ['red',rect(2,1),1,5],['red',rect(2,1),4,5],
  ['blue',rect(2,1),0,6],['purple',rect(1,2),2,6],['red',rect(1,2),3,6],
  ['green',rect(3,1),4,6,'yellow'],
  ['red',[[0,0],[1,0],[1,1]],0,7,'yellow'],
  ['blue',rect(1,3),4,7],['yellow',[[0,0],[1,0],[0,1]],5,7],
  ['green',[[0,0],[0,1],[1,1]],0,8],['yellow',rect(2,1),2,8],
  ['purple',rect(2,1),2,9],['red',[[1,0],[0,1],[1,1]],5,8],
].map(([color,shape,x,y,inner],i)=>({id:`source231-${i}`,color,shape,x,y,...inner?{layers:[color,inner]}:{}}));
assert.equal(source.flatMap(b=>b.shape).length,64);
assert.equal(new Set(source.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y].join(',')))).size,64);
const sourceFile = out + '/source-block-transcription.json';
if (!fs.existsSync(sourceFile)) fs.writeFileSync(sourceFile, JSON.stringify({
  sourceFrame: ROOT+'/source/frame-10.png', blocks:source,
  coloredGrids:[{color:'yellow',cells:[[3,4],[3,5]]}],
  gates:[{color:'red',frozen:0},{color:'blue',frozen:6},{color:'cyan',frozen:4},
    {color:'green',frozen:12},{color:'purple',frozen:14},{color:'yellow',frozen:16}],
  geometry:{width:7,height:10,playable:rect(7,10).filter(([x,y])=>!([0,6].includes(x)&&[4,5].includes(y)))},
  completeOpening:true,hiddenInventory:'none observed',
  sourceShellGridConflict:'v1.11: keep colored grid, remove four shell properties without deleting their bodies',
},null,2)+'\n',{flag:'wx'});

const mask=rect(7,10).filter(([x,y])=>!([0,6].includes(x)&&[0,9].includes(y)));
const palette=['red','blue','cyan','green','purple','yellow'];
function rng(seed){let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
const touching=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([dx,dy])=>Math.abs(a.x+x-b.x-dx)+Math.abs(a.y+y-b.y-dy)===1));
function make(seed){
  const random=rng(seed),shuffle=a=>a.map(v=>({v,r:random()})).sort((a,b)=>a.r-b.r).map(a=>a.v);
  const pieces=source.map((b,i)=>({id:`l231-b${i}`,color:b.color,
    shape: i===0?native[6]:b.shape.length===3&&b.shape.some(p=>p[0])&&b.shape.some(p=>p[1])?native[4]:b.shape }));
  const staged=start>=3000;
  const recolored=start>=4000;
  if(staged)pieces[0].shape=native[7];
  pieces.push({id:'l231-fill-grid',color:'yellow',shape:native[2]});
  const legal=new Set(mask.map(p=>p.join(','))),occupied=new Set(),placed=[],used=new Set();
  const fits=(b,x,y)=>b.shape.every(([dx,dy])=>legal.has([x+dx,y+dy].join(','))&&!occupied.has([x+dx,y+dy].join(',')));
  const controlled = start >= 1000;
  const pins=staged?[[7,0,2],[15,0,4],[17,0,3],[8,2,3],[11,3,3],[12,2,4],[16,2,5],[10,0,5],[13,0,7],[0,4,0]]:[[7,0,3],[15,0,5]];
  if(controlled)for(const[i,x,y]of pins){
    const b={...pieces[i],x,y};placed.push(b);used.add(i);
    for(const[dx,dy]of b.shape)occupied.add([x+dx,y+dy].join(','));
  }
  let budget=18000;
  function fill(){
    if(--budget<0)return false;
    if(used.size===pieces.length)return true;
    const p=mask.find(p=>!occupied.has(p.join(',')));
    const tried=new Set();
    for(const i of shuffle(pieces.map((_,i)=>i).filter(i=>!used.has(i))).sort((a,b)=>pieces[b].shape.length-pieces[a].shape.length)){
      const piece=pieces[i],sig=(recolored?'':piece.color)+JSON.stringify(piece.shape);if(tried.has(sig))continue;tried.add(sig);
      for(const [dx,dy]of piece.shape){const x=p[0]-dx,y=p[1]-dy,b={...piece,x,y};
        if(!fits(piece,x,y)||(!recolored&&placed.some(a=>a.color===b.color&&touching(a,b))))continue;
        placed.push(b);used.add(i);for(const[d,e]of b.shape)occupied.add([x+d,y+e].join(','));
        if(fill())return true;
        placed.pop();used.delete(i);for(const[d,e]of b.shape)occupied.delete([x+d,y+e].join(','));
      }
    }return false;
  }
  if(!fill())return null;
  if(recolored){
    const bag=new Map(),set=new Set(),pinIds=new Set(pins.map(([i])=>`l231-b${i}`));
    for(const b of pieces)bag.set(b.color,(bag.get(b.color)??0)+1);
    for(let i=0;i<placed.length;i++)if(pinIds.has(placed[i].id)){set.add(i);bag.set(placed[i].color,bag.get(placed[i].color)-1);}
    const neighbors=placed.map(a=>placed.map((b,j)=>a!==b&&touching(a,b)?j:-1).filter(j=>j>=0));let colorBudget=10000;
    function paint(){if(--colorBudget<0)return false;if(set.size===placed.length)return true;
      const i=shuffle(placed.map((_,i)=>i).filter(i=>!set.has(i))).sort((a,b)=>neighbors[b].filter(j=>set.has(j)).length-neighbors[a].filter(j=>set.has(j)).length)[0];
      for(const color of shuffle([...bag.keys()])){if(!bag.get(color)||neighbors[i].some(j=>set.has(j)&&placed[j].color===color))continue;
        placed[i].color=color;set.add(i);bag.set(color,bag.get(color)-1);if(paint())return true;bag.set(color,bag.get(color)+1);set.delete(i);
      }return false;
    }if(!paint())return null;
  }
  const slots=staged?[['left',2,3],['top',4,2],['left',5,3],...shuffle([['right',1,3],['right',5,3],['bottom',2,3]])]:controlled?[['left',3,3],...shuffle([['left',6,3],['right',1,3],['right',5,3],['top',2,3],['bottom',2,3]])]:shuffle([['left',1,3],['left',5,3],['right',1,3],['right',5,3],['top',2,3],['bottom',2,3]]);
  const freezes=[0,6,4,12,14,16];
  const gates=palette.map((color,i)=>({id:`l231-g-${color}`,color,side:slots[i][0],offset:slots[i][1],size:slots[i][2],...(freezes[i]?{frozen:freezes[i]}:{})}));
  const yellowCells=placed.filter(b=>b.color==='yellow').flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]));
  const eligible=yellowCells.filter(([x,y])=>x>=1&&x<=5&&y>=2&&y<=7);
  if(eligible.length<2)return null;
  const cells=shuffle(eligible).slice(0,2);
  return {id:231,name:'彩径·错峰开门',difficulty:'easy',width:7,height:10,playable:mask,
    mechanismRules:PROFILE,timeSeconds:120,reward:200,parMoves:40,preservedMoveTarget:40,
    designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:5,calibratedDifficulty:5},
    blocks:placed,gates,coloredGrids:[{id:'l231-yellow-floor',color:'yellow',cells}],
    mechanismAdaptation:{change:'竞品7×10腰部缺口改为四角切口原创对称轮廓。保留五冰门蓝6/青4/绿12/紫14/黄16及红普通门、2黄彩格；按v1.11保彩格撤4壳属性但保各外色本体。T/L非原向形适配已有q0素材'+(staged?'，蓝T4改同面积SQ2；左侧采用红门清除、青色停车、4/6门分段解冻的原创开局':'')+(recolored?'；普通体形色配对重新分配，六色总量保持':'')+'；原空彩格2格补1黄V2，28源体改29体66格满铺。全部位置重排，非镜像或整盘换色。',sourceReference:sourceFile},
  };
}

const start=Number(process.argv[2]??1),count=Math.min(1000,Number(process.argv[3]??100));
const run=out+`/run-${start}-${Date.now()}`;fs.mkdirSync(run);
fs.copyFileSync(new URL(import.meta.url),run+'/author-source.mjs');
let accepted=null;const rows=[];
for(let seed=start;seed<start+count;seed++){
  const level=make(seed),row={seed};if(!level){row.status='TILING_BUDGET';rows.push(row);if(seed%10===0)console.log(JSON.stringify(row));continue;}
  row.levelSha256=digest(level);
  try{
    row.audit=audit(level,api);
    row.route=start>=2000
      ? search(compile(level,api),{floor:11,maxMilliseconds:1600,maxStates:40000,pointer:true})
      : searchSpatial(level,api,{floor:11,maxMilliseconds:1200,maxStates:30000,maxTransitions:300000,normalize:true,orderSeed:seed%28});
    row.status='ROUTE_'+row.route.status;
    if(row.route.status==='witness'){
      const result=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});
      row.U=result.nonClearingDrags;row.totalDrags=result.effectiveDrags;
      if(row.U<5)row.status='BELOW_DIFFICULTY';
      else{
        row.proof=proveSymmetric(level,api,{floor:5,maxMilliseconds:8000,maxStates:160000,normalizeMonotone:true});
        row.status=row.proof.thresholdProven?'BOUNDS_MET_VALIDATION_PENDING':'LOWER_'+row.proof.status;
        if(row.proof.thresholdProven)accepted={level,drags:row.route.drags,proof:row.proof,row};
      }
    }
  }catch(e){row.status='REJECTED';row.error=e.message;}
  fs.writeFileSync(run+`/candidate-${seed}.json`,JSON.stringify({level,row},null,2)+'\n');
  rows.push(row);
  if(seed%5===0||row.U!==undefined||row.error)console.log(JSON.stringify({seed,status:row.status,U:row.U,error:row.error,clears:row.route?.maxClearsSeen}));
  if(accepted)break;
}
fs.writeFileSync(run+'/report.json',JSON.stringify({accepted,rows},null,2)+'\n');
console.log(JSON.stringify({run,accepted:Boolean(accepted),attempted:rows.length}));
