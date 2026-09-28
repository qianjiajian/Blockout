import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {api,digest,save} from './common.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
export function giftProjection153(level){
 assert.equal(level.id,153);assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');api.validateLevel(level);
 for(const k of ['generators','coloredGrids','elevators','conveyors','seams'])assert(!level[k]?.length,'Unqualified '+k);
 assert.equal(level.shutters.length,2);assert(level.shutters.every(s=>s.skin==='lift'&&s.count===0));
 const hidden=level.blocks.filter(b=>b.shutterId),opening=level.blocks.filter(b=>!b.shutterId);assert.equal(hidden.length,7);assert.equal(opening.length,29);
 const allowedHidden=new Set(['id','x','y','shape','color','shutterId']);for(const b of hidden)assert(Object.keys(b).every(k=>allowedHidden.has(k)),'Unqualified hidden metadata');
 const allowedOpening=new Set(['id','x','y','shape','color','frozen']);for(const b of opening)assert(Object.keys(b).every(k=>allowedOpening.has(k)),'Unqualified opening metadata');
 const gifts=hidden.length,p=structuredClone(level);p.blocks=structuredClone(opening);p.shutters=[];p.gates.push(...p.flipDoors.map(({initiallyOpen,...g})=>g));p.flipDoors=[];
 for(const b of p.blocks)if(b.frozen!==undefined){b.frozen=Math.max(0,b.frozen-gifts);if(!b.frozen)delete b.frozen;}
 for(const g of p.gates)if(g.frozen!==undefined){g.frozen=Math.max(0,g.frozen-gifts);if(!g.frozen)delete g.frozen;}
 // Profile bridge is explicit, source never changed. Static no-flip semantics
 // are the same; old compiler's optional-contact exits add further relaxation.
 p.mechanismRules='revised-2026-09-23-v1.4';api.validateLevel(p);
 return{level:p,sourceLevelSha256:digest(level),projectedLevelSha256:digest(p),hiddenIds:hidden.map(b=>b.id),giftedClearEvents:gifts,abstraction:'153-only-opening-with-seven-future-body-clears-precredited',simulation:'Erase all hidden body gestures and every lift/flip event. Seven precredited clears are never fewer than hidden clears in any source prefix; frozen counters can only be more permissive. Hidden occupancy disappears. Every opening-body step or exit remains possible, with no greater non-clearing cost. Optional contact avoids forcing newly allowed exits.',fullInventoryEquivalent:false,solvabilityCertified:false};
}
export function mappingWitness(level,drags){const proj=giftProjection153(level),m=new api.PuzzleModel(level),p=new api.PuzzleModel(proj.level),hidden=new Set(proj.hiddenIds),events=[];m.startCountdown();p.startCountdown();let sourceCost=0,projectedCost=0;
 const compare=()=>{const a=m.snapshot(),b=p.snapshot();for(const x of a.blocks.filter(x=>!hidden.has(x.id))){const y=b.blocks.find(y=>y.id===x.id);assert(y);assert.deepEqual([y.x,y.y,y.layers],[x.x,x.y,x.layers]);assert(y.frozen<=x.frozen);}assert.equal(b.blocks.length,a.blocks.filter(x=>!hidden.has(x.id)).length);for(const g of b.gates){const real=[...a.gates,...a.flipDoors].find(x=>x.id===g.id);assert(real);assert(g.frozen<=real.frozen);}};compare();
 for(const[i,d]of drags.entries()){const erased=hidden.has(d.blockId),before=m.snapshot().cleared,pbefore=p.snapshot().cleared;m.beginAction();if(!erased)p.beginAction();for(const xy of d.path){assert(m.moveBlockStep(d.blockId,...xy));if(!erased)assert(p.moveBlockStep(d.blockId,...xy));compare();}if(d.exitSide){assert(m.tryExit(d.blockId,d.exitSide).ok);if(!erased)assert(p.tryExit(d.blockId,d.exitSide).ok);}assert(m.commitAction());if(!erased)assert(p.commitAction());sourceCost+=Number(m.snapshot().cleared===before);projectedCost+=Number(!erased&&p.snapshot().cleared===pbefore);compare();events.push({step:i+1,blockId:d.blockId,erased,sourceCost,projectedCost,sourceClears:m.snapshot().cleared,projectedClears:p.snapshot().cleared});assert(projectedCost<=sourceCost);}
 assert(m.snapshot().complete&&p.snapshot().complete);return{passed:true,sourceCost,projectedCost,events};
}
export function checkGiftFloor153(level,options={}){const p=giftProjection153(level);return{...checkSymmetryFloor(p.level,{floor:5,maxStates:150000,maxMilliseconds:1500,...options}),projection:p};}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const d=JSON.parse(fs.readFileSync(process.argv[2])),proof=checkGiftFloor153(d.level),mapping=mappingWitness(d.level,d.drags),negative=[];for(const[field,val]of [['layers',['blue','red']],['keyId','unqualified'],['frozen',1],['movementAxis','vertical'],['timedBombSeconds',10]]){const l=structuredClone(d.level);l.blocks.find(b=>b.shutterId)[field]=val;let rejected=false;try{giftProjection153(l);}catch{rejected=true;}assert(rejected);negative.push({field,rejected});}console.log(save('gift-floor153',{sourceFile:process.argv[2],sourceFileSha256:digest(fs.readFileSync(process.argv[2])),proof,mapping,negativeControls:negative,qualificationScope:'153 only,29 plain opening bodies and7 single-stage plain hidden bodies in two lifts; all current v1.5 flip exits made permanently open in lower bound only.'}));console.log(JSON.stringify({status:proof.status,thresholdProven:proof.thresholdProven,shortcut:proof.relaxedNonClearingDrags,states:proof.discoveredStates}));}
