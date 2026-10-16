import {validateLevel} from './tmp-runtime.mjs'; import {searchRevisedLevel,replayRevisedRoute} from './tmp-runtime.mjs'; import {checkRevisedRepositionFloor} from './tmp-runtime.mjs';
function level(blocks,gates,width=4,height=2){return {mechanismRules:'revised-2026-09-23-v1.4',id:999,name:'x',difficulty:'super',timeSeconds:300,reward:0,width,height,gates,blocks};}
let n=0;
const cols=['red','blue','green','yellow','purple','orange','pink','cyan'];
for(const h of [2,3,4]){
 let positions=[]; for(let y=0;y<2;y++)for(let x=0;x<4;x++)positions.push([x,y]);
 // fixed select occupied combinations
 function comb(start,arr){if(arr.length===h){const occ=arr; const blocks=occ.map(([x,y],i)=>({id:'b'+i,x,y,shape:[[0,0]],color: i%2?'blue':'red'})); const gates=[0,1].flatMap(y=>[{id:'r'+y,side:'right',offset:y,size:1,color:'red'},{id:'l'+y,side:'left',offset:y,size:1,color:'blue'}]); let lv=level(blocks,gates); try{validateLevel(lv)}catch{return;} const s=searchRevisedLevel(lv,{maxStates:20000,maxDragStates:300,maxTransitions:300000,maxMilliseconds:1000}); if(s.status==='witness'){const r=replayRevisedRoute(lv,s.drags);if(r.complete&&r.nonClearingDrags>=1){const lo=checkRevisedRepositionFloor(lv,{floor:2,maxStates:30000,maxDragStates:1000,maxTransitions:500000,maxMilliseconds:3000}); if(lo.status==='threshold-proven'){console.log('FOUND h',h,'occ',JSON.stringify(occ),'non',r.nonClearingDrags,'drags',s.drags.length,'lower',lo.status,JSON.stringify(s.drags)); process.exit(0);}}} return;} for(let i=start;i<positions.length;i++)comb(i+1,[...arr,positions[i]]);}
 comb(0,[]);
}
console.log('none');
