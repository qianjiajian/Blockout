import fs from 'node:fs';
import {api,base,source,shapes,tile,recolorBag,recolor,rng,rect,searchSpatial,project,digest,audit} from '../author164-167/common.mjs';
import {ROOT,writeNew,ruleGate} from '../common.mjs';
import {shortenRoute} from '../../remake21to30-route-shortcuts.mjs';
ruleGate();const OUT=ROOT+'/assist166';fs.mkdirSync(OUT,{recursive:true});
const src=source(166),R=rng(Number(process.env.SEED??16610303)),map={SINGLE:1,V2:2,V3:3,H2:8,H3:9,SQ2:7,L3:4,L4:10,SQ3:14};
const began=Date.now(),budget={maxMilliseconds:900,maxStates:15000,maxTransitions:150000},rows=[];let best=0;
for(let attempt=0;Date.now()-began<Number(process.env.BUDGET??180000);attempt++){
 const l=base(166),seed=R.state();l.shutters=[{id:'a166-c4',x:0,y:1,width:3,height:5,count:4},{id:'a166-c15',x:3,y:0,width:3,height:11,count:15},{id:'a166-lower-left',x:0,y:7,width:3,height:4,count:1,skin:'lift'},{id:'a166-upper-left',x:0,y:1,width:3,height:4,count:1,skin:'lift'},{id:'a166-lower-right',x:3,y:7,width:3,height:4,count:1,skin:'lift'},{id:'a166-upper-right',x:3,y:0,width:3,height:4,count:1,skin:'lift'}];
 const opening=[['cyan',3,6,1,18],['orange',3,6,4],['green',2,6,9],['purple',2,6,7],['blue',8,1,0]];
 l.blocks=opening.map(([color,s,x,y,frozen],i)=>({id:`a166-o${i}`,color,shape:shapes[s],x,y,...(frozen?{frozen}:{})}));
 const lower=[['blue',7],['green',R.random()<.5?2:8],['green',R.random()<.5?4:3],['cyan',R.random()<.5?4:9],['cyan',R.random()<.5?2:8],['blue',1]].map(([color,s],i)=>({id:`a166-low${i}`,color,shape:shapes[s]}));
 const lowerBlocks=tile(lower,rect(0,6,3,5),{seed:R.state(),maxNodes:10000,pins:{'a166-low0':[0,6]},preferLarge:false});R.random();if(!lowerBlocks||!recolor(lowerBlocks,['blue','cyan','green'],{seed:R.state(),pins:{'a166-low0':'blue','a166-low5':'blue'}})){rows.push({attempt,seed,status:'construct-rejected',reason:'opening6 packing/color'});continue;}R.random();l.blocks.push(...lowerBlocks);
 const groups=[...src.curtains,...src.lifts];let failure;
 for(let gi=0;gi<groups.length;gi++){const g=groups[gi],region=l.shutters[gi],specs=g.pieces.map(([color,kind],i)=>({id:`a166-h${gi}-${i}`,color,shape:shapes[map[kind]],shutterId:region.id,...(g.sourcePieces[i]?.iceInitial?{frozen:g.sourcePieces[i].iceInitial}:{})}));
  if(gi===0){specs.forEach((b,i)=>b.shape=shapes[[7,1,9,1,2,2,2][i]]);specs[3].color='cyan';}
  if(gi===2)specs.forEach((b,i)=>b.color=['blue','cyan','green','red','blue'][i]);if(gi===3)specs.forEach((b,i)=>b.color=['green','blue','cyan'][i]);
  for(const b of specs){if(!b.frozen&&b.shape.length===2&&R.random()<.5)b.shape=shapes[R.random()<.5?2:8];if(!b.frozen&&b.shape===shapes[4]&&R.random()<.55)b.shape=shapes[R.random()<.5?3:9];}
  if(gi===1){specs[3].shape=shapes[2];specs[8].shape=shapes[8];}
  const packed=tile(specs,rect(region.x,region.y,region.width,region.height),{seed:R.state(),maxNodes:20000,preferLarge:false,pins:gi===0?{'a166-h0-0':[0,1],'a166-h0-1':[2,1],'a166-h0-2':[0,5]}:gi===1?{'a166-h1-12':[3,9],'a166-h1-0':[4,4],'a166-h1-3':[3,5],'a166-h1-8':[3,8]}:gi===3?{'a166-h3-0':[0,1]}:{}});R.random();if(!packed){failure='packing '+gi;break;}const pins=Object.fromEntries(packed.filter(b=>b.frozen||gi===3&&b.shape.length===9||gi===0&&['a166-h0-0','a166-h0-2'].includes(b.id)||gi===1&&['a166-h1-0','a166-h1-3','a166-h1-8'].includes(b.id)).map(b=>[b.id,b.color]));if(!recolorBag(packed,{seed:R.state(),pins})){failure='color adjacency '+gi;break;}R.random();l.blocks.push(...packed);
 }
 if(failure){rows.push({attempt,seed,status:'construct-rejected',reason:failure});if(attempt<10)console.log(JSON.stringify(rows.at(-1)));continue;}
 l.gates=[['blue','left',5,3,0],['cyan','bottom',0,3,2],['green','left',1,3,5],['red','left',8,3,7],['orange','right',4,3,12],['pink','right',1,3,14],['purple','top',1,3,16],['yellow','right',7,3,18]].map(([color,side,offset,size,frozen])=>({id:`a166-g${color}`,color,side,offset,size,...(frozen?{frozen}:{})}));
 let spatial,result,replay,drags,error;try{spatial=audit(l);result=searchSpatial(project(l),api,{...budget,floor:11,normalize:true,orderSeed:attempt,symmetry:true,diagnosticTrace:true});if(result.status==='witness'){drags=shortenRoute(l,result.drags,api).drags;replay=api.replayRevisedRoute(l,drags);}}catch(e){error=e.message;}
 const row={attempt,seed,sha256:digest(l),budget,status:result?.status??'static-rejected',clears:result?.maxClearsSeen,U:replay?.nonClearingDrags,complete:replay?.complete,error};rows.push(row);
 if(error&&attempt<30)console.log(JSON.stringify(row));
 if((result?.maxClearsSeen??0)>best||replay?.complete){best=Math.max(best,result?.maxClearsSeen??0);const file=OUT+'/candidate-'+Date.now()+'.json';writeNew(file,{ruleVersion:'1.103.0',level:l,drags:drags??[],spatial,result,replay,sourceFile:'deliverables/remake161-170-v146-20260924/source-audit/source166-review.json',adaptation:'Preserve original75cell board. Source46 known bodies retained, add two ordinary opening bodies for +6cell board delta with two +1 source shape expansions. Opening10 bodies27 cells, both curtains7/13 bodies15/33cells, all four lifts5/3/5/5 bodies12cells each. Three source ice18/6/10 and seven gate counts remain. Shapes/colors authored per1.103; ordinary blue/cyan openings deliberately drive curtain4. Lower-left lift below opening; other three below real curtains. All actual source inventories preserved; no stage deleted.',floorStatus:'NOT_RUN',pointerValidated:false,formalAdopted:false});console.log(JSON.stringify({...row,file}));if(replay?.complete&&replay.nonClearingDrags<=10)break;}
 R.random();
}
writeNew(OUT+'/round-'+Date.now()+'.json',{ruleVersion:'1.103.0',elapsed:Date.now()-began,finiteBudget:true,rows});console.log(JSON.stringify({best,trials:rows.length}));
