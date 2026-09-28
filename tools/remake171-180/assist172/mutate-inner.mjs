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
const colors=base.level.gates.map(g=>g.color), variants=[];
// Change an actual color, never re-run the parent candidate with a bigger budget.
for(const inner of ['green','cyan','purple','yellow','orange','red'])variants.push({kind:'inner',id:'r106-172-b21',inner});
for(const early of [7,8,11,16,18,20,22])for(const high of [1,2,5,14,15])variants.push({kind:'swap',a:early,b:high});
const start=Date.now(),budget=120000,log=[];let best=0,accepted;
for(const v of variants){
 if(Date.now()-start>=budget)break;
 const l=structuredClone(base.level);
 if(v.kind==='inner')l.blocks.find(b=>b.id===v.id).layers[1]=v.inner;
 else {const a=l.blocks[v.a],b=l.blocks[v.b];[a.color,b.color]=[b.color,a.color];}
 const hash=digest(l); if(hash===digest(base.level))throw Error('Unchanged candidate');
 let audit,search,route,prefixU=0,proof;
 try{audit=auditSpatial(l,raw);search=witnessNative(l,api,{floor:21,maxMilliseconds:1200,maxStates:120000});
  if(search.status!=='witness'){log.push({variant:v,hash,status:search.status,clears:search.maxClearsSeen});continue;}
  route=replay(l,search.drags,raw,{complete:true,requirePointerCompatible:true});
  const m=new raw.PuzzleModel(l);m.startCountdown();for(const d of search.drags){const c=m.snapshot().cleared;m.beginAction();for(const p of d.path)if(!m.moveBlockStep(d.blockId,...p))throw Error('prefix move');if(d.exitSide&&!m.tryExit(d.blockId,d.exitSide).ok)throw Error('prefix exit');m.commitAction();if(m.snapshot().cleared===c)prefixU++;if(m.snapshot().cleared>=13)break;}
  if(route.nonClearingDrags<16)proof={status:'upper-below-band'};
  else if(prefixU>=16)proof=prove(l,raw,{floor:16,goalClears:13,maxMilliseconds:3500,maxStates:300000});
  else proof=floorShellNative(l,raw,{floor:16,maxMilliseconds:3500,maxStates:300000});
  const file=OUT+'/inner-candidate-'+Date.now()+'.json';
  writeNew(file,{level:l,drags:search.drags,mapping:base.mapping,baseFile,baseSha256:digest(fs.readFileSync(baseFile)),variant:v,sourceNote:'Inherited source identity mapping and shellTransfer; this file records one new color mutation only.',audit,search,route,prefixU,proof,status:proof.thresholdProven?'BOUNDS_PASS':'UNVERIFIED'});
  log.push({variant:v,hash,file,U:route.nonClearingDrags,prefixU,proof:proof.status});
  best=Math.max(best,prefixU);console.log(JSON.stringify(log.at(-1)));
  if(proof.thresholdProven){accepted=file;break;}
 }catch(e){log.push({variant:v,hash,error:e.message});}
}
const file=OUT+'/inner-attempts-'+Date.now()+'.json';writeNew(file,{baseFile,budget,elapsed:Date.now()-start,log,bestPrefixU:best,accepted});console.log(JSON.stringify({file,accepted,bestPrefixU:best}));
