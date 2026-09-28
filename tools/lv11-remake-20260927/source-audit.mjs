import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {verifyRulesLock} from '../verify-rules-lock.mjs';

const ROOT='deliverables/lv11-remake-20260927';
const VIDEO='C:/Users/Administrator/Desktop/block out/参考视频/11-20.mp4';
const SOURCE_IMAGE='deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels/competitor-level-011.jpg';
const TRUTH='deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
const GALLERY='deliverables/competitor-vs-ours-lv001-200-current-v168-20260927/comparison.json';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(canonical(v))).digest('hex');
const bind=p=>({path:p,sha256:hash(fs.readFileSync(p)),bytes:fs.statSync(p).size});
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.79.0');
const map={white:'cyan',black:'purple',green:'green',pink:'pink',red:'red'};
const H3=[[0,0],[1,0],[2,0]],S=[[0,0]];
const blocks=[];
const add=(id,x,y,sourceColor,shape,frozen=0,evidenceSecond=1)=>blocks.push({id,x,y,sourceColor,color:map[sourceColor],shape,frozen,colorEvidence:`${ROOT}/source-video-${evidenceSecond}.png`});
add('source11-plain-pink',0,0,'pink',H3);
add('source11-plain-green-upper',0,1,'green',H3);
add('source11-plain-green-lower',0,6,'green',H3);
for(let y=2;y<=5;y++)for(let x=0;x<3;x++)add(`source11-single-${x}-${y}`,x,y,(x+y)%2===0?'black':'white',S);
const ice=[['white',17,30.5],['black',17,30.5],['green',17,30.25],['black',16,29.5],['red',15,28],['pink',14,26],['black',13,24]];
ice.forEach(([color,frozen,second],y)=>add(`source11-ice-row-${y}`,3,y,color,H3,frozen,second));
const gates=[
 {id:'source11-green-open',side:'top',offset:3,size:3,sourceColor:'green',color:'green',frozen:0,colorEvidence:`${ROOT}/source-video-1.png`},
 {id:'source11-white-open',side:'left',offset:5,size:1,sourceColor:'white',color:'cyan',frozen:0,colorEvidence:`${ROOT}/source-video-1.png`},
 {id:'source11-red-13',side:'left',offset:1,size:1,sourceColor:'red',color:'red',frozen:13,colorEvidence:`${ROOT}/source-video-24.png`},
 {id:'source11-pink-6',side:'left',offset:2,size:1,sourceColor:'pink',color:'pink',frozen:6,colorEvidence:`${ROOT}/source-video-11.png`},
 {id:'source11-black-7',side:'left',offset:3,size:1,sourceColor:'black',color:'purple',frozen:7,colorEvidence:`${ROOT}/source-video-21.png`},
];
const hist=(items,k)=>Object.fromEntries([...new Set(items.map(x=>x[k]))].sort().map(c=>[c,items.filter(x=>x[k]===c).length]));
assert.deepEqual(hist(blocks,'sourceColor'),{black:9,green:3,pink:2,red:1,white:7});
assert.equal(blocks.filter(b=>b.shape.length===3).length,10);assert.equal(blocks.filter(b=>b.shape.length===1).length,12);
assert.equal(blocks.filter(b=>b.frozen>0).length,7);
const coverage=blocks.flatMap(b=>b.shape.map(([x,y])=>`${b.x+x},${b.y+y}`));assert.equal(coverage.length,42);assert.equal(new Set(coverage).size,42);
const truth=JSON.parse(fs.readFileSync(TRUTH,'utf8')).levels.find(l=>l.level===11);
const gallery=JSON.parse(fs.readFileSync(GALLERY,'utf8')).levels.find(l=>l.level===11);
assert.equal(hash(fs.readFileSync(SOURCE_IMAGE)),gallery.competitor.sha256.toLowerCase());
assert.deepEqual(truth.composition.source_full_shape_histogram,{SINGLE:12,H3:10});
assert.deepEqual([...truth.mechanisms.numeric_ice.values].sort((a,b)=>a-b),[13,14,15,16,17,17,17]);

const built=await build({stdin:{resolveDir:process.cwd(),contents:`
export {LEVELS} from './src/core/levels.ts';
export {levelStarTargets} from './src/core/levelStarConditions.ts';
export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';
export {auditCandidateBlockArt} from './tools/revised-candidate-block-art.mjs';
`},bundle:true,platform:'node',format:'esm',write:false});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const old=api.LEVELS.find(l=>l.id===11);
assert.equal(old.width,6);assert.equal(old.height,7);assert.equal(old.playable.length,42);
assert.equal(old.name,'冻域排序');assert.equal(old.difficulty,'hard');assert.equal(old.timeSeconds,120);assert.equal(old.reward,40);
assert.deepEqual(api.levelStarTargets(old),{moveTarget:36,timeTargetSeconds:86});
const normalBlock=b=>({x:b.x,y:b.y,color:b.color,shape:b.shape,frozen:b.frozen??0});
const normalizeBlocks=bs=>bs.map(normalBlock).sort((a,b)=>a.y-b.y||a.x-b.x);
assert.deepEqual(normalizeBlocks(old.blocks),normalizeBlocks(blocks),'Established palette maps exact source block role, position, shape and ice values to current formal inventory');
const normalizeGates=gs=>gs.map(({side,offset,size,color,frozen=0})=>({side,offset,size,color,frozen})).sort((a,b)=>a.color.localeCompare(b.color));
assert.deepEqual(normalizeGates(old.gates),normalizeGates(gates));
const art=api.auditCandidateBlockArt(old);assert(art.passed);
const native=old.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));
assert(native.every(n=>n.match?.quarterTurns===0&&[1,9].includes(n.match.shapeId)));
const artBindings=[...new Set(art.requirements.map(r=>'public/'+r.path.replace(/^\//,'')))].map(bind);
const evidenceSeconds=[1,11,16,21,22,24,25,26,27,28,28.75,29,29.25,29.5,29.75,30,30.25,30.5,31];
const bindings=[VIDEO,SOURCE_IMAGE,TRUTH,GALLERY,
 'references/imported/blockout-100-level-images-2026-09-04/crops100/level011.png',
 'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.79.0.md',
 `${ROOT}/source-video-00-47-contact.png`,...evidenceSeconds.map(s=>`${ROOT}/source-video-${s}.png`),
 'tools/lv11-remake-20260927/source-audit.mjs','src/core/levels.ts','src/core/levelStarConditions.ts','src/game/formalBlockShapes.ts','src/game/artManifest.ts',
].map(bind);
const source={
 levelId:11,board:{width:6,height:7,playableCount:42,mask:Array(7).fill('######'),kind:'complete rectangle'},
 sourceVideo:VIDEO,openingEvidenceSecond:1,openingCount:22,openingUnfrozenDraggableCount:15,fullCount:22,
 shapeHistogram:{SINGLE:12,H3:10},occupiedCells:42,hiddenCount:0,sourceColorCounts:hist(blocks,'sourceColor'),mappedColorCounts:hist(blocks,'color'),
 openingUnfrozenVisibleColorCount:4,openingUnfrozenVisibleColors:['black','white','green','pink'],
 fullColorCount:5,allOpeningBodiesKnownColorCountAfterVideoReview:5,
 paletteMapping:map,blocks,gates,numericIce:{count:7,valuesByOriginalRow:[17,17,17,16,15,14,13]},
 noOtherMechanismsObserved:true,reviewStatus:'Confirmed from opening and post-thaw original video frames; no adjacent-block inference',
};
const report={
 schemaVersion:1,createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,status:'SOURCE_AND_BASELINE_AUDIT_COMPLETE',
 sourceFacts:source,
 correctionToLegacyTruth:{field:'composition.full_color_count',oldValue:4,verifiedFullValue:5,
   reason:'The stored four-color number is explicitly scoped to opening visible distinct colors with ice-hidden colors not guessed. Actual thawing reveals red ice15; the full level contains black, white, green, pink and red.',
   originalTruthModified:false,originalGalleryModified:false,
   openingScopeNote:'Opening visible unfrozen colors=4 remains a correct limited observation. Counting all 22 authored bodies by their now-known colors gives five; these scopes must not be conflated.'},
 oldFormal:{level:old,levelSemanticSha256:hash(old),profile:old.mechanismRules??'legacy',actualStars:api.levelStarTargets(old),
   sourceBlockAndGateMappingExact:true,originalGeometryExactMatchToSource:true,
   obsoleteDesignTargets:old.designTargets,native,art,artBindings},
 proposedSourceContract:{
   preserve:'22 bodies: 12 singles (source black6/white6), 3 ordinary H3 (pink1/green2), 7 frozen H3 (white17/black17/green17/black16/red15/pink14/black13); mapped colors white→cyan, black→purple, other three identities; ordinary green/white and ice pink6/black7/red13.',
   geometry:'User v1.79 authorizes replacing the old complete 6×7 rectangle with original symmetric connected no-hole geometry; prioritize 42 actual covered cells and source inventory.',
   unlocks:'Ordinary exits, irregular blocks/boards, ice exits and numeric ice allowed by level11; no shells/shutters or later mechanisms.',
   scoring:{difficulty:'hard',necessaryRepositionBand:[16,20],timeSeconds:120,timeStarSeconds:86,historicalReward:40,name:'冻域排序',oldMoveStarTarget:36,minimumNewTotalDrags:38,moveStarAdjustmentAuthorization:'Pending user answer as recorded by frozen v1.79; Lv9 authorization does not automatically extend.'},
   minimumNewTotalDragReason:'22 independent one-layer bodies must clear, plus fresh hard-band lower bound16. This is a conditional new-design bound, not a proof about the old legacy map.',
   routeAndBoundsRequired:'Fresh full no-booster route, valid numerical-ice lower bound, multi-cell decision evidence, native art and full final Pointer/natural-clock checks remain required.'},
 verificationScope:'Source/baseline read-only audit only. No candidate generated or difficulty/Pointer acceptance asserted.',
 bindings,networkUsed:false,productionModified:false,playerSaveTouched:false,releaseApproved:false,
};
const out=`${ROOT}/source-audit-${Date.now()}.json`;
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(`${ROOT}/source-ledger.json`,JSON.stringify(source,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({report:out,ledger:`${ROOT}/source-ledger.json`,status:report.status,sourceColors:source.sourceColorCounts,ice:ice.map(([color,value])=>[color,value]),oldLevelSha:hash(old),nativeBlocks:native.length,actualStars:api.levelStarTargets(old)}));
