import fs from 'node:fs';
import path from 'node:path';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {loadSpatialApi,searchSpatial} from '../../../remake111to120-spatial-floor-v147.mjs';
import {digest,measureDesignFacts} from '../../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
export const OUT='deliverables/campaign121-130-v146-20260924/round3-c';
export const shapes={S:[[0,0]],H2:[[0,0],[1,0]],H3:[[0,0],[1,0],[2,0]],V2:[[0,0],[0,1]],SQ:[[0,0],[1,0],[0,1],[1,1]],L:[[0,0],[0,1],[1,1]]};
export const rngFor=seed=>{let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);};
export const shuffle=(a,r)=>[...a].sort(()=>r()-.5);
export const cells=b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]);
export function pack(area,kinds,rng,prefix){
 const legal=new Set(area.map(p=>p.join(','))),used=new Set(),blocks=[];
 const pieces=shuffle(kinds.filter(x=>x!=='S'),rng).sort((a,b)=>shapes[b].length-shapes[a].length);
 let attempts=0;function rec(n){if(++attempts>12000)return false;if(n===pieces.length){const rest=area.filter(p=>!used.has(p.join(',')));if(rest.length!==kinds.filter(x=>x==='S').length)return false;for(const [x,y]of rest)blocks.push({x,y,shape:shapes.S});return true;}
  const shape=shapes[pieces[n]];for(const[x,y]of shuffle(area,rng)){const pts=shape.map(([dx,dy])=>[x+dx,y+dy].join(','));if(pts.some(p=>!legal.has(p)||used.has(p)))continue;pts.forEach(p=>used.add(p));blocks.push({x,y,shape});if(rec(n+1))return true;blocks.pop();pts.forEach(p=>used.delete(p));}return false;}
 if(!rec(0))return null;return blocks.map((b,i)=>({...b,id:`${prefix}-${i}`,shape:structuredClone(b.shape)}));
}
export function color(blocks,palette,rng,weights={}){
 const adj=blocks.map(()=>new Set());const own=new Map();blocks.forEach((b,i)=>cells(b).forEach(p=>own.set(p.join(','),i)));
 blocks.forEach((b,i)=>cells(b).forEach(([x,y])=>[[1,0],[0,1],[-1,0],[0,-1]].forEach(([dx,dy])=>{const j=own.get([x+dx,y+dy].join(','));if(j!==undefined&&j!==i)adj[i].add(j);})));let tries=0;
 function rec(n){if(n===blocks.length)return true;if(++tries>10000)return false;const available=blocks.map((b,i)=>({b,i,s:new Set([...adj[i]].map(j=>blocks[j].color).filter(Boolean)).size})).filter(x=>!x.b.color).sort((a,b)=>b.s-a.s||adj[b.i].size-adj[a.i].size);const {b,i}=available[0];const forbidden=new Set([...adj[i]].map(j=>blocks[j].color));const colors=typeof palette==='function'?palette(b):palette;const order=colors.map(c=>({c,k:-Math.log(Math.max(.00001,rng()))/(weights[c]??1)})).sort((a,b)=>a.k-b.k);for(const{c}of order){if(forbidden.has(c))continue;b.color=c;if(rec(n+1))return true;}delete b.color;return false;}return rec(blocks.filter(b=>b.color).length);
}
export function cleanBase(b){const l=structuredClone(b);for(const k of ['blocks','gates','shutters','generators','flipDoors','coloredGrids','elevators','conveyors','sourceAdaptation','onboardingHint','strategyNudge','strategyFocus'])delete l[k];l.blocks=[];l.gates=[];l.shutters=[];l.mechanismRules='revised-2026-09-23-v1.4';return l;}
const rect=(x,y,w,h)=>Array.from({length:w*h},(_,p)=>[x+p%w,y+Math.floor(p/w)]);
const gate=(color,side,offset,size,frozen)=>({id:`gate-${color}`,color,side,offset,size,...(frozen?{frozen}:{})});
export function make128(base,seed){
 const rng=rngFor(seed),l=cleanBase(base);l.shutters=[{id:'source128-cover15',x:0,y:0,width:7,height:3,count:15}];
 l.gates=[gate('green','left',3,3),gate('red','bottom',0,3),gate('purple','right',3,3,10),gate('yellow','bottom',4,3,12),gate('blue','top',4,3,15),gate('cyan','top',0,3,28)];
 const kinds=[...Array(16).fill('S'),...Array(3).fill('H3'),...Array(3).fill('V2'),'SQ'];
 const opening=pack(rect(0,3,7,5),kinds,rng,'r170-128-o');if(!opening)return null;
 if(!color(opening,['red','green','purple','yellow','blue'],rng,{red:7,green:7,purple:1,yellow:.6,blue:.3}))return null;
 // Unknown hidden inventory is authored independently, with 21/21 cells covered.
 const hidden=pack(rect(0,0,7,3),[...Array(7).fill('H2'),...Array(7).fill('S')],rng,'r170-128-h');if(!hidden)return null;
 color(hidden,['red','green','purple','yellow','blue','cyan'],rng);hidden.forEach(b=>b.shutterId=l.shutters[0].id);l.blocks=[...opening,...hidden];return l;
}
export function make130(base,seed){
 const rng=rngFor(seed),l=cleanBase(base);l.shutters=[{id:'source130-cover20',x:0,y:6,width:6,height:2,count:20}];
 l.gates=[gate('blue','top',1,3),gate('red','left',0,3),gate('yellow','right',0,3),gate('green','left',3,3),gate('purple','right',3,3),gate('cyan','bottom',0,2,6),gate('orange','bottom',2,2,7),gate('pink','bottom',4,2,3)];
 const kinds=[...Array(6).fill('S'),...Array(8).fill('H2'),...Array(4).fill('V2'),...Array(2).fill('H3')];
 const opening=pack(rect(0,0,6,6),kinds,rng,'r170-130-o');if(!opening)return null;
 if(!color(opening,['blue','red','yellow','green','purple'],rng))return null;
 const keyed=shuffle(opening,rng).slice(0,6);for(let i=0;i<3;i++){keyed[i].keyId=`source130-key${i+1}`;keyed[i+3].lockedBy=`source130-key${i+1}`;keyed[i+3].lockCount=1;}
 const hidden=pack(rect(0,6,6,2),[...Array(4).fill('H2'),...Array(2).fill('V2')],rng,'r170-130-h');if(!hidden)return null;color(hidden,['cyan','orange','pink','blue','green','red','yellow','purple'],rng);hidden.forEach(b=>b.shutterId=l.shutters[0].id);l.blocks=[...opening,...hidden];return l;
}
export function audit(l,api){api.validateLevel(l);const hard=api.auditRevisedCandidate(l);const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);const issues=hard.issues.filter(i=>!omit.has(i.code));const opening=auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden=auditHiddenCoverage(l),gates=auditGateSpanLimits(l),art=api.auditCandidateBlockArt(l),native=l.blocks.every(b=>api.matchFormalBlockShape(b.shape)?.quarterTurns===0);return{passed:!issues.length&&opening.passed&&hidden.passed&&gates.passed&&art.passed&&native,issues,opening,hidden,gates,art,native};}
export async function getApi(){const a=await loadApi(),b=await loadSpatialApi();return{...a.api,...b};}
export function save(name,data){fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,name),JSON.stringify(data,null,2)+'\n');}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/round3-c/author.mjs')){
 const lock=verifyRulesLock();if(!lock.ok)throw Error(lock.errors.join('\n'));const api=await getApi();const id=Number(process.argv[2]??128),start=Number(process.argv[3]??1),count=Number(process.argv[4]??120),ms=Number(process.argv[5]??1500);const base=api.LEVELS.find(l=>l.id===id),attempts=[];let best=null;
 for(let n=start;n<start+count;n++){
  const seed=id*100000+n;const l=(id===128?make128:make130)(base,seed);if(!l){attempts.push({seed,status:'packing-failed'});continue;}const a=audit(l,api);if(!a.passed){attempts.push({seed,status:'static-rejected',issues:a.issues});continue;}
  const s=searchSpatial(l,api,{floor:id===128?16:21,maxStates:60000,maxMilliseconds:ms,normalize:true,diagnosticTrace:true,orderSeed:n});let replay=null;if(s.drags)replay=api.replayRevisedRoute(l,s.drags);
  const row={seed,sha256:digest(l),status:s.status,cost:s.cost,maxClearsSeen:s.maxClearsSeen,termination:s.termination,explored:s.exploredStates,replay};attempts.push(row);
  if(s.status==='witness'&&replay?.valid&&replay.complete){
   const data={ruleVersion:lock.activeVersion,level:l,levelSha256:digest(l),seed,drags:s.drags,search:s,replay,audit:a,sourceFacts:JSON.parse(fs.readFileSync('deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json')).levels.find(x=>x.level===id),designDifferences:id===128?['Entire lower-five-row packing newly generated; preserved source23-piece shape histogram. Hidden14-piece fill authored because source hidden histogram unknown. Source frozen gate colors unspecified; six-color unique binding authored. Two source circular badges have only ordinary translation evidence; no unsupported rotation mechanism invented.']:['Source40-cell disconnected board cannot replace preserved48-cell baseline. Cover16 source cells adapted to12; count20 unchanged. Opening20 pieces now six singles/eightH2/fourV2/twoH3 to fill36 cells, under explicit shape/color iteration permission. Three keys/three count1 locks preserved with authored independent bindings; no bombs or shells. Duplicate-color source exits minimally consolidated into8unique colors while retaining all3frozen instances6/7/3. Hidden6-piece fill authored.'],proposedFacts:measureDesignFacts(l,api),lowerBoundCertified:false,pointerValidated:false,naturalClockValidated:false,formalAdopted:false};
   save(`candidate${id}-seed${seed}.json`,data);if(!best||replay.nonClearingDrags>best.replay.nonClearingDrags){best=data;save(`best${id}.json`,data);}console.log(JSON.stringify({id,seed,witness:replay.nonClearingDrags,drags:s.drags.length}));
   if(replay.nonClearingDrags>=(id===128?11:16)){save(`target${id}.json`,data);break;}
  }
  if(n%10===0)console.log(JSON.stringify({id,n,last:row.status,maxClears:s.maxClearsSeen,best:best?.replay.nonClearingDrags}));
  save(`attempts${id}-${start}.json`,{ruleVersion:lock.activeVersion,options:{start,count,ms},attempts});
 }
 save(`attempts${id}-${start}.json`,{ruleVersion:lock.activeVersion,options:{start,count,ms},attempts});console.log(JSON.stringify({id,attempts:attempts.length,best:best?.replay}));
}
