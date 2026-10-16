import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../daily-challenge/formal-v2/contract.mjs';
import {summarizeInventory,LEAGUE_MECHANISM_UNLOCKS} from './mechanism-policy.mjs';
import {boardMaskKey,partitionKey,DIVERSITY_POLICY} from './diversity-contract.mjs';

const root='deliverables/league-v2-20261008',selectionFile=`${root}/selection/index-010.json`,baselineFile=`${root}/mechanisms/old-formal100-mechanisms.json`;
const out=`${root}/reporting/design-strength-100.json`,read=f=>JSON.parse(fs.readFileSync(f)),fileSha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const selected=read(selectionFile).selections,baseline=read(baselineFile),bindings={[selectionFile]:fileSha(selectionFile),[baselineFile]:fileSha(baselineFile)};
assert.equal(selected.length,100);assert.deepEqual(selected.map(s=>s.index).sort((a,b)=>a-b),Array.from({length:100},(_,i)=>i+1));
const stats=values=>({count:values.length,sum:values.reduce((a,b)=>a+b,0),minimum:values.length?Math.min(...values):null,maximum:values.length?Math.max(...values):null,mean:values.length?Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(6)):null});
const rectangle=shape=>{const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);return new Set(shape.map(p=>p.join(','))).size===shape.length&&shape.length===(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1);};
const sumInstances=inventory=>Object.values(inventory).reduce((n,v)=>n+v.instances,0),rows=[];
for(const s of [...selected].sort((a,b)=>a.index-b.index)){
 const p=read(s.proofFile),m=read(s.mechanismFile),old=baseline.rows.find(r=>r.index===s.index),level=p.level,drags=p.drags;
 bindings[s.proofFile]=fileSha(s.proofFile);bindings[s.mechanismFile]=fileSha(s.mechanismFile);
 assert(p.accepted,`unaccepted proof ${s.index}`);assert(m.ok,`unaccepted mechanism receipt ${s.index}`);
 assert.equal(p.levelSha256,levelSha256(level));assert.equal(m.levelSha256,p.levelSha256);assert.equal(levelSha256(m.level),p.levelSha256);
 assert.equal(p.routeSha256,routeSha256(drags));assert.equal(m.routeSha256,p.routeSha256);assert.equal(routeSha256(m.drags),p.routeSha256);
 assert(p.route.canonicalReplay.valid&&p.route.canonicalReplay.complete&&p.route.independentReplay.valid&&p.route.independentReplay.complete);
 assert(m.participation.passed&&m.structure.passed);
 const current=summarizeInventory(level),previousTotal=sumInstances(old.inventory),currentTotal=sumInstances(current),lower=p.lowerBound.result,upper=p.route.search;
 assert(Number.isSafeInteger(lower.rawFullBoardStates)&&lower.rawFullBoardStates>0&&lower.rawFullBoardStates<=10000);
 assert.equal(lower.rawFullBoardStates,lower.discoveredStates);
 if(upper)assert(Number.isSafeInteger(upper.rawFullBoardStates)&&upper.rawFullBoardStates<=10000);
 const superHard=s.index%5===3,lowerFloor=superHard?21:16,upperCeiling=superHard?30:20;
 assert(p.L>=lowerFloor&&p.L<=p.U&&p.U<=upperCeiling);assert.equal(level.difficulty,superHard?'super':'hard');
 const scoring=p.scoring,specials=p.specials;assert(scoring.passed&&specials.length>=1&&specials.length<=3&&new Set(specials).size===specials.length);
 assert.equal(scoring.successPoints,10*specials.length);assert.equal(scoring.failurePoints,0);assert.equal(scoring.discardPoints,0);
 const badges=scoring.selected.map(b=>({blockId:b.blockId,dragIndex:b.dragIndex,routeFraction:b.dragIndex/drags.length,rectangular:rectangle(level.blocks.find(x=>x.id===b.blockId).shape),openingCanExit:b.opening.canExit}));
 assert.equal(badges.length,specials.length);assert(badges.every(b=>specials.includes(b.blockId)&&b.rectangular&&b.openingCanExit===false&&b.dragIndex>drags.length/2));
 const blocked=new Set((level.blocked??[]).map(p=>p.join(','))),playable=(level.playable??Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)])).filter(p=>!blocked.has(p.join(',')));
 rows.push({index:s.index,levelSha256:p.levelSha256,routeSha256:p.routeSha256,sourceLevelId:p.sourceLevelId,sourceLevelSha256:p.sourceLevelSha256,
  evidence:{proofFile:s.proofFile,mechanismFile:s.mechanismFile,proofStatus:p.status,mechanismStatus:m.status,modelAccepted:true,allMechanismsParticipate:true,pointerApprovalClaimedByThisReport:false},
  strength:{oldTotal:previousTotal,newTotal:currentTotal,delta:currentTotal-previousTotal,old:old.inventory,new:current,counters:Object.fromEntries(Object.keys(current).map(k=>[k,{old:stats(old.inventory[k].values),new:stats(current[k].values)}])),foundationExemption:s.index<=5,capacityException:m.comparison.capacityException??null,capacityAdaptation:m.plan.capacityAdaptation??null},
  mechanisms:m.structure.mechanisms,primary:m.plan.primary,
  difficulty:{label:level.difficulty,L:p.L,U:p.U,floor:lowerFloor,ceiling:upperCeiling,bandVerified:true,totalDrags:drags.length,exactWithinBounds:p.L===p.U,lowerMethod:p.lowerBound.method,
   lowerSearch:{rawFullBoardStates:lower.rawFullBoardStates,quotientStates:lower.quotientDiscoveredStates,exploredStates:lower.exploredStates,microStates:lower.microDiscoveredStates,termination:lower.termination,maxStates:lower.budget.maxStates},
   finalUpperSearch:upper?{invoked:true,rawFullBoardStates:upper.rawFullBoardStates,termination:upper.termination}:{invoked:false,rawFullBoardStates:0,method:'provided complete route; canonical and independent replays, not a new upper search'}},
  scoring:{badgeCount:specials.length,pointsPerBadge:10,successPoints:scoring.successPoints,failurePoints:0,discardPoints:0,allRectangular:true,allBlockedFromOpeningExit:true,allRemovedAfterRouteHalfway:true,badges},
  board:{width:level.width,height:level.height,playableCells:playable.length,kind:playable.length===level.width*level.height?'rectangle':'irregular',d4MaskKey:boardMaskKey(level),d4PartitionKey:partitionKey(level),bodyInventory:level.blocks.length},
  sourceAdaptation:p.sourceAdaptation??null});
}
const totals={};
for(const type of Object.keys(rows[0].strength.new)){
 const oldValues=rows.flatMap(r=>r.strength.old[type].values),newValues=rows.flatMap(r=>r.strength.new[type].values);
 const oldCount=rows.reduce((n,r)=>n+r.strength.old[type].instances,0),newCount=rows.reduce((n,r)=>n+r.strength.new[type].instances,0);
 totals[type]={oldInstances:oldCount,newInstances:newCount,delta:newCount-oldCount,oldLevels:rows.filter(r=>r.strength.old[type].instances>0).length,newLevels:rows.filter(r=>r.strength.new[type].instances>0).length,oldCounters:stats(oldValues),newCounters:stats(newValues),newQueueInventory:stats(rows.flatMap(r=>r.strength.new[type].inventory)),newLayerInventory:stats(rows.flatMap(r=>r.strength.new[type].layers))};
}
const coverage=Object.entries(LEAGUE_MECHANISM_UNLOCKS).map(([mechanism,unlock])=>{const used=rows.filter(r=>r.mechanisms.includes(mechanism)).map(r=>r.index);return {mechanism,requiredFirstUnlock:unlock,actualFirstAppearance:used[0]??null,levelCount:used.length,levels:used,beforeUnlock:used.filter(i=>i<unlock),appearsOnUnlock:used.includes(unlock)};});
assert(coverage.every(r=>r.beforeUnlock.length===0&&r.appearsOnUnlock));
const group=(key)=>{const result={};for(const row of rows){const value=key(row);(result[value]??=[]).push(row.index);}return result;};
const sources=group(r=>r.sourceLevelId),masks=group(r=>r.board.d4MaskKey),dimensions=group(r=>`${r.board.width}x${r.board.height}`),badgeCounts=group(r=>r.scoring.badgeCount),scoreValues=group(r=>r.scoring.successPoints);
const rawMaximum=Math.max(...rows.map(r=>r.difficulty.lowerSearch.rawFullBoardStates)),oldTotal=rows.reduce((n,r)=>n+r.strength.oldTotal,0),newTotal=rows.reduce((n,r)=>n+r.strength.newTotal,0);
const summary={schemaVersion:1,status:'FULL_100_MODEL_DESIGN_STRENGTH_SUMMARY_POINTER_ACCEPTANCE_NOT_CLAIMED',ruleVersion:'1.155.0',selection:selectionFile,generatedAt:new Date().toISOString(),productionChanged:false,levelDataChanged:false,searchInvocations:0,formalReady:false,pointerValidated:false,naturalClockValidated:false,
 scope:'Read-only aggregation of the exact100 selected final model proofs and mechanism receipts. Does not perform or substitute full catalog visual review, formal Pointer/natural-clock runs, production adoption or player-save verification.',
 verification:{selectedCount:100,uniqueIndices:100,allAcceptedAndSameLevelRouteBindings:true,allCompleteCanonicalAndIndependentRoutes:true,allMechanismParticipation:true,allBandsAndRawCaps:true,allScoringChecks:true,firstUnlocksMatch:true,fullBoardSearchStateCap:10000},
 strength:{oldTotal,newTotal,delta:newTotal-oldTotal,increasePercent:Number(((newTotal/oldTotal-1)*100).toFixed(4)),byMechanism:totals,
  perSlot:{increased:rows.filter(r=>r.strength.delta>0).map(r=>r.index),unchanged:rows.filter(r=>r.strength.delta===0).map(r=>r.index),decreased:rows.filter(r=>r.strength.delta<0).map(r=>r.index),capacityExceptionSlots:rows.filter(r=>r.strength.capacityException).map(r=>r.index)},
  countingPolicy:'Each actual device/body mechanism instance counts once. Cargo inventory and layers are separate descriptive values, never extra devices. Counters for different mechanism types are reported separately; sums do not replace difficulty proofs.'},
 coverage,
 difficulty:{rhythm:['hard','hard','super','hard','hard'],hardCount:rows.filter(r=>r.difficulty.label==='hard').length,superCount:rows.filter(r=>r.difficulty.label==='super').length,L:stats(rows.map(r=>r.difficulty.L)),U:stats(rows.map(r=>r.difficulty.U)),hardURange:stats(rows.filter(r=>r.difficulty.label==='hard').map(r=>r.difficulty.U)),superURange:stats(rows.filter(r=>r.difficulty.label==='super').map(r=>r.difficulty.U)),equalBoundsCount:rows.filter(r=>r.difficulty.exactWithinBounds).length,
  lowerRawStates:stats(rows.map(r=>r.difficulty.lowerSearch.rawFullBoardStates)),maximumRawStates:rawMaximum,maximumRawStateSlots:rows.filter(r=>r.difficulty.lowerSearch.rawFullBoardStates===rawMaximum).map(r=>r.index),finalUpperSearchInvocations:rows.filter(r=>r.difficulty.finalUpperSearch.invoked).length,rawAccountingScope:'Exact selected final proof searches only; candidate-pool attempts and their retained failures are not aggregated into this maximum. Held-body microstates are separate.'},
 scoring:{pointsPerBadge:10,badgeCountDistribution:Object.fromEntries(Object.entries(badgeCounts).map(([n,indices])=>[n,{levels:indices.length,indices}])),successPointsDistribution:Object.fromEntries(Object.entries(scoreValues).map(([n,indices])=>[n,{levels:indices.length,indices}])),totalBadges:rows.reduce((n,r)=>n+r.scoring.badgeCount,0),sumOfOneSuccessPerLevelPoints:rows.reduce((n,r)=>n+r.scoring.successPoints,0),allFailureAndDiscardPointsZero:true,removalRouteFraction:stats(rows.flatMap(r=>r.scoring.badges.map(b=>b.routeFraction))),placementDefinition:'Complete removal drag index is strictly after half of that exact complete route; each selected solid rectangle independently cannot exit by one opening held action.'},
 variety:{sourceCount:Object.keys(sources).length,sources,maxPerSource:Math.max(...Object.values(sources).map(a=>a.length)),d4BoardMaskCount:Object.keys(masks).length,boardMasks:Object.entries(masks).map(([key,indices])=>({key,indices,example:rows.find(r=>r.index===indices[0]).board})),dimensionCount:Object.keys(dimensions).length,dimensions,rectangleLevels:rows.filter(r=>r.board.kind==='rectangle').length,irregularLevels:rows.filter(r=>r.board.kind==='irregular').length,uniqueD4Partitions:new Set(rows.map(r=>r.board.d4PartitionKey)).size,policy:DIVERSITY_POLICY,visualAcceptanceClaimed:false},
 inputFileBindings:bindings,reportingTool:{path:'tools/league-v2/mechanism-report-strength.mjs',sha256:fileSha('tools/league-v2/mechanism-report-strength.mjs')},rows};
for(const [file,hash]of Object.entries(bindings))assert.equal(fileSha(file),hash,`input changed during read-only aggregation: ${file}`);
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,status:summary.status,strength:{oldTotal,newTotal,increasePercent:summary.strength.increasePercent},sources:summary.variety.sourceCount,masks:summary.variety.d4BoardMaskCount,partitions:summary.variety.uniqueD4Partitions,maxRaw:rawMaximum,maxRawSlots:summary.difficulty.maximumRawStateSlots,scoreCountDistribution:Object.fromEntries(Object.entries(badgeCounts).map(([k,v])=>[k,v.length])),unlockCoverage:coverage.map(c=>[c.mechanism,c.actualFirstAppearance])},null,2));
