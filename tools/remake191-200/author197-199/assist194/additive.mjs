import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,rng,project,searchSpatial,auditSpatial,digest,save,ruleGate,lower,tile,rect,recolor,shapes} from './common.mjs';
import {payload,native} from './fifo-floor.mjs';
import {replay} from '../../replay.mjs';
import {searchSpatial as prefixSearch} from './witness-prefix.mjs';
export function tailProjection(level){
 const l=structuredClone(level),outside=l.blocks.filter(b=>b.shutterId!=='c10');
 assert(l.blocks.every(b=>!b.frozen&&!b.keyId&&!b.lockedBy&&!b.star));
 assert(!l.flipDoors?.length&&!l.coloredGrids?.length);
 const credit=outside.reduce((n,b)=>n+(b.layers?.length??1),0);
 l.blocks=l.blocks.filter(b=>b.shutterId==='c10');
 assert.equal(l.blocks.length,13);assert.equal(credit,18);
 for(const b of l.blocks)delete b.shutterId;
 delete l.generators;delete l.shutters;
 for(const g of l.gates){if(g.frozen>credit)g.frozen-=credit;else delete g.frozen;}
 return{level:l,credit};
}
if(process.argv[1]?.endsWith('additive.mjs')){
 ruleGate();const initial=JSON.parse(fs.readFileSync(process.argv[2])),R=rng(Number(process.env.SEED??19410841)),log=[],seen=new Set();
 const initialDrags=[];{const m=new api.PuzzleModel(initial.level);m.startCountdown();for(const d of initial.drags){m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());initialDrags.push(d);if(m.snapshot().cleared===10)break;}assert.equal(m.snapshot().cleared,10);}
 for(let n=0;n<Number(process.env.ATTEMPTS??300);n++){
  const seed=R.state(),l=structuredClone(initial.level);let bs=l.blocks.filter(b=>b.shutterId==='c10');
  if(process.env.RETILE==='1'){
   const c=l.shutters.find(c=>c.id==='c10');
   bs=tile(bs,rect(c.x,c.y,c.width,c.height),{seed,maxNodes:16000,preferLarge:false});if(!bs){log.push({n,seed,status:'packing-fail'});continue;}
   l.blocks=l.blocks.filter(b=>b.shutterId!=='c10').concat(bs);
  }
  if(process.env.MUTATE==='1'){for(let j=0;j<2+Math.floor(R.random()*5);j++){const b=R.shuffle(bs)[0],col=R.shuffle(['blue','yellow','green','pink','red','orange','cyan','purple'])[0];b.color=col;if(b.layers)b.layers[0]=col;}}
  else {if(!recolor(bs,['blue','yellow','green','pink','red','orange','cyan','purple'],{seed:R.state()}))continue;R.random();}
  // Inherited shell roles remain; inner colors are an explicitly authored adaptation.
  for(const b of bs.filter(b=>b.layers)){b.layers[1]='purple';if(b.color==='purple'){b.color='orange';b.layers[0]='orange';}}
  const hash=digest(l);if(seen.has(hash))continue;seen.add(hash);
  let audit,tail,proof,s,rep,error;try{
   audit=auditSpatial(l,api);tail=tailProjection(l);proof=native(payload(tail.level,{floor:3,maxMilliseconds:700,maxStates:100000}).p);
   if(proof.thresholdProven){s=prefixSearch(project(l),api,{floor:16,maxMilliseconds:1800,maxStates:30000,maxTransitions:400000,normalize:true,orderSeed:n%31,diagnosticTrace:true,initialDrags});if(s.status==='witness')rep=replay(l,s.drags,api,{complete:true,requirePointerCompatible:true});}
  }catch(e){error=e.message;}
  const row={n,seed,hash,status:s?.status??'tail-filter',U:rep?.nonClearingDrags,tail:proof?.status,shortcut:proof?.relaxedNonClearingDrags,error};log.push(row);
  if(proof?.thresholdProven){row.file=save('additive194',{...initial,level:l,levelSha256:hash,spatial:audit,tailProjection:tail,tailProof:proof,proof:undefined,search:s,replay:rep,drags:s?.drags??[],iteration:{n,seed},budgets:{tailMs:700,searchMs:1800},proofModel:'DIAGNOSTIC fixed c10 13-body tail with all18 external events credited. Prefix8 + tail3 requires independent cut/projection qualification.'});console.log(JSON.stringify(row));if(rep){const prefix=lower(l,{floor:8,maxMilliseconds:1800,maxStates:220000});const p=save('additive-ready194',{candidate:row.file,levelSha256:hash,prefix,tailProof:proof,U:rep.nonClearingDrags,qualificationRequired:true});console.log(p);if(prefix.thresholdProven)break;}}
 }
 console.log(save('additive-attempts194',log));
}
