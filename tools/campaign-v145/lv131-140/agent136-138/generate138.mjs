import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../../revised-generator-queue-colors.mjs';
import {fastGeneratorWitness} from './fast-generator-witness.mjs';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));const {api}=await loadApi();
const out='deliverables/remake131-140-v146-20260924/agent136-138';fs.mkdirSync(out,{recursive:true});
const baseline=api.LEVELS.find(l=>l.id===138),palette=['red','blue','yellow','green','pink','purple','cyan','orange'];
const shapes={H2:[[0,0],[1,0]],H3:[[0,0],[1,0],[2,0]],S:[[0,0]],V2:[[0,0],[0,1]],SQ2:[[0,0],[1,0],[0,1],[1,1]]};
const rngFor=seed=>{let s=seed>>>0;return()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296);};
const shuffle=(a,r)=>a.map(x=>[r(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);const key=(x,y)=>`${x},${y}`;
function make(seed){const r=rngFor(seed),l=structuredClone(baseline);l.difficulty='normal';
 l.gates=[{id:'a138-blue',color:'blue',side:'left',offset:1,size:2},{id:'a138-purple',color:'purple',side:'right',offset:1,size:2},{id:'a138-yellow',color:'yellow',side:'top',offset:1,size:3},{id:'a138-pink',color:'pink',side:'top',offset:4,size:2},{id:'a138-orange',color:'orange',side:'left',offset:4,size:3},{id:'a138-cyan',color:'cyan',side:'right',offset:4,size:3},{id:'a138-green',color:'green',side:'bottom',offset:0,size:2,frozen:3},{id:'a138-red',color:'red',side:'bottom',offset:5,size:2,frozen:5}];
 l.shutters=[{id:'a138-cover8',x:0,y:3,width:2,height:6,count:8},{id:'a138-cover10',x:2,y:3,width:3,height:6,count:10},{id:'a138-cover14',x:5,y:3,width:2,height:6,count:14}];
 const pieces=[[1,0,'H2'],[3,0,'S'],[4,0,'H2'],[0,1,'H2'],[2,1,'H2'],[4,1,'H2'],[6,1,'S'],[0,2,'H2'],[2,2,'H2'],[4,2,'S'],[5,2,'H2']].map(([x,y,t])=>({x,y,shape:shapes[t],t}));
 // First cover retains all six observed bodies (12 cells); later covers are original full layers.
 const left=[[0,3,'H2'],[0,4,'V2'],[1,4,'V2'],[0,6,'S'],[1,6,'S'],[0,7,'SQ2']];
 pieces.push(...left.map(([x,y,t])=>({x,y,shape:shapes[t],t,shutterId:'a138-cover8'})));
 const middle=[[2,3,'H3'],[2,4,'H3'],[2,5,'SQ2'],[4,5,'V2'],[2,7,'H2'],[4,7,'V2'],[2,8,'H2']];
 pieces.push(...middle.map(([x,y,t])=>({x,y,shape:shapes[t],t,shutterId:'a138-cover10'})));
 const right=[[5,3,'SQ2'],[5,5,'H2'],[5,6,'H2'],[5,7,'SQ2']];pieces.push(...right.map(([x,y,t])=>({x,y,shape:shapes[t],t,shutterId:'a138-cover14'})));
 const occ=new Map();pieces.forEach((b,i)=>b.shape.forEach(([dx,dy])=>occ.set(key(b.x+dx,b.y+dy),i)));const assigned=[];
 l.blocks=pieces.map((b,i)=>{const used=new Set();b.shape.forEach(([dx,dy])=>{for(const [u,v]of[[0,1],[1,0],[0,-1],[-1,0]]){const j=occ.get(key(b.x+dx+u,b.y+dy+v));if(j!==i&&assigned[j])used.add(assigned[j]);}});const allowed=palette.filter(c=>!used.has(c)&&!(b.t==='H3'&&['green','red','pink'].includes(c)));let cs=shuffle(allowed,r);if(i<11&&r()<.5)cs=[...shuffle(['blue','purple','yellow','pink'].filter(c=>allowed.includes(c)),r),...cs];if(i===0&&!used.has('yellow'))cs=['yellow',...cs];const color=cs[0];assert(color);assigned.push(color);const {t,...body}=b;const block={...body,id:`a138-b${i}`,color};if([2,3,8,16].includes(i)){const inner=shuffle(palette.filter(c=>c!==color),r)[0];block.layers=[color,inner];}return block;});
 const qa=shuffle(palette,r).slice(0,2);for(let i=0;i<2;i++)l.blocks.push({id:`a138-q${i}`,x:3,y:8,shape:shapes.S,color:qa[i],generatorId:'a138-machine'});
 l.generators=[{id:'a138-machine',side:'bottom',offset:3,rimSpan:3,rimMount:'rim',spawn:[3,8],queueBlockIds:['a138-q0','a138-q1'],trigger:'move'}];return l;
}
const start=Number(process.argv[2]??1380001),count=Number(process.argv[3]??40),rows=[];
for(let seed=start;seed<start+count;seed++){const level=make(seed),row={seed,levelSha256:digest(level)};try{api.validateLevel(level);const audits={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),native:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)};assert(audits.opening.passed&&audits.hidden.passed&&audits.gates.passed&&audits.queue.passed&&audits.native,JSON.stringify(audits));const search=fastGeneratorWitness(level,api,{maxMilliseconds:5000,orderSeed:seed%11});if(search.status==='witness'){search.replay=api.replayRevisedRoute(level,search.drags);if(!search.replay.valid||!search.replay.complete){search.status='invalid';search.termination=search.replay.error;}}Object.assign(row,{status:search.status,termination:search.termination,explored:search.explored,U:search.replay?.nonClearingDrags});
 if(search.status==='witness'){const data={schemaVersion:1,activeRuleVersion:lock.activeVersion,seed,level,drags:search.drags,replay:search.replay,audits,sourceReview:{status:'ADAPTED_REVIEW_REQUIRED',facts:['3 covers8/10/14, 3H2 opening shells +1SQ2 hidden shell, 2 gates3/5, 1machine2queued bodies retained','cover8 six hidden pieces H2/V2/V2/S/S/SQ2 retained'],differences:['Baseline61cells retained; source openingH3 adapted to single to fill19 visiblecells.','New aligned layout and authored colors; shell inner colors kept distinct. Two remaining hidden layers original and full.','Source hidden facts at141/192 still need body-by-body binding; this candidate cannot be formally adopted before source review.']},lowerBoundCertified:false,pointerValidated:false,formalAdopted:false};const file=`${out}/candidate138-${seed}.json`;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});row.file=file;} }catch(e){row.error=e.message;}rows.push(row);console.log(JSON.stringify(row));}
fs.writeFileSync(`${out}/attempts138-${start}-${Date.now()}.json`,JSON.stringify({activeRuleVersion:lock.activeVersion,budgetPerCandidateMilliseconds:4000,rows},null,2)+'\n',{flag:'wx'});
