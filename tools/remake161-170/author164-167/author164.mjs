import {api,base,source,shapes,tile,recolorBag,rng,rect,save,audit,searchSpatial,project,digest} from './common.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
import {shortenRoute} from '../../remake21to30-route-shortcuts.mjs';
const src=source(164),R=rng(Number(process.env.SEED??164103)),map={SINGLE:1,V2:2,V3:3,H2:8,H3:9,SQ2:7,L3:4,L4:10,Z4:5},palette=['green','red','blue','cyan','yellow','purple','pink'];
const rows=[],budget={maxMilliseconds:1500,maxStates:18000,maxTransitions:180000};let best=-1;
function specs(pieces,prefix,owner){return pieces.map((p,i)=>{p=Array.isArray(p)?{color:p[0],shape:p[1]}:p;let sid=map[p.shape];if(p.layers&&sid===4)sid=R.random()<.5?3:9;else if(sid===2&&R.random()<.5)sid=8;else if(sid===3&&R.random()<.5)sid=9;const color=p.color==='lime'?'pink':p.color;return{id:prefix+i,shape:shapes[sid],color,...owner?{shutterId:owner}:{},...p.layers?{layers:p.layers.map(c=>c==='lime'?'pink':c)}:{}};});}
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??100);attempt++){
 const seed=R.state(),l=base(164);l.shutters=[{id:'r103-164-c3',x:4,y:6,width:3,height:4,count:3},{id:'r103-164-c9',x:0,y:3,width:7,height:3,count:9},{id:'r103-164-c22',x:0,y:0,width:7,height:3,count:22}];
 let okay=true;const groups=[{pieces:src.opening.pieces,prefix:'o',cells:rect(0,6,4,4)},...src.curtains.map((s,i)=>({pieces:s.pieces,prefix:'h'+i+'-',owner:l.shutters[i].id,cells:rect(l.shutters[i].x,l.shutters[i].y,l.shutters[i].width,l.shutters[i].height)}))];
 for(const[gidx,g]of groups.entries()){
  if(gidx===0){l.blocks.push(...[[0,6,9,'green'],[0,7,8,'red'],[3,9,1,'red'],[0,9,9,'cyan'],[3,8,1,'yellow'],[3,7,1,'blue'],[2,7,2,'purple'],[0,8,8,'green'],[3,6,1,'yellow']].map(([x,y,s,color],i)=>({id:'o'+i,x,y,shape:shapes[s],color})));l.gates.push({id:'r103-164-green',color:'green',side:'left',offset:6,size:3});continue;}
  let bs=tile(specs(g.pieces,g.prefix,g.owner),g.cells,{seed:R.state(),preferLarge:false,maxNodes:12000});R.random();if(!bs){okay=false;break;}if(!recolorBag(bs,{seed:R.state()})){okay=false;break;}l.blocks.push(...bs);
 }
 if(!okay){rows.push({attempt,seed,status:'packing-rejected'});continue;}
 l.gates.push({id:'r103-164-red',color:'red',side:'bottom',offset:3,size:3,frozen:1},{id:'r103-164-yellow',color:'yellow',side:'right',offset:7,size:3,frozen:6},{id:'r103-164-blue',color:'blue',side:'right',offset:4,size:3,frozen:13},{id:'r103-164-purple',color:'purple',side:'left',offset:3,size:3,frozen:18},{id:'r103-164-cyan',color:'cyan',side:'right',offset:0,size:3,frozen:25},{id:'r103-164-pink',color:'pink',side:'top',offset:2,size:3,frozen:34});
 let check,search,replay,proof,drags,error;try{check=audit(l);search=searchSpatial(project(l),api,{...budget,floor:19,normalize:true,orderSeed:attempt,diagnosticTrace:true});if(search.status==='witness'){drags=shortenRoute(l,search.drags,api).drags;replay=api.replayRevisedRoute(l,drags);if(replay.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15)proof=checkSymmetryFloor(project(l),{floor:11,maxStates:50000,maxMilliseconds:3000});}}catch(e){error=e.message;}
 const row={attempt,seed,sha:digest(l),status:search?.status??'static-rejected',clears:search?.maxClearsSeen,U:replay?.nonClearingDrags,complete:replay?.complete,proof:proof?.status,error};rows.push(row);console.log(JSON.stringify(row));
 if((search?.maxClearsSeen??-1)>best||replay?.complete){best=Math.max(best,search?.maxClearsSeen??-1);row.file=save('candidate164',{activeRuleVersion:'1.103.0',level:l,sourceFile:'source164-review.json',sourceAdaptation:'Original placement and v1.103 colors; 33 known bodies and 5 shells retained, same areas of all three real hidden batches; source L3 shells adapted to legal native bars; lime mapped pink.',projection:'Only no-flip profile1.5→1.4; all inventory and mechanics retained. Optional-exit lower graph relaxes forced exits; full1.5 authoritative replay separate.',budget,iteration:{attempt,seed},audit:check,search,replay,proof,drags:drags??[],formalAdopted:false});console.log(row.file);if(proof?.thresholdProven)break;}
 R.random();
}
console.log(save('attempts164',rows));
