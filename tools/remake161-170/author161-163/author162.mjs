import fs from 'node:fs';
import {loadApi,ruleGate,PROFILE,digest,auditSpatial} from '../common.mjs';
import {searchFlipWitness} from './flip-search.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
import {pack,SHAPES,seededRng,rect} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const ROOT='deliverables/remake161-170-20260927/author161-163';
const old=JSON.parse(fs.readFileSync('deliverables/remake161-170-v146-20260924/level162/reviewed162-1790248846837.json'));
ruleGate();const {api}=await loadApi(),rng=seededRng(Number(process.env.SEED??103162)),pick=a=>a[Math.floor(rng.rand()*a.length)];
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only'));
const logs=[],end=Date.now()+Number(process.env.SECONDS??90)*1000,colors=['red','blue','green','yellow','purple'];
const logFile=ROOT+'/attempts162-'+Date.now()+'.jsonl';
let best=Infinity,solved;
for(let attempt=0;Date.now()<end;attempt++){
 if(attempt%100===0)global.gc?.();
 const level=structuredClone(old.level);level.mechanismRules=PROFILE;
 if(attempt%3===2){const tiles=structuredClone(old.sourceAdaptation.tiles);for(const t of tiles)if(t.kind==='V2'&&!t.layers&&rng.rand()<.3)t.kind='H2';const bodies=pack(tiles,rect(6,6),rng,15,true);if(!bodies)continue;level.blocks=bodies.map(b=>({id:'a103-162-'+b.sourceId,x:b.x,y:b.y,shape:b.shape,color:b.color,...(b.layers?{layers:b.layers}:{})}));}
 else if(attempt%3===1){for(let k=0;k<2;k++){const b=pick(level.blocks.filter(b=>!b.layers));b.color=pick(colors);}}
 const occupied=new Set();let gateFailed=false;
 for(const g of rng.shuffle(level.flipDoors)){
  const options=[];for(const side of ['left','right','top','bottom']){
   const bodies=level.blocks.filter(b=>(b.layers??[b.color]).includes(g.color));const size=Math.max(...bodies.map(b=>1+Math.max(...b.shape.map(p=>['top','bottom'].includes(side)?p[0]:p[1]))));
   if(size>3)continue;for(let offset=0;offset+size<=6;offset++)if(!Array.from({length:size},(_,k)=>side+':'+(offset+k)).some(k=>occupied.has(k)))options.push({side,size,offset});
  }
  if(!options.length){gateFailed=true;break;}Object.assign(g,pick(options));for(let k=0;k<g.size;k++)occupied.add(g.side+':'+(g.offset+k));
 }
 if(gateFailed)continue;
 try{api.validateLevel(level);if(!api.auditCandidateBlockArt(level).passed)continue;const issues=api.auditRevisedCandidate(level).issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');if(issues.length)continue;}catch{continue;}
 const witness=searchFlipWitness(level,{maxCost:20,maxMilliseconds:250,maxStates:30000,orderSeed:attempt%level.blocks.length});
 const log={attempt,levelSha256:digest(level),budget:{maxCost:20,maxMilliseconds:250,maxStates:30000},result:{...witness,drags:undefined}};logs.push(log);fs.appendFileSync(logFile,JSON.stringify(log)+'\n');
 if(witness.status!=='witness')continue;
 const replay=api.replayRevisedRoute(level,witness.drags);log.replay=replay;if(!replay.valid||!replay.complete)continue;
 const projected=structuredClone(level);projected.mechanismRules='revised-2026-09-23-v1.4';projected.gates.push(...projected.flipDoors.map(({initiallyOpen,...g})=>g));projected.flipDoors=[];
 const proof=checkSymmetryFloor(projected,{floor:16,maxMilliseconds:1200,maxStates:150000});log.proof=proof;
 if(witness.cost<best){best=witness.cost;console.log(JSON.stringify({attempt,best,proof:proof.status,proofShortcut:proof.relaxedNonClearingDrags}));}
 if(proof.thresholdProven){let spatial;try{spatial=auditSpatial(level,api);}catch(e){spatial={passed:false,error:e.message};}
  solved={activeRuleVersion:'1.103.0',level,drags:witness.drags,levelSha256:digest(level),routeSha256:digest(witness.drags),witness,replay,proof,projected,spatial,sourceAdaptation:old.sourceAdaptation,sourceOpeningStatus:old.sourceOpeningStatus,formalAdopted:false,pointerValidated:false};
  const file=ROOT+'/candidate162-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(solved,null,2),{flag:'wx'});console.log(JSON.stringify({file,cost:witness.cost,proof:proof.status}));break;
 }
}
fs.writeFileSync(ROOT+'/attempts162-'+Date.now()+'.json',JSON.stringify({activeRuleVersion:'1.103.0',finiteBudgets:true,logs,solved:!!solved},null,2),{flag:'wx'});
console.log(JSON.stringify({attempts:logs.length,solved:!!solved,best}));
