import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {loadApi,auditSpatial,digest} from './remake101to110-v146.mjs';
import {verifySource} from './verify-source107to110-v147.mjs';
import {searchSpatial,loadSpatialApi} from '../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {searchCachedSpatial} from '../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-cached.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
const OUT='deliverables/remake101-110-v146-20260924/pipeline109';
const seedFile='deliverables/remake101-110-v146-20260924/source106-110/partial109-1790270044947.json';
let seed=Number(process.env.SEED??10914701);const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),pick=a=>a[Math.floor(rand()*a.length)],shape=b=>JSON.stringify([...b.shape].sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const save=(name,data)=>{fs.mkdirSync(OUT,{recursive:true});const file=OUT+'/'+name+'-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return file;};
export function mutate109(base){const l=structuredClone(base);for(let n=0;n<1+Math.floor(rand()*4);n++){
 if(rand()<.72){const a=pick(l.blocks),others=l.blocks.filter(b=>b!==a&&b.shutterId===a.shutterId&&shape(b)===shape(a));if(!others.length)continue;const b=pick(others);[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}
 else{const a=pick(l.gates),others=l.gates.filter(g=>g!==a&&g.size===a.size);if(!others.length)continue;const b=pick(others);for(const k of['side','offset','portals']){[a[k],b[k]]=[b[k],a[k]];if(a[k]===undefined)delete a[k];if(b[k]===undefined)delete b[k];}}
 }return l;}
async function main(){assert(verifyRulesLock().ok);const {api}=await loadApi(),full=await loadSpatialApi(),initial=JSON.parse(fs.readFileSync(process.argv[2]??seedFile)),start=Date.now(),budget=Number(process.env.BUDGET??300000),pool=[{level:initial.level,score:initial.replay?.nonClearingDrags??initial.result.cost}],stats={trials:0,valid:0,witness:0,proof:0};let best=pool[0].score;
 while(Date.now()-start<budget){stats.trials++;const origin=rand()<.15?pool[0]:pick(pool),level=mutate109(origin.level);try{auditSpatial(level,api);}catch{continue;}stats.valid++;
  const result=searchSpatial(level,full,{floor:26,normalize:true,symmetry:true,maxMilliseconds:Number(process.env.SEARCH??700),maxStates:50000,orderSeed:stats.trials%level.blocks.length});if(result.status!=='witness')continue;const replay=api.replayRevisedRoute(level,result.drags);if(!replay.valid||!replay.complete)continue;stats.witness++;const score=replay.nonClearingDrags;
  if(score>=origin.score-1&&score<=25&&(pool.length<30||rand()<.3)){pool.push({level,score});if(pool.length>30)pool.splice(1+Math.floor(rand()*(pool.length-1)),1);}
  if(score>best){best=score;const file=save('higher109',{level,drags:result.drags,replay,result,seed,stats,formalAdopted:false});console.log(JSON.stringify({file,score,stats,elapsed:Date.now()-start}));}
  if(score<16||score>20)continue;const source=verifySource(level,api),data={activeRuleVersion:'1.47.0',level,drags:result.drags,replay,source,measurement:measureRoute(level,result.drags,api),seed,sourceCandidate:seedFile,pointerValidated:false,formalAdopted:false};const file=save('candidate109',data),proof=searchCachedSpatial(level,full,{prove:true,floor:16,symmetry:true,clearPriority:true,cacheLimit:50000,maxMilliseconds:Number(process.env.PROOF??10000),maxStates:500000,maxTransitions:10000000});stats.proof++;const proofFile=save('floor109',{candidate:file,levelSha256:digest(level),proof});console.log(JSON.stringify({file,proofFile,score,proof:proof.status,shortcut:proof.cost,states:proof.exploredStates}));if(proof.thresholdProven)return;
  if(stats.trials%100===0)console.log(JSON.stringify({best,stats,elapsed:Date.now()-start}));
 }console.log(JSON.stringify({best,stats,elapsed:Date.now()-start}));}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
