import assert from 'node:assert/strict';
export const VERSION='staggered-interface-ordering-preference-v1';
export const MAX_PREFERENCE_CHECKS=1000000;
export function assertInterfaceLayout(level,p){
 assert(p&&Object.keys(p).sort().join(',')==='bottomSplitX,splitY,topLeftAxis,topSplitX');
 for(const x of [p.topSplitX,p.bottomSplitX])assert(Number.isSafeInteger(x)&&x>=1&&x<level.width);
 assert.notEqual(p.topSplitX,p.bottomSplitX,'Explicit staggered seam');
 assert(Number.isSafeInteger(p.splitY)&&p.splitY>=1&&p.splitY<level.height);
 assert(['horizontal','vertical'].includes(p.topLeftAxis));return true;
}
export function createInterfacePreferenceMeter({qualificationOnly=false,now=Date.now,maxChecks=MAX_PREFERENCE_CHECKS}={}){
 if(!qualificationOnly)assert.equal(now,Date.now);assert(Number.isSafeInteger(maxChecks)&&maxChecks>=0&&maxChecks<=MAX_PREFERENCE_CHECKS);
 const start=now(),byKind={};let checks=0;
 return{charge(kind){assert(now()-start<30000,'interface-preference-deadline');assert(checks<maxChecks,'interface-preference-check-cap');checks++;byKind[kind]=(byKind[kind]??0)+1;},
 report(){return{version:VERSION,checks,byKind:{...byKind},maxChecks,elapsedMilliseconds:now()-start,maxMilliseconds:30000,countMeaning:'Actual preference score cell/body comparisons; separate from original DFS and complete-world/search counts.',worlds:0};}};
}
function regionAt(x,y,p){const top=y<p.splitY,left=x<(top?p.topSplitX:p.bottomSplitX),same=top===left;
 return{axis:same?p.topLeftAxis:p.topLeftAxis==='horizontal'?'vertical':'horizontal',id:(top?'top':'bottom')+'-'+(left?'left':'right')};}
/** Score only: no placement is removed. Shapes are never rotated. */
export function placementInterfacePreference(body,p,charge=()=>{}){
 const w=1+Math.max(...body.shape.map(c=>c[0])),h=1+Math.max(...body.shape.map(c=>c[1])),axis=w>h?'horizontal':h>w?'vertical':null;
 let matching=0,near=0;const regions=new Set();
 for(const[dx,dy]of body.shape){charge('placement-cell');const x=body.x+dx,y=body.y+dy,r=regionAt(x,y,p),split=y<p.splitY?p.topSplitX:p.bottomSplitX;regions.add(r.id);matching+=Number(r.axis===axis);near+=Number(Math.abs(x-split)<=1||Math.abs(y-p.splitY)<=1);}
 const shortInterface=body.shape.length===2&&near>0;
 return{bonus:(axis?.45*matching/body.shape.length:0)+(shortInterface?.55:0)+(regions.size>1&&body.shape.length<=3?.10:0),axis,shortInterface,regions:[...regions].sort(),orientationMatchFraction:axis?matching/body.shape.length:0};
}
/** Partial gate ordering. Many parallel bars touching one board side are a
 * risk indicator only, not an obstruction or a difficulty certificate. */
export function gateParallelExposure(level,gate,charge=()=>{}){
 let n=0;const horizontal=['left','right'].includes(gate.side);
 for(const b of level.blocks){charge('gate-body');const w=1+Math.max(...b.shape.map(c=>c[0])),h=1+Math.max(...b.shape.map(c=>c[1]));
  if(b.shape.length<3||!(horizontal?h===1:w===1))continue;
  const touching=gate.side==='left'?b.x===0:gate.side==='right'?b.x+w===level.width:gate.side==='top'?b.y===0:b.y+h===level.height;
  n+=Number(touching);
 }return Math.max(0,n-1)*.06;
}
/** Current partial assignment only. Penalize same-colour parallel long bars
 * in the same strip feeding one ordinary gate. No colour domain is removed. */
export function parallelOrdinaryFeedRisk(level,index,color,assigned,gates,charge=()=>{}){
 const g=gates.find(g=>g.color===color);assert(g);if(g.frozen)return 0;
 const b=level.blocks[index],w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1])),horizontal=['left','right'].includes(g.side);
 if(b.shape.length<3||!(horizontal?h===1:w===1))return 0;
 let count=0;for(let j=0;j<level.blocks.length;j++){charge('colour-parallel-body');if(j===index||assigned[j]!==color)continue;const other=level.blocks[j],ow=1+Math.max(...other.shape.map(p=>p[0])),oh=1+Math.max(...other.shape.map(p=>p[1]));
  if(ow===w&&oh===h&&(horizontal?other.x===b.x:other.y===b.y))count++;
 }return count;
}
