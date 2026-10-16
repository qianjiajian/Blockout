import fs from 'node:fs';
import {api,rng} from '../remake191-200/author194-196/common.mjs';
import {searchSpatial} from './author-hard20260930/grid-witness.mjs';
import {gridFloor} from './author-hard20260930/grid-floor224.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
if(!verifyRulesLock().ok)throw Error('Rules lock');
const out='deliverables/continue221-230-20260930/author224-root',base=JSON.parse(fs.readFileSync('deliverables/continue221-230-20260930/hard/candidate-224-g1406.json')),R=rng(Number(process.argv[2]??224871)),run=Date.now(),seen=new Set();fs.mkdirSync(out,{recursive:true});
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
for(let n=0;n<80;n++){
 const level=structuredClone(base),v=level.blocks.filter(b=>!b.frozen&&b.id!=='oa'),a=R.shuffle(v)[0],b=R.shuffle(v.filter(b=>b.color!==a.color))[0];[a.color,b.color]=[b.color,a.color];
 if(n%3===0){const grid=R.shuffle(level.coloredGrids)[0],index=Math.floor(R.random()*grid.cells.length),occupied=new Set(level.coloredGrids.flatMap(g=>g.cells).map(p=>p.join(','))),choices=level.blocks.filter(b=>b.color===grid.color&&!b.shutterId).flatMap(b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy])).filter(p=>!occupied.has(p.join(',')));if(choices.length)grid.cells[index]=R.shuffle(choices)[0];}
 const sha=digest(level);if(seen.has(sha))continue;seen.add(sha);const issues=api.auditRevisedCandidate(level).issues.filter(i=>!omit.has(i.code));if(issues.length||!api.auditCandidateBlockArt(level).passed)continue;
 const w=searchSpatial(level,api,{floor:21,maxMilliseconds:1600,maxStates:30000,maxTransitions:400000,symmetry:true});let rep,proof;if(w.drags)rep=api.replayRevisedRoute(level,w.drags);
 if(rep?.valid&&rep.complete&&rep.nonClearingDrags>=16&&rep.nonClearingDrags<=20)proof=gridFloor(level,{floor:16,maxMilliseconds:8000,maxStates:1500000});
 const row={n,sha,status:w.status,U:rep?.nonClearingDrags,L:proof?.status,states:proof?.discoveredStates,clears:w.maxClearsSeen};fs.appendFileSync(out+`/mutations-${run}.jsonl`,JSON.stringify(row)+'\n');
 if(rep?.valid&&rep.complete){const file=out+`/mutation-${run}-${n}.json`;fs.writeFileSync(file,JSON.stringify({level,drags:w.drags,replay:rep,proof,row},null,2));console.log(JSON.stringify({...row,file}));if(proof?.thresholdProven)break;}else if(n%10===0)console.log(JSON.stringify(row));
}
