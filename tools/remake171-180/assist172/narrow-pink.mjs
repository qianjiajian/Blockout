import fs from 'node:fs';
import {loadApi,replay} from '../replay.mjs';
import {auditSpatial,digest,writeNew} from '../common.mjs';
import {witnessNative} from './native-witness.mjs';
import {prove} from './prefix-quotient.mjs';
import {floorShellNative} from './full-floor.mjs';
const OUT='deliverables/remake171-180-20260927/assist172';
const baseFile='deliverables/remake171-180-20260927/author178-180/assist172/shell172-1790528936005.json';
const base=JSON.parse(fs.readFileSync(baseFile)),{api:raw}=await loadApi();
const api={...raw,replayRevisedRoute:(l,d)=>replay(l,d,raw,{complete:true,requirePointerCompatible:true})};
const variants=[]; for(const size of [1,2,3])for(let offset=1;offset+size<=6;offset++)if(size!==3||offset!==1)variants.push({kind: 'pink-port',size,offset});
const start=Date.now(),budget=120000,log=[];let best=0,accepted;
for(const v of variants){
 if(Date.now()-start>=budget)break;
 const l=structuredClone(base.level);
 const gate=l.gates.find(g=>g.color==='pink');gate.size=v.size;gate.offset=v.offset;
 const hash=digest(l); if(hash===digest(base.level))throw Error('Unchanged candidate');
 let audit,search,route,prefixU=0,proof;
 try{audit=auditSpatial(l,raw);search=witnessNative(l,api,{floor:21,maxMilliseconds:1200,maxStates:120000});
  if(search.status!=='witness'){log.push({variant:v,hash,status:search.status,clears:search.maxClearsSeen});continue;}
  route=replay(l,search.drags,raw,{complete:true,requirePointerCompatible:true});
  const m=new raw.PuzzleModel(l);m.startCountdown();for(const d of search.drags){const c=m.snapshot().cleared;m.beginAction();for(const p of d.path)if(!m.moveBlockStep(d.blockId,...p))throw Error('prefix move');if(d.exitSide&&!m.tryExit(d.blockId,d.exitSide).ok)throw Error('prefix exit');m.commitAction();if(m.snapshot().cleared===c)prefixU++;if(m.snapshot().cleared>=13)break;}
  if(route.nonClearingDrags<16)proof={status:'upper-below-band'};
  else if(prefixU>=16)proof=prove(l,raw,{floor:16,goalClears:13,maxMilliseconds:3500,maxStates:300000});
  else proof=floorShellNative(l,raw,{floor:16,maxMilliseconds:3500,maxStates:300000});
  const file=OUT+'/narrow-candidate-'+Date.now()+'.json';
  writeNew(file,{level:l,drags:search.drags,mapping:base.mapping,baseFile,baseSha256:digest(fs.readFileSync(baseFile)),variant:v,sourceNote:'Inherited source identity mapping and shellTransfer; this file changes the ordinary pink gate position/width while retaining its color and ordinary property.',audit,search,route,prefixU,proof,status:proof.thresholdProven?'BOUNDS_PASS':'UNVERIFIED'});
  log.push({variant:v,hash,file,U:route.nonClearingDrags,prefixU,proof:proof.status});
  best=Math.max(best,prefixU);console.log(JSON.stringify(log.at(-1)));
  if(proof.thresholdProven){accepted=file;break;}
 }catch(e){log.push({variant:v,hash,error:e.message});}
}
const file=OUT+'/narrow-attempts-'+Date.now()+'.json';writeNew(file,{baseFile,budget,elapsed:Date.now()-start,log,bestPrefixU:best,accepted});console.log(JSON.stringify({file,accepted,bestPrefixU:best}));
