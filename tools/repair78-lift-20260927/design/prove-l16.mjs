import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {compileSpatial,each,key,cleared,iceRemaining,NONE} from './spatial-search.mjs';

// Dedicated bound algorithm, NOT searchSpatial's proposal-only success status.
// Scope: this exact 19-body v1.4 level; no shells, keys, axes, queues, flips,
// timers, seams, stars or colored cells. Every body and hidden ice age remains.
// The domain permits postponing first-contact exit (optionalExit=true), so every
// canonical real gesture is represented, and extra gestures only relax it.
// Cost is 0 for each clear gesture and 1 for each non-clearing held gesture.
// No greedy clear normalization is used. Exhaust all states below cost 16.
// Visited-key quotient only forgets an already-revealed lift's age once ALL its
// surviving hidden ice has melted. That timestamp then affects no future rule.
const file=process.argv[2],ROOT='deliverables/repair78-lift-20260927/design';assert(file);
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.104.0');
const candidate=JSON.parse(fs.readFileSync(file)),level=candidate.level;assert.equal(digest(level),candidate.levelSha256);
assert.equal(level.id,78);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');assert.equal(level.blocks.length,19);
for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors','seams'])assert(!level[k]?.length);
for(const b of level.blocks)for(const k of ['layers','keyId','lockedBy','lockCount','movementAxis','timedBombSeconds','star','rotationBadge'])assert.equal(b[k],undefined);
assert.equal(level.shutters.length,1);assert.equal(level.shutters[0].skin,'lift');assert.equal(level.shutters[0].count,0);
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {resolveMatchingGatePortal,exitFrontierFacesBoundary} from './src/core/blockExitFrontier.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const bindings=Object.fromEntries([...Object.keys(built.metafile.inputs).filter(p=>fs.existsSync(p)),file,'tools/repair78-lift-20260927/design/spatial-search.mjs','tools/repair78-lift-20260927/design/prove-l16.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.104.0.md'].map(p=>[p,digest(fs.readFileSync(p))]));
const c=compileSpatial(level,api),floor=16,budget={maxStates:2000000,maxMilliseconds:Number(process.argv[3]??60000),maxTransitions:80000000},start=Date.now();
const stateKey=s=>{const copy=s.slice();for(const cover of c.covers)if(s[cover.stateIndex]!==NONE&&cover.members.every(i=>s[i]===NONE||iceRemaining(c,s,i)===0))copy[cover.stateIndex]=65534;return key(copy);};
const startKey=stateKey(c.initial),seen=new Map([[startKey,0]]),buckets=Array.from({length:floor},()=>[]),heads=Array(floor).fill(0);buckets[0].push(c.initial);
let explored=0,transitions=0,stop,costFinished=-1,maxClears=0,shortcut;const byCost=[];
for(let cost=0;cost<floor;cost++){
 const beganExplored=explored;
 while(heads[cost]<buckets[cost].length){
  if(Date.now()-start>=budget.maxMilliseconds){stop='deadline';break;}
  const s=buckets[cost][heads[cost]];buckets[cost][heads[cost]++]=null;if(seen.get(stateKey(s))<cost)continue;
  explored++;const count=cleared(c,s);maxClears=Math.max(maxClears,count);
  if(count===c.totalClears){shortcut={cost,state:[...s]};stop='relaxed-shortcut';break;}
  each(c,s,(next,k)=>{transitions++;if(transitions>budget.maxTransitions){stop='max-transitions';return false;}if(Date.now()-start>=budget.maxMilliseconds){stop='deadline';return false;}const nextCost=cost+k;if(nextCost>=floor)return;const nextKey=stateKey(next),known=seen.get(nextKey);if(known!==undefined&&known<=nextCost)return;if(seen.size>=budget.maxStates){stop='max-states';return false;}seen.set(nextKey,nextCost);buckets[nextCost].push(next);},{optionalExit:true});
  if(stop)break;
 }
 byCost.push({cost,expanded:explored-beganExplored,queued:buckets[cost].length,processed:heads[cost],fullyExhausted:!stop});
 console.log(JSON.stringify({cost,expanded:explored,discovered:seen.size,transitions,elapsedMs:Date.now()-start,stop}));
 if(stop)break;costFinished=cost;buckets[cost]=[];
}
for(const[p,h]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),h);
const proof={createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,levelSha256:digest(level),source:{file,sha256:bindings[file]},status:stop?'UNKNOWN':'THRESHOLD_PROVEN',thresholdProven:!stop&&costFinished===15,excludedNonClearingCosts:!stop?[0,15]:null,floor,termination:stop??'all-costs-0-through-15-exhausted',budget,elapsedMs:Date.now()-start,exploredStates:explored,discoveredStates:seen.size,attemptedTransitions:transitions,maxClears,byCost,shortcut,bindings,proofMethod:'Complete 0/1 cost buckets over full labeled inventory and true lift reveal/ice ages; optional first-contact exits relax actual input; no greedy normalization; only irrelevant melted reveal age removed from visited key.',domainScope:'Lv78 v1.4 restricted static scope asserted in script; one true lift, numeric body/gate ice; full rigid-body exit sweep occupancy.',evidenceBoundary:'A threshold proof only when all costs 0–15 exhaust. Budget exhaustion and relaxed shortcut stay UNKNOWN; GUI, natural clock, robustness and upper route are separate.'};
const output=`${ROOT}/lower16-${Date.now()}.json`;fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,status:proof.status,thresholdProven:proof.thresholdProven,elapsedMs:proof.elapsedMs,states:seen.size,transitions}));
