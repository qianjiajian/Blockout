import fs from 'node:fs';
import {api,rng,adjacent} from '../remake191-200/author194-196/common.mjs';
import {searchSpatial} from '../campaign-v145/lv141-150/round2-a/witness-greedy.mjs';
import {floor226} from './floor226.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
if(!verifyRulesLock().ok)throw Error('Rules lock');
const out='deliverables/continue221-230-20260930/author226',files=['candidate-1790736096179-153.json','candidate-1790736096179-185.json','candidate-1790735844340-12.json'].map(x=>out+'/'+x),pool=files.map(f=>JSON.parse(fs.readFileSync(f)).level),R=rng(Number(process.env.SEED??226940)),run=Date.now();
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
const seen=new Set(pool.map(digest));
for(let n=0;n<Number(process.env.COUNT??120);n++){
 const l=structuredClone(pool[n%pool.length]),free=l.blocks.filter(b=>!b.layers&&!b.lockedBy&&!b.keyId&&!b.id.includes('-q')),seed=R.state();
 for(let m=0;m<1+n%3;m++){const b=free[Math.floor(R.random()*free.length)];b.color=R.shuffle(['red','yellow','green','blue','cyan'].filter(c=>c!==b.color))[0];}
 if(n%2){const b=R.shuffle(free)[0],other=R.shuffle(free.filter(a=>a!==b&&JSON.stringify(a.shape)===JSON.stringify(b.shape)))[0];if(other){[b.x,other.x]=[other.x,b.x];[b.y,other.y]=[other.y,b.y];}}
 if(n%5===0){const g=R.shuffle(l.gates)[0];g.offset=Math.floor(R.random()*((['top','bottom'].includes(g.side)?l.width:l.height)-g.size+1));}
 const hash=digest(l);if(seen.has(hash))continue;seen.add(hash);let issues;try{issues=api.auditRevisedCandidate(l).issues.filter(i=>!omit.has(i.code));}catch(e){continue;}if(issues.length)continue;
 const w=searchSpatial({...structuredClone(l),mechanismRules:'revised-2026-09-23-v1.4'},api,{floor:16,maxStates:25000,maxMilliseconds:1200,maxTransitions:600000,orderSeed:n%28});const rep=w.status==='witness'?api.replayRevisedRoute(l,w.drags):null;let bound;
 if(rep?.valid&&rep.complete&&rep.nonClearingDrags>=11){bound=floor226(l,{maxMilliseconds:3500,maxStates:900000,prefix:process.env.PREFIX==='1'});const f=out+'/candidate-mutation-'+run+'-'+n+'.json';fs.writeFileSync(f,JSON.stringify({level:l,drags:w.drags,replay:rep,bound,formalAdopted:false,pointerValidated:false,sourceParent:files[n%files.length]},null,2));if(bound.proof.thresholdProven){console.log(JSON.stringify({file:f,L:11,U:rep.nonClearingDrags}));break;}}
 const row={n,seed,sha:digest(l),status:w.status,U:rep?.nonClearingDrags,floor:bound?.proof.status,shortcut:bound?.proof.relaxedNonClearingDrags};fs.appendFileSync(out+'/mutations-'+run+'.jsonl',JSON.stringify(row)+'\n');if(rep||n%10===0)console.log(JSON.stringify(row));
}
