import fs from 'node:fs';
import {api as baseApi,shapes,save,rng,digest,adjacent} from './common.mjs';
import {tile} from '../agent154-156/common.mjs';
import {openDoorFloorProjection} from '../spatial-bridge.mjs';
import {checkAxisFloor} from '../../remake131to140-axis-floor-v172.mjs';
import {searchSpatial,loadSpatialApi} from '../../remake111to120-spatial-floor-v147.mjs';
const api={...baseApi,...await loadSpatialApi()},source='deliverables/remake151-160-20260927/agent154-156/candidate-156-3209.json',full=JSON.parse(fs.readFileSync(source)).level,rows=[],seen=new Set(),queued=new Set(full.generators.flatMap(g=>g.queueBlockIds)),cells=full.playable??Array.from({length:full.width*full.height},(_,p)=>[p%full.width,Math.floor(p/full.width)]);let wins=0;
outer:for(let seed=7000;seed<7300;seed++){
 const r=rng(seed),ids=[...Array(4).fill(0).map(()=>r.random()<.5?3:9),14,14,14,r.random()<.5?3:9],specs=ids.map((s,i)=>({id:'r102-156-o'+i,shape:shapes[s],color:'red',...(i===2||i===3?{frozen:1}:{})})),ob=tile(r.shuffle(specs),cells,seed,2000);if(!ob)continue;
 const ad=ob.map(a=>ob.map(b=>a!==b&&adjacent(a,b)));for(let ymask=0;ymask<256;ymask++){if(ymask.toString(2).replace(/0/g,'').length!==4)continue;if(ad.some((row,i)=>ymask>>i&1&&row.some((v,j)=>v&&(ymask>>j&1))))continue;const non=ob.map((_,i)=>i).filter(i=>!(ymask>>i&1));for(let bits=0;bits<16;bits++){
  ob.forEach((b,i)=>b.color=ymask>>i&1?'yellow':bits>>non.indexOf(i)&1?'green':'red');if(ad.some((row,i)=>row.some((v,j)=>v&&ob[i].color===ob[j].color)))continue;
  const h=digest(ob);if(seen.has(h))continue;seen.add(h);const l=structuredClone(full);l.blocks=[...structuredClone(ob),...l.blocks.filter(b=>queued.has(b.id))];const m=new api.PuzzleModel(l);if(!ob.some(b=>['left','right','top','bottom'].some(s=>m.exitAttemptStatus(b.id,s)==='ok')))continue;
  const projected=structuredClone(l);projected.blocks=structuredClone(ob);for(const b of projected.blocks)delete b.frozen;projected.generators=[];const p=openDoorFloorProjection(projected,api),floor=checkAxisFloor(p.level,api,{floor:5,maxStates:10000,maxMilliseconds:200});const row={seed,ymask,bits,levelSha256:digest(l),floorStatus:floor.status};
  if(floor.thresholdProven){const witness=searchSpatial(p.level,api,{floor:11,maxStates:10000,maxMilliseconds:700,normalize:true});row.witnessStatus=witness.status;if(witness.drags?.length){const replay=api.replayRevisedRoute(p.level,witness.drags);row.U=replay.nonClearingDrags;row.file=save('opening156-colored',{seed,ymask,bits,level:l,projection:p,proof:floor,witness,replay,source,authoredOpeningColors:true});console.log(JSON.stringify(row));if(++wins>=3){rows.push(row);break outer;}}}rows.push(row);
 }}
}
console.log(save('opening156-colors-round',{rows,tested:rows.length,unique:seen.size,wins}));
