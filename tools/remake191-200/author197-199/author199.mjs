import {api,base,shapes,tile,recolorBag,rng,rect,save,audit,searchSpatial,project,digest,lower} from './common.mjs';
const R=rng(Number(process.env.SEED??199108)),rows=[],start=Date.now(),max=Number(process.env.ATTEMPTS??150);let best=0;
for(let n=0;n<max;n++){
 const seed=R.state(),l=base(199);l.blocks=[];l.gates.find(g=>g.color==='blue').size=3;l.gates.find(g=>g.color==='blue').offset=6;l.gates.find(g=>g.color==='yellow').offset=3;
 const specs=[
  {owner:null,sh:[4,9,8,8,1,1,1],cols:['red','red','red','blue','blue','blue','green']},
  {owner:'cover5',sh:[8,8,1],cols:['blue','green','red'],shells:{0:'red'}},
  {owner:'cover7',sh:[3,8,8,8,8,8,8],cols:['red','blue','green','red','blue','green','yellow']},
  {owner:'cover12',sh:[3,9,9,3,7],cols:['green','yellow','orange','blue','red'],shells:{0:'blue',1:'red'},ice:2},
  {owner:'cover18',sh:[8,8,3,4,8],cols:['purple','green','yellow','red','blue']},
  {owner:'cover25',sh:[8,8,1],cols:['orange','purple','red']}
 ];
 let ok=true;for(const g of specs){const s=l.shutters.find(s=>s.id===g.owner),cells=s?rect(s.x,s.y,s.width,s.height):l.playable.filter(([x,y])=>!l.shutters.some(s=>x>=s.x&&x<s.x+s.width&&y>=s.y&&y<s.y+s.height));const bs=g.sh.map((shape,i)=>({id:`r108-199-${g.owner??'open'}-${i}`,shape:shapes[shape],color:g.cols[i],...(g.owner?{shutterId:g.owner}:{}),...(g.shells?.[i]?{layers:[g.cols[i],g.shells[i]]}:{}),...(g.ice===i?{frozen:16}:{})}));
  if(['cover7','cover18'].includes(g.owner))for(const b of bs)if(b.shape.length===2)b.shape=R.shuffle([shapes[2],shapes[8]])[0];
  const packed=tile(bs,cells,{seed:R.state(),maxNodes:6000,preferLarge:false});R.random();if(!packed||!recolorBag(packed,{seed:R.state(),pins:g.owner?{}:{'r108-199-open-0':'red'}})){ok=false;rows.push({n,seed,status:'packing-fail',owner:g.owner});break;}R.random();l.blocks.push(...packed);
 }if(!ok){rows.push({n,seed,status:'packing-fail'});continue;}
 let check,s,rep,proof,error;
 try{check=audit(l);s=searchSpatial(project(l),api,{floor:11,maxMilliseconds:1100,maxStates:18000,maxTransitions:250000,normalize:true,symmetry:true,diagnosticTrace:true,orderSeed:n%30});if(s.status==='witness'){rep=api.replayRevisedRoute(l,s.drags);if(rep.complete&&rep.nonClearingDrags>=5)proof=lower(l,{floor:5,maxMilliseconds:2000,maxStates:250000});}}catch(e){error=e.message;}
 const row={n,seed,sha:digest(l),status:s?.status??'static-reject',U:rep?.nonClearingDrags,clears:s?.maxClearsSeen,L:proof?.status,error};rows.push(row);
 if((s?.maxClearsSeen??0)>best||rep?.complete){best=Math.max(best,s?.maxClearsSeen??0);row.file=save(rep?.complete?'candidate199':'partial199',{ruleVersion:'1.108.0',level:l,levelSha256:digest(l),audit:check,search:s,replay:rep,proof,drags:s.drags??[],iteration:{n,seed},budget:{searchMs:1100,proofMs:2000},sourceFile:'.codex-temp/remaining98-v111/late/source-review-199.json',sourceAdaptation:'30 bodies,7 opening and real curtain batches3/7/5/5/3 at5/7/12/18/25, all fill their original preserved candidate66cell geometry. Fresh source correction: shell1 belongscover5; shells2 and ice16 belongcover12, no opening shells. Native color/shape adaptation underv108; M11 source11/30 exceeds30% and adapted count3. Five frozen exits3/8/14/21/29 retained.'});console.log(JSON.stringify(row));}
 if(rep?.complete&&rep.nonClearingDrags<=10&&proof?.thresholdProven)break;
}
console.log(save('attempts199',{elapsedMs:Date.now()-start,rows}));
