import {validateLevel,checkRevisedRepositionFloor,searchRevisedLevel,replayRevisedRoute} from './tmp-runtime.mjs';
const colors=['red','blue','green','yellow'];
const W=4,H=3; const cells=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++)cells.push([x,y]);
function sample(a){return a[Math.floor(Math.random()*a.length)]}
let best={cost:0};for(let t=0;t<3000;t++){
 const occ=[];while(occ.length<8){const p=sample(cells);if(!occ.some(q=>q[0]===p[0]&&q[1]===p[1]))occ.push(p)}
 // gates all rows both sides each unique per row; blocks color determines gate side via map
 const gates=[];for(let y=0;y<H;y++){gates.push({id:`r${y}`,side:'right',offset:y,size:1,color:colors[(2*y)%4]},{id:`l${y}`,side:'left',offset:y,size:1,color:colors[(2*y+1)%4]});}
 const blocks=occ.map(([x,y],i)=>({id:'b'+i,x,y,shape:[[0,0]],color:colors[(2*y+(x%2))%4]}));
 const lv={mechanismRules:'revised-2026-09-23-v1.4',id:999,name:'x',difficulty:'super',timeSeconds:300,reward:0,width:W,height:H,gates,blocks};try{validateLevel(lv)}catch{continue}
 const lo=checkRevisedRepositionFloor(lv,{floor:Math.min(5,best.cost+2),maxStates:15000,maxDragStates:300,maxTransitions:300000,maxMilliseconds:300});
 if(lo.status==='threshold-proven'&&lo.floor>best.cost){best={cost:lo.floor,lv,lo};console.log('best',best.cost,occ,lo.exploredStates);}
 if(best.cost>=5){const s=searchRevisedLevel(lv,{maxStates:200000,maxDragStates:300,maxTransitions:1000000,maxMilliseconds:3000}); if(s.witnessFound){const r=replayRevisedRoute(lv,s.drags);console.log('route',r.nonClearingDrags,r.complete,s.drags);process.exit(0)}}
}
console.log('final',best.cost,best.lv, best.lo)
