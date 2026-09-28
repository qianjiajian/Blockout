import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadApi,auditSpatial,digest} from './remake91to100-v146.mjs';
import {loadSpatialApi,searchSpatial} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs';
import {proveSplit} from '../deliverables/remake91-100-v146-20260924/agent97-review/split97.mjs';
const dir='deliverables/remake91-100-v146-20260924/root97';fs.mkdirSync(dir,{recursive:true});
const oldFile='deliverables/remake91-100-v146-20260924/agent95-98/candidate97-1790265751936.json',old=JSON.parse(fs.readFileSync(oldFile));
const {api}=await loadApi(),graph=await loadSpatialApi();let seed=9714733;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),shuffle=a=>a.map(v=>[rand(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const slots=old.level.gates.map(g=>Object.fromEntries(['side','offset','size','portals'].filter(k=>g[k]!==undefined).map(k=>[k,g[k]])));
const seen=new Set();let attempts=0,h4=0,solved=0;
for(let n=0;n<1600;n++){
 const l=structuredClone(old.level),dx=n%2?-1:1;l.shutters[0].x+=dx;for(const b of l.blocks)if(b.shutterId)b.x+=dx;
 const perm=n<2?slots:shuffle(slots);for(let j=0;j<8;j++){const g=l.gates[j];for(const k of ['side','offset','size','portals'])delete g[k];Object.assign(g,structuredClone(perm[j]));}
 const hash=digest(l);if(seen.has(hash))continue;seen.add(hash);if(!auditSpatial(l,api).passed)continue;attempts++;
 const hidden=proveSplit(l,graph,{mode:'after-projection',floor:4,maxStates:40000,maxMilliseconds:500});if(!hidden.thresholdProven){if(attempts%50===0)console.log(JSON.stringify({attempts,h4,solved,lastHidden:hidden.status,cost:hidden.cost}));continue;}h4++;
 for(let orderSeed=0;orderSeed<2;orderSeed++){
  const route=searchSpatial(l,graph,{floor:16,maxStates:50000,maxMilliseconds:3000,orderSeed,weight:1000});if(route.status!=='witness'||route.cost<11)continue;
  const replay=api.replayRevisedRoute(l,route.drags);if(!replay.valid||!replay.complete)continue;solved++;
  const prefix=proveSplit(l,graph,{mode:'before-reveal',floor:7,maxStates:1500000,maxMilliseconds:90000});
  const out=dir+'/candidate97-lift-shift-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify({level:l,drags:route.drags,route,replay,hidden,prefix,oldFile,dx,permutation:perm,formalAdopted:false},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({out,U:route.cost,prefix:prefix.status,hidden:hidden.status,attempts,h4,solved}));if(prefix.thresholdProven)process.exit(0);break;
 }
 if(h4%10===0)console.log(JSON.stringify({attempts,h4,solved}));
}
console.log(JSON.stringify({attempts,h4,solved,complete:true}));
