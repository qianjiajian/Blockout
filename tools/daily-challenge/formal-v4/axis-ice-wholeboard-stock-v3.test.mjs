import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {SELF,PROPOSAL,nativeWholeBoardCatalogue,createWholeBoardMeter,createAxisIceWholeBoardFactory,necessaryCoverSupport,localAxisRelease,necessaryMotifGateSupport,incrementalDomainFilter} from './axis-ice-wholeboard-stock-v3.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

const output=process.env.WHOLEBOARD_AXIS_ICE_FACTORY_TEST_OUT;assert(output,'Unique immutable private output required');await fs.mkdir(output,{recursive:false});
const sha=b=>createHash('sha256').update(b).digest('hex'),checks=[],bindings={},activity={syntheticSourceDefinitions:0,syntheticFactoryCalls:0,oracleFullTuplesCharged:0};
async function save(name,value){const p=path.join(output,name);await fs.writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});bindings[p]=sha(await fs.readFile(p));}
const bundle=await build({stdin:{contents:"export {GAME_ART} from './src/game/artManifest.ts'; export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const art=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64')),catalogue=nativeWholeBoardCatalogue(art);Object.assign(bindings,catalogue.assetBindings);for(const f of Object.keys(bundle.metafile.inputs).filter(f=>f!=='<stdin>'))bindings[f]=sha(await fs.readFile(f));
const rectangle=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
function fixture(){activity.syntheticSourceDefinitions++;return{id:997981,name:'Synthetic whole-board source',width:4,height:4,difficulty:'super',reward:0,timeSeconds:120,parMoves:40,mechanismRules:'revised-2026-09-27-v1.5',blocks:[[0,0],[2,0],[0,2],[2,2]].map(([x,y],i)=>({id:'old'+i,x,y,shape:rectangle(2,2),color:['red','blue','green','yellow'][i]})),gates:[{id:'old',color:'red',side:'top',offset:0,size:2}]};}
const gatePins={G0:{side:'left',offset:0,size:1},G1:{side:'top',offset:0,size:2},G2:{side:'right',offset:3,size:1},G3:{side:'top',offset:2,size:2},G4:{side:'right',offset:0,size:1},G5:{side:'left',offset:2,size:1},G6:{side:'right',offset:2,size:1},G7:{side:'bottom',offset:2,size:2}};
const positions=[[0,0],[0,1],[0,3],[2,1],[2,0],[0,2],[2,2],[2,3]],roleColours=['cyan','red','green','blue','orange','yellow','purple','pink'];
function recipe(){return{recipeId:'private-synthetic-wholeboard-01',sourceLevelId:997981,seed:171,colourSeed:313,authoredInventory:{bodyCount:8,shapeAreaMaximum:6,nativeOrientation:'q0-only',maximumSingleCellBodies:0,allowedRectangleDimensions:[[2,1]]},labels:{bodyPrefix:'tiny-',axisRoles:[{body:'b01',axis:'vertical',gateRole:'G1'},{body:'b02',axis:'horizontal',gateRole:'G2'},{body:'b05',axis:'horizontal',gateRole:'G5'},{body:'b07',axis:'vertical',gateRole:'G7'}],gateRoles:Array.from({length:8},(_,i)=>({id:'G'+i,allowedSides:[gatePins['G'+i].side],sizeRange:[gatePins['G'+i].size,gatePins['G'+i].size],...(i===5?{frozen:1}:i===7?{frozen:2}:{})}))},openingRelations:[{first:'b00',second:'b01',firstGateRole:'G0',firstIsInitiallyOrdinaryClear:true,secondInitiallyClearable:false,secondMoveUnitSteps:1,secondNewOccupiedCellsSubsetOfFirstFootprint:true,secondShiftMatchesActualAxis:true,secondShiftEndsAtItsOrdinaryGate:true}],redesignRequirements:{minimumSourceBodiesWhoseFootprintDisappears:2,minimumOriginalOpeningFootprintAreaChangedFraction:.5,minimumChangedPhysicalGateApertures:2},finiteLimits:{maximumFullWorlds:1,maximumCspSessions:1,maximumRestarts:0,firstFullIsTerminal:true}};}
function constraints(){return{allowExtraInitialOrdinaryContacts:true,gatePins:structuredClone(gatePins),roleColours:[...roleColours],bodyPins:Object.fromEntries(positions.map(([x,y],i)=>['b'+String(i).padStart(2,'0'),{x,y,dimensions:[2,1],gateRoles:['G'+i]}]))};}
const future=[{reason:'static-audit',worlds:16,transitions:16,micro:0},{reason:'spatial-compile',worlds:16,transitions:32,micro:8},{reason:'dual-replay',worlds:40,transitions:40,micro:12},{reason:'terminal-guard',worlds:1,transitions:1,micro:0}];
function run({source=fixture(),r=recipe(),q=constraints(),limits={},now=Date.now,prepay=future}={}){const meter=createWholeBoardMeter({qualificationOnly:true,limits,now}),f=createAxisIceWholeBoardFactory(source,r,catalogue,meter,{qualificationOnly:true,qualificationConstraints:q,futureReservations:prepay});activity.syntheticFactoryCalls++;return{meter,f,result:f.constructOnce()};}
function sane(result){assert.equal(result.constructionAccounting.placeholderWorlds,0);for(const k of ['newModels','newSearches','newReplays','newClaims'])assert.equal(result.constructionAccounting[k],0);const a=result.accounting;assert(a.worlds<=a.limits.maxWorlds&&a.transitions<=a.limits.maxTransitions&&a.micro<=a.limits.maxMicroStates&&a.partialNodes<=a.limits.maxPartialNodes);assert.equal(a.partialNodes,Object.values(result.constructionAccounting.partialAssignmentCount).reduce((a,b)=>a+b,0));}

test('first actual object already has all four axes, ice and local release; reservations precede its hash',async()=>{
 const {meter,f,result:q}=run();assert(q.found,JSON.stringify(q));sane(q);assert.equal(q.status,'FIRST_FULL_AXIS_ICE_TERMINAL');assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.level.blocks.length,8);assert.equal(q.level.blocks.filter(b=>b.movementAxis==='horizontal').length,2);assert.equal(q.level.blocks.filter(b=>b.movementAxis==='vertical').length,2);assert.deepEqual(q.level.gates.filter(g=>g.frozen).map(g=>g.frozen).sort(),[1,2]);assert.equal(q.accounting.worlds,74);assert.deepEqual(q.firstFullReceipt.prepaidPhases,future);assert.equal(q.firstFullReceipt.firstFullWorlds,1);assert(q.firstFullReceipt.openingRelation.necessaryLocalGeometryOnly);assert.equal(q.firstFullReceipt.openingRelation.completeRouteProven,false);assert.throws(()=>f.constructOnce(),/terminal/);
 meter.reserve({worlds:11,transitions:2,micro:3},'synthetic-joint-prepayment');assert.equal(meter.report().worlds,85);assert.equal(q.accounting.worlds,74,'Returned frozen construction accounting must not mutate');assert.throws(()=>{q.level.blocks[0].color='red';});
 await save('first-full.json',{q,afterJointReservation:meter.report()});checks.push({name:'first-full-mechanisms-reservations-shared-meter',pass:true});
});

test('finite zero-full cases and resource caps preserve counters and cannot reenter',async()=>{
 const rows=[];for(const limits of [{maxPartialNodes:1},{maxTransitions:1},{maxMicroStates:1},{maxWorlds:73}]){const s=run({limits});assert.equal(s.result.found,false);assert.equal(s.result.level,null);assert.equal(s.result.accounting.worlds,0);sane(s.result);assert.throws(()=>s.f.constructOnce());rows.push(s.result);}
 let clock=0;const meter=createWholeBoardMeter({qualificationOnly:true,limits:{maxMilliseconds:10},now:()=>clock}),f=createAxisIceWholeBoardFactory(fixture(),recipe(),catalogue,meter,{qualificationOnly:true,qualificationConstraints:constraints(),futureReservations:future});meter.guard();clock=10;activity.syntheticFactoryCalls++;const late=f.constructOnce();assert.equal(late.reason,'wholeboard-deadline');assert.equal(late.accounting.worlds,0);assert.throws(()=>f.constructOnce());rows.push(late);
 const q=constraints();q.bodyPins.b04={...q.bodyPins.b04,x:0,y:2};const no=run({q});assert.equal(no.result.status,'FINITE_JOINT_DOMAIN_EXHAUSTED');assert(!no.result.found);assert.equal(no.result.accounting.worlds,0);assert.throws(()=>no.f.constructOnce());rows.push(no.result);
 await save('no-full-terminals.json',{rows});checks.push({name:'no-full-cap-exhaustion-no-reentry',pass:true,cases:rows.length});
});

test('post-full deadline preserves original complete identity, prepaid phases and no fallback leaf',async()=>{
 let calls=0;const reference=run({now:()=>{calls++;return 0;},limits:{maxMilliseconds:10}});assert(reference.result.found);const totalCalls=calls;let seen=0;const late=run({now:()=>++seen>=totalCalls?10:0,limits:{maxMilliseconds:10}});assert(late.result.found);assert.equal(late.result.reason,'wholeboard-deadline');assert.equal(late.result.levelSha256,reference.result.levelSha256);assert.equal(late.result.accounting.worlds,74);assert.equal(late.result.constructionAccounting.firstFullWorlds,1);assert.throws(()=>late.f.constructOnce());assert.throws(()=>late.meter.reserve({worlds:1},'late-reserve'));
 await save('formed-full-deadline.json',{reference:reference.result,late:late.result,totalCalls});checks.push({name:'formed-full-terminal-preserves-identity',pass:true});
});

test('a charged complete object survives a local-check transition cap after materialization',async()=>{
 const base=run(),limited=run({limits:{maxTransitions:base.result.accounting.transitions-1}});assert(base.result.found&&limited.result.found);assert.equal(limited.result.reason,'wholeboard-transitions-cap');assert.equal(limited.result.levelSha256,base.result.levelSha256);assert.equal(limited.result.firstFullReceipt.levelSha256,limited.result.levelSha256);assert.equal(limited.result.accounting.worlds,74);assert.equal(limited.result.constructionAccounting.firstFullWorlds,1);assert.throws(()=>limited.f.constructOnce());
 await save('formed-full-transition-cap.json',{base:base.result,limited:limited.result});checks.push({name:'post-materialization-coordinate-cap-preserves-full',pass:true});
});

test('all tiny mask support cases agree with naive exact-cover existence and debit each visited cell',async()=>{
 const meter=createWholeBoardMeter({qualificationOnly:true}),start=meter.report();let cases=0,rejected=0;
 for(let x=1;x<8;x++)for(let y=1;y<8;y++)for(let z=1;z<8;z++){const ds=[x,y,z].map(bits=>[1,2,4].filter(m=>bits&m).map(m=>({mask:BigInt(m)}))),possible=ds[0].some(a=>ds[1].some(b=>ds[2].some(c=>!(a.mask&b.mask)&&!(a.mask&c.mask)&&!(b.mask&c.mask)&&(a.mask|b.mask|c.mask)===7n)));const pass=necessaryCoverSupport([],ds.map(options=>({options})),3,meter);if(!pass){assert(!possible);rejected++;}cases++;}
 const a=meter.report();assert.equal(a.worlds,0);assert.equal(a.transitions,Object.values(a.kinds).reduce((n,k)=>n+(k.transitions??0),0));assert.equal(start.transitions,0);
 await save('coverage-necessary.json',{cases,rejected,accounting:a,completeWorlds:0});checks.push({name:'necessary-cover-tiny-naive-equivalence',pass:true,cases});
});

test('complete tiny joint solutions agree with an independent labelled-tuple oracle and coverage toggle',async()=>{
 // Four final colour tuples only. Every oracle tuple is explicitly charged
 // before reading its complete body colours, including both rejected tuples.
 const q=constraints();q.bodyPins.b03.gateRoles=['G3','G6'];q.bodyPins.b06.gateRoles=['G3','G6'];const solutions=[];
 for(const a of [3,6])for(const b of [3,6]){activity.oracleFullTuplesCharged++;const roles=[0,1,2,a,4,5,b,7];if(new Set(roles).size!==8)continue;let adjacentEqual=false;for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){const [x,y]=positions[i],[xx,yy]=positions[j];if(roles[i]===roles[j]&&((Math.abs(x-xx)===2&&y===yy)||(x===xx&&Math.abs(y-yy)===1)))adjacentEqual=true;}if(!adjacentEqual)solutions.push(roles.map(i=>roleColours[i]));}
 assert.equal(solutions.length,2);const enabled=run({q}),disabled=run({q:{...q,coverageSupport:false}});assert(enabled.result.found&&disabled.result.found);assert.equal(enabled.result.levelSha256,disabled.result.levelSha256);assert(solutions.some(cs=>JSON.stringify(cs)===JSON.stringify(enabled.result.level.blocks.map(b=>b.color))));
 await save('joint-naive-oracle.json',{oracleFullTuplesCharged:4,solutions,enabled:enabled.result,disabled:disabled.result});checks.push({name:'joint-tuple-oracle-and-first-full-equivalence',pass:true,oracleFullTuplesCharged:4});
});

test('local opening relation rejects premature, frozen, wrong-axis and unsupported swept-strip motifs',async()=>{
 const meter=createWholeBoardMeter({qualificationOnly:true}),a={x:0,y:0,w:2,h:1,mask:3n},b={x:0,y:1,w:2,h:1,mask:48n,axis:'vertical'},ga={side:'left',offset:0,size:1},gb={side:'top',offset:0,size:2};assert(localAxisRelease(a,b,ga,gb,4,4,meter));
 const rows=[[a,b,{...ga,frozen:1},gb],[a,b,ga,{...gb,frozen:1}],[a,{...b,axis:'horizontal'},ga,gb],[{...a,mask:1n},b,ga,gb],[a,{...b,y:0,mask:3n},ga,gb]];for(const row of rows)assert.equal(localAxisRelease(...row,4,4,meter),null);assert.equal(meter.report().worlds,0);
 await save('local-opening-rejections.json',{rejected:rows.length,accounting:meter.report(),noDeletedBodyWorld:true});checks.push({name:'local-opening-motif-is-partial-only',pass:true,rejected:rows.length});
});

test('joint partial inventory rejects ice thresholds needing unavailable earlier clear events',async()=>{
 const r=recipe();r.labels.gateRoles.find(g=>g.id==='G5').frozen=7;r.labels.gateRoles.find(g=>g.id==='G7').frozen=7;const s=run({r});assert.equal(s.result.found,false);assert.equal(s.result.status,'FINITE_JOINT_DOMAIN_EXHAUSTED');assert(s.result.constructionAccounting.pruneCounts['ice-clear-inventory-bound']>0);assert.equal(s.result.accounting.worlds,0);assert(s.result.accounting.kinds['ice-capacity-option'].transitions>0);assert.throws(()=>s.f.constructOnce());
 await save('ice-inventory-impossibility.json',{q:s.result,ordinaryBodies:6,requiredEarlierClearEvents:7,necessaryOnly:true});checks.push({name:'ice-clear-inventory-necessary-bound',pass:true});
});

test('ordinary axes cannot start already clearable with zero movement; frozen axis contacts remain admitted',async()=>{
 const good=run();assert(good.result.found);assert(good.result.constructionAccounting.domainDesignChoices.ordinaryAxisInitialExitContactExcluded);const q=constraints();q.bodyPins.b02.x=2;const bad=run({q});assert(!bad.result.found);assert(bad.result.constructionAccounting.pruneCounts['empty-initial-domain']>0);assert.equal(bad.result.accounting.worlds,0);assert(good.result.level.blocks.find(b=>b.id==='tiny-b05').movementAxis==='horizontal');
 await save('ordinary-axis-contact-design-choice.json',{good:good.result,bad:bad.result,actualParticipationNotClaimed:true});checks.push({name:'ordinary-axis-contact-choice',pass:true});
});

test('production declaration can be checked without any real-domain compilation; tiny cannot admit a real source',async()=>{
 const raw=await fs.readFile(PROPOSAL.path);assert.equal(sha(raw),PROPOSAL.sha256);bindings[PROPOSAL.path]=sha(raw);const p=JSON.parse(raw),sourceRows=[];
 const sourcePath=p.recipes[0].source.catalogue.path,sourceBytes=await fs.readFile(sourcePath);assert.equal(sha(sourceBytes),p.recipes[0].source.catalogue.sha256);bindings[sourcePath]=sha(sourceBytes);const cat=JSON.parse(sourceBytes);
 // Read only schema keys here. Authentic recipe/source loading remains task
 // owned; qualification never calls constructOnce for these IDs.
 for(const r of p.recipes){assert([100,118,29].includes(r.sourceLevelId));assert.equal(r.labels.axisRoles.length,4);assert.equal(r.labels.gateRoles.filter(g=>g.frozen).length,2);const source=cat.rows.find(x=>x.sourceLevelId===r.sourceLevelId).level,meter=createWholeBoardMeter(),f=createAxisIceWholeBoardFactory(source,r,catalogue,meter,{futureReservations:[{reason:'static-audit',worlds:16},{reason:'spatial-compile',worlds:16},{reason:'dual-replay',worlds:r.proposedWholeWorldBudget.dualReplayReservation},{reason:'terminal-guard',worlds:1}]});assert.equal(f.report().accounting.partialNodes,0);assert.equal(f.report().accounting.transitions,0);assert.equal(f.report().accounting.micro,0);assert.equal(f.report().accounting.worlds,0);assert.equal(f.report().accounting.started,false);sourceRows.push({sourceLevelId:r.sourceLevelId,bodyCount:r.authoredInventory.bodyCount,levelSha256:r.source.levelSha256,recipeSha256:levelSha256(r),accounting:f.report().accounting});}
 const fake=fixture();fake.id=100;const r=recipe();r.sourceLevelId=100;const m=createWholeBoardMeter({qualificationOnly:true});assert.throws(()=>createAxisIceWholeBoardFactory(fake,r,catalogue,m,{qualificationOnly:true,qualificationConstraints:constraints()}),/Tiny/);assert.equal(m.report().transitions,0);
 assert.throws(()=>createAxisIceWholeBoardFactory(fixture(),recipe(),{shapes:catalogue.shapes},createWholeBoardMeter({qualificationOnly:true}),{qualificationOnly:true}));assert.throws(()=>createWholeBoardMeter({now:()=>0}));assert.throws(()=>createWholeBoardMeter({limits:{maxWorlds:10001}}));
 await save('production-metadata-only.json',{sourceRows,sourceCatalogueType:Array.isArray(cat)?'array':typeof cat,realDomainCalls:0,metadataAccounting:m.report()});checks.push({name:'production-descriptors-tiny-isolation',pass:true});
});


test('early gate-pair necessary pruning is one-way sound for every tiny rectangle and aperture pair',async()=>{
 const dims=[[1,1],[1,2],[2,1],[1,3],[3,1],[2,2],[2,3],[3,2],[4,1]],rows=[];
 const touch=(a,g,W,H)=>g.side==='left'?a.x===0&&a.y>=g.offset&&a.y+a.h<=g.offset+g.size:g.side==='right'?a.x+a.w===W&&a.y>=g.offset&&a.y+a.h<=g.offset+g.size:g.side==='top'?a.y===0&&a.x>=g.offset&&a.x+a.w<=g.offset+g.size:a.y+a.h===H&&a.x>=g.offset&&a.x+a.w<=g.offset+g.size;
 for(let W=1;W<=4;W++)for(let H=1;H<=4;H++){
  const meter=createWholeBoardMeter({qualificationOnly:true}),shapes=dims.filter(([w,h])=>w<=W&&h<=H).map(([w,h])=>({w,h,colours:['red','blue']})),bodies=[],gates=[];
  // Only independent rectangle fragments: no LevelSpec, completed board,
  // deleted-body world, model or route is created by this geometric oracle.
  for(const s of shapes)for(let y=0;y+s.h<=H;y++)for(let x=0;x+s.w<=W;x++){let mask=0n;for(let yy=0;yy<s.h;yy++)for(let xx=0;xx<s.w;xx++)mask|=1n<<BigInt((y+yy)*W+x+xx);bodies.push({...s,x,y,mask});}
  for(const side of ['left','right','top','bottom']){const n=['left','right'].includes(side)?H:W;for(let size=1;size<=Math.min(3,n);size++)for(let offset=0;offset+size<=n;offset++)gates.push({side,size,offset});}
  let pairs=0,rejected=0,localChecks=0,localPositive=0,positivePairs=0;
  for(const aa of gates)for(const bb of gates){
   if(aa.side===bb.side&&Math.max(aa.offset,bb.offset)<Math.min(aa.offset+aa.size,bb.offset+bb.size))continue;
   pairs++;const ga={...aa,color:'red'},gb={...bb,color:'blue'},axis=['left','right'].includes(gb.side)?'horizontal':'vertical',pass=necessaryMotifGateSupport(ga,gb,axis,W,H,shapes,meter);if(!pass)rejected++;
   const aOptions=bodies.filter(a=>touch(a,ga,W,H)),bOptions=bodies.filter(b=>{const dx=gb.side==='left'?-1:gb.side==='right'?1:0,dy=gb.side==='top'?-1:gb.side==='bottom'?1:0;return !touch(b,gb,W,H)&&touch({...b,x:b.x+dx,y:b.y+dy},gb,W,H);});let any=false;
   for(const a of aOptions)for(const b of bOptions){localChecks++;const release=localAxisRelease(a,{...b,axis},ga,gb,W,H,meter);if(!release)continue;any=true;localPositive++;assert(pass,'Necessary gate pruning rejected a true local release');
    // Singleton per-colour native support catches width/height mixups which
    // an oversized catalogue could otherwise hide in the gate-pair test.
    assert(necessaryMotifGateSupport(ga,gb,axis,W,H,[{w:a.w,h:a.h,colours:['red']},{w:b.w,h:b.h,colours:['blue']}],meter));
   }if(any)positivePairs++;
  }
  assert.equal(meter.report().worlds,0);assert.equal(meter.report().micro,0);assert.equal(meter.report().transitions,Object.values(meter.report().kinds).reduce((n,v)=>n+(v.transitions??0),0));rows.push({W,H,pairs,rejected,localChecks,localPositive,positivePairs,accounting:meter.report()});
 }
 assert(rows.some(r=>r.localPositive>0));await save('motif-gate-pair-tiny-soundness.json',{rows,direction:'Every actual localAxisRelease implies necessary gate support; no sufficiency or complete-level existence claim.',newCompleteWorlds:0});checks.push({name:'all-small-gate-pairs-one-way-native-support-soundness',pass:true,boards:rows.length,pairs:rows.reduce((n,r)=>n+r.pairs,0),localPositive:rows.reduce((n,r)=>n+r.localPositive,0)});
});

test('motif gate pair is selected before other gates and fails without compiling any body domain',async()=>{
 const q=constraints();q.gatePins.G1.offset=2;q.gatePins.G3.offset=0;const s=run({q});assert.equal(s.result.status,'FINITE_JOINT_DOMAIN_EXHAUSTED');assert.equal(s.result.found,false);assert.equal(s.result.accounting.worlds,0);assert.equal(s.result.accounting.micro,0);assert.deepEqual(s.result.constructionAccounting.domainCounts,[]);assert.equal(s.result.constructionAccounting.partialAssignmentCount.body,0);assert.equal(s.result.constructionAccounting.partialAssignmentCount.gate,3);assert.equal(s.result.constructionAccounting.pruneCounts['motif-gate-necessary'],1);assert.deepEqual(s.result.constructionAccounting.domainDesignChoices.motifGateOrder,['G1','G0']);assert.equal(s.result.accounting.kinds['motif-gate-pair-call'].transitions,1);assert.throws(()=>s.f.constructOnce());
 await save('early-motif-pair-no-body-domain.json',{q:s.result,completeWorlds:0});checks.push({name:'motif-pair-first-and-before-body-domains',pass:true});
});

test('D3 production-domain choice admits only A at an ordinary gate; explicit tiny bypass never applies in production',async()=>{
 const r=recipe();r.targetDifficulty=3;const oldPinned=run({r});assert(oldPinned.result.found);assert.equal(oldPinned.result.constructionAccounting.domainDesignChoices.extraOrdinaryContactQualificationBypass,true);assert.equal(oldPinned.result.constructionAccounting.domainDesignChoices.onlyMotifInitiallyOrdinaryClearable,false);
 const q=constraints();delete q.allowExtraInitialOrdinaryContacts;const strict=run({r,q});assert.equal(strict.result.found,false);assert.equal(strict.result.status,'FINITE_JOINT_DOMAIN_EXHAUSTED');assert.equal(strict.result.accounting.worlds,0);assert.equal(strict.result.constructionAccounting.domainDesignChoices.onlyMotifInitiallyOrdinaryClearable,true);assert.equal(strict.result.constructionAccounting.domainDesignChoices.extraOrdinaryContactQualificationBypass,false);assert(strict.result.constructionAccounting.pruneCounts['non-motif-initial-ordinary-contact']>0);const choices=strict.result.constructionAccounting.domainCounts[0].choices;assert(choices[0]>0,'A remains allowed');assert(choices[1]>0,'B one-unit inset remains allowed');assert(choices[5]>0&&choices[7]>0,'Frozen contacts remain allowed');assert.equal(choices[4],0,'Ordinary non-axis body already at its gate is rejected');
 const bytes=await fs.readFile(PROPOSAL.path),p=JSON.parse(bytes),cat=JSON.parse(await fs.readFile(p.recipes[0].source.catalogue.path)),pr=p.recipes[0],src=cat.rows.find(x=>x.sourceLevelId===pr.sourceLevelId).level,m=createWholeBoardMeter();assert.throws(()=>createAxisIceWholeBoardFactory(src,pr,catalogue,m,{qualificationConstraints:{allowExtraInitialOrdinaryContacts:true}}));assert.throws(()=>createAxisIceWholeBoardFactory(src,pr,catalogue,m,{qualificationConstraints:{incrementalDomains:false}}));assert.equal(m.report().transitions,0);assert.equal(m.report().worlds,0);
 await save('d3-unique-ordinary-opening-domain-choice.json',{legacyTiny:oldPinned.result,strict:strict.result,productionBypassRejected:true,realDomainCalls:0,notDifficultyEvidence:true});checks.push({name:'d3-unique-opening-explicit-tiny-only-bypass',pass:true});
});


test('incremental filtering retains exactly the naive chosen-set domain, including reverse label order',async()=>{
 const W=3,H=3,options=[];for(const [w,h]of [[1,1],[2,1],[1,2]])for(let y=0;y+h<=H;y++)for(let x=0;x+w<=W;x++)for(const color of ['red','blue']){let mask=0n;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)mask|=1n<<BigInt((y+yy)*W+x+xx);options.push({x,y,w,h,color,mask,symmetryKey:[y*W+x,w,h,color].join(':')});}
 const near=(a,b)=>((a.x+a.w===b.x||b.x+b.w===a.x)&&Math.max(a.y,b.y)<Math.min(a.y+a.h,b.y+b.h))||((a.y+a.h===b.y||b.y+b.h===a.y)&&Math.max(a.x,b.x)<Math.min(a.x+a.w,b.x+b.w));
 const compatible=(a,b)=>!(a.mask&b.mask)&&!(a.color===b.color&&near(a,b));const meter=createWholeBoardMeter({qualificationOnly:true});let cases=0,nonempty=0;
 for(const labelOrder of [[1,5],[5,1],[1,2]])for(const a of options)for(const b of options){if(!compatible(a,b))continue;let incremental=options;const placed=[];
  for(const [k,p]of [a,b].entries()){const j=labelOrder[k];placed.push({j,p});incremental=incrementalDomainFilter(incremental,p,meter,{ordinaryOrder:j<3?1:-1});const naive=options.filter(v=>placed.every(({j,p})=>compatible(v,p)&&(j<3?v.symmetryKey>p.symmetryKey:v.symmetryKey<p.symmetryKey)));assert.deepEqual(incremental,naive);cases++;nonempty+=Number(incremental.length>0);}
 }
 assert(cases>0&&nonempty>0);assert.equal(meter.report().worlds,0);assert.equal(meter.report().transitions,Object.values(meter.report().kinds).reduce((n,k)=>n+(k.transitions??0),0));await save('incremental-naive-domain-equivalence.json',{cases,nonempty,coordinateFragmentsOnly:true,completeBoards:0,accounting:meter.report()});checks.push({name:'incremental-naive-domain-equivalence-forward-reverse-labels',pass:true,cases});
});

test('unpinned ordinary domains share compilation/filter/OR while same-order naive construction reaches the same first full',async()=>{
 const q=constraints();delete q.bodyPins.b03;delete q.bodyPins.b06;const fast=run({q}),slow=run({q:{...q,incrementalDomains:false}});assert(fast.result.found,JSON.stringify(fast.result));assert(slow.result.found,JSON.stringify(slow.result));sane(fast.result);sane(slow.result);assert.equal(fast.result.levelSha256,slow.result.levelSha256,'Same v3 compiled/ranked domains must have the same first full');assert.equal(fast.result.constructionAccounting.domainReuse.ordinaryCompilationReferences,1);assert(fast.result.constructionAccounting.domainReuse.incrementalReferences>0);assert(fast.result.accounting.kinds['cover-domain-reuse'].transitions>0);assert(fast.result.accounting.kinds['colour-domain-reuse'].transitions>0);assert(fast.result.accounting.kinds['body-pair'].transitions<slow.result.accounting.kinds['body-pair'].transitions);assert(fast.result.accounting.kinds['area-domain-option'].transitions>0);assert(fast.result.accounting.kinds['area-domain-reuse'].transitions>0);assert.equal(fast.result.accounting.kinds['area-variable-reference'].transitions,fast.result.accounting.kinds['incremental-child-domain-reference'].transitions,'Area contribution remains per label');assert.equal(fast.result.accounting.kinds['selected-scalar-body'].transitions,fast.result.accounting.kinds['selected-body-reference'].transitions);assert.equal(slow.result.constructionAccounting.optimizationChoices.qualificationNaiveReference,true);assert.equal(fast.result.constructionAccounting.optimizationChoices.qualificationNaiveReference,false);
 const pinned=JSON.parse(await fs.readFile(path.join(output,'first-full.json'))).q;assert.equal(pinned.constructionAccounting.domainReuse.ordinaryCompilationReferences,0,'Pinned ordinary labels must not share compilation');assert.equal(pinned.constructionAccounting.domainReuse.incrementalReferences,0,'Distinct pinned arrays must not share filtering');
 await save('ordinary-shared-domain-naive-first-full.json',{fast:fast.result,slow:slow.result,pinnedEvidence:'first-full.json',scope:'Same v3 rank order only; no v2 first-full equivalence or production performance claim.'});checks.push({name:'shared-ordinary-pins-isolation-and-naive-first-full',pass:true});
});

test.after(async()=>{
 const toolBundle=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const f of Object.keys(toolBundle.metafile.inputs))toolBindings[f]=sha(await fs.readFile(f));Object.assign(bindings,toolBindings);const testFile='tools/daily-challenge/formal-v4/axis-ice-wholeboard-stock-v3.test.mjs';bindings[testFile]=sha(await fs.readFile(testFile));
 await save('report.json',{status:checks.length===15?'WHOLEBOARD_AXIS_ICE_FACTORY_TINY_PASS':'WHOLEBOARD_AXIS_ICE_FACTORY_TINY_INCOMPLETE',checks,activity,toolBindings,fileBindings:{...bindings},newRealDomains:0,newRealConstructions:0,newRealModels:0,newReplays:0,newSearches:0,newClaims:0,productionQualified:false,syntheticOnly:true});
});
