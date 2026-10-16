import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareMissingPortalPenalty,compareMissingPortalTargetKeys,VERSION} from './reverse-missing-portal-penalty-v1.mjs';
const T='tools/daily-challenge/formal-v4/',V='deliverables/daily-formal-v4-20261008/',SELF=T+'reverse-missing-portal-penalty-v1.mjs',TEST=T+'reverse-missing-portal-penalty.metadata.test.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex'),copy=structuredClone;
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),atom=(id,color,w=1,h=1,star=false)=>({id,color,shape:rect(w,h),star}),gate=(id,color,side,offset,size,star=false)=>({id,color,side,offset,size,star});
function meter(limit=Infinity){const labels={},calls=[];let total=0,micro=0,stopped=false;return{charge(t,m,label){if(stopped||total+t>limit){stopped=true;throw Error('synthetic-coordinate-cap');}assert(Number.isSafeInteger(t)&&t>0);assert(Number.isSafeInteger(m)&&m>=0);total+=t;micro+=m;labels[label]=(labels[label]??0)+t;calls.push([t,m,label]);},summary(){return{transitions:total,micro,labels,calls:calls.length,stopped};}};}
function fixture(){const a=atom('insert','purple',2,1),c=atom('missing-cyan','cyan',2,1),o=atom('already-blocked','orange'),b=atom('present','blue');return{level:{width:4,height:4,gates:[gate('c','cyan','left',1,2),gate('o','orange','left',1,1)],blocks:[{...b,x:0,y:1}]},inventory:[a,c,o,b],insertingBody:a};}
// Independent cell-set oracle: enumerate every board coordinate and test the
// boundary predicate, instead of constructing gate-aligned mask anchors.
function oracle({level,inventory,insertingBody},position){
 const present=new Set(level.blocks.map(b=>b.id)),occupied=new Set(level.blocks.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y].join(',')))),added=new Set(insertingBody.shape.map(([x,y])=>[x+position[0],y+position[1]].join(',')));let count=0;
 for(const b of inventory){if(b.id===insertingBody.id||present.has(b.id))continue;const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));let before=false,after=false;
  for(let y=0;y+h<=level.height;y++)for(let x=0;x+w<=level.width;x++){
   if(!level.gates.some(g=>g.color===b.color&&(!b.star||g.star)&&((g.side==='left'&&x===0&&y>=g.offset&&y+h<=g.offset+g.size)||(g.side==='right'&&x+w===level.width&&y>=g.offset&&y+h<=g.offset+g.size)||(g.side==='top'&&y===0&&x>=g.offset&&x+w<=g.offset+g.size)||(g.side==='bottom'&&y+h===level.height&&x>=g.offset&&x+w<=g.offset+g.size))))continue;
   const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy].join(','));if(cells.some(p=>occupied.has(p)))continue;before=true;if(cells.every(p=>!added.has(p)))after=true;
  }if(before&&!after)count++;
 }return count;
}
export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V+'proof')+path.sep));await fs.mkdir(out,{recursive:false});const checks=[],bindings={};
 const save=async(name,q)=>{const file=out+'/'+name+'.json',bytes=Buffer.from(JSON.stringify(q,null,2)+'\n');await fs.writeFile(file,bytes,{flag:'wx'});bindings[file]=sha(bytes);return{path:file,sha256:sha(bytes)};};
 const read=async(file,expected)=>{const bytes=await fs.readFile(file);if(expected)assert.equal(sha(bytes),expected);bindings[file]=sha(bytes);return bytes;};
 try{
  const base=fixture(),original=JSON.stringify(base),m=meter(),score=prepareMissingPortalPenalty({...base,charge:m.charge});assert.equal(score.scoreAt([0,2]),1);assert.equal(score.scoreAt([2,2]),0);assert.equal(score.scoreAt([1,3]),0);assert.equal(JSON.stringify(base),original);
  const noPresent=copy(base);noPresent.level.blocks=[];assert.equal(prepareMissingPortalPenalty({...noPresent,charge:meter().charge}).scoreAt([0,2]),0);
  checks.push({name:'newly-lost-last-entry-only-not-already-blocked-or-one-of-two',passed:true,evidence:await save('basic',{lastEntryLost:1,remainingEntry:0,alreadyBlockedNotCounted:true,inputsUnchanged:true,work:m.summary()})});

  const insert=atom('new-pink','pink',2,1),normal=atom('missing-normal','pink',2,1),star=atom('missing-star','pink',2,1,true),blue=atom('blocker','blue');
  const s={level:{width:4,height:4,gates:[gate('normal','pink','left',0,1),gate('star','pink','right',2,1,true)],blocks:[]},inventory:[insert,normal,star,blue],insertingBody:insert};
  assert.equal(prepareMissingPortalPenalty({...s,charge:meter().charge}).scoreAt([2,2]),1,'Star loses its only portal; ordinary retains the normal portal');
  s.level.blocks=[{...blue,x:0,y:0}];assert.equal(prepareMissingPortalPenalty({...s,charge:meter().charge}).scoreAt([2,2]),2,'Both distinct missing IDs lose their remaining portal');
  s.level.blocks=[{...normal,x:0,y:0}];assert.equal(prepareMissingPortalPenalty({...s,charge:meter().charge}).scoreAt([2,2]),1,'Present ID is excluded');
  checks.push({name:'same-color-and-star-eligibility-count-per-missing-identity',passed:true,evidence:await save('star',{ordinaryUsesBothGateTypes:true,starUsesOnlyStar:true,sameColorIncluded:true,alreadyPresentAndInsertingExcluded:true,twoDifferentMissingIdsCountTwice:true})});

  let cases=0,totalTransitions=0,totalMicro=0;
  for(const vertical of [false,true]){
  const inv=[atom('insert','purple'),atom('ordinary','blue',vertical?1:2,vertical?2:1),atom('star','blue',vertical?1:2,vertical?2:1,true),...Array.from({length:9},(_,i)=>atom('placed-'+i,'cyan'))],gates=[gate('n','blue',vertical?'top':'left',0,2),gate('s','blue',vertical?'bottom':'right',2,1,true)];
  for(let mask=0;mask<512;mask++){
   const blocks=[];for(let i=0;i<9;i++)if(mask&(1<<i))blocks.push({...inv[i+3],x:i%3,y:Math.floor(i/3)});
   const f={level:{width:3,height:3,gates,blocks},inventory:inv,insertingBody:inv[0]},work=meter(),prepared=prepareMissingPortalPenalty({...f,charge:work.charge});
   for(let i=0;i<9;i++)if(!(mask&(1<<i))){const p=[i%3,Math.floor(i/3)];assert.equal(prepared.scoreAt(p),oracle(f,p),'3x3 occupancy '+mask+' / '+i);cases++;}
   totalTransitions+=work.summary().transitions;totalMicro+=work.summary().micro;
  }}
  assert.equal(cases,4608);checks.push({name:'all-3x3-occupancies-and-free-single-cell-endpoints-match-cell-oracle',passed:true,evidence:await save('exhaustive-synthetic',{occupanciesPerOrientation:512,orientations:2,gateSides:['left','right','top','bottom'],endpoints:cases,maximumArea:9,maximumInventory:12,totalChargedTransitions:totalTransitions,totalChargedMicro:totalMicro,metadataCoordinateSetsOnly:true,newModels:0,newLevelSpecs:0})});

  let geometryRead=false;const unread=new Proxy({}, {get(){geometryRead=true;throw Error('geometry-read');}});assert.throws(()=>prepareMissingPortalPenalty({level:unread,inventory:[],insertingBody:{},charge:()=>{throw Error('precharge-stop');}}),/precharge-stop/);assert.equal(geometryRead,false);
  let positionRead=false,failScore=false;const work=meter(),prepared=prepareMissingPortalPenalty({...fixture(),charge:(...args)=>{if(failScore)throw Error('score-precharge-stop');work.charge(...args);}});failScore=true;const position=new Proxy([0,2],{get(t,k){positionRead=true;return t[k];}});assert.throws(()=>prepared.scoreAt(position),/score-precharge-stop/);assert.equal(positionRead,false);
  assert.throws(()=>prepareMissingPortalPenalty({...fixture(),charge:meter(10).charge}),/synthetic-coordinate-cap/);
  assert.throws(()=>score.scoreAt([0,1]),/overlaps/);assert.throws(()=>score.scoreAt([-1,2]),/Finite geometry/);
  checks.push({name:'charge-before-geometry-and-score-with-shared-cap-refusal',passed:true,evidence:await save('caps',{prepareReadsNoGeometryAfterInitialRefusal:true,scoreReadsNoPoseAfterInitialRefusal:true,midPrepareCapThrowsWithoutResult:true,invalidEndpointRejected:true,helperDoesNotCreateOrResetBudgets:true})});

  const rows=[{id:'closes',key:[0,1,-10,-8,0,0]},{id:'free-a',key:[0,0,-3,-4,1,1]},{id:'own-exit',key:[1,0,-100,-9,0,0]},{id:'free-b',key:[0,0,-3,-4,1,1]}],sortMeter=meter(),order=rows.slice().sort((a,b)=>compareMissingPortalTargetKeys(a.key,b.key,sortMeter.charge));
  assert.deepEqual(order.map(x=>x.id),['free-a','free-b','closes','own-exit']);assert.deepEqual(order.map(x=>x.id).sort(),rows.map(x=>x.id).sort());assert.equal(compareMissingPortalTargetKeys(rows[1].key,rows[3].key,meter().charge),0);
  assert.throws(()=>compareMissingPortalTargetKeys(rows[0].key,rows[1].key,meter(0).charge),/synthetic-coordinate-cap/);
  checks.push({name:'six-key-soft-ranking-preserves-all-rows-own-exit-priority-and-stable-ties',passed:true,evidence:await save('ordering',{key:['ownExitFlag','newlyClosedMissingIds','-cross','-distance','y','x'],order:order.map(x=>x.id),candidateSetUnchanged:true,unchangedScoresRetainOriginalTieBreakOrder:true,maximumScalarChargesPerComparison:7,work:sortMeter.summary()})});
  await read(SELF);await read(TEST);await read(V+'proof/reverse-star-finite-strategy-readonly-01/report.json','0863aa711f6fe53eca21c247577bd90cfeea19a7e020e14c5cccbd1b42808a75');await read(V+'proof/star-source200-actual02-construction-readonly-01/report.json','a3989105092aca2d2a6fc1489ed276f03f731fb0621533d4c58cb2bc3d0a06f0');
  for(const [file,digest]of Object.entries(bindings))assert.equal(sha(await fs.readFile(file)),digest);
  return{report:await save('report',{status:'MISSING_PORTAL_SOFT_PENALTY_METADATA_PASS',version:VERSION,errors:[],checks,fileBindings:bindings,toolBindings:{[SELF]:bindings[SELF],[TEST]:bindings[TEST]},newConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newHistoryLoads:0,newLedgerClaims:0,productionIntegrated:false,oldFilesChanged:false,charging:'Finite logical metadata work units, not CPU instructions. Every new loop item, lookup, bitset operation and scalar sort comparison is preceded by the caller shared coordinate charge. Existing pre-reservations are not refunded. Micro counts new portal anchors and scored poses.',limitations:['Soft geometry ordering only. No solvability, held path, successful reverse edge, high difficulty or improved yield is proved.','Synthetic metadata fixtures have at most 16 cells; exhaustive occupancy masks are not dynamic game worlds and no model or solver is loaded.','All target choices remain available before the unchanged finite shortlist; ordering can alter which choices that shortlist retains.','Factory integration must call the existing sticky shared session coordinateWork and retain raw10000/trans10m/micro3m/time30s plus all old full/owner/math gates.']}),checks:checks.length};
 }catch(error){await save('failed-report',{status:'MISSING_PORTAL_SOFT_PENALTY_METADATA_FAIL',error:error.stack,checks,fileBindings:bindings});throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));
