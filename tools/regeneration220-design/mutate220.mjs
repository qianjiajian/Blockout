import fs from 'node:fs';
import {loadSpatialApi} from '../remake201to210-v123-floor.mjs';
import {loadContinuationRuntime,sha256} from '../continuation211-runtime.mjs';
import {searchGuided} from './search.mjs';
import {proveSymmetric} from './prove-symmetric.mjs';
const out='deliverables/continue211-220-20260930/design220-new',base=JSON.parse(fs.readFileSync(out+'/candidate-486.json')).level;
const api=await loadSpatialApi(),core=await loadContinuationRuntime(),colors=['red','blue','orange','green','purple'],history=[],seen=new Set([sha256(base)]);
function adjacent(level){const a=new Map();for(const b of level.blocks)for(const [dx,dy]of b.shape)a.set([b.x+dx,b.y+dy].join(','),b);for(const [k,b]of a){const [x,y]=k.split(',').map(Number);for(const [dx,dy]of[[1,0],[0,1]]){const c=a.get([x+dx,y+dy].join(','));if(c&&c.id!==b.id&&(c.layers?.[0]??c.color)===(b.layers?.[0]??b.color))return true;}}return false;}
let seed=220;const rnd=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
for(let i=0;i<40;i++){
 const level=structuredClone(base);let tries=0,changes=[];
 while(changes.length<1+i%3&&tries++<100){const b=level.blocks[rnd(level.blocks.length)];if(b.layers)continue;const old=b.color,color=colors[rnd(colors.length)],width=1+Math.max(...b.shape.map(p=>p[0]));if(color===old||width>2&&(['purple','green'].includes(color)||b.shutterId&&color==='orange'||!b.shutterId&&color!=='orange'))continue;b.color=color;if(adjacent(level)){b.color=old;continue;}changes.push({id:b.id,from:old,to:color});}
 if(!changes.length)continue;
 const normal=level.blocks.filter(b=>!b.shutterId&&['green','orange'].includes(b.color)).length;if(normal<9)continue;const fingerprint=sha256(level);if(seen.has(fingerprint))continue;seen.add(fingerprint);
 const result=searchGuided(level,api,{floor:45,maxMilliseconds:1800,maxStates:18000,orderSeed:i%28,progressWeight:.14}),replay=result.drags?core.replayRevisedRoute(level,result.drags):null;
 let proof;if(replay?.valid&&replay.complete&&replay.nonClearingDrags>=21&&replay.nonClearingDrags<=30)proof=proveSymmetric(level,api,{floor:21,maxMilliseconds:6000,maxStates:100000,normalizeMonotone:true});
 const record={i,fingerprint:sha256(level),changes,result:result.status,U:replay?.nonClearingDrags,proof:proof?.status};history.push(record);console.log(record);
 fs.writeFileSync(out+'/local-'+i+'.json',JSON.stringify({level,changes,result,replay,proof},null,2));fs.writeFileSync(out+'/local-history.json',JSON.stringify(history,null,2));
 if(proof?.thresholdProven){fs.writeFileSync(out+'/qualified220.json',JSON.stringify({level,result,replay,proof},null,2));break;}
}
