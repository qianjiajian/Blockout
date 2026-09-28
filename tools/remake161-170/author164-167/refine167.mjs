import fs from 'node:fs';import assert from 'node:assert/strict';
import{api,recolorBag,rng,save,audit,searchSpatial,project,digest,OUT}from'./common.mjs';
import{prefixFloor}from'./floor-countdown.mjs';import{checkAxisPrefixFloor}from'../../campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
const seeds=['candidate167-1790518140302.json','candidate167-1790518154661.json','candidate167-1790518183254.json'].map(f=>JSON.parse(fs.readFileSync(OUT+'/'+f)));
const R=rng(Number(process.env.SEED??167903)),rows=[];
export function beforeReveal(level){const l=project(level),lifts=l.shutters.filter(s=>s.skin==='lift');for(const lift of lifts){const cover=l.shutters.find(s=>s.skin!=='lift'&&s.count>=9&&['x','y','width','height'].every(k=>s[k]===lift[k]));assert(cover,'Lift must remain entirely blocked behind countdown curtain before goal9');}const ids=new Set(lifts.map(s=>s.id));l.shutters=l.shutters.filter(s=>!ids.has(s.id));l.blocks=l.blocks.filter(b=>!ids.has(b.shutterId));return l;}
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??120);attempt++){
 const parent=seeds[attempt%seeds.length],l=structuredClone(parent.level),seed=R.state(),opening=l.blocks.filter(b=>!b.shutterId),first=opening.find(b=>b.shape.length===9);
 if(attempt%5<3&&!recolorBag(opening,{seed,pins:{[first.id]:'blue'}}))continue;
 const y=l.gates.find(g=>g.color==='yellow'),places=[['left',4],['left',5],['left',6],['left',7],['left',8],['bottom',0],['top',2],['top',3]];[y.side,y.offset]=places[Math.floor(R.random()*places.length)];
 let staticAudit,proof,prefix,search,replay,error;
 try{staticAudit=audit(l);const p=beforeReveal(l);proof=prefixFloor(p,{goalClears:9,floor:11,maxMilliseconds:600,maxStates:120000});if(proof.thresholdProven){prefix=checkAxisPrefixFloor(p,api,{goalClears:9,floor:16,maxMilliseconds:1400,maxStates:160000});if(prefix.drags&&api.replayRevisedRoute(l,prefix.drags).valid){search=searchSpatial(project(l),api,{initialDrags:prefix.drags,floor:17,maxMilliseconds:1600,maxStates:18000,maxTransitions:160000,normalize:true,orderSeed:attempt,diagnosticTrace:true});if(search.drags)replay=api.replayRevisedRoute(l,search.drags);}}}catch(e){error=e.message;}
 const row={attempt,seed,sha:digest(l),status:proof?.status,lower:proof?.thresholdProven?11:proof?.relaxedNonClearingDrags,prefixCost:prefix?.cost,clears:search?.maxClearsSeen,U:replay?.nonClearingDrags,error};rows.push(row);console.log(JSON.stringify(row));
 if(proof?.thresholdProven){row.file=save('refined167',{activeRuleVersion:'1.105.0',parent:parent.iteration,level:l,iteration:{attempt,seed},audit:staticAudit,proof,prefix,search,replay,drags:search?.drags??[],projectionReason:'All10 lift bodies remain physically behind identical ordinary curtain masks until at least9 clears. Prefix before9 removes only inaccessible lift cohorts; full witness retains every layer and is checked by current1.5 model. Lower proof binding is to projected pre-reveal level, not full source hash; qualification required.',formalAdopted:false});console.log(row.file);if(replay?.complete&&replay.nonClearingDrags<=15)break;}
 R.random();
}
console.log(save('refined167-attempts',rows));
