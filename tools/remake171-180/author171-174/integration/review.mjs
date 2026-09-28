import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {build} from 'esbuild';
import {digest,ruleGate} from '../../common.mjs';

const ROOT='deliverables/remake171-180-20260927',OUT=ROOT+'/author171-174/integration';
const args=process.argv.slice(2),expected=Number(args[args.indexOf('--expect')+1]),priorFile=args.includes('--prior')?args[args.indexOf('--prior')+1]:null;
assert([9,10].includes(expected),'--expect 9 or --expect 10 is required');
const ownIds=expected===9?[171,173,174,175,176,177,178,179,180]:Array.from({length:10},(_,i)=>171+i);
const dataFile='src/core/remake171to180.ts',fixtureFile='tests/fixtures/remake171to180-v106.json',levelsFile='src/core/levels.ts',artFile='src/game/formalBlockShapes.ts';
const bindings={},immutableBindings={},read=p=>{const bytes=fs.readFileSync(p);bindings[p]=digest(bytes);return bytes.toString();},json=p=>JSON.parse(read(p)),bindImmutable=p=>{const d=json(p);immutableBindings[p]=bindings[p];return d;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),plain=x=>JSON.parse(JSON.stringify(x)),lock=ruleGate();assert.equal(lock.activeVersion,'1.111.0');
read('docs/rules/manifest.json');read('tools/remake171-180/author171-174/integration/review.mjs');
const source={data:read(dataFile),levels:read(levelsFile),art:read(artFile)},fixture=json(fixtureFile),prior=priorFile?bindImmutable(priorFile):null;
assert.equal(fixture.ruleVersion,'1.106.0');assert.deepEqual(fixture.rows.map(r=>r.id),ownIds);
function parseData(file,text){
 const t=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);assert.equal(t.parseDiagnostics.length,0);assert.equal(t.statements.length,4);
 const[imp,...rest]=t.statements;assert(ts.isImportDeclaration(imp)&&imp.importClause?.isTypeOnly);assert.equal(imp.moduleSpecifier.text,'./types');assert.deepEqual(imp.importClause.namedBindings.elements.map(x=>x.name.text),['LevelSpec']);
 const vars={};for(const v of rest){assert(ts.isVariableStatement(v));assert(v.declarationList.flags&ts.NodeFlags.Const);assert.equal(v.declarationList.declarations.length,1);const d=v.declarationList.declarations[0];assert(ts.isIdentifier(d.name)&&d.initializer);assert(!Object.hasOwn(vars,d.name.text));vars[d.name.text]=d.initializer.getText(t);}
 assert.deepEqual(Object.keys(vars),['REMADE_171_180_IDS','reviewed','applyRemake171to180']);assert.equal(vars.applyRemake171to180.replace(/\s/g,''),'(level:LevelSpec):LevelSpec=>reviewed[level.id]??level');
 const ids=JSON.parse(vars.REMADE_171_180_IDS),reviewed=JSON.parse(vars.reviewed);assert.deepEqual(ids,Object.keys(reviewed).map(Number));assert.equal(new Set(ids).size,ids.length);assert(ids.every(id=>id>=171&&id<=180));for(const id of ids)assert.equal(reviewed[id].id,id);return{ids,reviewed};
}
const currentData=parseData(dataFile,source.data);assert.deepEqual(currentData.ids,ownIds);for(const r of fixture.rows)assert.deepEqual(currentData.reviewed[r.id],r.level);
const makeModule=rows=>'// Original layouts, bounded regeneration and fresh verification under v1.106.\nimport type { LevelSpec } from \'./types\';\nexport const REMADE_171_180_IDS: readonly number[] = '+JSON.stringify(rows.map(r=>r.id))+';\nconst reviewed: Record<number, LevelSpec> = '+JSON.stringify(Object.fromEntries(rows.map(r=>[r.id,r.level])),null,2)+';\nexport const applyRemake171to180 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n';
assert.equal(source.data,makeModule(fixture.rows));
const beforeFiles=fs.readdirSync(ROOT).filter(f=>/^adoption-\d+-before\.json$/.test(f)).sort().map(f=>ROOT+'/'+f),records=[];
let previousRows=[],previousAfter=null;
for(let index=0;index<beforeFiles.length;index++){
 const beforeFile=beforeFiles[index],resultFile=beforeFile.replace('-before.json','-result.json'),before=bindImmutable(beforeFile),result=bindImmutable(resultFile),ready=bindImmutable(before.readyFile);
 assert.equal(digest(fs.readFileSync(before.readyFile)),before.readySha256);assert.equal(result.readyFile,before.readyFile);assert.equal(ready.status,'READY_FOR_FORMAL_ADOPTION');
 const newRows=ready.rows.map(r=>{assert(!previousRows.some(old=>old.id===r.id));assert(r.sourceValidated&&r.lower.thresholdProven);const d=bindImmutable(r.file);assert.equal(bindings[r.file],r.candidateSha256);assert.equal(digest(d.level),r.levelSha256);assert.equal(digest(d.drags),r.routeSha256);return{id:r.id,level:d.level,drags:d.drags,lowerBound:r.L,upperBound:r.U};});
 assert.deepEqual(newRows.map(r=>r.id),before.newIds);assert.deepEqual(result.newIds,before.newIds);assert.equal(result.otherLevelsUnchanged,200-newRows.length);assert.equal(before.levels.length,200);assert.deepEqual(before.levels.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
 if(index){assert.deepEqual(JSON.parse(before.source[fixtureFile]),{ruleVersion:'1.106.0',rows:previousRows});const old=parseData(dataFile,before.source[dataFile]);assert.deepEqual(old.ids,previousRows.map(r=>r.id));for(const r of previousRows){assert.deepEqual(old.reviewed[r.id],r.level);assert.deepEqual(before.levels[r.id-1],r.level);}}
 const rows=[...previousRows,...newRows].sort((a,b)=>a.id-b.id),ids=rows.map(r=>r.id);assert.deepEqual(ids,before.ids);assert.deepEqual(ids,result.ids);
 const moduleText=makeModule(rows),fixtureText=JSON.stringify({ruleVersion:'1.106.0',rows},null,2)+'\n';assert.equal(digest(moduleText),result.sourceAfter[dataFile]);assert.equal(digest(fixtureText),result.sourceAfter[fixtureFile]);parseData(dataFile,moduleText);
 let wiring=before.source[levelsFile],art=before.source[artFile];
 if(index===0){
  const anchor='export const LEVELS: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);';assert.equal(wiring.split(anchor).length,2);
  wiring="import { applyRemake171to180 } from './remake171to180';\n"+wiring.replace(anchor,'export const LEVELS_BEFORE_171_180_REMAKE: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_171_180_REMAKE.map(applyRemake171to180);');
  const a='REMADE_161_170_IDS.includes(levelId)';assert.equal(art.split(a).length,2);art="import { REMADE_171_180_IDS } from '../core/remake171to180';\n"+art.replace(a,a+' || REMADE_171_180_IDS.includes(levelId)');
  assert.match(result.initialWriteFailure,/O_TRUNC returned UNKNOWN/);read('tools/remake171-180/complete-first-wiring.mjs');
 }else{assert.equal(wiring,source.levels);assert.equal(art,source.art);}
 assert.equal(digest(wiring),result.sourceAfter[levelsFile]);assert.equal(digest(art),result.sourceAfter[artFile]);assert.equal(wiring,source.levels);assert.equal(art,source.art);
 const after=before.levels.map(l=>newRows.find(r=>r.id===l.id)?.level??l);assert.equal(digest(after),result.campaignSha256);assert.deepEqual(after.filter((l,i)=>!same(l,before.levels[i])).map(l=>l.id),newRows.map(r=>r.id).sort((a,b)=>a-b));
 const untouched=before.levels.filter(l=>!before.newIds.includes(l.id));assert(untouched.every(l=>after[l.id-1]===l));
 const gap=previousAfter?before.levels.filter((l,i)=>!same(l,previousAfter[i])).map(l=>({id:l.id,before:previousAfter[l.id-1],after:l})):[];
 assert(gap.every(r=>r.id<171||r.id>180),'No unauthorized own-scope edit between adoptions');
 records.push({beforeFile,resultFile,newIds:before.newIds,ids,instantOtherCount:untouched.length,beforeCampaignSha256:digest(before.levels),afterCampaignSha256:digest(after),sourceAfter:result.sourceAfter,interveningChanges:gap,firstWiringRecovery:index===0?{reportedFailure:result.initialWriteFailure,independentCheck:'Exact two additive source transformations reconstructed from captured original bytes; module, fixture, both shared file hashes and all200 resulting objects agree. The filesystem failure itself is reported history, not independently re-executed.'}:null});
 previousRows=rows;previousAfter=after;
}
assert.deepEqual(previousRows,fixture.rows);assert.deepEqual(records.at(-1).ids,ownIds);

// Compile the live final stage and preserve JavaScript reference identity.
const treeFiles=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?treeFiles(dir+'/'+e.name):[dir+'/'+e.name]).sort(),sourceFiles=treeFiles('src'),beforeCompileHashes=Object.fromEntries(sourceFiles.map(p=>[p,digest(fs.readFileSync(p))]));
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS,LEVELS_BEFORE_171_180_REMAKE} from './src/core/levels.ts'; export {applyRemake171to180,REMADE_171_180_IDS} from './src/core/remake171to180.ts'; export {matchFormalBlockShapeForLevel,matchFormalBlockShape,FORMAL_BLOCK_SHAPES} from './src/game/formalBlockShapes.ts';"},bundle:true,write:false,metafile:true,format:'esm',platform:'node',logLevel:'silent'});
for(const p of Object.keys(bundle.metafile.inputs).filter(p=>p!=='<stdin>')){const normalized=p.replaceAll('\\','/');assert.equal(digest(fs.readFileSync(p)),beforeCompileHashes[normalized],'Compiler dependency changed during bundle '+p);read(p);}
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64')),stage=api.LEVELS_BEFORE_171_180_REMAKE,current=api.LEVELS;assert.equal(current.length,200);assert.equal(stage.length,200);assert.deepEqual(api.REMADE_171_180_IDS,ownIds);
const stageRows=[];for(let i=0;i<200;i++){const before=stage[i],after=current[i],mapped=api.applyRemake171to180(before),selected=ownIds.includes(before.id);assert.equal(after,mapped);if(selected)assert.deepEqual(plain(after),currentData.reviewed[before.id]);else assert.equal(after,before,'Other level reference identity '+before.id);stageRows.push({id:before.id,selected,sameReference:after===before,beforeSha256:digest(before),afterSha256:digest(after)});}
assert.equal(stageRows.filter(r=>!r.selected&&r.sameReference).length,200-expected);
for(const id of[-1,0,181,201,100000]){const sentinel={id};assert.equal(api.applyRemake171to180(sentinel),sentinel);}
const tailChanges=current.filter((l,i)=>!same(plain(l),previousAfter[i])).map(l=>({id:l.id,before:previousAfter[l.id-1],after:plain(l)}));assert(tailChanges.every(r=>r.id<171||r.id>180));

// Bind each background transition to the actual parallel adoption or the exact182 score edit.
const parallelCache=new Map();
function parallelEvidence(change){
 const key=digest(change);if(parallelCache.has(key))return parallelCache.get(key);let found;
 if(change.id===182){const p='deliverables/star-targets182-185-20260928/applied.json',a=bindImmutable(p),packet=bindImmutable(a.rows.find(r=>r.id===182).file);assert.equal(a.status,'PASS');assert.deepEqual(change.after,{...change.before,preservedMoveTarget:48});assert.deepEqual(packet.level,change.after);found={kind:'exact-score-only-182',file:p,sha256:bindings[p],newTarget:48};}
 else if(change.id>=191&&change.id<=200){const dir='deliverables/remake191-200-20260927';for(const f of fs.readdirSync(dir).filter(f=>/^adoption-\d+-result\.json$/.test(f))){const p=dir+'/'+f,r=JSON.parse(fs.readFileSync(p)),bf=p.replace('-result.json','-before.json'),b=JSON.parse(fs.readFileSync(bf));if(!r.ids.includes(change.id)||!same(b.levels[change.id-1],change.before))continue;const ready=JSON.parse(fs.readFileSync(r.readyFile)),row=ready.rows.find(x=>x.id===change.id);if(!row)continue;const candidate=JSON.parse(fs.readFileSync(row.file));if(!same(candidate.level,change.after))continue;bindImmutable(p);bindImmutable(bf);bindImmutable(r.readyFile);bindImmutable(row.file);assert.equal(bindings[r.readyFile],b.readySha256);assert.equal(bindings[row.file],row.candidateSha256);assert.equal(digest(change.after),row.levelSha256);found={kind:'exact-parallel-191-200-adoption',file:p,beforeFile:bf,readyFile:r.readyFile,candidate:row.file,levelSha256:row.levelSha256};break;}}
 assert(found,'Unreviewed intervening transition '+change.id);parallelCache.set(key,found);return found;
}
for(const record of records)record.interveningChanges=record.interveningChanges.map(c=>({id:c.id,beforeSha256:digest(c.before),afterSha256:digest(c.after),evidence:parallelEvidence(c)}));
const tail=tailChanges.map(c=>({id:c.id,beforeSha256:digest(c.before),afterSha256:digest(c.after),evidence:parallelEvidence(c)}));
const artRows=fixture.rows.map(r=>({id:r.id,bodies:r.level.blocks.map(b=>{const match=api.matchFormalBlockShapeForLevel(b.shape,r.id),native=api.matchFormalBlockShape(b.shape,'native-only');assert(match&&match.quarterTurns===0);assert.deepEqual(match,native);return{id:b.id,shapeId:match.shapeId,quarterTurns:match.quarterTurns};})}));
// Rotated versions unsupported by native lookup must also be unavailable through each accepted level's art policy.
let artNegativeCases=0;for(const definition of api.FORMAL_BLOCK_SHAPES){const rotated=definition.cells.map(([x,y])=>[-y,x]);if(api.matchFormalBlockShape(rotated,'native-only'))continue;for(const id of ownIds){assert.equal(api.matchFormalBlockShapeForLevel(rotated,id),undefined);artNegativeCases++;}}assert(artNegativeCases>0);
const stageAst=ts.createSourceFile(levelsFile,source.levels,ts.ScriptTarget.Latest,true),stageVars=stageAst.statements.filter(ts.isVariableStatement).flatMap(s=>[...s.declarationList.declarations]).filter(d=>ts.isIdentifier(d.name)&&['LEVELS','LEVELS_BEFORE_171_180_REMAKE'].includes(d.name.text));assert.equal(stageVars.length,2);
assert.equal(stageVars.find(d=>d.name.text==='LEVELS').initializer.getText(stageAst),'LEVELS_BEFORE_171_180_REMAKE.map(applyRemake171to180)');assert.equal(stageVars.find(d=>d.name.text==='LEVELS_BEFORE_171_180_REMAKE').initializer.getText(stageAst),'LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200)');
let delta=null;if(prior){assert.equal(prior.status,'NINE_FORMAL_INTEGRATION_PASS');assert.equal(expected,10);assert.deepEqual(prior.ids,[171,173,174,175,176,177,178,179,180]);for(const[p,h]of Object.entries(prior.immutableBindings))assert.equal(digest(fs.readFileSync(p)),h);for(const old of prior.fixtureRows)assert.deepEqual(fixture.rows.find(r=>r.id===old.id),old);assert.deepEqual(records.slice(prior.adoptions.length).flatMap(r=>r.newIds),[172]);delta={prior:priorFile,priorSha256:bindings[priorFile],addedIds:[172],allNinePriorRowsExact:true,oldImmutableEvidencePreserved:true,newAdoptions:records.slice(prior.adoptions.length).map(r=>r.resultFile)};}
const baseline=json(ROOT+'/baseline.json'),first=json(beforeFiles[0]),preTaskBackgroundChanges=first.levels.filter((l,i)=>!same(l,baseline.levels[i].level)).map(l=>l.id);assert(preTaskBackgroundChanges.every(id=>id<171||id>180));
for(const[p,h]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),h,'Input changed during integration review '+p);
assert.deepEqual(treeFiles('src'),sourceFiles);for(const[p,h]of Object.entries(beforeCompileHashes))assert.equal(digest(fs.readFileSync(p)),h,'Source changed during audit '+p);
const report={status:expected===9?'NINE_FORMAL_INTEGRATION_PASS':'TEN_FORMAL_INTEGRATION_PASS',createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,taskRuleVersion:'1.106.0',ids:ownIds,otherCurrentStageObjectsWithExactReferenceIdentity:200-expected,pureDataModule:true,exactFallback:true,finalStageVerified:true,firstWiringRecoveredAndVerified:true,adoptions:records,parallelChangesAfterLastAdoption:tail,preFirstAdoptionBackgroundChanges:preTaskBackgroundChanges,baselineBoundary:'Preservation is checked for each immediate adoption and the current final stage. Differences already present before first adoption are background work, not retroactively attributed to this task.',fixtureRows:fixture.rows,stageRows,artRows,artNegativeCases,currentCampaignSha256:digest(current),delta,bindings,immutableBindings,limitations:['This review validates data integration, current object identity and art eligibility; it does not rerun old lower searches or GUI runs.','First write filesystem error is recorded history. The recovery output is independently reconstructed and hash checked.','Parallel transitions are bound as exact disjoint changes, not re-certified for their gameplay or difficulty.'],playerSaveTouched:false,newGuiRuns:false,release:false};
fs.mkdirSync(OUT,{recursive:true});const out=OUT+'/integration-'+expected+'-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,status:report.status,ids:ownIds,otherIdentity:200-expected,adoptions:records.length,parallelChanges:records.flatMap(r=>r.interveningChanges.map(c=>c.id)),artNegativeCases}));
