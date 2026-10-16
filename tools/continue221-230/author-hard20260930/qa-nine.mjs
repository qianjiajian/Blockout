import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {loadApi,replay} from '../../remake191-200/replay.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {auditGeneratorQueueColors} from '../../revised-generator-queue-colors.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {verifySourceGeometry} from '../source-geometry.mjs';
import {checkLevelSpecLiteral} from '../levelspec-literal-check.mjs';
import {compile222,payload222} from '../../../deliverables/continue221-230-20260929/domain221222.mjs';
import {keyPayload} from '../../remake191-200/author194-196/key-floor.mjs';
import {searchSpatial,loadSpatialApi} from '../../remake111to120-spatial-floor-v147.mjs';

const lock=verifyRulesLock();assert(lock.ok);
const root='deliverables/continue221-230-20260930';
const sha=b=>createHash('sha256').update(b).digest('hex');
const jsonHash=x=>sha(JSON.stringify(x));
const read=f=>JSON.parse(fs.readFileSync(f));
const {api}=await loadApi();
const bundled=await build({stdin:{resolveDir:process.cwd(),contents:"export {GAME_ART} from './src/game/artManifest';"},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {GAME_ART}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const manifest=read('art-source/manifest.json');
const entries=new Map(manifest.assets.map(a=>[path.resolve('art-source',a.runtime),a]));
const paths=[
 ['qualified221-final.json','pointer-1790740619350-496x1078-42124/report.json','pointer-1790740630020-320x568-28940/report.json'],
 ['author222-domino/qualified222.json','pointer-1790740619350-496x1078-42124/report.json','pointer-1790740630020-320x568-28940/report.json'],
 ['qualified223.json','pointer-1790739852991-496x1078-7712/report.json','pointer-1790739864004-320x568-55828/report.json'],
 ['qualified225-source-mask.json','pointer-1790738148265-496x1078-61256/report.json','pointer-1790738148319-320x568-59048/report.json'],
 ['author226-structured/qualified226-schema.json','pointer-1790739491310-496x1078-51888/report.json','pointer-1790739501416-320x568-64244/report.json'],
 ['qualified227-sourcefull.json','pointer-1790740955724-496x1078-11780/report.json','pointer-1790740965954-320x568-57016/report.json'],
 ['author228-contour/qualified228.json','pointer-1790738838967-496x1078-20924/report.json','pointer-1790738849958-320x568-58512/report.json'],
 ['author229-contour/qualified229.json','pointer-1790738451942-496x1078-13580/report.json','pointer-1790738600889-320x568-44416/report.json'],
 ['author230-regions/qualified230.json','pointer-1790737384272-496x1078-2644/report.json','pointer-1790737384280-320x568-52844/report.json'],
];
if(process.argv[3]==='224')paths.splice(0,paths.length,['224-row-domino/headless224.json','pointer-1790741509221-496x1078-28788/report.json','pointer-1790741509266-320x568-43688/report.json']);
const reference={
 221:{bodies:30,shells:0,stars:0,axes:['vertical','vertical'],iceBodies:[],iceGates:[15,15],curtains:[10,10],lifts:0,hiddenBodies:17,keys:0,locks:[],queues:[],bombs:[],sourceM11:5},
 222:{bodies:28,shells:2,stars:8,axes:[],iceBodies:[],iceGates:[3,6,9,12,14,14],curtains:[10],lifts:0,hiddenBodies:3,keys:0,locks:[],queues:[],bombs:[],sourceM11:2},
 223:{bodies:29,shells:5,stars:0,axes:['horizontal'],iceBodies:[11],iceGates:[5,13,15,20,26],curtains:[],lifts:1,hiddenBodies:2,keys:0,locks:[],queues:[],bombs:[],sourceM11:0},
 224:{bodies:27,shells:0,stars:0,axes:[],iceBodies:[10,10,10],iceGates:[4,10,14,16],curtains:[8],lifts:0,hiddenBodies:10,keys:0,locks:[],queues:[],bombs:[],sourceM11:5},
 225:{bodies:28,shells:0,stars:0,axes:[],iceBodies:[],iceGates:[],curtains:[],lifts:0,hiddenBodies:0,keys:0,locks:[],queues:[],bombs:[],sourceM11:4},
 226:{bodies:28,shells:3,stars:0,axes:[],iceBodies:[17],iceGates:[3,12,18],curtains:[],lifts:0,hiddenBodies:0,keys:3,locks:[1,2],queues:[3],bombs:[],sourceM11:4},
 227:{bodies:26,shells:4,stars:0,axes:[],iceBodies:[],iceGates:[],curtains:[8],lifts:0,hiddenBodies:3,keys:0,locks:[],queues:[],bombs:[30],sourceM11:7},
 228:{bodies:14,shells:4,stars:0,axes:['vertical'],iceBodies:[],iceGates:[3,4,8,12],curtains:[],lifts:0,hiddenBodies:0,keys:0,locks:[],queues:[],bombs:[],sourceM11:2},
 229:{bodies:18,shells:0,stars:0,axes:['horizontal','horizontal','vertical','vertical'],iceBodies:[],iceGates:[],curtains:[],lifts:0,hiddenBodies:0,keys:2,locks:[1,1],queues:[],bombs:[],sourceM11:2},
 230:{bodies:23,shells:0,stars:0,axes:[],iceBodies:[],iceGates:[4,4,4,4],curtains:[],lifts:0,hiddenBodies:0,keys:0,locks:[],queues:[],bombs:[],sourceM11:1},
};
const sort=a=>a.sort((a,b)=>typeof a==='number'?a-b:String(a).localeCompare(String(b)));
const nonrect=b=>b.shape.length!==(Math.max(...b.shape.map(p=>p[0]))-Math.min(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))-Math.min(...b.shape.map(p=>p[1]))+1);
function inventory(l){return {bodies:l.blocks.length,shells:l.blocks.filter(b=>b.layers?.length>1).length,stars:l.blocks.filter(b=>b.star).length,axes:sort(l.blocks.filter(b=>b.movementAxis).map(b=>b.movementAxis)),iceBodies:sort(l.blocks.filter(b=>b.frozen).map(b=>b.frozen)),iceGates:sort(l.gates.filter(g=>g.frozen).map(g=>g.frozen)),curtains:sort((l.shutters??[]).filter(s=>s.skin!=='lift').map(s=>s.count)),lifts:(l.shutters??[]).filter(s=>s.skin==='lift').length,hiddenBodies:l.blocks.filter(b=>b.shutterId).length,keys:l.blocks.filter(b=>b.keyId).length,locks:sort(l.blocks.filter(b=>b.lockedBy).map(b=>b.lockCount??1)),queues:sort((l.generators??[]).map(g=>g.queueBlockIds.length)),bombs:sort(l.blocks.filter(b=>b.timedBombSeconds).map(b=>b.timedBombSeconds))};}
function gameplay(l){const c=structuredClone(l);for(const k of ['mechanismAdaptation','name','difficulty','timeSeconds','reward','parMoves','preservedMoveTarget','designTargets'])delete c[k];for(const g of c.gates??[]){const origin=g.side==='left'?[0,g.offset]:g.side==='right'?[c.width-1,g.offset]:g.side==='top'?[g.offset,0]:[g.offset,c.height-1];if(g.portals&&digest(g.portals)===digest([{side:g.side,origin,size:g.size}]))delete g.portals;}return c;}
function evidenceBinding(packet){
 const l=packet.level,id=l.id,proof=packet.proof,details={floor:proof.floor,status:proof.status,termination:proof.termination,thresholdProven:proof.thresholdProven};
 assert(proof.thresholdProven&&proof.termination==='below-threshold-exhausted');
 if(id===225){const expected={...structuredClone(l),mechanismRules:'revised-2026-09-23-v1.4',flipDoors:[],gates:[...l.gates,...l.flipDoors.map(({initiallyOpen,...g})=>g)]};assert.deepEqual(packet.proofQualification.projection,expected);assert.equal(proof.sourceLevelSha256,digest(expected));assert.equal(packet.proofQualification.sourceLevelSha256,digest(l));details.projection='All three flips always open, all bodies retained';details.inputBound=true;return details;}
 const input=read(proof.input),output=read(proof.output),sourceBytes=fs.readFileSync(proof.source);assert.equal(sha(sourceBytes),proof.sourceHash??proof.sourceSha256);assert([sha(fs.readFileSync(proof.input)),digest(input),jsonHash(input)].includes(proof.inputSha256));for(const k of ['floor','thresholdProven','status','termination'])assert.equal(output[k],proof[k]);
 let p,projected=l;
 if(id===221||id===222){p=payload222(compile222(l));if(id===221)p.groups=[];}
 else {
  if(id===223){projected=packet.projection;const expected=gameplay(l);expected.blocks=projected.blocks.map(b=>{const v=structuredClone(l.blocks.find(a=>a.id===b.id));assert(v&&!v.shutterId);delete v.layers;return v;});delete expected.shutters;assert.deepEqual(gameplay(projected),expected);assert.equal(projected.blocks.length,27);const lift=l.shutters.find(s=>s.skin==='lift'),guard=l.blocks.find(b=>b.frozen===11);assert(guard.shape.some(([dx,dy])=>guard.x+dx>=lift.x&&guard.x+dx<lift.x+lift.width&&guard.y+dy>=lift.y&&guard.y+dy<lift.y+lift.height));assert(l.blocks.filter(b=>b.layers&&!b.shutterId).every(b=>b.layers[0]==='yellow'));assert(l.gates.filter(g=>g.color==='yellow').every(g=>g.frozen>=13));details.projection='Exact prefix to 11 clears: frozen11 guard prevents lift; yellow shells cannot peel before gate13.';}
  if(id===226){projected=packet.projection.level;const expected=structuredClone(l),queue=new Set(l.generators.flatMap(g=>g.queueBlockIds));expected.blocks=expected.blocks.filter(b=>!queue.has(b.id));delete expected.generators;assert.deepEqual(gameplay(projected),gameplay(expected));const guard=l.blocks.find(b=>b.id===packet.projection.guard),g=l.generators[0],cargo=l.blocks.find(b=>b.id===g.queueBlockIds[0]);assert.equal(guard.frozen,17);assert(guard.shape.some(([dx,dy])=>cargo.shape.some(([cx,cy])=>guard.x+dx===g.spawn[0]+cx&&guard.y+dy===g.spawn[1]+cy)));details.projection='Exact prefix to 17 clears: frozen17 immovable guard blocks first FIFO spawn; all opening bodies retained.';}
  if(id===227){projected=structuredClone(l);for(const b of projected.blocks)delete b.timedBombSeconds;details.projection='Only bomb deadlines removed; all bodies, layers, covers and gates retained.';}
  if(id===224||id===230){projected=structuredClone(l);delete projected.coloredGrids;}
  p=keyPayload(projected).p;
  if(id===223)p.goalClears=11;
  if(id===226)p.goalClears=17;
  if(id===224){for(const[i,b]of l.blocks.entries())p.blocks[i].forbidden=(b.layers??[b.color]).map(color=>{const words=[0,0,0,0];for(const grid of l.coloredGrids)if(grid.color!==color)for(const[x,y]of grid.cells){const at=y*l.width+x;words[at>>>5]|=1<<(at&31);}return words;});details.projection='All full inventory, hidden count8 cover, three ice10 blocks, four ice gates and both colored grids retained exactly in per-stage forbidden masks. Optional contact and omitted exit sweep relaxations only.';}
  if(id===223||id===228||id===229){const groups=new Map();for(const[i,b]of projected.blocks.entries()){const key=JSON.stringify({shape:b.shape,color:b.color,layers:b.layers,frozen:b.frozen,movementAxis:b.movementAxis,keyId:b.keyId,lockedBy:b.lockedBy,lockCount:b.lockCount});if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}p.groups=[...groups.values()].filter(g=>g.length>1);}
  if(id===230)for(let i=0;i<l.blocks.length;i++){const b=l.blocks[i],bad=new Set(l.coloredGrids.filter(g=>g.color!==b.color).flatMap(g=>g.cells.map(([x,y])=>y*l.width+x))),body=p.blocks[i];body.poses=body.poses.map((pose,j)=>pose&&!b.shape.some(([dx,dy])=>bad.has(j+dy*l.width+dx))?pose:null);for(const pose of body.poses)if(pose)pose.neighbors=pose.neighbors.filter(j=>body.poses[j]);}
 }
 for(const k of ['floor','maxStates','maxMilliseconds'])p[k]=input[k];assert.deepEqual(p,input);
 details.inputBound=true;details.input=proof.input;details.inputSha256=sha(fs.readFileSync(proof.input));details.backend=proof.source;details.backendSha256=sha(sourceBytes);details.exploredStates=proof.exploredStates;details.qualificationPassed=packet.qualification?.passed??Boolean(packet.proofQualification);return details;
}

const rows=[];
for(const [file,...reports]of paths){
 const packet=read(root+'/'+file),level=packet.level,row={id:level.id,file:root+'/'+file,packetFileSha256:sha(fs.readFileSync(root+'/'+file)),levelSha256:digest(level),routeSha256:digest(packet.drags),issues:[],notes:[]};
 const check=(name,fn)=>{try{row[name]=fn();return row[name];}catch(e){row.issues.push({code:name,message:e.message});row[name]={passed:false,error:e.message};}};
 check('packetHashes',()=>{assert([digest(level),jsonHash(level)].includes(packet.levelSha256));assert([digest(packet.drags),jsonHash(packet.drags)].includes(packet.routeSha256));return{passed:true,packetLevelHash:packet.levelSha256,packetRouteHash:packet.routeSha256};});
 check('sourceGeometry',()=>verifySourceGeometry(level));
 check('strictLevelSpec',()=>{const r=checkLevelSpecLiteral(level,root+'/qa-nine-literals/level'+level.id+'.ts');assert(r.passed,JSON.stringify(r.diagnostics));return r;});
 check('staticModel',()=>{api.validateLevel(level);const ignore=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);const issues=api.auditRevisedCandidate(level).issues.filter(i=>!ignore.has(i.code));assert.deepEqual(issues,[]);const opening=auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden=auditHiddenCoverage(level),queue=auditGeneratorQueueColors(level),gates=auditGateSpanLimits(level);assert(opening.passed&&hidden.passed&&queue.passed&&gates.passed);return{passed:true,opening,hidden,queue,gates};});
 check('assets',()=>{const assets=[],fallback=[];function asset(url,usage){assert(url,'Unregistered asset '+usage);const file='public/'+url,e=entries.get(path.resolve(file));assert(e,'Absent art-source entry '+url);const data=fs.readFileSync(file);assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(data.readUInt32BE(16),e.width);assert.equal(data.readUInt32BE(20),e.height);assert(fs.existsSync(path.resolve('art-source',e.source)));assets.push({usage,url,manifestKey:e.key,width:e.width,height:e.height,sha256:sha(data)});}
  for(const b of level.blocks){const m=api.matchFormalBlockShape(b.shape,'native-only');assert.equal(m?.quarterTurns,0);for(const color of b.layers??[b.color])asset(GAME_ART.gameplay.formalBlocks[color]?.solid[m.shapeId],b.id+':'+color+':solid');if(b.layers?.length>1){const url=GAME_ART.gameplay.formalBlocks[b.layers[0]]?.shell[m.shapeId];if(url)asset(url,b.id+':shell');else fallback.push({blockId:b.id,shapeId:m.shapeId,layers:b.layers,mode:'existing native outer solid + inner-colour badge',dedicatedShellAsset:false});}}
  if(fallback.length)asset(GAME_ART.gameplay.layerPreviewBadges,'fallback inner-colour badges');
  for(const g of [...level.gates,...level.flipDoors??[]])for(const portal of g.portals??[g]){const horizontal=['top','bottom'].includes(portal.side),span=Math.min(3,portal.size);asset(GAME_ART.gameplay.gates[g.color]?.[horizontal?'horizontal':'vertical']?.[span],g.id+':gate-span-'+portal.size);}
  return{passed:true,assets,shellPresentationFallback:fallback};});
 check('mechanismInventory',()=>{const actual=inventory(level),{sourceM11,...expected}=reference[level.id];assert.deepEqual(actual,expected);if(level.id===225)assert.deepEqual(sort(level.flipDoors.map(g=>g.color+':'+g.initiallyOpen)),['blue:false','purple:false','yellow:true']);if(level.id===227)assert.equal(level.coloredGrids?.length??0,0);if(level.id===230){assert.deepEqual(sort(level.coloredGrids.map(g=>g.cells.length)),[3,9,9,9]);assert.equal(level.blocks.filter(b=>b.color==='orange').length,4);}const count=level.blocks.filter(nonrect).length;assert(count/level.blocks.length<=.3);if(sourceM11>0&&count===0){const differences={222:'Source yellow→green T4 shell becomes yellow→green V2 (l222-2); source green L3 becomes blue V2 (l222-7). All star/shell/hidden flags and counters retained.',228:'Source yellow L3 becomes yellow H3 (l228-b9); source red J4 becomes purple SQ2 (l228-b10). Four shells and green H2 vertical-axis carrier retained.',229:'Source yellow/red-token L3 lock becomes purple V3 (l229-b2), source light-green/blue-token L3 lock becomes blue V3 (l229-b3); both lock tokens and count1 retained.',230:'Source green L3 becomes green V3 (l230-green-core). Source three shells removed under explicit colored-grid/shell compatibility adaptation; orange body carriers retained.'};row.notes.push({code:'DECLARED_AUTHORIZED_SHAPE_ADAPTATION',sourceIrregularBodyCount:sourceM11,authoredIrregularBodyCount:0,exactSourceShapeInventoryPreserved:false,detail:differences[level.id],basis:'Parent confirmed current user finite-regeneration authorization permits changing block kinds; source geometry adaptations must be disclosed, and attached mechanism effects/counts/initial values retained.'});if(level.id===222)row.notes.push({code:'SOURCE_LEDGER_PLAN_CORRECTION',field:'source.conflicts[0]',obsoleteText:'preserving two shells and shape inventory',correction:'The final authorized adaptation preserves two shells and all body instances, not the source shape inventory. This QA sidecar supersedes that obsolete design-plan phrase; the old source ledger and final level bytes remain unchanged.'});}return{passed:true,expected,actual,sourceM11,authoredM11:count,irregularRatio:count/level.blocks.length,sourceM11BodyCountPreserved:sourceM11===count};});
 check('independentReplay',()=>{const r=replay(level,packet.drags,api,{timed:true,complete:true,requirePointerCompatible:true});delete r.final;delete r.finalStateKey;assert(r.valid&&r.complete);return r;});
 check('proofBinding',()=>evidenceBinding(packet));
 check('difficulty',()=>{const band=[221,225,228].includes(level.id)?[5,10]:[224,227].includes(level.id)?[16,20]:level.id===230?[21,30]:[11,15];const L=packet.proof.floor,U=row.independentReplay.nonClearingDrags;assert(L>=band[0]&&L<=U&&U<=band[1]);assert.equal(packet.drags.length,level.preservedMoveTarget);return{passed:true,band,L,U,totalDrags:packet.drags.length,starTargets:api.levelStarTargets(level),exactMinimumClaimed:false};});
 check('pointerEvidence',()=>reports.map(file=>{const r=read(root+'/'+file),entry=r.rows.find(a=>a.id===level.id);assert.equal(r.status,'PASS');assert(r.candidateOnly&&r.naturalClock&&!r.clockFrozen);assert.equal(entry.levelSha256,row.levelSha256);assert.equal(entry.routeSha256,row.routeSha256);assert.equal(entry.settlement.earnedStars,3);assert(entry.naturalTimingReplay.passed);assert.equal(entry.nonClearingDrags,row.independentReplay.nonClearingDrags);return{file:root+'/'+file,reportSha256:sha(fs.readFileSync(root+'/'+file)),viewport:r.viewport,earnedStars:3,naturalTimingReplayPassed:true,elapsedSeconds:level.timeSeconds-entry.final.remainingSeconds};}));
 row.notes.push('Source geometry and inventory independently compared against packet observation ledgers; this QA does not claim fresh visual re-observation of every source video frame.');
 if(level.id===227)row.notes.push('Two shell sprites use the existing formal native-solid + inner-colour badge fallback. Asset support and complete shell peel replay verified; this script does not itself perform new screenshot visual inspection.');
 row.mechanicalPassed=row.issues.every(i=>i.code==='SOURCE_M11_OMITTED');row.passed=row.issues.length===0;rows.push(row);console.log(JSON.stringify({id:row.id,passed:row.passed,mechanicalPassed:row.mechanicalPassed,issues:row.issues.map(i=>({code:i.code,message:i.message.slice(0,220)}))}));
}
const result={createdAt:new Date().toISOString(),activeRule:lock.activeVersion,governingRule:'1.121.0',scope:process.argv[3]==='224'?'Final 224 headless gameplay/proof/Pointer binding audit; external source ledger finalization remains separate.':'Nine existing isolated candidate packets; independent read-only model/static/assets/proof-input/source-ledger/pointer-binding audit. No candidate mutation.',passed:rows.every(r=>r.passed),mechanicalPassed:rows.every(r=>r.mechanicalPassed),rows,formalAdopted:false,releaseApproved:false,productionBoundary:200};
const output=process.argv[2]??root+'/qa-nine.json';fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:result.passed,mechanicalPassed:result.mechanicalPassed}));
