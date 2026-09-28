import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';

const root='deliverables/lv17-remake-20260927',video='C:/Users/Administrator/Desktop/block out/参考视频/11-20.mp4';
const image='deliverables/competitor-screenshots/BlockOut-competitor-levels-001-100-2026-06/levels/competitor-level-017.jpg';
const crop='references/imported/blockout-100-level-images-2026-09-04/crops100/level017.png';
const truthFile='deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
const galleryFile='deliverables/competitor-vs-ours-lv001-200-current-v168-20260927/comparison.json';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.85.0');
const frame=s=>`${root}/source-video-${s}.png`,mapping={blue:'blue',green:'green',pink:'pink',red:'red',yellow:'yellow'};
const SINGLE=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],H3=[[0,0],[1,0],[2,0]],SQ2=[[0,0],[1,0],[0,1],[1,1]],blocks=[];
const add=(x,y,color,shape=SINGLE,frozen=0,core=null,colorSecond=276.3)=>blocks.push({id:`source17-${x}-${y}`,x,y,shape,sourceColor:color,color,frozen,...(core?{sourceLayers:[color,core],layers:[color,core]}:{}),openingEvidence:frame(276.3),colorEvidence:frame(colorSecond),...(frozen?{iceValueEvidence:frame(276.3)}:{})});
for(let y=0;y<2;y++)for(let x=0;x<6;x++)add(x,y,(x+y)%2?'blue':'yellow');
add(0,2,'yellow',H2,6,null,288);add(2,2,'red',H2,6,null,288);add(4,2,'green',H2,6,null,288);
add(0,3,'red',V2);add(1,3,'blue',V2,0,'pink');add(2,3,'yellow',SQ2,0,'green');add(4,3,'pink',V2,0,'yellow');add(5,3,'blue',V2);
add(0,5,'green',H3,18,null,320);add(3,5,'red',H3,18,null,320);
add(0,6,'pink',H3,19,'yellow',321.5);add(3,6,'yellow',H3,19,'blue',321.5);
add(0,7,'blue',H3);add(3,7,'green',H3);
const gates=[
 {id:'source17-yellow-open',side:'right',offset:0,size:2,color:'yellow',frozen:0,colorSecond:276.3},
 {id:'source17-blue-8',side:'left',offset:0,size:2,color:'blue',frozen:8,colorSecond:304},
 {id:'source17-red-16',side:'top',offset:3,size:3,color:'red',frozen:16,colorSecond:316},
 {id:'source17-pink-21',side:'left',offset:3,size:2,color:'pink',frozen:21,colorSecond:324},
 {id:'source17-green-26',side:'bottom',offset:0,size:3,color:'green',frozen:26,colorSecond:332},
].map(({colorSecond,...g})=>({...g,sourceColor:g.color,countEvidence:frame(276.3),colorEvidence:frame(colorSecond)}));
const hist=a=>Object.fromEntries([...new Set(a)].sort().map(k=>[k,a.filter(v=>v===k).length]));
const shapeKey=b=>b.shape.map(p=>p.join(',')).sort().join(';');
const shapes={SINGLE,H2,V2,H3,SQ2},shapeName=b=>Object.keys(shapes).find(k=>shapeKey({shape:shapes[k]})===shapeKey(b));
const playable=Array.from({length:48},(_,i)=>[i%6,Math.floor(i/6)]),occupied=blocks.flatMap(b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]));
assert.equal(blocks.length,26);assert.equal(occupied.length,48);assert.equal(new Set(occupied.map(p=>p.join(','))).size,48);
assert.deepEqual(occupied.map(p=>p.join(',')).sort(),playable.map(p=>p.join(',')).sort());
assert.deepEqual(hist(blocks.map(shapeName)),{H2:3,H3:6,SINGLE:12,SQ2:1,V2:4});
assert.deepEqual(hist(blocks.map(b=>b.color)),{blue:9,green:3,pink:2,red:3,yellow:9});
const shells=blocks.filter(b=>b.layers),ice=blocks.filter(b=>b.frozen);
assert.equal(shells.length,5);assert.equal(ice.length,7);assert.deepEqual(ice.map(b=>b.frozen).sort((a,b)=>a-b),[6,6,6,18,18,19,19]);
const adjacent=[];for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){const a=blocks[i],b=blocks[j];if(a.shape.some(([dx,dy])=>b.shape.some(([ex,ey])=>Math.abs(a.x+dx-b.x-ex)+Math.abs(a.y+dy-b.y-ey)===1)))adjacent.push({a:a.id,b:b.id,outerColors:[a.color,b.color]});}
const source={levelId:17,sourceVideo:video,openingEvidenceSecond:276.3,openingConfirmationSeconds:[276.1,276.2,276.5],completionEvidenceSecond:336,nextLevelEvidenceSecond:344,
 board:{width:6,height:8,playableCount:48,mask:Array(8).fill('######'),kind:'Full 6-by-8 rectangle',openingEmptyCells:[]},openingCount:26,fullCount:26,openingUnfrozenDraggableCount:19,shapeHistogram:{SINGLE:12,H2:3,V2:4,H3:6,SQ2:1},occupiedCells:48,hiddenCount:0,
 sourceColorCounts:hist(blocks.map(b=>b.color)),mappedColorCounts:hist(blocks.map(b=>b.color)),finalCoreColorCounts:hist(blocks.map(b=>b.layers?.at(-1)??b.color)),colorStageEventCounts:hist(blocks.flatMap(b=>b.layers??[b.color])),fullColorCount:5,paletteMapping:mapping,paletteMappingAuthority:'All five actual source colors have exact existing game palette entries. No substitution; old formal purple is not a source color.',blocks,gates,
 shells:{count:5,openingVisuallyExposedCount:3,openingIceOccludedCount:2,extraLayersEach:1,shapeHistogram:{V2:2,SQ2:1,H3:2},pairs:shells.map(b=>({id:b.id,x:b.x,y:b.y,shape:shapeName(b),sourceLayers:b.sourceLayers,layers:b.layers,frozen:b.frozen,evidence:b.colorEvidence})),peelEvents:5,bodyRemovalEvents:26,totalClearEvents:31},
 numericIce:{count:7,values:ice.map(b=>b.frozen),instances:ice.map(b=>({id:b.id,shape:shapeName(b),color:b.color,frozen:b.frozen,...(b.layers?{layers:b.layers}:{}),valueEvidence:b.iceValueEvidence,colorEvidence:b.colorEvidence}))},
 sourceAdjacency:adjacent,sourceSameOuterColorAdjacency:adjacent.filter(a=>a.outerColors[0]===a.outerColors[1]),observedMechanisms:['ordinary_exit','frozen_exit','numeric_ice_block','single_outer_shell'],noOtherMechanismsObserved:true,
 hiddenScope:'No curtains, lifts, generators or separate hidden inventory. The two initial19 ice H3 bodies already occupy opening cells; their shells are visually occluded by ice, not spawned or separate hidden bodies.',
 sourceProgression:[{second:276.3,clearEvents:0,observation:'02:15; all26 bodies/48cells; gates8/16/21/26 and block ice6/18/19 intact.'},{second:288,clearEvents:6,observation:'All three ice6 H2 thawed yellow/red/green; leftyellowH2 has moved to upperleft. Gate8 remaining2.'},{second:304,clearEvents:15,observation:'Blue8 opened; red16 remaining1. BlueV2 shell has exposedpink; SQ2 shell has exposedgreen.'},{second:320,clearEvents:18,observation:'Both ice18 H3 thawed greenleft/redright; two ice19 H3 remain1; pinkgate3/greengate8.'},{second:321.5,clearEvents:19,observation:'Both ice19 H3 thawed: leftpink→yellow, rightyellow→blue; pinkgate2/greengate7. RightH3 being moved whole.'},{second:322,clearEvents:20,observation:'RightH3 yellow shell justpeeled at yellow gate, bluecore visible; pinkgate1/greengate6.'},{second:324,clearEvents:22,observation:'Pink21 gate now visible; leftpink→yellow H3 stillintact; greengate4.'},{second:328,clearEvents:24,observation:'Both initialpink shells peeled, yellowV2 and yellowH3 cores visible; greengate2.'},{second:332,clearEvents:null,observation:'Green26 actual door visible and usable; not inferred from neighboring blocks.'}],
 historicalTruthCorrection:{oldOpeningVisibleShellCount:3,oldReportedFullShellCount:3,correctOpeningVisibleShellCount:3,correctFullShellCount:5,iceOccludedShellIds:['source17-0-6','source17-3-6'],oldReportedTotalClearEvents:29,correctTotalClearEvents:31,firstDiscoveryWasPartialFourShellCount:true,finalEvidence:frame(321.5),reason:'Old summary incorrectly treated only the three visible shells as full inventory. Exact thaw frame reveals two more shells attached to existing initial19 H3 bodies. Counts26/48 and all ice initialvalues remain unchanged.',archiveIsTrueOpening:true,archiveTimer:'02:15',archiveCountsUnchanged:true},
 reviewStatus:'First-stable before-operation frame276.3 and all actual thawed block/gate colors personally reviewed. Shell cores independently visible before/after peeling. No ice/gate color inferred from adjacent blocks; no design or solver invoked.'};
const bind=p=>({path:p.replaceAll('\\','/'),sha256:digest(fs.readFileSync(p)),bytes:fs.statSync(p).size});
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const sourceBaseline={createdAt:new Date().toISOString(),activeVersion:lock.activeVersion,scope:'All pre-existing src files before Lv17 formal write; source-only capture.',files:walk('src').sort().map(bind)};
const ledgerPath=root+'/source-ledger.json',sourceBaselinePath=root+'/source-src-baseline.json';
fs.writeFileSync(ledgerPath,JSON.stringify(source,null,2)+'\n',{flag:'wx'});fs.writeFileSync(sourceBaselinePath,JSON.stringify(sourceBaseline,null,2)+'\n',{flag:'wx'});
const{api,inputs}=await loadApi(),old=api.LEVELS[16];assert.equal(old.id,17);assert.equal(old.difficulty,'hard');assert.deepEqual(api.levelStarTargets(old),{moveTarget:71,timeTargetSeconds:97});assert.equal(old.timeSeconds,135);assert.equal(old.reward,70);assert.equal(old.parMoves,71);
const sourceLevel={...old,blocks:blocks.map(({id,x,y,color,shape,layers,frozen})=>({id,x,y,color,shape,...(layers?{layers}:{}),...(frozen?{frozen}:{})})),gates:gates.map(({id,side,offset,size,color,frozen})=>({id,side,offset,size,color,...(frozen?{frozen}:{})}))};
api.validateLevel(sourceLevel);const art=api.auditCandidateBlockArt(sourceLevel);assert(art.passed);const native=blocks.map(b=>({id:b.id,shape:shapeName(b),match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(native.every(n=>n.match?.quarterTurns===0));
const truth=JSON.parse(fs.readFileSync(truthFile)).levels.find(l=>l.level===17),gallery=JSON.parse(fs.readFileSync(galleryFile)).levels.find(l=>l.level===17);
assert.equal(digest(fs.readFileSync(image)),gallery.competitor.sha256.toLowerCase());
const frames=fs.readdirSync(root).filter(f=>/^source-video-.*\.png$/.test(f)).map(f=>root+'/'+f);
const bindings=[...new Set([video,image,crop,truthFile,galleryFile,ledgerPath,sourceBaselinePath,...frames,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.85.0.md','tools/lv17-remake-20260927/source-audit.mjs','tools/lv17-remake-20260927/source-extract.mjs',...inputs,...art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))])].map(bind);
const report={schemaVersion:1,createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,ruleLock:{passed:true,versionCount:lock.verified.length},status:'SOURCE_AND_BASELINE_AUDIT_COMPLETE',sourceFacts:source,
 oldFormal:{level:old,semanticSha256:digest(old),profile:old.mechanismRules??'legacy',actualStars:api.levelStarTargets(old),shapeHistogram:hist(old.blocks.map(shapeName)),outerColorCounts:hist(old.blocks.map(b=>b.color)),shellCount:old.blocks.filter(b=>b.layers?.length>1).length,numericIce:old.blocks.filter(b=>b.frozen).map(({id,color,frozen})=>({id,color,frozen})),gates:old.gates,sourceGeometryExact:true,sourceShapeInventoryExact:true,sourceColorsAndShellPairsExact:false,sourceGateColorsAndCountersExact:false,reason:'Old formal has26 bodies/48cells but only3shells, one iceblock1 and one icegate1 plus4ordinary gates. Purple/recolored shapes and overlong8/8/6 exits are not exact source facts.'},historicalTruth:{composition:truth.composition,oldTruthModified:false,oldGalleryModified:false},sourceNativeArt:{native,art},
 sourceContract:{preserve:'26 bodies,48 occupied cells:12S/3H2/4V2/6H3/1SQ2; exact26 source shape/color/ice/layer pairs. Five single shells, including two ice19 H3 shells. Seven numericice6/6/6/18/18/19/19; ordinaryyellow and blue8/red16/pink21/green26 gates;31 clear events; no hidden inventory.',geometry:'Keep true6×8 full rectangle. Author new block grouping/adjacency/paths and gate locations, not a source layout D4 copy. Source same-outer-color contacts must be removed by positioning, not inventory edits.',scoring:{oldDifficulty:'hard',newDifficulty:'normal',necessaryRepositionBand:[11,15],timeSeconds:135,timeStarSeconds:97,historicalReward:70,historicalParMoves:71,preservedMoveTarget:71,sourceClearEvents:31,qualifiedWitnessTotalRange:[42,46],moveTargetCapacityConflict:false},hardConflicts:'Source shares some same-outer-color edges that require new positions. No unsupported source palette, capacity, hidden inventory or beyond-unlock mechanism conflict found. Old8/8/6 doors are not retained; new complete cross-section doors must satisfy≤3.'},
 verificationScope:'Source read-only audit only; no generated candidate, route, lower bound, Pointer, human blind test or formal replacement asserted.',bindings,networkUsed:false,productionModified:false,playerSaveTouched:false,releaseApproved:false};
for(const b of bindings)assert.equal(digest(fs.readFileSync(b.path)),b.sha256);
const output=root+'/source-audit-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,ledger:ledgerPath,sourceBaseline:sourceBaselinePath,sourceFiles:sourceBaseline.files.length,status:report.status,sourceShapeInventory:source.shapeHistogram,shells:5,totalClearEvents:31,iceValues:source.numericIce.values,gates:gates.map(({color,frozen})=>({color,frozen})),sameOuterColorAdjacency:source.sourceSameOuterColorAdjacency}));
