import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadApi} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';

const root='deliverables/lv16-remake-20260927';
const video='C:/Users/Administrator/Desktop/block out/参考视频/11-20.mp4';
const image='deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels/competitor-level-016.jpg';
const crop='references/imported/blockout-100-level-images-2026-09-04/crops100/level016.png';
const truthFile='deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
const galleryFile='deliverables/competitor-vs-ours-lv001-200-current-v168-20260927/comparison.json';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.84.0');
const mapping={black:'purple',white:'cyan',blue:'blue',yellow:'yellow',red:'red'};
const SINGLE=[[0,0]],V3=[[0,0],[0,1],[0,2]],blocks=[];
const frame=s=>`${root}/source-video-${s}.png`;
const add=(x,y,sourceColor,shape=SINGLE,sourceCore=null)=>blocks.push({
  id:`source16-${x}-${y}`,x,y,shape,sourceColor,color:mapping[sourceColor],frozen:0,
  ...(sourceCore?{sourceLayers:[sourceColor,sourceCore],layers:[mapping[sourceColor],mapping[sourceCore]],peelEvidence:{before:frame(256),after:frame(258)}}:{}),
  openingEvidence:frame(238.5),openingConfirmation:frame(239.2),
});
add(5,0,'red',V3);add(4,1,'yellow',V3,'red');add(2,4,'red',V3);
for(const[x,y]of [[3,2],[2,3],[3,4],[5,4],[4,5],[3,6],[5,6]])add(x,y,'black');
for(const[x,y]of [[4,4],[1,5],[3,5],[0,6],[4,6]])add(x,y,'white');
for(const[x,y]of [[1,4],[0,5],[1,6]])add(x,y,'blue');
for(const[x,y]of [[3,3],[5,3],[5,5]])add(x,y,'yellow');
const gates=[
  {id:'source16-blue-open',side:'left',offset:5,size:1,sourceColor:'blue',frozen:0,colorSecond:238.5},
  {id:'source16-white-3',side:'bottom',offset:2,size:1,sourceColor:'white',frozen:3,colorSecond:244},
  {id:'source16-yellow-8',side:'bottom',offset:3,size:1,sourceColor:'yellow',frozen:8,colorSecond:258},
  {id:'source16-red-12',side:'right',offset:4,size:3,sourceColor:'red',frozen:12,colorSecond:260},
  {id:'source16-black-15',side:'bottom',offset:4,size:2,sourceColor:'black',frozen:15,colorSecond:266},
].map(({colorSecond,...g})=>({...g,color:mapping[g.sourceColor],countEvidence:frame(238.5),colorEvidence:frame(colorSecond)}));
const mask=['.....#','....##','...###','..####','.#####','######','######'];
const playable=mask.flatMap((r,y)=>[...r].flatMap((v,x)=>v==='#'?[[x,y]]:[]));
const occupied=blocks.flatMap(b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]));
assert.equal(blocks.length,21);assert.equal(occupied.length,27);assert.equal(new Set(occupied.map(p=>p.join(','))).size,27);
assert.deepEqual(occupied.map(p=>p.join(',')).sort(),playable.map(p=>p.join(',')).sort());
const hist=v=>Object.fromEntries([...new Set(v)].sort().map(k=>[k,v.filter(x=>x===k).length]));
const sourceCounts=hist(blocks.map(b=>b.sourceColor)),mappedCounts=hist(blocks.map(b=>b.color));
assert.deepEqual(sourceCounts,{black:7,blue:3,red:2,white:5,yellow:4});
assert.deepEqual(mappedCounts,{blue:3,cyan:5,purple:7,red:2,yellow:4});
assert.deepEqual(hist(blocks.filter(b=>b.shape.length===1).map(b=>b.sourceColor)),{black:7,blue:3,white:5,yellow:3});
const adjacent=[];for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
  const a=blocks[i],b=blocks[j];if(a.shape.some(([dx,dy])=>b.shape.some(([ex,ey])=>Math.abs(a.x+dx-b.x-ex)+Math.abs(a.y+dy-b.y-ey)===1)))adjacent.push({a:a.id,b:b.id,sourceOuterColors:[a.sourceColor,b.sourceColor],mappedOuterColors:[a.color,b.color]});
}
const sameOuterColorAdjacency=adjacent.filter(a=>a.mappedOuterColors[0]===a.mappedOuterColors[1]);
assert.equal(sameOuterColorAdjacency.length,2);
const source={
  levelId:16,sourceVideo:video,openingEvidenceSecond:238.5,openingConfirmationSeconds:[239,239.2],completionEvidenceSecond:270,nextLevelEvidenceSecond:278,
  board:{width:6,height:7,playableCount:27,mask,kind:'One-sided right-aligned staircase with a two-row six-cell base',openingEmptyCells:[]},
  openingCount:21,openingUnfrozenDraggableCount:21,fullCount:21,shapeHistogram:{SINGLE:18,V3:3},occupiedCells:27,hiddenCount:0,
  sourceColorCounts:sourceCounts,mappedColorCounts:mappedCounts,sourceSingleColorCounts:{black:7,white:5,blue:3,yellow:3},sourceV3OuterColors:{red:2,yellow:1},
  finalCoreColorCounts:hist(blocks.map(b=>b.sourceLayers?.at(-1)??b.sourceColor)),colorStageEventCounts:hist(blocks.flatMap(b=>b.sourceLayers??[b.sourceColor])),fullColorCount:5,
  paletteMapping:mapping,paletteMappingAuthority:'v1.84: black→purple and white→cyan only; red/yellow/blue preserved. Explicit source-to-game adaptation, not original-color equality.',
  blocks,gates,shells:{count:1,extraLayersEach:1,shapeHistogram:{V3:1},pairs:[{id:'source16-4-1',x:4,y:1,sourceLayers:['yellow','red'],layers:['yellow','red']}],peelEvents:1,bodyRemovalEvents:21,totalClearEvents:22},
  numericIce:{count:0,values:[]},sourceAdjacency:adjacent,sourceSameOuterColorAdjacency:sameOuterColorAdjacency,sourceAdjacencyAdaptation:'The source yellowV3 shell touches yellowS at(3,3) and(5,3). New authored positions must remove these two same-outer-color adjacencies while preserving complete source attributes.',observedMechanisms:['ordinary_exit','frozen_exit','single_outer_shell'],noOtherMechanismsObserved:true,
  sourceColorOrder:{threeBlueClearsOpenWhite3:true,fiveWhiteClearsReach8OpenYellow8:true,threeYellowSinglesPlusYellowPeelReach12OpenRed12:true,threeRedV3RemovalsReach15OpenBlack15:true,lastSevenBlackSinglesComplete22:true,scope:'Inventory/counter consistency verified from full source progression, not a new authored-level lower-bound proof.'},
  historicalOpeningCorrection:{oldArchiveWasAfterFirstClear:true,oldSummaryOpeningCount:20,oldSummaryOccupiedCells:26,oldSummaryShapeHistogram:{SINGLE:17,V3:3},missingOpeningBodyId:'source16-0-5',missingOpeningBody:{x:0,y:5,shape:SINGLE,color:'blue'},correctOpeningCount:21,correctOccupiedCells:27,correctShapeHistogram:{SINGLE:18,V3:3},archiveTimer:'02:59',archiveRemainingGateValues:[11,2,7,14],trueOpeningTimer:'03:00',trueOpeningGateValues:[12,3,8,15],reason:'Archive screenshot shows blue exit particles and the blue S at(0,5) is gone. Raw238.5/239/239.2 frames precede the first drag and retain that body. The apparent empty square is not part of the stable opening.'},
  reviewStatus:'Raw first-operation-before frames reviewed, frozen counts bound at238.5s and each actual thawed gate color reviewed separately; shell at256/258s tracked yellow→red; source completion and next level reviewed. No gate colors inferred from adjacent bodies.',
};
const truth=JSON.parse(fs.readFileSync(truthFile)).levels.find(l=>l.level===16),gallery=JSON.parse(fs.readFileSync(galleryFile)).levels.find(l=>l.level===16);
assert.equal(digest(fs.readFileSync(image)),gallery.competitor.sha256.toLowerCase());
assert.equal(truth.composition.source_full_piece_count,20);assert.equal(truth.composition.source_occupied_cell_count,26);assert.deepEqual(truth.composition.source_full_shape_histogram,{SINGLE:17,V3:3});assert.equal(truth.board.playable_cell_count,27);
const{api,inputs}=await loadApi(),old=api.LEVELS[15];
assert.equal(old.id,16);assert.equal(old.name,'色彩接力');assert.equal(old.difficulty,'hard');assert.equal(old.timeSeconds,180);assert.equal(old.reward,65);assert.equal(old.parMoves,50);
assert.deepEqual(api.levelStarTargets(old),{moveTarget:50,timeTargetSeconds:129});
const sourceLevel={...old,blocks:blocks.map(({id,x,y,color,shape,layers})=>({id,x,y,color,shape,...(layers?{layers}:{})})),gates:gates.map(({id,side,offset,size,color,frozen})=>({id,side,offset,size,color,...(frozen?{frozen}:{})}))};
api.validateLevel(sourceLevel);const sourceArt=api.auditCandidateBlockArt(sourceLevel);assert(sourceArt.passed);
const native=sourceLevel.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));
assert(native.every((n,i)=>n.match?.shapeId===(sourceLevel.blocks[i].shape.length===1?1:3)&&n.match.quarterTurns===0));
const oldCoverage=new Set(old.blocks.flatMap(b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy].join(','))));assert.equal(oldCoverage.size,26);
const bind=p=>({path:p.replaceAll('\\','/'),sha256:digest(fs.readFileSync(p)),bytes:fs.statSync(p).size});
const frames=fs.readdirSync(root).filter(f=>/^source-video-.*\.png$/.test(f)).map(f=>root+'/'+f);
const bindings=[...new Set([video,image,crop,truthFile,galleryFile,...frames,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.84.0.md','tools/lv16-remake-20260927/source-audit.mjs','tools/lv16-remake-20260927/source-extract.mjs',...inputs,...sourceArt.requirements.map(r=>'public/'+r.path.replace(/^\//,''))])].map(bind);
const report={
  schemaVersion:1,createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,ruleLock:{passed:true,versionCount:lock.verified.length},status:'SOURCE_AND_BASELINE_AUDIT_COMPLETE',sourceFacts:source,
  oldFormal:{level:old,semanticSha256:digest(old),rawSha256:createHash('sha256').update(JSON.stringify(old)).digest('hex'),profile:old.mechanismRules??'legacy',actualStars:api.levelStarTargets(old),outerColorCounts:hist(old.blocks.map(b=>b.color)),gates:old.gates.map(({color,side,offset,size,frozen=0})=>({color,side,offset,size,frozen})),oldOrdinaryGateCount:old.gates.filter(g=>!g.frozen).length,oldFrozenGateValues:old.gates.filter(g=>g.frozen).map(g=>g.frozen),openingOccupiedCells:oldCoverage.size,openingEmptyCells:old.playable.filter(p=>!oldCoverage.has(p.join(','))),sourceGeometryExact:true,sourceBodyCountExact:false,sourceShapeInventoryExact:false,sourceColorsAndShellPairExact:false,sourceGateColorsAndCountersExact:false,reason:'Old formal has20 bodies and26 occupied cells, four ordinary gates and one ice1; this does not preserve the true21-body opening, blue/white/yellow/red/black chain or four frozen values3/8/12/15. Old palette is not an established source mapping.'},
  historicalTruthCorrection:{...source.historicalOpeningCorrection,oldTruthModified:false,oldGalleryModified:false,correctedSourceIsNotAuthoredExtraBody:true},
  sourceNativeArt:{native,art:sourceArt},
  sourceContract:{preserve:'21 bodies=18S+3 nativeV3,27 fully occupied cells; source black7/white5/blue3/yellow4/red2 outer inventory mapped black→purple/white→cyan; exactly one yellow→red V3 shell; ordinaryblue and icecyan3/yellow8/red12/purple15; no hidden/numericice/later mechanisms.',geometry:'Use a clearly different symmetric connected hole-free27-cell layout. The true source27 is already fully covered; the old26-cell capacity assumption is corrected, not adapted by removing or inventing bodies. Original yellow-shell adjacency to two yellowS must be eliminated by the authorized new positional layout.',scoring:{oldDifficulty:'hard',newDifficulty:'normal',necessaryRepositionBand:[11,15],authority:'User-confirmed ordinary consolidation in v1.84',name:'色彩接力',timeSeconds:180,timeStarSeconds:129,historicalReward:65,historicalParMoves:50,preservedMoveTarget:50,sourceClearEvents:22,qualifiedWitnessTotalRange:[33,37],moveTargetCapacityConflict:false},mechanisms:'SingleV3 shell with ice-gate color chain is the known source contract. Record actual long/single setup distribution and meaningful V3 passage/changed-color exit decisions without a new ratio quota.',sourceConflictsResolved:'Source black/white are unsupported by existing8-color artwork; v1.84 explicitly resolves them through a consistent bijection. No board occupancy conflict remains after restoring the previously missed openingblue S. Two source same-outer-color adjacencies require positional adaptation, not a source-inventory change.'},
  verificationScope:'Source and old formal read-only audit only; no candidate generation, difficulty proof, new route, Pointer or scoring acceptance asserted.',bindings,networkUsed:false,productionModified:false,playerSaveTouched:false,releaseApproved:false,
};
for(const b of bindings)assert.equal(digest(fs.readFileSync(b.path)),b.sha256);
const output=root+'/source-audit-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});fs.writeFileSync(root+'/source-ledger.json',JSON.stringify(source,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,ledger:root+'/source-ledger.json',status:report.status,bodyCount:source.fullCount,shapes:source.shapeHistogram,sourceColors:sourceCounts,mappedColors:mappedCounts,gates:gates.map(({sourceColor,color,frozen})=>({sourceColor,color,frozen})),stars:report.oldFormal.actualStars}));
