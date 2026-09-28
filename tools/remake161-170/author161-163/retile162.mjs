import fs from 'node:fs';
import {loadApi,PROFILE,digest,auditSpatial} from '../common.mjs';
import {searchFlipWitness} from './flip-search.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
const {api}=await loadApi(),old=JSON.parse(fs.readFileSync('deliverables/remake161-170-v146-20260924/level162/reviewed162-1790248846837.json')),logs=[];
const keys=['red-l4','yellow-t4','purple-single'],shapes=api.FORMAL_BLOCK_SHAPES.filter(s=>s.cells.length===4&&s.canonicalWidth<=3&&s.canonicalHeight<=3);
const options=shapes.flatMap(s=>Array.from({length:4},(_,p)=>({shape:s.cells,x:3+p%2,y:Math.floor(p/2)}))).filter(s=>s.shape.every(([dx,dy])=>s.x+dx<6&&s.y+dy<3));
for(const red of options)for(const yellow of options){const cells=[...red.shape.map(([dx,dy])=>[red.x+dx,red.y+dy]),...yellow.shape.map(([dx,dy])=>[yellow.x+dx,yellow.y+dy])],set=new Set(cells.map(p=>p.join(',')));if(set.size!==8)continue;const free=Array.from({length:9},(_,p)=>[3+p%3,Math.floor(p/3)]).find(p=>!set.has(p.join(',')));if(!free)continue;
 for(let yo=0;yo<5;yo++)for(let bo=0;bo<6;bo++){const level=structuredClone(old.level);level.mechanismRules=PROFILE;Object.assign(level.blocks.find(b=>b.id.endsWith(keys[0])),red);Object.assign(level.blocks.find(b=>b.id.endsWith(keys[1])),yellow);Object.assign(level.blocks.find(b=>b.id.endsWith(keys[2])),{x:free[0],y:free[1]});level.flipDoors.find(g=>g.color==='yellow').offset=yo;level.flipDoors.find(g=>g.color==='blue').offset=bo;
 try{api.validateLevel(level);if(!api.auditCandidateBlockArt(level).passed||api.auditRevisedCandidate(level).issues.some(i=>i.category!=='source'&&i.code!=='wrong-rule-profile'))continue;}catch{continue;}
 const w=searchFlipWitness(level,{maxCost:20,maxMilliseconds:200,maxStates:35000});if(w.status!=='witness')continue;const replay=api.replayRevisedRoute(level,w.drags);if(!replay.valid)continue;
 const projected=structuredClone(level);projected.mechanismRules='revised-2026-09-23-v1.4';projected.gates.push(...projected.flipDoors.map(({initiallyOpen,...g})=>g));projected.flipDoors=[];const proof=checkSymmetryFloor(projected,{floor:16,maxMilliseconds:1000,maxStates:150000});const log={levelSha256:digest(level),witnessCost:w.cost,proof};logs.push(log);console.log(JSON.stringify({cost:w.cost,proof:proof.status,shortcut:proof.relaxedNonClearingDrags}));
 if(proof.thresholdProven){const out={activeRuleVersion:'1.103.0',level,drags:w.drags,replay,proof,projected,spatial:auditSpatial(level,api),sourceAdaptation:old.sourceAdaptation,sourceOpeningStatus:old.sourceOpeningStatus,formalAdopted:false,pointerValidated:false};const file='deliverables/remake161-170-20260927/author161-163/candidate162-retile-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(out,null,2));console.log(file);process.exit(0);}
 }
}
fs.writeFileSync('deliverables/remake161-170-20260927/author161-163/retile162-'+Date.now()+'.json',JSON.stringify(logs,null,2));
