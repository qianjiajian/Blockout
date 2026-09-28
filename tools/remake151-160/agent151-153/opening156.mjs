import fs from 'node:fs';
import {api as baseApi,shapes,save,rng,digest,adjacent} from './common.mjs';
import {tile} from '../agent154-156/common.mjs';
import {openDoorFloorProjection} from '../spatial-bridge.mjs';
import {checkAxisFloor} from '../../remake131to140-axis-floor-v172.mjs';
import {searchSpatial,loadSpatialApi} from '../../remake111to120-spatial-floor-v147.mjs';
const api={...baseApi,...await loadSpatialApi()},source='deliverables/remake151-160-20260927/agent154-156/candidate-156-3209.json',full=JSON.parse(fs.readFileSync(source)).level,rows=[],seen=new Set();
for(let seed=Number(process.argv[2]??5000);seed<Number(process.argv[2]??5000)+Number(process.argv[3]??300);seed++){
 const r=rng(seed),barY=seed%2===0,ids=[...Array(4).fill(0).map(()=>r.random()<.5?3:9),14,14,14,r.random()<.5?3:9],sqColors=barY?r.shuffle(['red','green',r.random()<.5?'red':'green']):r.shuffle(['yellow','red','green']);
 const specs=ids.map((s,i)=>({id:'r102-156-o'+i,shape:shapes[s],color:i===2?'red':i<4?'yellow':i<7?sqColors[i-4]:barY?'yellow':r.random()<.5?'orange':'cyan',...(i===2||i===3?{frozen:1}:{})}));
 const ob=tile(r.shuffle(specs),full.playable??Array.from({length:full.width*full.height},(_,p)=>[p%full.width,Math.floor(p/full.width)]),seed,3000);if(!ob||ob.some(a=>ob.some(b=>a!==b&&a.color===b.color&&adjacent(a,b))))continue;if(!api.auditCandidateBlockArt({blocks:ob}).passed)continue;
 const h=digest(ob);if(seen.has(h))continue;seen.add(h);const l=structuredClone(full),queued=new Set(l.generators.flatMap(g=>g.queueBlockIds));l.blocks=[...ob,...l.blocks.filter(b=>queued.has(b.id))];const projected=structuredClone(l);projected.blocks=structuredClone(ob);for(const b of projected.blocks)delete b.frozen;projected.generators=[];const p=openDoorFloorProjection(projected,api),floor=checkAxisFloor(p.level,api,{floor:5,maxStates:10000,maxMilliseconds:300});
 const row={seed,source,level:l,levelSha256:digest(l),projection:p,proof:floor};if(floor.thresholdProven){row.relaxedWitness=searchSpatial(p.level,api,{floor:11,maxStates:15000,maxMilliseconds:1500,normalize:true});row.relaxedRoute=row.relaxedWitness.drags??[];if(row.relaxedRoute.length){row.relaxedReplay=api.replayRevisedRoute(p.level,row.relaxedRoute);row.status='OPENING_L5_WITNESS';}else row.status='OPENING_NO_WITNESS';}else row.status=floor.status;
 const file=save('opening156',row);rows.push({file,seed,status:row.status,U:row.relaxedReplay?.nonClearingDrags});console.log(JSON.stringify(rows.at(-1)));if(row.status==='OPENING_L5_WITNESS'&&rows.filter(x=>x.status==='OPENING_L5_WITNESS').length>=5)break;
}
console.log(save('opening156-round',rows));
