import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {OUTPUT,ruleGate,writeNew} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyFormalIntegration} from './verify-formal-integration.mjs';

const lock=ruleGate(),read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>digest(fs.readFileSync(p));
const summaryPath=OUTPUT+'/summary.json',summary=read(summaryPath);
const freshPath=OUTPUT+'/formal-review/run-1790263253628/summary.json',fresh=read(freshPath);
const evidenceOnly=process.argv[2]==='--verify-evidence-only';
const buildPath=evidenceOnly?null:process.argv[2];assert(evidenceOnly||buildPath,'Provide the passing build report');
const testsPath=OUTPUT+'/formal-integration-1790263006147/final-regression-reconciled-current.json';
const tests=read(testsPath);assert(tests.success&&tests.numFailedTests===0);
const checksPath=OUTPUT+'/formal-integration-1790263006147/project-checks-current.json';
const checks=read(checksPath);assert.equal(checks.typecheck.exitCode,0);assert.equal(checks.formalHarnessTests.passed,5);
const staticAudit=await verifyFormalIntegration();
assert.equal(fresh.status,'PASS');assert(fresh.lowerBoundRecomputed&&!fresh.priorPassReused);
const verified=new Map();
function verifyFile(file,expected){assert.equal(hash(file),expected,file);verified.set(file,expected);}
function verifyArchive(a){for(const [file,h]of Object.entries(a.bindings))verifyFile(a.copies[file],h);}
for(const row of summary.rows){
 verifyFile(row.candidate.path,row.candidate.sha256);
 for(const evidence of row.evidence)verifyFile(evidence.path,evidence.sha256);
 const proof=fresh.reports.find(r=>r.id===row.id);assert(proof);
 verifyFile(proof.path,proof.sha256);
 assert.equal(proof.levelSha256,row.candidate.levelSha256);assert.equal(proof.routeSha256,row.candidate.routeSha256);
 assert.equal(proof.lowerBound,row.lowerBound);assert.equal(proof.upperBound,row.upperBound);
 const full=read(proof.path);assert(full.proof.thresholdProven&&full.route.valid&&full.route.complete);
 verifyArchive(full.inputArchive);
}

const lf=s=>s.replaceAll('\r\n','\n');
const parse=text=>ts.createSourceFile('bound.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
// Independently admit only literal reviewed data and its identity-preserving
// lookup. A runtime edit, executable initializer or out-of-batch ID fails.
function reviewedModule(file){
 const text=lf(fs.readFileSync(file,'utf8')),nodes=parse(text).statements;
 const range=path.basename(file).match(/^remake(\d+)to(\d+)\.ts$/);assert(range,file);
 const from=+range[1],to=+range[2],applyName='applyRemake'+from+'to'+to;
 assert(from>=31&&to<=200&&from<=to&&(to<61||from>70));
 let idsName,ids,reviewed,applyFound=false,imports=0;
 for(const n of nodes){
  if(ts.isImportDeclaration(n)){assert(n.importClause?.isTypeOnly&&n.moduleSpecifier.text==='./types');imports++;continue;}
  assert(ts.isVariableStatement(n)&&n.declarationList.declarations.length===1);
  const d=n.declarationList.declarations[0],name=d.name.getText();
  if(name==='reviewed'){reviewed=JSON.parse(d.initializer.getText());}
  else if(name===applyName){assert.equal(d.initializer.getText().replace(/\s/g,''),'(level:LevelSpec):LevelSpec=>reviewed[level.id]??level');applyFound=true;}
  else {assert(/^REMADE_\d+_\d+_IDS$/.test(name));assert(!ids);idsName=name;ids=JSON.parse(d.initializer.getText());}
 }
 assert.equal(imports,1);assert(applyFound&&ids&&reviewed);
 assert.deepEqual(ids,Object.keys(reviewed).map(Number));
 for(const id of ids)assert(Number.isInteger(id)&&id>=from&&id<=to&&reviewed[id].id===id);
 return {modulePath:file,applyName,idsName,ids,sha256:hash(file)};
}
function stripNewImports(text,extra,kind){
 return lf(text).split('\n').filter(line=>!extra.some(g=>kind==='levels'
  ?new RegExp('^import \\{ '+g.applyName+' \\} from [\"\\\']\\./'+path.basename(g.modulePath,'.ts')+'[\"\\\'];$').test(line)
  :new RegExp('^import \\{ '+g.idsName+' \\} from [\"\\\']\\.\\./core/'+path.basename(g.modulePath,'.ts')+'[\"\\\'];$').test(line))).join('\n');
}
function normalizeLevels(text,extra){
 text=stripNewImports(text,extra,'levels');
 const nodes=[...parse(text).statements],decl=n=>ts.isVariableStatement(n)&&n.declarationList.declarations.length===1?n.declarationList.declarations[0]:null;
 const first=nodes.findIndex(n=>decl(n)?.initializer?.getText()==='LEVELS_BEFORE_61_70_REMAKE.map(applyRemake61to70)');
 const last=nodes.findIndex(n=>decl(n)?.name.getText()==='LEVELS');assert(first>=0&&last>=first);
 let previous='LEVELS_BEFORE_61_70_REMAKE';
 for(let i=first;i<=last;i++){
  const d=decl(nodes[i]);assert(d);
  const match=d.initializer.getText().match(/^([A-Z0-9_]+)\.map\((applyRemake\d+to\d+)\)$/);assert(match);
  assert.equal(match[1],previous);
  assert(i===first?match[2]==='applyRemake61to70':extra.some(g=>g.applyName===match[2]));
  previous=d.name.getText();
 }
 return text.slice(0,nodes[first].getStart())+'export const LEVELS: LevelSpec[] = LEVELS_BEFORE_61_70_REMAKE.map(applyRemake61to70);'+text.slice(nodes[last].end);
}
function normalizePolicy(text,extra){
 text=stripNewImports(text,extra,'policy');for(const g of extra)text=text.replaceAll(' || '+g.idsName+'.includes(levelId)','');return text;
}
const pointerReports=fs.readdirSync(OUTPUT).filter(n=>/^formal-pointer-/.test(n))
 .map(n=>OUTPUT+'/'+n+'/report.json').filter(p=>fs.existsSync(p)&&read(p).status==='PASS');
const matrix=[],bridges=[];
for(const file of pointerReports){
 const report=read(file);assert(report.formalEntry&&!report.candidateInjected&&report.naturalClock&&!report.clockFrozen);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.drift,[]);
 for(const [p,h]of Object.entries(report.bindings))verifyFile(p,h);
 const currentLevels=fs.readFileSync('src/core/levels.ts','utf8');
 const extra=[...currentLevels.matchAll(/import \{ (applyRemake\d+to\d+) \} from ["']\.\/(remake\d+to\d+)["'];/g)]
  .map(m=>'src/core/'+m[2]+'.ts').filter(p=>!Object.hasOwn(report.sourceSnapshot,p)).map(reviewedModule);
 const changed=[];
 for(const [p,h]of Object.entries(report.sourceSnapshot)){
  const snapshot=path.join(report.runtimeSnapshot,p);
  verifyFile(snapshot,h);
  if(hash(p)===h)continue;
  const old=fs.readFileSync(snapshot,'utf8'),now=fs.readFileSync(p,'utf8');
  if(p==='src/core/levels.ts')assert.equal(normalizeLevels(now,extra),normalizeLevels(old,extra),'Only separately scoped literal-data stages may differ');
  else if(p==='src/game/formalBlockShapes.ts')assert.equal(normalizePolicy(now,extra),normalizePolicy(old,extra),'Only separate native ID policies may differ');
  else if(/^src\/core\/remake\d+to\d+\.ts$/.test(p)){const a=reviewedModule(p),b=reviewedModule(snapshot);assert.equal(a.applyName,b.applyName);}
  else assert.fail('Unreviewed runtime drift: '+p);
  changed.push({path:p,snapshotSha256:h,currentSha256:hash(p)});
 }
 bridges.push({report:file,sha256:hash(file),allowedSeparateBatchChanges:changed,literalDataOnlyAddedModules:extra});
 for(const r of report.rows){
  const selected=summary.rows.find(s=>s.id===r.id);assert(selected);
  assert.equal(r.status,'PASS');assert.equal(r.levelSha256,selected.candidate.levelSha256);
  assert.equal(r.routeSha256,selected.candidate.routeSha256);
  assert(r.formalObjectIdentity&&r.formalDefinitionsUnchanged&&!r.candidateInjected);
  assert(r.final.complete&&!r.final.failed&&r.final.remainingSeconds>0);
  assert(r.naturalTimingReplay.passed&&r.naturalTimingReplay.wholeModelReplay);
  assert.equal(r.nativeDrawAudit.rotated,0);assert.equal(r.nativeDrawAudit.canvasRotationCalls,0);
  assert.equal(r.final.moves,selected.totalDrags);assert.equal(r.nonClearingDrags,selected.upperBound);
  matrix.push({id:r.id,viewport:report.viewport,report:file,reportSha256:hash(file),
   totalDrags:r.final.moves,nonClearingDrags:r.nonClearingDrags,remainingSeconds:r.final.remainingSeconds,
   levelSha256:r.levelSha256,routeSha256:r.routeSha256,formalObjectIdentity:true,candidateInjected:false,
   naturalTimingReplay:true,openingScreenshot:path.dirname(file)+'/lv'+r.id+'-opening.png',
   completeScreenshot:path.dirname(file)+'/lv'+r.id+'-complete.png'});
 }
}
for(const row of summary.rows)for(const [width,height]of [[320,568],[496,1078]])
 assert.equal(matrix.filter(m=>m.id===row.id&&m.viewport.width===width&&m.viewport.height===height).length,1,'Lv'+row.id+' '+width+'×'+height+' must have exactly one complete passing run');
assert.equal(matrix.length,20);
const visualPath=OUTPUT+'/formal-review/visual-small-screen.json',visual=read(visualPath);assert.equal(visual.status,'PASS');
const rootVisualPath=OUTPUT+'/formal-review/visual-root.json',rootVisual=read(rootVisualPath);assert.equal(rootVisual.status,'PASS');
for(const f of rootVisual.files)verifyFile(f.path,f.sha256);
const totalPointerDrags=matrix.reduce((n,r)=>n+r.totalDrags,0);assert.equal(totalPointerDrags,868);
if(evidenceOnly){console.log(JSON.stringify({status:'EVIDENCE_PASS_BUILD_NOT_CHECKED',scenarios:matrix.length,totalPointerDrags,verifiedImmutableFiles:verified.size}));process.exit(0);}
const build=read(buildPath);assert.equal(build.status,'PASS');
assert(build.privateBuildInputsUnchanged&&build.sourceInputsStableDuringCopy);
for(const r of build.formalSelectionAfterBuild){
 const expected=summary.rows.find(s=>s.id===r.id);assert(expected);
 assert.equal(r.levelSha256,expected.candidate.levelSha256);
 assert.equal(r.routeSha256,expected.candidate.routeSha256);
}
const buildBindings=read(path.join(path.dirname(buildPath),'snapshot-input-bindings.json'));
for(const [p,item]of Object.entries(buildBindings))verifyFile(path.join(build.snapshot,p),item.sha256);
const report={status:'FORMAL_BATCH_COMPLETE',checkedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,designContract:'1.45.0',
 verifier:{path:'tools/campaign-v145/lv061-070/finalize-formal-batch.mjs',sha256:hash('tools/campaign-v145/lv061-070/finalize-formal-batch.mjs')},
 formalAdoptedCount:10,scope:[61,70],candidateHistory:{path:summaryPath,sha256:hash(summaryPath)},
 freshFormalProof:{path:freshPath,sha256:hash(freshPath),lowerBoundRecomputed:true},
 actualFinalStaticAudit:staticAudit,pointerMatrix:matrix,totalPointerDrags,runtimeBridges:bridges,
 verifiedImmutableFiles:verified.size,build:{path:buildPath,sha256:hash(buildPath),status:build.status},
 tests:{path:testsPath,sha256:hash(testsPath),passed:tests.numPassedTests},
 projectChecks:{path:checksPath,sha256:hash(checksPath)},visual:{path:visualPath,sha256:hash(visualPath)},rootVisual:{path:rootVisualPath,sha256:hash(rootVisualPath)},
 rows:summary.rows.map(r=>({id:r.id,difficulty:r.target.difficulty,lowerBound:r.lowerBound,upperBound:r.upperBound,totalDrags:r.totalDrags,
  levelSha256:r.candidate.levelSha256,routeSha256:r.candidate.routeSha256,starAssessment:r.starAssessment,formalAdopted:true})),
 humanBlindTested:false,mobileDeviceTested:false,playerSaveTouched:false,published:false};
writeNew(OUTPUT+'/formal-summary.json',report);
console.log(JSON.stringify({status:report.status,formalAdoptedCount:10,pointerScenarios:matrix.length,totalPointerDrags,verifiedImmutableFiles:verified.size,report:OUTPUT+'/formal-summary.json'}));
