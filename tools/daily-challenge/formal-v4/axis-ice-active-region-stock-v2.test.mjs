import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {SELF,VERSION,regionalAreaSupports,enumerateActiveBodyGateFragments,nativeWholeBoardCatalogue,createWholeBoardMeter,createAxisIceWholeBoardFactory} from './axis-ice-active-region-stock-v2.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

const OUT=process.env.ACTIVE_REGION_V2_TEST_OUT;assert(OUT);await fs.mkdir(OUT,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),checks=[],bindings={},activity={syntheticFactoryCalls:0,scalarCases:0,singleFragmentCases:0,completeTinyAssignments:0};
async function read(p){const b=await fs.readFile(p);bindings[p]=sha(b);return JSON.parse(b);}
async function save(name,q){const p=path.join(OUT,name);await fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});bindings[p]=sha(await fs.readFile(p));}
const oldBase='deliverables/daily-formal-v4-20261008/proof/active-region-axis-ice-factory-private-02',oldReport=await read(oldBase+'/report.json'),saved=await read(oldBase+'/first-full.json');
assert.equal(oldReport.status,'ACTIVE_REGION_AXIS_ICE_FACTORY_TINY_PASS');assert.equal(oldReport.checks.length,10);
const bundle=await build({stdin:{contents:"export {GAME_ART} from './src/game/artManifest.ts';export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const art=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64')),catalogue=nativeWholeBoardCatalogue(art);Object.assign(bindings,catalogue.assetBindings);for(const p of Object.keys(bundle.metafile.inputs).filter(p=>p!=='<stdin>'))bindings[p]=sha(await fs.readFile(p));
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),meter=()=>createWholeBoardMeter({qualificationOnly:true});
const source=()=>({id:997991,name:'Private active-region source',width:4,height:4,difficulty:'super',reward:0,timeSeconds:120,parMoves:40,mechanismRules:'revised-2026-09-27-v1.5',blocks:[[0,0],[2,0],[0,2],[2,2]].map(([x,y],i)=>({id:'old'+i,x,y,shape:rect(2,2),color:['red','blue','green','yellow'][i]})),gates:[{id:'old',color:'red',side:'top',offset:0,size:2}]});
function run({r=structuredClone(saved.recipe),q=structuredClone(saved.constraints),limits={},now=Date.now,prepayWorld=false}={}){const m=createWholeBoardMeter({qualificationOnly:true,limits,now});if(prepayWorld)m.reserve({worlds:1},'tiny-prior-world');const f=createAxisIceWholeBoardFactory(source(),r,catalogue,m,{qualificationOnly:true,qualificationConstraints:q,futureReservations:saved.q.firstFullReceipt.futureReservationsDeclared});activity.syntheticFactoryCalls++;return{f,m,q:f.constructOnce()};}
function sane(q){assert.equal(q.constructionAccounting.version,VERSION);assert.equal(q.accounting.transitions,Object.values(q.accounting.kinds).reduce((n,k)=>n+(k.transitions??0),0));for(const[k,c]of [['worlds','maxWorlds'],['partialNodes','maxPartialNodes'],['transitions','maxTransitions'],['micro','maxMicroStates']])assert(q.accounting[k]<=q.accounting.limits[c]);for(const k of ['newModels','newSearches','newReplays','newClaims','placeholderWorlds'])assert.equal(q.constructionAccounting[k],0);}

test('regional scalar support equals every complete tiny scalar assignment, including global single allowance',async()=>{
 const m=meter(),sets=Array.from({length:7},(_,mask)=>[1,2,3].filter((_,bit)=>(mask+1)&(1<<bit)));let cases=0;
 for(const a of sets)for(const b of sets)for(const c of sets)for(const single of [0,1,2]){
  const entries=[{activeRegion:true,areas:a},{activeRegion:true,areas:b},{activeRegion:false,areas:c}],targets=[2,4],solutions=[];for(const x of a)for(const y of b)for(const z of c)if(x+y===4&&z===2&&[x,y,z].filter(v=>v===1).length<=single)solutions.push([x,y,z]);
  const q=regionalAreaSupports(entries,targets,single,m,{filter:true});assert.equal(!!q,solutions.length>0);if(q)for(let i=0;i<3;i++)assert.deepEqual([...q.supportedAreas[i]].sort(),[...new Set(solutions.map(s=>s[i]))].sort());cases++;
 }
 const forced=regionalAreaSupports(Array.from({length:8},()=>({activeRegion:true,areas:[1,2,3,4]})),[0,16],0,m,{filter:true});assert(forced.supportedAreas.every(a=>JSON.stringify(a)==='[2]'));
 assert.equal(regionalAreaSupports([{activeRegion:true,areas:[1,3]}],[0,2],1,m),null,'exact area hole cannot pass a min/max interval');assert.equal(m.report().worlds,0);activity.scalarCases+=cases;await save('regional-scalar-oracle.json',{cases,accounting:m.report(),noCoordinatesOrWorlds:true});checks.push({name:'scalar-complete-set-equivalence',pass:true,cases});
});

// Independent direct predicate: no imported portal/axis/region predicate.
function naiveFragments(p){const {W,H,region:r,shapes,body:b,gate:g}=p,out=[];for(const s of shapes)for(let y=0;y+s.h<=H;y++)for(let x=0;x+s.w<=W;x++){
 const area=s.w*s.h,pin=b.pin;if(b.requiredGate&&b.requiredGate!==g.id||pin?.gateRoles&&!pin.gateRoles.includes(g.id)||!s.colours.includes(g.color)||pin&&(pin.x!==undefined&&pin.x!==x||pin.y!==undefined&&pin.y!==y||pin.dimensions&&pin.dimensions.join(',')!==[s.w,s.h].join(',')))continue;
 const cells=rect(s.w,s.h).map(([dx,dy])=>[x+dx,y+dy]),inside=cells.every(([xx,yy])=>xx>=r.x&&xx<r.x+r.width&&yy>=r.y&&yy<r.y+r.height),outside=cells.every(([xx,yy])=>xx<r.x||xx>=r.x+r.width||yy<r.y||yy>=r.y+r.height);if(b.activeRegion?!inside:!outside)continue;
 const vertical=g.side==='top'||g.side==='bottom',start=vertical?x:y,span=vertical?s.w:s.h;if(span>g.size)continue;const aligned=start>=g.offset&&start+span<=g.offset+g.size,edge=g.side==='top'?y===0:g.side==='bottom'?y+s.h===H:g.side==='left'?x===0:x+s.w===W,contact=aligned&&edge;
 if(b.axis&&((b.axis==='horizontal')===vertical||!aligned))continue;if(b.axis&&!g.frozen&&contact)continue;if(b.isStarter?(area!==2||!contact):(!b.ice&&!g.frozen&&contact))continue;
 out.push([x,y,s.w,s.h,g.color,g.id,b.axis??null,b.ice??0,Math.max(b.ice??0,g.frozen??0),b.activeRegion]);
 }return out.map(JSON.stringify).sort();}
const key=a=>JSON.stringify([a.x,a.y,a.w,a.h,a.color,a.gateRole,a.axis,a.ice,a.release,a.activeRegion]);
test('single-gate fragments match independent geometry across four directions, ice, colours and pins',async()=>{
 const shapes=[[1,1],[2,1],[1,2],[2,2]].map(([w,h],i)=>({w,h,shape:rect(w,h),shapeId:String(i),colours:i===2?['blue']:['red','blue']})),m=meter();let cases=0;
 for(const [W,H]of [[3,3],[4,4]])for(const [rx,ry]of [[0,0],[W-2,0],[0,H-2],[W-2,H-2]])for(const side of ['top','right','bottom','left'])for(let size=1;size<=2;size++)for(let offset=0;offset+size<=(['top','bottom'].includes(side)?W:H);offset++)for(const color of ['red','blue'])for(const frozen of [0,2])for(const body of [{activeRegion:true,isStarter:true},{activeRegion:true,axis:'horizontal'},{activeRegion:true,axis:'vertical'},{activeRegion:false,axis:'horizontal',ice:2},{activeRegion:false,axis:'vertical',ice:2},{activeRegion:false,ice:2,pin:{dimensions:[2,1],gateRoles:['G']}}]){
  const p={W,H,region:{x:rx,y:ry,width:2,height:2},shapes,body:{requiredGate:'G',...body},gate:{id:'G',color,side,offset,size,...frozen?{frozen}:{}}};assert.deepEqual(enumerateActiveBodyGateFragments(p,m).map(key).sort(),naiveFragments(p));cases++;
 }
 assert.equal(m.report().worlds,0);activity.singleFragmentCases+=cases;await save('single-gate-oracle.json',{cases,accounting:m.report(),productionInputs:0});checks.push({name:'single-body-domain-equivalence',pass:true,cases});
});

test('tiny full packing set is unchanged by region area filtering and own-gate early rejection',async()=>{
 const W=2,H=3,region={x:0,y:0,width:2,height:2},shapes=[[1,1],[1,2],[2,1]].map(([w,h])=>({w,h,shape:rect(w,h),shapeId:`${w}x${h}`,colours:['red','blue','green','orange']}));
 const bodies=[{activeRegion:true,isStarter:true},{activeRegion:true,axis:'vertical'},{activeRegion:true,axis:'horizontal'},{activeRegion:false,ice:2}],gates=[{id:'G0',color:'red',side:'left',offset:0,size:1},{id:'G1',color:'blue',side:'top',offset:0,size:1,frozen:2},{id:'G2',color:'green',side:'left',offset:1,size:1,frozen:2},{id:'G3',color:'orange',side:'bottom',offset:0,size:2}];
 function enumerate(optimized){const m=meter(),domains=bodies.map((body,i)=>enumerateActiveBodyGateFragments({W,H,region,shapes,body:{...body,requiredGate:'G'+i},gate:gates[i]},m)),support=optimized?regionalAreaSupports(domains.map((d,i)=>({activeRegion:bodies[i].activeRegion,areas:d.map(a=>a.area)})),[2,4],2,m,{filter:true}):null,solutions=[];
  const d=domains.map((rows,i)=>optimized?rows.filter(a=>support.supportedAreas[i].includes(a.area)):rows);function visit(i,used,chosen){for(const a of d[i]){m.transition('tiny-oracle-fragment');let bits=0n;for(const[x,y]of a.shape){m.transition('tiny-oracle-cell');bits|=1n<<BigInt((a.y+y)*W+a.x+x);}if(bits&used)continue;if(i===d.length-1){if((bits|used)!==63n||[...chosen,a].filter(b=>b.area===1).length>2)continue;m.reserve({worlds:1},'tiny-oracle-complete-assignment');solutions.push([...chosen,a].map(key).join('|'));}else visit(i+1,used|bits,[...chosen,a]);}}visit(0,0n,[]);return{solutions:solutions.sort(),accounting:m.report()};}
 const naive=enumerate(false),optimized=enumerate(true);assert(naive.solutions.length);assert.deepEqual(optimized.solutions,naive.solutions);activity.completeTinyAssignments+=naive.solutions.length+optimized.solutions.length;await save('complete-tiny-packing-set.json',{naive,optimized,realSources:0,solvabilityClaimed:false});checks.push({name:'full-tiny-packing-set-equivalence',pass:true,solutions:naive.solutions.length});
});

test('closed factory tiny retains first-full physical bytes, cache and terminal semantics',async()=>{
 const base=run();assert(base.q.found,JSON.stringify(base.q.constructionAccounting));assert.deepEqual(base.q.level,saved.q.level);assert.equal(base.q.levelSha256,levelSha256(base.q.level));assert.equal(base.q.accounting.worlds,1);assert(base.q.constructionAccounting.domainReuse.fixedGateHits>=5);assert(base.q.constructionAccounting.domainReuse.fixedGateCompilations>=5);sane(base.q);assert.throws(()=>base.f.constructOnce());
 const naive=run({q:{...structuredClone(saved.constraints),fixedGateSupport:false,regionalSupport:false}});assert(naive.q.found);assert.deepEqual(base.q.level,naive.q.level);sane(naive.q);
 const no=structuredClone(saved.constraints);no.bodyPins.b03.x=0;const failed=run({q:no});assert(!failed.q.found);assert(failed.q.constructionAccounting.pruneCounts['fixed-role-gate-empty']>0);assert.equal(failed.q.constructionAccounting.domainCounts.length,0);assert.throws(()=>failed.f.constructOnce());sane(failed.q);
 await save('first-full.json',{q:base.q,recipe:saved.recipe,constraints:saved.constraints});await save('closed-tiny-naive-and-empty.json',{naive:naive.q,failed:failed.q});checks.push({name:'first-full-and-early-empty-closure',pass:true});
});

test('new DP/cache checks pay finite caps; full remains saved after final clock or transition failure',async()=>{
 const rows=[];for(const limits of [{maxTransitions:1},{maxMicroStates:1},{maxPartialNodes:1}]){const a=run({limits});assert(!a.q.found);sane(a.q);assert.throws(()=>a.f.constructOnce());rows.push(a.q);}
 const prepaid=run({limits:{maxWorlds:1},prepayWorld:true});assert(!prepaid.q.found);assert.equal(prepaid.q.firstFullReceipt,null);assert.equal(prepaid.q.reason,'wholeboard-worlds-cap');sane(prepaid.q);rows.push(prepaid.q);
 let calls=0;const base=run({now:()=>{calls++;return 0;},limits:{maxMilliseconds:10}});assert(base.q.found);let current=0;const timed=run({now:()=>++current>=calls?10:0,limits:{maxMilliseconds:10}}),capped=run({limits:{maxTransitions:base.q.accounting.transitions-1}});for(const a of [timed,capped]){assert(a.q.found);assert.equal(a.q.levelSha256,base.q.levelSha256);sane(a.q);assert.throws(()=>a.f.constructOnce());}assert.equal(timed.q.reason,'wholeboard-deadline');assert.equal(capped.q.reason,'wholeboard-transitions-cap');
 await save('no-full-terminals.json',{rows});await save('formed-full-terminals.json',{base:base.q,timed:timed.q,capped:capped.q});checks.push({name:'paid-checks-and-no-retry-terminal',pass:true});
});

test.after(async()=>{const b=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(b.metafile.inputs))toolBindings[p]=sha(await fs.readFile(p));Object.assign(bindings,toolBindings);const p='tools/daily-challenge/formal-v4/axis-ice-active-region-stock-v2.test.mjs';bindings[p]=sha(await fs.readFile(p));await save('report.json',{status:checks.length===5?'ACTIVE_REGION_AXIS_ICE_FACTORY_V2_TINY_PASS':'ACTIVE_REGION_AXIS_ICE_FACTORY_V2_TINY_INCOMPLETE',checks,activity,toolBindings,fileBindings:{...bindings},reusedUnchangedOldEvidence:{path:oldBase+'/report.json',sha256:bindings[oldBase+'/report.json'],testsRerun:false},newRealDomains:0,newRealConstructions:0,newModels:0,newReplays:0,newSearches:0,newClaims:0,syntheticOnly:true,productionQualified:false,ordering:'New fragment/gate ordering; no equality of old production first-full claimed.'});});
