import fs from 'node:fs';
import{api,shapes,tile,recolor,rng,rect,project,searchSpatial,auditSpatial,digest,lower,save,ruleGate}from'./common.mjs';
import{replay}from'../../replay.mjs';
ruleGate();const initial=JSON.parse(fs.readFileSync(process.argv[2])),R=rng(Number(process.env.SEED??19410825)),log=[];let best=0;
for(let n=0;n<Number(process.env.ATTEMPTS??200);n++){
 const seed=R.state(),l=structuredClone(initial.level),occupied=new Set(),assembled=l.blocks.filter(b=>b.shutterId==='c10'||b.id==='q-orange');let okay=true;
 for(const c of l.shutters.filter(c=>c.id!=='c10')){
  const choices=c.id==='c5'?[[2,3]]:c.id==='c7a'?[[4,2],[2,4]]:[[2,1]],wh=R.shuffle(choices)[0];[c.width,c.height]=wh;
  const positions=R.shuffle(rect(0,8,8,6)).filter(([x,y])=>x%2===0&&x+c.width<=8&&y+c.height<=13&&rect(x,y,c.width,c.height).every(p=>l.playable.some(q=>q[0]===p[0]&&q[1]===p[1])&&!occupied.has(p.join(','))));
  if(!positions.length){okay=false;break;}[c.x,c.y]=positions[0];for(const p of rect(c.x,c.y,c.width,c.height))occupied.add(p.join(','));
  const old=l.blocks.filter(b=>b.shutterId===c.id),ids=c.id==='c5'?(c.width===2?[3,3]:[9,9]):c.id==='c7a'?(c.width===4?[9,9,2]:[3,3,8]):[1,1];const spec=old.map((b,i)=>({...b,shape:shapes[ids[i]]}));
  const bs=tile(spec,rect(c.x,c.y,c.width,c.height),{seed:R.state(),maxNodes:5000,preferLarge:false});R.random();if(!bs||!recolor(bs,['blue','green','yellow','pink','red'],{seed:R.state()})){okay=false;break;}assembled.push(...bs);
 }
 if(!okay)continue;for(const c of l.shutters.filter(c=>c.id==='c10'))for(const p of rect(c.x,c.y,c.width,c.height))occupied.add(p.join(','));
 const cells=l.playable.filter(p=>!occupied.has(p.join(','))),spec=l.blocks.filter(b=>!b.shutterId&&b.id!=='q-orange').map(b=>({...b}));
 const variants=[[9,9,13,13,7,7,8,8,9,9],[9,9,13,7,7,7,7,8,9,9],[9,9,14,7,7,4,8,8,9,9]];
 const ids=R.shuffle(variants)[0];if(ids.reduce((n,id)=>n+shapes[id].length,0)!==cells.length)continue;spec.forEach((b,i)=>b.shape=shapes[ids[i]]);
 const open=tile(spec,cells,{seed:R.state(),maxNodes:12000,preferLarge:false});R.random();if(!open){log.push({n,seed,status:'packing-fail'});continue;}
 const pins=Object.fromEntries(open.filter(b=>b.y===0).map(b=>[b.id,b.x<4?'blue':'pink']));
 if(!recolor(open,['blue','green','yellow','pink'],{seed:R.state(),pins})){log.push({n,seed,status:'color-fail'});continue;}
 l.blocks=[...open,...assembled];
 let audit,proof,s,rep,error;try{audit=auditSpatial(l,api);proof=lower(l,{maxMilliseconds:700,maxStates:160000});if(proof.maxClearsSeen>=2){s=searchSpatial(project(l),api,{floor:16,maxMilliseconds:1400,maxStates:22000,maxTransitions:260000,normalize:true,orderSeed:n%31,diagnosticTrace:true});if(s.status==='witness')rep=replay(l,s.drags,api,{complete:true,requirePointerCompatible:true});}}catch(e){error=e.message;}
 const row={n,seed,hash:digest(l),status:s?.status??'static-fail',clears:s?.maxClearsSeen,U:rep?.nonClearingDrags,proof:proof?.status,prefixU:proof?.relaxedNonClearingDrags,error};log.push(row);
 if(rep||(proof?.thresholdProven&&s?.maxClearsSeen>=10)||(s?.maxClearsSeen??0)>best){best=Math.max(best,s?.maxClearsSeen??0);row.file=save('scattered194',{...initial,level:l,levelSha256:digest(l),spatial:audit,proof,search:s,replay:rep,drags:s?.drags??[],iteration:{n,seed},budgets:{proofMs:700,searchMs:1400},sourceAdaptation:'All31 identities/roles preserved. Four real curtains retain5/7/7/10 but independently reshaped and repositioned; layers true full. Early shapes and colors reauthored to the remaining36 cells. Full source ledger pending.'});console.log(JSON.stringify(row));if(rep&&proof.thresholdProven)break;}
}
console.log(save('scatters194',log));
