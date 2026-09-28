import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadApi} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';

const root='deliverables/lv15-remake-20260927';
const video='C:/Users/Administrator/Desktop/block out/参考视频/11-20.mp4';
const image='deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels/competitor-level-015.jpg';
const crop='references/imported/blockout-100-level-images-2026-09-04/crops100/level015.png';
const truthFile='deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
const galleryFile='deliverables/competitor-vs-ours-lv001-200-current-v168-20260927/comparison.json';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.83.0');
const shape=[[0,0],[1,0],[0,1],[1,1]],blocks=[];
const frame=second=>`${root}/source-video-${second}.png`;
const add=(x,y,color,core=null,peelBefore=null,peelAfter=null)=>blocks.push({
  id:`source15-${x}-${y}`,x,y,color,sourceColor:color,shape,
  ...(core?{layers:[color,core],sourceLayers:[color,core]}:{}),
  frozen:0,openingEvidence:frame(194),
  ...(core?{peelEvidence:{before:frame(peelBefore),after:frame(peelAfter)}}:{}),
});
add(0,0,'pink','blue',210,212);add(4,0,'red','yellow',222,224);
add(0,2,'yellow');add(2,2,'blue','red',224,225);add(4,2,'pink');
add(0,4,'red');add(2,4,'green');add(4,4,'yellow');
add(0,6,'blue','pink',222,224);add(4,6,'green','blue',214,216);
const gates=[
  {id:'source15-yellow-open',side:'right',offset:4,size:2,color:'yellow',sourceColor:'yellow',frozen:0},
  {id:'source15-pink-2',side:'bottom',offset:4,size:2,color:'pink',sourceColor:'pink',frozen:2},
  {id:'source15-green-3',side:'bottom',offset:0,size:2,color:'green',sourceColor:'green',frozen:3},
  {id:'source15-red-5',side:'top',offset:0,size:2,color:'red',sourceColor:'red',frozen:5},
  {id:'source15-blue-6',side:'top',offset:4,size:2,color:'blue',sourceColor:'blue',frozen:6},
].map(g=>({...g,countEvidence:frame(194),colorEvidence:frame(220)}));
const mask=['##..##','##..##','######','######','######','######','##..##','##..##'];
const playable=mask.flatMap((row,y)=>[...row].flatMap((c,x)=>c==='#'?[[x,y]]:[]));
const occupied=blocks.flatMap(b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]));
assert.equal(occupied.length,40);assert.equal(new Set(occupied.map(p=>p.join(','))).size,40);
assert.deepEqual(occupied.map(p=>p.join(',')).sort(),playable.map(p=>p.join(',')).sort());
const histogram=values=>Object.fromEntries([...new Set(values)].sort().map(c=>[c,values.filter(x=>x===c).length]));
const outerColors=histogram(blocks.map(b=>b.color));
const finalColors=histogram(blocks.map(b=>b.layers?.at(-1)??b.color));
const stageColors=histogram(blocks.flatMap(b=>b.layers??[b.color]));
assert.deepEqual(outerColors,{blue:2,green:2,pink:2,red:2,yellow:2});
assert.deepEqual(finalColors,{blue:2,green:1,pink:2,red:2,yellow:3});
assert.deepEqual(stageColors,{blue:4,green:2,pink:3,red:3,yellow:3});
assert.equal(blocks.filter(b=>b.layers).length,5);assert.equal(blocks.reduce((n,b)=>n+(b.layers?.length??1),0),15);
const adjacent=[];
for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
  const a=blocks[i],b=blocks[j];
  if(a.shape.some(([dx,dy])=>b.shape.some(([ex,ey])=>Math.abs(a.x+dx-b.x-ex)+Math.abs(a.y+dy-b.y-ey)===1)))adjacent.push({a:a.id,b:b.id,outerColors:[a.color,b.color]});
}
assert(adjacent.every(a=>a.outerColors[0]!==a.outerColors[1]));
const source={
  levelId:15,sourceVideo:video,openingEvidenceSecond:194,completionEvidenceSecond:232,nextLevelEvidenceSecond:240,
  board:{width:6,height:8,playableCount:40,mask,kind:'H-shaped, two arms connected by a four-row full-width middle',openingEmptyCells:[]},
  openingCount:10,openingUnfrozenDraggableCount:10,fullCount:10,shapeHistogram:{SQ2:10},occupiedCells:40,hiddenCount:0,
  sourceColorCounts:outerColors,mappedColorCounts:outerColors,finalCoreColorCounts:finalColors,colorStageEventCounts:stageColors,
  fullColorCount:5,paletteMapping:{blue:'blue',green:'green',pink:'pink',red:'red',yellow:'yellow'},
  blocks,gates,shells:{count:5,extraLayersEach:1,shapeHistogram:{SQ2:5},pairs:blocks.filter(b=>b.layers).map(b=>({id:b.id,x:b.x,y:b.y,layers:b.layers})),peelEvents:5,bodyRemovalEvents:10,totalClearEvents:15},
  numericIce:{count:0,values:[]},sourceAdjacency:adjacent,
  observedMechanisms:['ordinary_exit','frozen_exit','single_outer_shell'],
  firstAppearance:{singleOuterShell:15,provenance:'Historical full-scan truth records first appearance15; this audit directly confirms five real shells at15, not an independent re-scan of all preceding levels.'},
  noOtherMechanismsObserved:true,
  reviewStatus:'Opening reviewed at194s; all five thawed gates simultaneously visible at220s; five shell pairs tracked in before/after frames; completion232s and next level240s reviewed. No gate color inferred from an adjacent body.',
};
const truth=JSON.parse(fs.readFileSync(truthFile)).levels.find(l=>l.level===15);
const gallery=JSON.parse(fs.readFileSync(galleryFile)).levels.find(l=>l.level===15);
assert.equal(digest(fs.readFileSync(image)),gallery.competitor.sha256.toLowerCase());
assert.deepEqual(truth.composition.source_full_shape_histogram,{SQ2:10});assert.equal(truth.board.playable_cell_count,40);
assert.equal(truth.mechanisms.shells.count,5);assert.deepEqual([...truth.mechanisms.directional_exits.frozen_values].sort((a,b)=>a-b),[2,3,5,6]);
const {api,inputs}=await loadApi(),old=api.LEVELS[14];
assert.equal(old.id,15);assert.equal(old.name,'外壳回顾');assert.equal(old.difficulty,'hard');assert.equal(old.timeSeconds,120);assert.equal(old.reward,60);
assert.deepEqual(api.levelStarTargets(old),{moveTarget:34,timeTargetSeconds:86});
assert.deepEqual(old.playable.map(p=>p.join(',')).sort(),playable.map(p=>p.join(',')).sort());
const sourceLevel={...old,blocks:blocks.map(({id,x,y,color,shape,layers})=>({id,x,y,color,shape,...(layers?{layers}:{})})),gates:gates.map(({id,side,offset,size,color,frozen})=>({id,side,offset,size,color,...(frozen?{frozen}:{})}))};
api.validateLevel(sourceLevel);
const sourceArt=api.auditCandidateBlockArt(sourceLevel);assert(sourceArt.passed);
const native=sourceLevel.blocks.map(b=>({id:b.id,layers:b.layers??[b.color],match:api.matchFormalBlockShape(b.shape,'native-only')}));
assert(native.every(n=>n.match?.shapeId===7&&n.match.quarterTurns===0));
const oldOuter=histogram(old.blocks.map(b=>b.color));
const sourceSignature=blocks.map(b=>`${b.color}:${(b.layers??[b.color]).join('>')}`).sort();
const oldSignature=old.blocks.map(b=>`${b.color}:${(b.layers??[b.color]).join('>')}`).sort();
assert.notDeepEqual(oldSignature,sourceSignature);
const bind=p=>({path:p.replaceAll('\\','/'),sha256:digest(fs.readFileSync(p)),bytes:fs.statSync(p).size});
const frames=fs.readdirSync(root).filter(f=>/^source-video-.*\.png$/.test(f)).map(f=>root+'/'+f);
const bindings=[...new Set([video,image,crop,truthFile,galleryFile,...frames,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.83.0.md','tools/lv15-remake-20260927/source-audit.mjs','tools/lv15-remake-20260927/source-extract.mjs',...inputs,...sourceArt.requirements.map(r=>'public/'+r.path.replace(/^\//,''))])].map(bind);
const report={
  schemaVersion:1,createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,ruleLock:{passed:true,versionCount:lock.verified.length},status:'SOURCE_AND_BASELINE_AUDIT_COMPLETE',
  sourceFacts:source,
  oldFormal:{level:old,semanticSha256:digest(old),rawSha256:createHash('sha256').update(JSON.stringify(old)).digest('hex'),profile:old.mechanismRules??'legacy',actualStars:api.levelStarTargets(old),outerColorCounts:oldOuter,gates:old.gates.map(({side,offset,size,color,frozen=0})=>({side,offset,size,color,frozen})),shellPairs:old.blocks.filter(b=>b.layers).map(b=>({id:b.id,x:b.x,y:b.y,layers:b.layers})),sourceGeometryExact:true,sourceShapeMechanismCountMatch:true,sourceColorsAndShellPairsExact:false,sourceGateColorsExact:false,oneToOnePaletteRemapCanExplainDifferences:false,reason:'Source outer multiplicities are2 each in five colors; current authored outer multiplicities are red4/pink3/yellow1/green1/orange1, so this is not a bijective palette renaming. Current five shell pairs differ. All source colors and shell assets are supported directly. parMoves536 is historical metadata, not the actual34-star target.'},
  sourceNativeArt:{native,art:sourceArt},
  historicalTruthRefinement:{oldShellItems:truth.mechanisms.shells.items,newPreciseShellPairs:source.shells.pairs,newPreciseGateColors:gates.map(({color,frozen,side,offset,size})=>({color,frozen,side,offset,size})),coarseCountFactsRemainCorrect:true,galleryExactLabelNotProofOfDetailedColorPairParity:true,oldTruthModified:false,oldGalleryModified:false},
  sourceContract:{
    preserve:'10 original-direction SQ2 bodies, five single-shell outer/core pairs pink>blue/red>yellow/blue>red/blue>pink/green>blue, five plain bodies yellow2/pink1/red1/green1; ordinary yellow gate and frozen pink2/green3/red5/blue6; no body ice, hidden inventory or other later mechanism.',
    geometry:'Source40 playable cells are exactly covered by10SQ2. A new clearly different40-cell symmetric, connected, hole-free footprint can preserve inventory without capacity adaptation. Specific geometry/layout/gate locations remain design work, not a source fact.',
    sourceCompatibility:'All five colors use unique gates, each SQ2 cross-section is2 and native shapeId7 q0 is supported for all colors/outer shells. No source-to-hard-rule capacity conflict identified.',
    scoring:{oldDifficulty:'hard',newDifficulty:'easy',necessaryRepositionBand:[5,10],authority:'v1.83 explicitly applies the adopted first-teach simple rule to this Lv15 remake only; other199 remain unchanged. No Lv11 or Lv12 exception borrowed.',timeSeconds:120,timeStarSeconds:86,historicalReward:60,oldMoveTarget:34,preservedMoveTarget:34,historicalParMoves:536,sourceClearEventCount:15,qualifiedWitnessTotalRange:[20,25],moveTargetCapacityConflict:false,reason:'Five peels and ten body removals are15 clearing drags, not repositioning. A valid U5–10 witness totals20–25 and can fit the preserved34-move target; natural-time and actual scoring still require Pointer verification.'},
    mechanisms:'Single-shell first-teach remains the core new mechanism; frozen gates are existing support. No authority inferred to add numeric ice, shutters, generators, colored floors, stars, axis or other mechanisms.',
  },
  verificationScope:'Source and old formal read-only audit only. No new candidate generation, difficulty certificate, route or Pointer acceptance asserted.',bindings,networkUsed:false,productionModified:false,playerSaveTouched:false,releaseApproved:false,
};
for(const b of bindings)assert.equal(digest(fs.readFileSync(b.path)),b.sha256);
const output=root+'/source-audit-'+Date.now()+'.json';
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(root+'/source-ledger.json',JSON.stringify(source,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,ledger:root+'/source-ledger.json',status:report.status,sourceShells:source.shells.pairs,sourceGates:source.gates,stars:report.oldFormal.actualStars}));
