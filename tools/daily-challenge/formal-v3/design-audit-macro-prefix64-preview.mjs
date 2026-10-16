import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {absoluteCells,boardCells} from './diversity-layout-factory.mjs';
import {compareLayouts} from './diversity.mjs';
import {auditPlainForwardDrag} from './reverse-route-audit.mjs';
const directory=process.argv[2];assert(directory?.includes('/macro-prefix64-04/preview-'));const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report=read(`${directory}/report.json`),canvas=read(`${directory}/canvas-preview/report.json`),runtime=await loadBoundedRuntime(),rows=[],pairwise=[];
const pts=a=>JSON.stringify([...a].sort((p,q)=>p[1]-q[1]||p[0]-q[0]));assert(report.candidates.length>0&&report.candidates.length<=52);
for(const x of report.candidates){
 const q=read(x.path),p=q.provenance,probe=q.openingProbe,ref=read(p.reference).level,source=runtime.LEVELS.find(l=>l.id===q.sourceLevelId),f=designFingerprints(q.level),prior=read(q.failedParent.file),pf=designFingerprints(prior.level);
 assert.equal(sha(x.path),x.sha256);assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(sha(p.reference),p.referenceSha256);assert.equal(sha(q.failedParent.file),q.failedParent.sha256);
 assert.equal(read(q.failedParent.resultFile).accepted,false);assert.equal(read(q.failedParent.requestFile).id,q.redesignOf);assert.equal(sha(q.failedParent.requestFile),q.failedParent.requestSha256);assert.equal(sha(q.failedParent.resultFile),q.failedParent.resultSha256);
 assert.notEqual(f.shapeSha256,pf.shapeSha256);assert.notEqual(f.colorSha256,pf.colorSha256);const oldColours=new Map(pf.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),shared=f.colorAssignments.filter(b=>oldColours.has(b.id));assert(shared.length?shared.some(b=>oldColours.get(b.id)!==JSON.stringify(b.colors)):JSON.stringify(f.colorAssignments.map(b=>b.colors).sort())!==JSON.stringify(pf.colorAssignments.map(b=>b.colors).sort()));
 assert.equal(q.accepted,false);assert.equal(q.L,null);assert.equal(q.U,null);assert.equal(q.drags,null);assert.equal(q.newLUSearches,0);assert.equal(fs.existsSync(q.unattemptedIdentity.path),false);
 const m=p.macro,a=new Set(m.a.ids),b=new Set(m.b.ids),[dx,dy]=m.translation;assert(![...a].some(id=>b.has(id)));assert.equal(pts(m.a.points),pts(ref.blocks.filter(o=>a.has(o.id)).flatMap(absoluteCells)));assert.equal(pts(m.b.points),pts(ref.blocks.filter(o=>b.has(o.id)).flatMap(absoluteCells)));assert.equal(pts(m.a.points.map(([x,y])=>[x+dx,y+dy])),pts(m.b.points));
 assert(m.areaFraction>=.35&&m.bodyCount>=8&&m.quadrants.length>=3);const translated=structuredClone(ref);for(const o of translated.blocks){if(a.has(o.id)){o.x+=dx;o.y+=dy;}else if(b.has(o.id)){o.x-=dx;o.y-=dy;}}
 const retiled=new Set(p.boundaryRetileBodyIds);assert.equal(retiled.size,2);assert.equal(pts(translated.blocks.filter(o=>retiled.has(o.id)).flatMap(absoluteCells)),pts(q.level.blocks.filter(o=>retiled.has(o.id)).flatMap(absoluteCells)));
 for(const o of q.level.blocks.filter(o=>!retiled.has(o.id))){const old=translated.blocks.find(z=>z.id===o.id);assert.equal(pts(old.shape),pts(o.shape));assert.equal(old.x,o.x);assert.equal(old.y,o.y);}
 assert.equal(q.level.width,source.width);assert.equal(q.level.height,source.height);assert.equal(pts(boardCells(q.level)),pts(boardCells(source)));assert.equal(pts(q.level.blocks.flatMap(absoluteCells)),pts(boardCells(q.level)));assert.notEqual(levelSha256(q.level.gates),levelSha256(ref.gates));
 assert.equal(probe.valid,true);assert(probe.consecutiveParking>=5);assert(probe.initialClears>=1&&probe.initialClears<=2);assert.equal(probe.drags.length,probe.initialClears+probe.consecutiveParking);assert.equal(probe.fullGameSearchPerformed,false);assert.equal(probe.U,null);
 const account=q.prefixConstructionAccounting;assert(account.totalConservativeWorldBound<=10000);assert.equal(account.totalConservativeWorldBound,account.priorConstructionWorldUpperBound+probe.fullWorlds);
 let current=structuredClone(q.level);const fixedWorlds=[levelSha256(current)],prefixAudits=[];
 for(const d of probe.drags){const next=structuredClone(current),b=next.blocks.find(x=>x.id===d.blockId);assert(b);if(d.exitSide)next.blocks=next.blocks.filter(x=>x.id!==d.blockId);else[b.x,b.y]=d.path.at(-1);const a=auditPlainForwardDrag(runtime,current,d,{expectedBodies:next.blocks});assert(a.valid,a.error);prefixAudits.push(a);fixedWorlds.push(levelSha256(next));current=next;}
 assert.equal(current.blocks.length,q.level.blocks.length-probe.initialClears);assert.equal(levelSha256(current),levelSha256(probe.afterPrefixLevel));for(const h of fixedWorlds)assert(probe.worldSha256s.includes(h));assert.equal(new Set(probe.worldSha256s).size,probe.fullWorlds);
 const shot=canvas.rows.find(r=>r.file===x.path);assert(shot);assert.equal(shot.fileSha256,x.sha256);assert.equal(sha(shot.image),shot.imageSha256);assert.equal(shot.errors.length+shot.storage.length+shot.missingWholeBlockIds.length,0);
 rows.push({path:x.path,sha256:x.sha256,source:q.sourceLevelId,width:q.level.width,height:q.level.height,area:boardCells(q.level).length,inventory:q.level.blocks.length,maskSha256:q.sourceMaskSha256,redesignOf:q.redesignOf,
  macroWholeBoardRedesign:{isLocalNeighbour:false,macroAreaFraction:m.areaFraction,macroBodies:m.bodyCount,quadrants:m.quadrants,similarity:q.similarity,actualNewExits:true,ancestryPreserved:p.reference},
  actualPrefix:probe.drags,initialClears:probe.initialClears,consecutiveParking:probe.consecutiveParking,fixedWorlds,openingProbeConsideredWorlds:probe.fullWorlds,constructionAccounting:account,additionalSearches:0,providedActionReplays:prefixAudits,image:shot.image,imageSha256:shot.imageSha256});
}
for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const n=compareLayouts(read(rows[i].path).level,read(rows[j].path).level).footprintSimilarity;assert(n<=.65);pairwise.push({a:i,b:j,similarity:n});}
for(const b of report.bindings)assert.equal(sha(b.path),b.sha256);for(const[file,h]of Object.entries(canvas.sourceBindings))assert.equal(sha(file),h);
const qualificationFile='deliverables/daily-formal-v3-20261008/design/macro-prefix64-04/prefix-qualification.tap',tap=fs.readFileSync(qualificationFile,'utf8');assert(/pass 5/.test(tap)&&/fail 0/.test(tap));
const audit={status:'FIXED_PHASE_MACRO_OPENINGS_INITIAL_CLEAR_AND_LONG_PREFIX_VERIFIED',formalReady:false,accepted:false,completeRoutes:0,LUSearches:0,publicLedgerClaims:0,playerSaveTouched:false,productionChanged:false,
 report:{path:`${directory}/report.json`,sha256:sha(`${directory}/report.json`)},canvas:{path:`${directory}/canvas-preview/report.json`,sha256:sha(`${directory}/canvas-preview/report.json`)},
 qualification:{path:qualificationFile,sha256:sha(qualificationFile),helperSha256:sha('tools/daily-challenge/formal-v3/design-macro-prefix-probe.mjs'),testSha256:sha('tools/daily-challenge/formal-v3/design-macro-prefix-probe.test.mjs'),tests:5,pass:5},
 sourceCount:new Set(rows.map(r=>r.source)).size,maskCount:new Set(rows.map(r=>r.maskSha256)).size,totalDistinctFixedProbeWorlds:rows.reduce((n,r)=>n+r.fixedWorlds.length,0),rows,pairwise,
 visualReview:{method:'Actual Canvas sheets opened and all candidates visually inspected before this audit.',sheets:canvas.sheets,observations:['Normal source masks remain unchanged; full-cover native pieces render without clipping or gaps.','New macro partitions, colour adjacency and rim exits differ substantially across the displayed boards.'],limitations:'Fixed initial1-2 clears plus5-12 consecutive parking only; no complete U, L, or formal Pointer acceptance.'},proofToolchainSha256:runtime.toolchainSha256};
fs.writeFileSync(`${directory}/structure-opening-visual-audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({sources:audit.sourceCount,masks:audit.maskCount,initialClearAndLongPrefix:rows.length,probeWorlds:rows.reduce((n,r)=>n+r.fixedWorlds.length,0),maxPair:Math.max(...pairwise.map(x=>x.similarity)),LUSearches:0}));
