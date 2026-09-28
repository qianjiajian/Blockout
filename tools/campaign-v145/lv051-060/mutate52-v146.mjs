import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {search} from './campaign-axis-key-search-v146.mjs';
import {checkAxisKeyFloor} from './campaign-axis-key-floor-v146.mjs';
import {seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54';
const input=process.argv[2]??OUT+'/draft52-146522-2340-1790248636835.json';
const original=JSON.parse(fs.readFileSync(input)),lock=verifyRulesLock();assert(lock.ok);
const {api}=await loadApi();
const seed=Number(process.env.SEED??52471),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)];
const write=(name,d)=>{const p=OUT+'/'+name+'-'+Date.now()+'.json';fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return p;};
const key=s=>JSON.stringify([...s].sort((a,b)=>a[0]-b[0]||a[1]-b[1]));
const pool=[{level:original.level,parent:input}],seen=new Set(),failures={};let attempts=0,valid=0,solved=0,best=0;
function mutate(parent){
 const l=structuredClone(parent.level),changes=[];
 for(let k=0;k<1+Math.floor(rng.rand()*3);k++){
  if(rng.rand()<.65){const a=pick(l.blocks),matches=l.blocks.filter(b=>b.id!==a.id&&key(a.shape)===key(b.shape));if(!matches.length)continue;const b=pick(matches);[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];changes.push({swap:[a.id,b.id]});}
  else{const g=pick(l.gates);g.side=pick(['left','right','top','bottom']);const max=['top','bottom'].includes(g.side)?l.width:l.height;g.size=1+Math.floor(rng.rand()*3);g.offset=Math.floor(rng.rand()*(max-g.size+1));changes.push({gate:g.id,side:g.side,offset:g.offset,size:g.size});}
 }
 const occupied=new Set();
 for(const g of l.gates){
  for(let n=g.offset;n<g.offset+g.size;n++){const x=g.side+':'+n;if(occupied.has(x))return;occupied.add(x);}
  for(const b of l.blocks.filter(b=>b.color===g.color)){const vertical=['top','bottom'].includes(g.side),span=1+Math.max(...b.shape.map(p=>p[vertical?0:1])),anchor=vertical?b.x:b.y;if(span>g.size)return;if(b.movementAxis&&((b.movementAxis==='vertical')!==vertical||anchor<g.offset||anchor+span>g.offset+g.size))return;}
 }
 const cells=new Map(l.blocks.flatMap(b=>b.shape.map(([x,y])=>[(x+b.x)+','+(y+b.y),b])));
 for(const b of l.blocks)for(const [dx,dy]of b.shape){const x=b.x+dx,y=b.y+dy;for(const [nx,ny]of [[x+1,y],[x,y+1]]){const other=cells.get(nx+','+ny);if(other&&other.id!==b.id&&other.color===b.color)return;}}
 try{api.validateLevel(l);}catch{return;}
 return{level:l,changes,parent:parent.parent};
}
const end=Date.now()+Number(process.env.SECONDS??180)*1000;
while(Date.now()<end){
 attempts++;const c=mutate(pick(pool));if(!c)continue;const k=digest(c.level);if(seen.has(k))continue;seen.add(k);valid++;
 const r=search(c.level,{floor:31,maxStates:100000,maxMilliseconds:Number(process.env.SEARCH_MS??1200),weight:Number(process.env.WEIGHT??20)});
 if(r.status!=='witness'){failures[r.status]=(failures[r.status]??0)+1;continue;}
 const replay=api.replayRevisedRoute(c.level,r.drags);assert(replay.valid&&replay.complete);solved++;best=Math.max(best,replay.nonClearingDrags);
 if(replay.nonClearingDrags<21){failures.low=(failures.low??0)+1;continue;}
 const proof=checkAxisKeyFloor(c.level,{floor:21,maxStates:250000,maxMilliseconds:Number(process.env.PROOF_MS??3000)});
 const d={...original,ruleVersion:lock.activeVersion,seed,attempts,level:c.level,drags:r.drags,replay,proof,localMutation:{parent:c.parent,changes:c.changes},measurement:undefined,pointerValidated:false,formalAdopted:false};
 const file=write('mutant52-'+seed+'-'+attempts,d);console.log(JSON.stringify({file,cost:replay.nonClearingDrags,proof:proof.status,shortcut:proof.relaxedNonClearingDrags,attempts,valid,solved}));
 if(proof.thresholdProven)break;
 if(proof.status!=='relaxed-shortcut'){pool.push({level:c.level,parent:file});if(pool.length>25)pool.splice(1,1);}
}
const report={seed,attempts,valid,solved,best,failures,pool:pool.map(p=>p.parent),input,exhaustive:false};console.log(JSON.stringify({report:write('mutation52-report',report),...report}));
