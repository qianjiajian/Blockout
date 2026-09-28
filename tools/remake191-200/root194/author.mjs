import fs from 'node:fs';
import {api,shapes,tile,recolor,rng,rect,project,searchSpatial} from '../author194-196/common.mjs';
import {payload,native} from '../author194-196/floor-countdown.mjs';
import {ROOT,digest,auditSpatial,writeNew,ruleGate} from '../common.mjs';
import {replay} from '../replay.mjs';
ruleGate();
const base=JSON.parse(fs.readFileSync(ROOT+'/author194-196/candidate194-1790525206611.json')).level;
const dir=ROOT+'/root194';fs.mkdirSync(dir,{recursive:true});const R=rng(Number(process.env.SEED??194901)),end=Date.now()+Number(process.env.SECONDS??90)*1000,log=[];let best=0;
const save=(name,d)=>{const p=dir+'/'+name+'-'+Date.now()+'.json';writeNew(p,d);return p;};
for(let attempt=0;Date.now()<end;attempt++){
 const seed=R.state(),l=structuredClone(base);l.shutters[0].height=7;for(const c of l.shutters.slice(1))c.y++;
 const occupied=new Set(l.shutters.flatMap(c=>rect(c.x,c.y,c.width,c.height).map(x=>x.join(','))));
 let okay=true;const assembled=[];
 for(const owner of [null,...l.shutters.map(c=>c.id)]){
  const spec=structuredClone(l.blocks.filter(b=>owner?b.shutterId===owner:!b.shutterId&&b.id!=='q-orange'));
  if(owner===null){const large=spec.filter(b=>b.shape.length===9);large[0].shape=shapes[7];large[1].shape=shapes[13];}
  if(owner==='c10'){
   const ordinary=R.shuffle(spec.filter(b=>!b.layers&&b.shape.length<=4));const four=ordinary.find(b=>b.shape.length===4),two=ordinary.find(b=>b.shape.length===2);
   four.shape=shapes[14];two.shape=shapes[14];
  }
  const c=l.shutters.find(c=>c.id===owner),cells=c?rect(c.x,c.y,c.width,c.height):l.playable.filter(x=>!occupied.has(x.join(',')));
  const bs=tile(spec,cells,{seed:R.state(),maxNodes:5000,preferLarge:false});R.random();if(!bs){okay=false;log.push({attempt,seed,status:'packing-fail',owner});break;}
  // Shell identity/layer count persists; all known shape/color adaptations are explicit in final review.
  const palette=owner===null?['blue','yellow','green','pink','red']:['blue','yellow','green','pink','red','orange','cyan','purple'];
  const pins=owner===null?Object.fromEntries(bs.filter(b=>b.y===0).map(b=>[b.id,b.x<4?'blue':'pink'])):{};
  if(!recolor(bs,palette,{seed:R.state(),pins})){okay=false;log.push({attempt,seed,status:'color-fail',owner});break;}assembled.push(...bs);
 }
 if(!okay)continue;l.blocks=[...assembled,structuredClone(base.blocks.find(b=>b.id==='q-orange'))];
 const slots={blue:['top',1,3],orange:['top',4,3],yellow:['bottom',4,3],green:['bottom',1,3],pink:['left',10,3],red:['right',8,3],cyan:['left',1,3],purple:['right',5,3]};
 for(const g of l.gates){const[side,offset,size]=slots[g.color];Object.assign(g,{side,offset,size});}
 let spatial,proof,search,route,error;
 try{
  spatial=auditSpatial(l,api);const prefix=structuredClone(l);prefix.blocks=prefix.blocks.filter(b=>b.id!=='q-orange');delete prefix.generators;
  const{p}=payload(prefix,{floor:11,maxMilliseconds:1200,maxStates:150000});p.goalClears=10;proof=native(p);
  search=searchSpatial(project(l),api,{floor:16,maxMilliseconds:1300,maxStates:30000,maxTransitions:300000,normalize:true,orderSeed:seed,diagnosticTrace:true});
  if(search.status==='witness')route=replay(l,search.drags,api,{complete:true,requirePointerCompatible:true});
 }catch(e){error=e.message;}
 const row={attempt,seed,hash:digest(l),status:search?.status??'static-fail',clears:search?.maxClearsSeen,U:route?.nonClearingDrags,proof:proof?.status,shortcut:proof?.relaxedNonClearingDrags,error};log.push(row);
 if(route||(search?.maxClearsSeen??0)>best||(proof?.thresholdProven&&search?.maxClearsSeen>8)){
  best=Math.max(best,search?.maxClearsSeen??0);row.file=save('candidate194',{level:l,drags:search?.drags??[],spatial,proof,search,replay:route,sourceFile:ROOT+'/author194-196/source194-1790525381700.json',sourceValidated:false,ruleVersion:'1.108.0',finiteBudget:{proofMilliseconds:1200,routeMilliseconds:1300},projection:'Full countdown inventory except one queue body and its machine. Every queue pose is entirely within c10 through clears0..9; goal is first clear10 and no postgoal action is used. This requires independent inclusion qualification before certification.',formalAdopted:false});console.log(JSON.stringify(row));
  if(route&&proof.thresholdProven)break;
 }
}
console.log(save('attempts194',log));
