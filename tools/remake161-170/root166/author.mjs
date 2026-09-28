import fs from 'node:fs';
import {api,base,source,shapes,tile,recolorBag,rng,rect,searchSpatial,project,digest,audit} from '../author164-167/common.mjs';
import {ROOT,writeNew,ruleGate} from '../common.mjs';
import {shortenRoute} from '../../remake21to30-route-shortcuts.mjs';
ruleGate();const OUT=ROOT+'/root166';fs.mkdirSync(OUT,{recursive:true});
const src=source(166),R=rng(Number(process.env.SEED??103166)),rows=[],map={SINGLE:1,V2:2,V3:3,H2:8,H3:9,SQ2:7,L3:4,L4:10,SQ3:14};
const budget={maxMilliseconds:1200,maxStates:20000,maxTransitions:200000};let best=-1;
const stamp=Date.now(),log=OUT+'/attempts-'+stamp+'.jsonl';
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??90);attempt++){
 const l=base(166),seed=R.state();
 l.shutters=[{id:'r103-166-left',x:0,y:8,width:5,height:3,count:4},{id:'r103-166-right',x:0,y:4,width:5,height:4,count:15},
 {id:'r103-166-lower-left',x:1,y:0,width:3,height:4,count:1,skin:'lift'},{id:'r103-166-upper-left',x:0,y:8,width:4,height:3,count:1,skin:'lift'},
 {id:'r103-166-lower-right',x:0,y:4,width:3,height:4,count:1,skin:'lift'},{id:'r103-166-upper-right',x:2,y:4,width:3,height:4,count:1,skin:'lift'}];
 const closed=new Set(l.shutters.slice(0,2).flatMap(s=>rect(s.x,s.y,s.width,s.height)).map(p=>p.join(',')));
 const groups=[{s:src.opening,shapeIds:[14,13,3,13,7,10,13,2],cells:l.playable.filter(([x,y])=>!closed.has([x,y].join(','))&&!(x===6&&y>=8)),name:'opening'},
 {s:src.curtains[0],shapeIds:[8,1,3,3,2,2,2],region:l.shutters[0]},
 {s:src.curtains[1],shapeIds:[2,2,1,2,1,1,2,1,2,2,1,1,2],region:l.shutters[1]},
 ...src.lifts.map((s,i)=>({s,region:l.shutters[i+2]}))];
 let failed;
 for(let gi=0;gi<groups.length;gi++){
  const g=groups[gi],specs=g.s.pieces.map((p,i)=>({id:`r103-166-${gi}-${i}`,shape:shapes[g.shapeIds?.[i]??map[p[1]]],color:p[0],...(g.region?{shutterId:g.region.id}:{}),...(g.s.sourcePieces[i]?.iceInitial?{frozen:g.s.sourcePieces[i].iceInitial}:{})}));
  if(gi===0){const ice=specs.splice(2,1)[0];l.blocks.push({...ice,x:6,y:8});}
  for(const b of specs){if(!b.frozen&&b.shape.length===2&&R.random()<.5)b.shape=shapes[R.random()<.5?2:8];if(gi>0&&!b.frozen&&b.shape===shapes[4]&&R.random()<.65)b.shape=shapes[R.random()<.5?3:9];}
  const cells=g.cells??rect(g.region.x,g.region.y,g.region.width,g.region.height);
  let bs=tile(specs,cells,{seed:R.state(),maxNodes:15000,preferLarge:false,pins:gi===0?{'r103-166-0-0':[0,1]}:{}});R.random();
  if(!bs){failed='packing group '+gi;break;}
  const pins=Object.fromEntries(bs.filter(b=>b.frozen||b.id==='r103-166-0-0').map(b=>[b.id,b.color]));
  if(!recolorBag(bs,{seed:R.state(),pins})){failed='adjacent colors '+gi;break;}R.random();l.blocks.push(...bs);
 }
 if(failed){rows.push({attempt,seed,status:'construction-rejected',reason:failed});continue;}
 l.gates=[{id:'blue',color:'blue',side:'left',offset:1,size:3},
 {id:'cyan',color:'cyan',side:'right',offset:4,size:3,frozen:2},
 {id:'green',color:'green',side:'right',offset:1,size:3,frozen:5},
 {id:'red',color:'red',side:'left',offset:4,size:3,frozen:7},
 {id:'orange',color:'orange',side:'top',offset:1,size:3,frozen:12},
 {id:'pink',color:'pink',side:'left',offset:8,size:3,frozen:14},
 {id:'purple',color:'purple',side:'bottom',offset:0,size:3,frozen:16},
 {id:'yellow',color:'yellow',side:'bottom',offset:4,size:3,frozen:18}];
 let spatial,result,replayed,drags,error;
 try{spatial=audit(l);result=searchSpatial(project(l),api,{...budget,floor:15,normalize:true,orderSeed:attempt,diagnosticTrace:true});
  if(result.status==='witness'){drags=shortenRoute(l,result.drags,api).drags;replayed=api.replayRevisedRoute(l,drags);}
 }catch(e){error=e.message;}
 const row={attempt,seed,levelSha256:digest(l),budget,status:result?.status??'static-rejected',maxClears:result?.maxClearsSeen,U:replayed?.nonClearingDrags,complete:replayed?.complete,error};
 rows.push(row);fs.appendFileSync(log,JSON.stringify(row)+'\n');console.log(JSON.stringify(row));
 if((result?.maxClearsSeen??-1)>best||replayed?.complete){best=Math.max(best,result?.maxClearsSeen??-1);const file=OUT+'/candidate-'+Date.now()+'.json';writeNew(file,{ruleVersion:'1.103.0',level:l,drags:drags??[],spatial,result,replay:replayed,sourceFile:'deliverables/remake161-170-v146-20260924/source-audit/source166-review.json',sourceAdaptation:'v1.103 shape/color redesign: opening8 bodies29cells (original21); 7-body curtain4 resized15→18, 13-body curtain15 resized33→28, four12cell lifts with all5/3/5/5 bodies. Known ice18/6/10 and 7 gate counts retained; upper-left lift below first curtain, both right lifts below second, lower-left lift below opening. All46 bodies retained. Upper-left lift uses4x3 instead of3x4 to fit original75cell board. All new placements original, no runtime change.',floorStatus:'NOT_RUN',pointerValidated:false,formalAdopted:false});console.log(file);if(replayed?.complete&&replayed.nonClearingDrags<=10)break;}
 R.random();global.gc?.();
}
writeNew(OUT+'/round-'+stamp+'.json',{ruleVersion:'1.103.0',finiteBudget:true,rows});
