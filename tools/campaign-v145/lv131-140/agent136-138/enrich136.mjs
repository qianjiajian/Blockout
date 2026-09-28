import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadIsolatedApi} from './isolated-api.mjs';
import {geometry} from '../../../native-block-repair-v143.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {measureRoute} from '../../../remake21to30-quality.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
const root='deliverables/remake131-140-v146-20260924/agent136-138';
const source=`${root}/candidate136-four-irregular-mutated-8-1790471823006.json`,d=JSON.parse(fs.readFileSync(source));
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const api=await loadIsolatedApi(),baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels.find(x=>x.level.id===136),base=baseline.level;
assert.deepEqual(geometry(d.level),geometry(base));for(const k of ['id','name','timeSeconds','reward','parMoves','parSeconds'])assert.deepEqual(d.level[k],base[k]);
const sourceBodies=[
 {id:'s136-purple-L3',color:'purple',x:0,y:0,shape:[[0,0],[1,0],[0,1]],target:'a136-b2'},
 {id:'s136-blue-L4',color:'blue',x:5,y:0,shape:[[0,0],[1,0],[1,1],[1,2]],target:'a136-b5'},
 {id:'s136-red-L4',color:'red',x:0,y:2,shape:[[0,0],[0,1],[0,2],[1,2]],target:'a136-b9'},
 {id:'s136-yellow-L3',color:'yellow',x:5,y:3,shape:[[1,0],[0,1],[1,1]],target:'a136-b11'},
 {id:'s136-green-S1',color:'green',x:1,y:1,shape:[[0,0]],target:'a136-b4'},
 {id:'s136-cyan-S',color:'cyan',x:2,y:1,shape:[[0,0]],target:'a136-b13'},
 {id:'s136-yellow-H3',color:'yellow',x:3,y:1,shape:[[0,0],[1,0],[2,0]],target:'a136-b1'},
 {id:'s136-purple-H3',color:'purple',x:1,y:2,shape:[[0,0],[1,0],[2,0]],target:'a136-b3'},
 {id:'s136-red-H2',color:'red',x:4,y:2,shape:[[0,0],[1,0]],target:'a136-b7'},
 {id:'s136-blue-S',color:'blue',x:1,y:3,shape:[[0,0]],target:'a136-b0'},
 {id:'s136-green-S2',color:'green',x:2,y:3,shape:[[0,0]],target:'a136-b6'},
 {id:'s136-blue-H2',color:'blue',x:3,y:3,shape:[[0,0],[1,0]],target:'a136-b14'},
 {id:'s136-purple-S',color:'purple',x:5,y:3,shape:[[0,0]],target:'a136-b10'}
];
const sourceMap=sourceBodies.map(s=>{const b=d.level.blocks.find(b=>b.id===s.target);assert(b&&!b.shutterId);return{source:{...s,target:undefined},targetBlockId:b.id,targetShape:b.shape,targetColor:b.color,targetPosition:[b.x,b.y],adaptation:'User-authorized q0 native shape, color and arrangement adaptation under v1.72; original facts retained separately'};});
assert.equal(new Set(sourceMap.map(x=>x.targetBlockId)).size,13);
const mappedIds=new Set(sourceMap.map(x=>x.targetBlockId)),added=d.level.blocks.filter(b=>!b.shutterId&&!mappedIds.has(b.id));assert.equal(added.length,4);
const irregular=b=>{const w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;return b.shape.length!==w*h;};
assert.equal(sourceBodies.filter(irregular).length,4);assert.equal(d.level.blocks.filter(irregular).length,4);
assert.deepEqual(d.level.gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[1,2,4,9,9]);assert.equal(d.level.shutters.length,1);assert.equal(d.level.shutters[0].count,13);
const paths=['.codex-temp/video-audit-135-169/openings/level-136.jpg','.codex-temp/video-audit-135-169/board-crops/level-136.jpg','.codex-temp/video-audit-135-169/opening-contacts/lv136.jpg'];
const replay=api.replayRevisedRoute(d.level,d.drags);assert(replay.valid&&replay.complete&&replay.nonClearingDrags<=30);
const proof=checkSymmetryFloor(d.level,{floor:21,maxStates:400000,maxMilliseconds:10000});assert(proof.thresholdProven);
const measurement=measureRoute(d.level,d.drags,api);
const audits={opening:auditOpeningCoverage(new api.PuzzleModel(d.level).snapshot()),hidden:auditHiddenCoverage(d.level),gates:auditGateSpanLimits(d.level),native:d.level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}))};
assert(audits.opening.passed&&audits.hidden.passed&&audits.gates.passed);assert(audits.native.every(x=>x.match?.quarterTurns===0));
const occupancy=new Map();for(const b of d.level.blocks)for(const [dx,dy] of b.shape)occupancy.set(`${b.x+dx},${b.y+dy}`,b);
for(const b of d.level.blocks)for(const[dx,dy]of b.shape)for(const[u,v]of[[0,1],[1,0]]){const n=occupancy.get(`${b.x+dx+u},${b.y+dy+v}`);assert(!n||n.id===b.id||n.shutterId!==b.shutterId||n.color!==b.color);}audits.adjacent=true;
const data={...d,activeRuleVersion:lock.activeVersion,levelSha256:digest(d.level),routeSha256:digest(d.drags),baselineSha256:digest(base),sourceCandidate:source,replay,proof,measurement,audits,sourceReview:{status:'REVIEWED_WITH_EXPLICIT_ADAPTATIONS',reviewedAt:new Date().toISOString(),sources:paths.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')})),sourceBoard:{width:7,height:10,playableCellCount:63,nonPlayableRow:5},sourceOpening:{bodyCount:13,occupiedCells:29,upperAreaCells:35,shapeHistogram:{L3:2,L4:2,H3:2,H2:2,S:5},irregularBodies:4,colors:['purple','blue','red','yellow','green','cyan'],blocks:sourceBodies.map(({target,...b})=>b)},sourceGates:{ordinary:[{side:'left',region:'upper',color:'purple'},{side:'left',region:'lower',color:'purple'},{side:'left',region:'lower',color:'cyan'},{side:'right',region:'lower',color:'yellow'},{side:'right',region:'lower',color:'red'},{side:'bottom',region:'lower',color:'green'}],frozen:[{side:'top',count:2},{side:'top',count:4},{side:'left',count:9},{side:'right',count:9},{side:'bottom',count:1}],frozenColorStatus:'Not readable through opaque source ice; authored assignments are not asserted as source facts'},sourceHidden:{shutter:{x:0,y:6,width:7,height:4,count:13},inventoryStatus:'Unknown: supplied136 clip ends before this cover is revealed',design:{shutter:d.level.shutters[0],blocks:d.level.blocks.filter(b=>b.shutterId)},designStatus:'Original full single layer over baseline-adapted region; not a claim that source had3 bodies'},sourceMap,addedOrdinaryBodies:added,sourceGateMap:[{source:'top frozen2',target:'a136-orange'},{source:'top frozen4',target:'a136-pink'},{source:'left frozen9',target:'a136-blue'},{source:'right frozen9',target:'a136-purple'},{source:'bottom frozen1',target:'a136-yellow'}],truthCorrections:['Source opening contains4 irregular bodies, not only rectangles; both L4 and both L3 individually retained as q0 native L3.','Source upper29 occupied cells leave6 opening gaps. Source cyan single is distinct from blue.'],differences:['Baseline6×7 full42 geometry/name/time135/par60/historyreward200 retained. Source7×10 split63-cell board cannot be copied into the fixed baseline.','All13 known opening bodies retained individually with authored native shapes/colors and original spatial arrangement. Four additional ordinary bodies fill opening36 cells. Total17 opening+3 original hidden=20 bodies; irregular4/20=20%.','Source count13 lower7×4 cover adapted to baseline6×1 bottom row. Source hidden contents are unavailable and are explicitly original3 H2, fully filling6 cells. Count13 is unchanged.','Source has11 gates: five frozen2/4/9/9/1 plus6 ordinary including duplicatepurple. The8 unique palette capacity requires reducing3 ordinary gates; every frozen instance and count retained. Remaining3ordinary red/cyan/green, all8colors assigned explicitly as authored, gates recolored and relocated.','Original13-source mapping is identity accounting, not a claim of spatial, color or shape copying; source facts and user-authorized changes are separate.'],uncertainties:['Frozen gate source colors are obscured; candidate assignments are authored.','Source lower hidden layer never appears in supplied136 clip, so itsbody count/colors/shapes are unavailable.']},decisionReview:{status:'AUTHOR_REVIEWED_PENDING_ROOT',mainMechanisms:['Five frozen exits use the same clear-event budget with distinct1/2/4/9/9 unlock phases','Count13 cover opens the final full bottom-row inventory only after13 prior clears'],spatialDecisions:'Four native L3 plus two-cell bodies share narrow exit-alignment lanes; fresh floor excludes0–20 non-clearing drags and a full49-drag route uses29. This is spatial ordering as well as countdown sequencing.',singleCellDominated:measurement.singleCellDrags>=measurement.multiCellDrags,baselineStarTargets:baseline.starTargets,humanBlindTested:false},lowerBoundCertified:true,pointerValidated:false,naturalClockValidated:false,formalAdopted:false,releaseApproved:false};
const file=`${root}/enriched136-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,sha256:data.levelSha256,L:21,U:replay.nonClearingDrags,drags:d.drags.length,multi:measurement.multiCellDrags,single:measurement.singleCellDrags,sourceMap:sourceMap.length,added:added.length}));
