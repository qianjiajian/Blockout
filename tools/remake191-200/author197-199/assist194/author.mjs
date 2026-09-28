import fs from 'node:fs';
import {api,shapes,tile,recolor,recolorBag,rng,rect,project,searchSpatial,auditSpatial,digest,lower,save,ruleGate} from './common.mjs';
import {replay} from '../../replay.mjs';
ruleGate();const input='deliverables/remake191-200-20260927/author194-196/candidate194-1790525206611.json',base=JSON.parse(fs.readFileSync(input)).level;
const R=rng(Number(process.env.SEED??19410815)),depth=Number(process.env.DEPTH??7),log=[];let best=0;
function flex(spec,cells){const legal=new Set(cells.map(p=>p.join(','))),occ=new Set(),out=[],ids=[2,3,4,5,6,7,8,9,10,11,13,14];let nodes=0;const irr=s=>s.length!==(Math.max(...s.map(p=>p[0]))+1)*(Math.max(...s.map(p=>p[1]))+1);function go(){if(++nodes>8000)return false;if(out.length===spec.length)return occ.size===cells.length;const remain=cells.length-occ.size,slots=spec.length-out.length,p=cells.find(p=>!occ.has(p.join(',')));for(const id of R.shuffle(ids)){const shape=shapes[id];if(remain-shape.length<(slots-1)*2||remain-shape.length>(slots-1)*9||irr(shape)&&out.filter(b=>irr(b.shape)).length>=2)continue;for(const[dx,dy]of shape){const x=p[0]-dx,y=p[1]-dy,keys=shape.map(([sx,sy])=>[x+sx,y+sy].join(','));if(keys.some(k=>!legal.has(k)||occ.has(k)))continue;out.push({...spec[out.length],shape,x,y});keys.forEach(k=>occ.add(k));if(go())return true;out.pop();keys.forEach(k=>occ.delete(k));if(nodes>8000)return false;}}return false;}return go()?out:null;}
for(let n=0;n<Number(process.env.ATTEMPTS??150);n++){
 const seed=R.state(),l=structuredClone(base);l.shutters[0].height=depth;for(const c of l.shutters.slice(1))c.y+=depth-6;
 const cover=new Set(l.shutters.flatMap(s=>rect(s.x,s.y,s.width,s.height).map(p=>p.join(',')))),assembled=[];let ok=true;
 for(const owner of [null,...l.shutters.map(c=>c.id)]){
  const old=l.blocks.filter(b=>owner?b.shutterId===owner:!b.shutterId&&b.id!=='q-orange'),spec=structuredClone(old);
  if(!owner){const ids=depth===6?[9,14,9,14,9,13,8,7,8,9]:depth===8?(process.env.MIXED==='1'?[9,9,7,7,4,4,2,2,8,8]:[9,9,9,9,9,9,9,9,8,8]):[9,9,13,13,7,7,8,8,9,9];spec.forEach((b,i)=>b.shape=shapes[ids[i]]);}
  if(owner==='c10'){const ids=depth===6?[13,7,7,7,7,7,7,10,5,8,8]:depth===8?[14,14,13,13,13,13,7,7,4,4,8]:[13,13,13,7,7,7,7,7,7,10,5];let j=0;for(const b of spec)if(!b.layers)b.shape=shapes[ids[j++]];}
  const c=l.shutters.find(s=>s.id===owner),cells=c?rect(c.x,c.y,c.width,c.height):l.playable.filter(p=>!cover.has(p.join(',')));
  let bs;if(!owner&&process.env.FLEX==='1'){const bottom=cells.filter(p=>p[1]!==0),t=flex(spec.slice(2),bottom);bs=t?[{...spec[0],shape:shapes[9],x:1,y:0},{...spec[1],shape:shapes[9],x:4,y:0},...t]:null;}else bs=tile(spec,cells,{seed:R.state(),maxNodes:16000,preferLarge:false});R.random();if(!bs){log.push({n,seed,status:'packing-fail',owner});ok=false;break;}
  const pins=!owner?Object.fromEntries(bs.filter(b=>b.y===0).map(b=>[b.id,b.x<4?'blue':'pink'])):{};
  if(!owner&&process.env.FLEX==='1'){const bottom=bs.filter(b=>Math.max(...b.shape.map(([x,y])=>b.y+y))===13&&b.shape.every(([x])=>b.x+x>=4&&b.x+x<=6));if(bottom.length)pins[R.shuffle(bottom)[0].id]='yellow';}
  // Keep shell identities and purple cores. Late gate colors remain sparse enough for true full inventory release.
  const palette=owner==='c10'?['blue','yellow','green','pink','red','orange']:['blue','yellow','green','pink'];
  if(!recolor(bs,palette,{seed:R.state(),pins})){log.push({n,seed,status:'color-fail',owner});ok=false;break;}
  if(owner==='c10'){const choices=bs.filter(b=>!b.layers);const b=R.shuffle(choices)[0];b.color='cyan';}
  assembled.push(...bs);
 }
 if(!ok)continue;l.blocks=[...assembled,structuredClone(base.blocks.find(b=>b.id==='q-orange'))];
 const slots={blue:['top',1,3],orange:['top',4,3],yellow:['bottom',4,3],green:['bottom',1,3],pink:['left',10,3],red:['right',8,3],cyan:['left',1,3],purple:['right',5,3]};
 for(const g of l.gates){const[side,offset,size]=slots[g.color];Object.assign(g,{side,offset,size});}
 let spatial,proof,s,rep,error;try{spatial=auditSpatial(l,api);proof=lower(l,{maxMilliseconds:500,maxStates:100000});s=searchSpatial(project(l),api,{floor:16,maxMilliseconds:1200,maxStates:18000,maxTransitions:220000,normalize:true,orderSeed:n%31,diagnosticTrace:true});if(s.status==='witness')rep=replay(l,s.drags,api,{complete:true,requirePointerCompatible:true});}catch(e){error=e.message;}
 const row={n,seed,hash:digest(l),status:s?.status??'static-fail',clears:s?.maxClearsSeen,U:rep?.nonClearingDrags,proof:proof?.status,prefixU:proof?.relaxedNonClearingDrags,error};log.push(row);
 if(rep||(s?.maxClearsSeen??0)>best||(proof?.thresholdProven&&s?.maxClearsSeen>=10)){best=Math.max(best,s?.maxClearsSeen??0);row.file=save('candidate194',{level:l,spatial,proof,search:s,replay:rep,drags:s?.drags??[],levelSha256:digest(l),sourceFile:'deliverables/remake191-200-20260927/author194-196/source194-1790525381700.json',sourceValidated:false,ruleVersion:'1.108.0',budgets:{searchMs:1200,proofMs:500},sourceAdaptation:'All31 bodies and roles retained; c10 and opening shapes authored to precisely fill preserved108cells. Earlier6/8/2 regions count5/7/7 and c10 count10. All true queue stock retained in witness. Source-to-design ledger pending.',formalAdopted:false});console.log(JSON.stringify(row));if(rep&&proof.thresholdProven)break;}
}
console.log(save('attempts194',log));
