import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest,loadPreviewCore} from '../../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {loadSpatialApi,searchSpatial} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
import {checkNativeAxisFloor} from '../root-native/native-axis-floor.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {pack,SHAPES,seededRng} from '../../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';

const lock=verifyRulesLock();assert(lock.ok);
const source='deliverables/remake131-140-v146-20260924/agent139-140/enriched140-1790472702049.json',base=JSON.parse(fs.readFileSync(source));
const [spatial,{api:core}]=await Promise.all([loadSpatialApi(),loadPreviewCore()]);const api={...core,...spatial};
const root='deliverables/remake131-140-v146-20260924/agent131-134',rng=seededRng(Number(process.env.SEED??19140132)),pick=a=>a[Math.floor(rng.rand()*a.length)],shuffle=a=>rng.shuffle([...a]),key=p=>p.join(',');
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
const failures={}; const fail=k=>(failures[k]=(failures[k]??0)+1,null);
const occupied=bs=>new Set(bs.flatMap(b=>b.shape.map(([x,y])=>key([b.x+x,b.y+y]))));
const rectangle=(x,y,w,h)=>Array.from({length:w*h},(_,i)=>[x+i%w,y+Math.floor(i/w)]);
function make(){
 const l=structuredClone(base.level),side=pick([0,2]),y=pick([3,4,5,6]);
 l.shutters=[{id:'n140-cover8',x:side,y,width:3,height:5,count:8}];
 const hiddenCells=rectangle(side,y,3,5),hideKeys=new Set(hiddenCells.map(key)),openingCells=l.playable.filter(p=>!hideKeys.has(key(p)));
 const hidden=pack([{id:'n140-hidden-0',sourceId:'n140-hidden-0',kind:'H2',shell:true},{id:'n140-hidden-1',sourceId:'n140-hidden-1',kind:'V2',shell:true},{id:'n140-hidden-2',sourceId:'n140-hidden-2',kind:'SQ2',shell:true},{id:'n140-hidden-3',sourceId:'n140-hidden-3',kind:'L4'},{id:'n140-hidden-4',sourceId:'n140-hidden-4',kind:'L3'}],hiddenCells,rng,3000);
 if(!hidden)return fail('hidden');
 const axes=[],legal=new Set(openingCells.map(key));
 for(let i=0;i<4;i++){
  const kind=i%2?'V3':'H2',shape=SHAPES[kind][0],x=[1,3,2,1][i],axisColor=['blue','cyan','red','yellow'][i];
  const occ=occupied(axes),positions=shuffle(Array.from({length:12},(_,j)=>j)).filter(y=>shape.every(([dx,dy])=>legal.has(key([x+dx,y+dy]))&&!occ.has(key([x+dx,y+dy]))));
  const yy=positions.find(y=>axes.every(a=>a.color!==axisColor||shape.every(([dx,dy])=>a.shape.every(([u,v])=>Math.abs(x+dx-a.x-u)+Math.abs(y+dy-a.y-v)!==1))));
  if(yy===undefined)return fail('axis');
  axes.push({id:`n140-axis-${i}`,sourceId:`n140-axis-${i}`,kind,x,y:yy,shape,color:axisColor,movementAxis:'vertical'});
 }
 const occ=occupied(axes),spec=['L3','SQ2','SQ2','SQ2','BAR3','BAR3','H2','H2','H2','H2','SINGLE','SINGLE'].map((kind,i)=>({sourceId:`n140-ordinary-${i}`,kind}));
 const opening=pack(spec,openingCells.filter(p=>!occ.has(key(p))),rng,5000);if(!opening){if(!failures.opening)fs.writeFileSync(root+'/assist140-pack-first.json',JSON.stringify({axes,openingCells,remaining:openingCells.filter(p=>!occ.has(key(p))),spec}));return fail('opening');}
 l.gates=[{id:'n140-blue',color:'blue',side:'top',offset:1,size:2},{id:'n140-cyan',color:'cyan',side:'top',offset:3,size:1},{id:'n140-red',color:'red',side:'bottom',offset:2,size:2,frozen:4},{id:'n140-yellow',color:'yellow',side:'bottom',offset:1,size:1,frozen:2}];
 const colors=shuffle(['purple','green','orange','pink']);
 for(let i=0;i<4;i++){const color=colors[i],offset=(i%2)*4+pick([1,2,3]);l.gates.push({id:'n140-'+color,color,side:i<2?'left':'right',offset,size:3,...(color==='purple'?{frozen:3}:{})});}
 l.blocks=[...axes,...opening,...hidden.map(b=>({...b,shutterId:'n140-cover8'}))].map(b=>({id:b.sourceId,x:b.x,y:b.y,shape:b.shape,color:b.color??'green',...(b.movementAxis?{movementAxis:b.movementAxis}:{}),...(b.shutterId?{shutterId:b.shutterId}:{}),...(b.shell?{layers:['green','orange']}:{})}));
 return l;
}
function color(l){
 const bs=l.blocks,adj=bs.map((a,i)=>bs.flatMap((b,j)=>j!==i&&a.shutterId===b.shutterId&&a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1))?[j]:[]));
 const assigned=new Set(bs.flatMap((b,i)=>b.movementAxis?[i]:[]));
 const available=bs.map(b=>b.movementAxis?[b.color]:shuffle(l.gates.filter(g=>{const wide=['top','bottom'].includes(g.side)?1+Math.max(...b.shape.map(p=>p[0])):1+Math.max(...b.shape.map(p=>p[1]));return wide<=g.size;}).map(g=>g.color)).filter(color=>api.auditCandidateBlockArt({blocks:[{...b,color,layers:b.layers?[color,'green']:undefined}]}).passed));
 let calls=0;function go(){if(++calls>2000)return false;if(assigned.size===bs.length)return true;
  const i=bs.map((_,i)=>i).filter(i=>!assigned.has(i)).sort((a,b)=>adj[b].filter(j=>assigned.has(j)).length-adj[a].filter(j=>assigned.has(j)).length)[0];
  for(const c of available[i]){if(adj[i].some(j=>assigned.has(j)&&bs[j].color===c))continue;bs[i].color=c;assigned.add(i);if(go())return true;assigned.delete(i);}return false;
 }
 if(!go())return false;
 for(const [i,b]of bs.entries())if(b.layers){const inner=available[i].filter(c=>c!==b.color&&api.auditCandidateBlockArt({blocks:[{...b,layers:[b.color,c]}]}).passed);if(!inner.length)return false;b.layers=[b.color,pick(inner)];}
 return true;
}
const start=Date.now(),rows=[];let attempts=0,winner=null,template=null;
for(let n=0;n<30000&&attempts<100&&Date.now()-start<Number(process.env.SECONDS??220)*1000;n++){
 const state=rng.state();if(!template)template=make();if(!template)continue;
 const l=structuredClone(template);if(!color(l)){fail('color');template=null;continue;}
 try{api.validateLevel(l);}catch(e){fail('validate:'+e.message);template=null;continue;}
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden:auditHiddenCoverage(l),gates:auditGateSpanLimits(l),art:api.auditCandidateBlockArt(l)};
 const issues=api.auditRevisedCandidate(l).issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');
 if(!Object.values(audit).every(x=>x.passed)||issues.length){fail('audit:'+JSON.stringify(issues));template=null;continue;}
 attempts++;
 const search=searchSpatial(l,spatial,{floor:21,maxMilliseconds:1800,maxStates:120000,symmetry:true,orderSeed:attempts%11});
 const replay=search.status==='witness'?api.replayRevisedRoute(l,search.drags):null;
 const row={n,attempt:attempts,seed:state,status:search.status,U:replay?.nonClearingDrags,maxClears:search.maxClearsSeen};
 if(replay?.valid&&replay.complete){
  const proof=replay.nonClearingDrags>=16?checkNativeAxisFloor(l,api,{floor:16,maxMilliseconds:8000,maxStates:4000000}):null;
  row.proof=proof&&{status:proof.status,thresholdProven:proof.thresholdProven,states:proof.discoveredStates,cost:proof.relaxedNonClearingDrags,lastCost:proof.lastExpandedCost};
  const file=root+`/assist140-wideaxes-${attempts}-${Date.now()}.json`;
  fs.writeFileSync(file,JSON.stringify({activeRuleVersion:lock.activeVersion,level:l,levelSha256:digest(l),drags:search.drags,routeSha256:digest(search.drags),replay,search,proof,audit,seed:state,constructor:'tools/campaign-v145/lv131-140/agent131-134/assist140-wideaxes.mjs',sourceCandidate:source,sourceReview:{status:'NEEDS_REFRESHED_SOURCE_BINDING',sourceFacts:base.sourceReview,changes:['All18source IDs retained; four vertical axes now native H2/SQ2, two blue/two red; all3shells retained in5body15cell cover8.','All3M11 retained; 14 capacity cells redistributed across original bodies, no invented mechanism.','Cover geometry rotated/repacked to3x5 side region. New colors and native shapes under v172.']},lowerBoundCertified:proof?.thresholdProven??false,formalAdopted:false,pointerValidated:false,naturalClockValidated:false},null,2)+'\n');row.file=file;
  if(proof?.thresholdProven){winner=file;}
 }
 rows.push(row);console.log(JSON.stringify(row));if(winner)break;if(attempts%3===0)template=null;
}
const report=root+`/assist140-wideaxes-status-${Date.now()}.json`;fs.writeFileSync(report,JSON.stringify({rows,winner,attempts,elapsedMs:Date.now()-start},null,2)+'\n');console.log(JSON.stringify({report,winner,attempts,failures}));
