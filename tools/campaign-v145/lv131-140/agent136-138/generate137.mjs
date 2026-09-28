import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
import {fastWitness} from './fast-witness.mjs';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const {api}=await loadApi();
const root='deliverables/remake131-140-v146-20260924/agent136-138';fs.mkdirSync(root,{recursive:true});
const baseline=api.LEVELS.find(l=>l.id===137),colors=['yellow','orange','green','blue','red','cyan','purple'];
const SH={C:[[0,0],[0,1],[1,1]],V3:[[0,0],[0,1],[0,2]],V2:[[0,0],[0,1]],H2:[[0,0],[1,0]],S:[[0,0]]};
const rngFor=seed=>{let s=seed>>>0;return()=>((s=(Math.imul(1664525,s)+1013904223)>>>0)/4294967296);};
const shuffle=(a,r)=>a.map(x=>[r(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const key=(x,y)=>`${x},${y}`;
function tile(seed){
 const r=rngFor(seed),area=new Set(baseline.playable.filter(([x,y])=>!(x>=1&&x<5&&y<4)).map(p=>key(...p)));
 const types=['C','C','V3','V3','V3','V3','V2','V2','V2','V2','V2','H2','H2','H2','S','S'];let work=0;
 function rec(left,out){if(!area.size)return out;if(++work>20000)return null;const cell=[...area].map(s=>s.split(',').map(Number)).sort((a,b)=>a[1]-b[1]||a[0]-b[0])[0];
  for(const t of shuffle([...new Set(left)],r))for(const [dx,dy]of shuffle(SH[t],r)){const x=cell[0]-dx,y=cell[1]-dy,cells=SH[t].map(([u,v])=>key(x+u,y+v));if(cells.some(s=>!area.has(s)))continue;cells.forEach(s=>area.delete(s));const remain=left.slice();remain.splice(remain.indexOf(t),1);const result=rec(remain,[...out,{x,y,shape:SH[t],type:t}]);if(result)return result;cells.forEach(s=>area.add(s));}return null;}
 return rec(types,[]);
}
function make(seed){const r=rngFor(seed+773),opening=tile(Math.floor(seed/10));if(!opening)return null;
 const level=structuredClone(baseline);level.difficulty='easy';level.shutters=[{id:'a137-cover3',x:1,y:0,width:4,height:4,count:3}];
 level.gates=[{id:'a137-yellow',color:'yellow',side:'left',offset:4,size:3},{id:'a137-green',color:'green',side:'left',offset:1,size:3,frozen:3},{id:'a137-cyan',color:'cyan',side:'top',offset:2,size:3,frozen:6},{id:'a137-purple',color:'purple',side:'bottom',offset:1,size:2,frozen:8},{id:'a137-orange',color:'orange',side:'bottom',offset:3,size:3,frozen:1},{id:'a137-red',color:'red',side:'right',offset:1,size:3,frozen:8},{id:'a137-blue',color:'blue',side:'right',offset:4,size:3,frozen:8}];
 const all=[...opening,...Array.from({length:8},(_,i)=>({x:1+(i%2)*2,y:Math.floor(i/2),shape:SH.H2,type:'H2',shutterId:'a137-cover3'}))];
 const occupancy=new Map();all.forEach((b,i)=>b.shape.forEach(([dx,dy])=>occupancy.set(key(b.x+dx,b.y+dy),i)));
 const assigned=[],blocks=[];for(let i=0;i<all.length;i++){const b=all[i],used=new Set();b.shape.forEach(([dx,dy])=>{for(const [u,v] of [[0,1],[1,0],[-1,0],[0,-1]]){const j=occupancy.get(key(b.x+dx+u,b.y+dy+v));if(j!==i&&assigned[j])used.add(assigned[j]);}});let cs=shuffle(colors.filter(c=>!used.has(c)),r);if(!b.shutterId&&b.type!=='C')cs=[...shuffle(['yellow','orange','green'].filter(c=>!used.has(c)),r),...cs];if(b.x===0&&b.y>=4&&b.y<=6&&!used.has('yellow')&&b.type!=='C')cs=['yellow',...cs];if(b.shape.some(([dx,dy])=>b.y+dy===7)&&!used.has('orange')&&b.type!=='C')cs=['orange',...cs];const color=cs[0];if(!color)return null;assigned.push(color);const {type,...body}=b;blocks.push({...body,id:`a137-${i}`,color,...(type==='C'?{frozen:8}:{})});}level.blocks=blocks;return level;
}
const start=Number(process.argv[2]??137001),count=Number(process.argv[3]??60),attempts=[];let found=null;
for(let seed=start;seed<start+count&&!found;seed++){
 const level=make(seed);if(!level){attempts.push({seed,status:'no-tiling'});continue;}let row={seed,levelSha256:digest(level)};
 try{api.validateLevel(level);const audits={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level),native:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0)};
  assert(audits.opening.passed&&audits.hidden.passed&&audits.gates.passed&&audits.native,JSON.stringify(audits));
  const search=fastWitness(level,{maxMilliseconds:3000});if(search.status==='witness'){search.replay=api.replayRevisedRoute(level,search.drags);if(!search.replay.valid||!search.replay.complete){search.status='invalid';search.termination=search.replay.error;}}row={...row,status:search.status,termination:search.termination,explored:search.exploredStates??search.explored,U:search.replay?.nonClearingDrags};
  if(search.status==='witness'){
   const candidate={schemaVersion:1,activeRuleVersion:lock.activeVersion,level,seed,drags:search.drags,replay:search.replay,audits,sourceReview:{status:'REVIEWED_ADAPTATION',openingSource:'.codex-temp/video-audit-135-169/openings/level-137.jpg',hiddenSource:'.codex-temp/video-audit-135-169/137-144/samples1s/sec-00035.jpg',facts:['13 opening bodies, 2 CROSS5 frozen8, source cover3; hidden8 bodies in20cells','Source frozen side doors are8, not3 as old truth incorrectly transcribed; ordinary lime/yellow plus green3,cya6,orange1,purple8,red8,blue8; duplicate orange8 removed by unique-color rule'],differences:['Preserve baseline52 playable cells versus55 source occupied cells. Cover20→16 and hidden8 bodies→8 native H2; opening original13 shapes plus1ordinary single to fill36.','Original layout and authored colors; source mechanism counts preserved except duplicate orange gate removal.']},formalAdopted:false,pointerValidated:false,lowerBoundCertified:false};
   const file=path.join(root,`candidate137-${seed}.json`);fs.writeFileSync(file,JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});row.file=file;
   if(search.replay.nonClearingDrags>=5&&search.replay.nonClearingDrags<=10){const proof=checkSymmetryFloor(level,{floor:5,maxStates:300000,maxMilliseconds:10000});candidate.proof=proof;candidate.lowerBoundCertified=proof.thresholdProven;fs.writeFileSync(path.join(root,`candidate137-${seed}-proof.json`),JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});row.proof=proof.status;found=proof.thresholdProven?candidate:null;}
  }
 }catch(e){row.error=String(e.message);}attempts.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync(path.join(root,`attempts137-${start}-${Date.now()}.json`),JSON.stringify({activeRuleVersion:lock.activeVersion,budgetPerCandidateMilliseconds:3000,attempts,found:found?.seed??null},null,2)+'\n',{flag:'wx'});
