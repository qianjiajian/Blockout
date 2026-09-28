import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {loadApi,ruleGate,auditStructure} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {compile,each,clearCount,key,search} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
import {compile as compileFull,each as eachFull,search as searchFull} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';

const root='deliverables/remake31-200-v145-20260924/batches/lv061-070';
const source=process.argv[2]??root+'/root64/purple-source-preserved64-1790256786266.json';
const candidate=JSON.parse(fs.readFileSync(source)),level=candidate.level;
const locks=ruleGate(),{api}=await loadApi();
assert.equal(level.id,64);
const audit=auditStructure(candidate,api),replay=api.replayRevisedRoute(level,candidate.drags);
assert(replay.valid&&replay.complete&&replay.nonClearingDrags===10);
assert(!(level.shutters??[]).some(s=>s.skin==='lift'));
assert(!level.blocks.some(b=>b.movementAxis));
const budget={floor:5,maxStates:100000,maxMilliseconds:30000,prove:true};
const proof=search(level,budget);
const c=compile(level),full=compileFull(level),start=Date.now();
const queue=[{s:c.initial,cost:0}],seen=new Map([[key(c.initial),0]]);
let states=0,edges=0,stopped=null;
function expandState(s){
 const result=new Uint16Array(full.N*2+full.covers.length),cleared=clearCount(c,s);
 for(let i=0;i<c.blocks.length;i++){
  const b=c.blocks[i],hidden=cleared<b.reveal;
  result[i]=hidden?510:s[i];
  result[full.N+i]=hidden?b.ice:Math.max(0,b.ice-(cleared-b.reveal));
 }
 for(let j=0;j<c.covers.length;j++)result[full.N*2+j]=Number(cleared>=c.covers[j].count);
 return result;
}
function compactState(s){return Uint16Array.from(c.blocks.map((b,i)=>s[i]===510?b.initial:s[i]));}
for(let n=0;n<queue.length;n++){
 if(Date.now()-start>30000||seen.size>100000){stopped='finite-budget';break;}
 const row=queue[n];if(seen.get(key(row.s))<row.cost)continue;
 const expected=new Map(),actual=new Map();
 each(c,row.s,(i,v,cost)=>{const s=row.s.slice();s[i]=v;expected.set(cost+':'+key(s),{s,cost});},{optionalExit:true});
 eachFull(full,expandState(row.s),(s,cost)=>{
  const compact=compactState(s);
  assert.deepEqual([...s],[...expandState(compact)],'Dynamic ice / curtain state agrees with counter representation');
  actual.set(cost+':'+key(compact),true);
 },{optionalExit:true});
 assert.deepEqual([...actual.keys()].sort(),[...expected.keys()].sort(),'Complete successor sets must match');
 states++;edges+=actual.size;
 for(const {s,cost} of expected.values()){
  const next=row.cost+cost,k=key(s);if(next>=5||(seen.has(k)&&seen.get(k)<=next))continue;
  seen.set(k,next);queue.push({s,cost:next});
 }
}
const differential={status:stopped?'UNKNOWN':'PASS',stopped,states,uniqueStates:seen.size,edges,ms:Date.now()-start,domain:'All reachable states with cost < 5; all complete optional-exit successor sets, including cost-5 boundary edges; complete inventory, explicit dynamic ice and curtain reveal cross-check.'};
const independentFullGraph=searchFull(level,budget);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files=[source,'tools/campaign-v145/lv061-070/assist64-review-new.mjs',root+'/author61-64/local-graph.mjs',root+'/author65-67/lift-search.mjs'];
const report={status:proof.thresholdProven&&independentFullGraph.thresholdProven&&!stopped?'PASS':'UNKNOWN',checkedAt:new Date().toISOString(),rules:{activeVersion:locks.activeVersion,locksPassed:locks.ok},source,levelSha256:digest(level),routeSha256:digest(candidate.drags),bindings:files.map(file=>({file,sha256:hash(file)})),scope:'Independent no-complete-route-with-0-through-4-nonclearing-drags review of the final purple-source-preserved candidate; no candidate edits.',audit,replay,proof,differential,independentFullGraph,lowerBound:proof.thresholdProven?5:null,upperBound:replay.nonClearingDrags,abstraction:'Retain all bodies, layers, ice, gate counts and plain countdown covers; contact exits are optional.',costNonincreasing:'Every actual held path remains available, with each clear/peel cost 0 and each nonclearing release cost 1. Optional exit contact adds paths and cannot increase the minimum. Closed nonoverlapping full-region covers prohibit external blockers, hence reveal and hidden-ice activation occur at the source count; dynamic-state graph equivalence checked exhaustively below threshold.',sourceAlignmentValidated:false,pointerValidated:false,humanBlindTested:false,formalAdopted:false};
const file=root+'/assist64/review-new64-'+Date.now()+'.json';
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,status:report.status,L:report.lowerBound,U:report.upperBound,proof,differential,independentFullGraph}));
