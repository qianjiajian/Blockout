import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
const sha=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const clean=x=>JSON.parse(JSON.stringify(x)),raw=p=>sha(fs.readFileSync(p));
const root='deliverables/lv70-remake-20260927',baselineFile=root+'/baseline.json',candidateFile=root+'/design-strengthen-1790509714045/candidate-0.json';
const before=JSON.parse(fs.readFileSync(baselineFile)),candidate=JSON.parse(fs.readFileSync(candidateFile));
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.95.0');
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else files.push(p);}}walk('src');
const oldEvidenceReport=root+'/source-current-audit-1790507770929.json',frozenReview=root+'/source-strengthened-review-1790509969324.json';
const oldEvidence=JSON.parse(fs.readFileSync(oldEvidenceReport)),frozen=JSON.parse(fs.readFileSync(frozenReview));
const historicalPaths=Object.keys(oldEvidence.bindings).filter(p=>p.startsWith('deliverables/remake31-200-v145-20260924/batches/lv061-070/'));
const paths=[...files,baselineFile,candidateFile,oldEvidenceReport,frozenReview,...historicalPaths,root+'/design-ice-light-1790509563742/candidate-4.json','tools/lv70-remake-20260927/design-formal-review.mjs','docs/rules/manifest.json',...['1.90.0','1.91.0','1.92.0','1.93.0','1.94.0','1.95.0'].map(v=>'docs/rules/mechanism-rules-v'+v+'.md')];
const bindings=Object.fromEntries([...new Set(paths)].map(p=>[p,raw(p)]));
const report={status:'RUNNING',createdAt:new Date().toISOString(),activeRule:lock.activeVersion,ruleLockVersions:lock.verified.length,candidate:candidateFile,baseline:baselineFile,scope:'Independent read-only formal Lv70 and exact source/campaign preservation audit',bindings,productionModified:false,testsModified:false,rulesModified:false,playerSaveTouched:false,published:false,lowerBoundRerun:false,pointerValidated:false};
try{
 const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS,LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE} from './src/core/levels.ts';export {applyLevel70GeneratorRemake} from './src/core/level70GeneratorRemake.ts';"},bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
 const formal=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64')),{api}=await loadApi();
 const levels=formal.LEVELS,stage=formal.LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE;assert.equal(levels.length,200);assert.equal(stage.length,200);
 assert.deepEqual(clean(levels[69]),candidate.level,'Final formal Lv70 equals frozen candidate including metadata and complete ordering');
 assert.deepEqual(clean(api.LEVELS),clean(levels));assert.equal(digest(levels[69]),candidate.levelSha256);
 const stageChanged=levels.filter((l,i)=>l!==stage[i]).map(l=>l.id);assert.deepEqual(stageChanged,[70]);
 for(let i=0;i<200;i++)if(i!==69){assert.equal(levels[i],stage[i]);assert.deepEqual(clean(levels[i]),clean(stage[i]));assert.equal(formal.applyLevel70GeneratorRemake(stage[i]),stage[i]);}
 report.formalCandidateExact=true;report.formalCandidateSha256=digest(levels[69]);report.stageChangedIds=stageChanged;report.other199ReferenceAndValuePreserved=true;
 const targets={35:38,36:31,38:49,39:44,41:45,43:24,44:39,46:41,47:46,48:43,50:27,52:45,54:48,55:34,56:40,58:41,59:51};
 const expected=structuredClone(before.levels);for(const[id,target]of Object.entries(targets))expected[Number(id)-1].preservedMoveTarget=target;
 assert.deepEqual(clean(stage),expected,'Before70 stage differs from baseline only by the 17 authorized star targets');
 expected[69]=candidate.level;assert.deepEqual(clean(levels),expected,'All200 exact baseline +17 scores +new70');
 const changedFromBaseline=levels.filter((l,i)=>sha(l)!==before.levelHashes[i].sha256).map(l=>l.id);
 assert.deepEqual(changedFromBaseline,[...Object.keys(targets).map(Number),70].sort((a,b)=>a-b));
 report.concurrentScoreChanges=Object.entries(targets).map(([id,value])=>({id:Number(id),before:before.levels[id-1].preservedMoveTarget,after:value,onlyField:'preservedMoveTarget'}));report.baselineChangedIds=changedFromBaseline;report.other182BaselineValuesPreserved=true;
 const sourceAudits=[];
 for(const[sourcePath,ids]of [['src/core/nativeRemake31to40.ts',[35,36,38,39]],['src/core/remake41to50.ts',[41,43,44,46,47,48,50]],['src/core/remake51to60.ts',[52,54,55,56,58,59]]]){
  const text=fs.readFileSync(sourcePath,'utf8'),ast=ts.createSourceFile(sourcePath,text,ts.ScriptTarget.Latest,true);let object;
  for(const statement of ast.statements)if(ts.isVariableStatement(statement))for(const d of statement.declarationList.declarations)if(d.name.getText(ast)==='reviewed')object=d.initializer;
  assert(object&&ts.isObjectLiteralExpression(object));const edits=[];
  for(const id of ids){const entry=object.properties.find(p=>p.name?.getText(ast).replaceAll('"','')===String(id));assert(entry&&ts.isPropertyAssignment(entry)&&ts.isObjectLiteralExpression(entry.initializer));const field=entry.initializer.properties.find(p=>p.name?.getText(ast).replaceAll('"','')==='preservedMoveTarget');assert(field&&ts.isPropertyAssignment(field)&&ts.isNumericLiteral(field.initializer));assert.equal(Number(field.initializer.text),targets[id]);edits.push({id,start:field.initializer.getStart(ast),end:field.initializer.end,before:before.levels[id-1].preservedMoveTarget,after:targets[id]});}
  let restored=text;for(const e of [...edits].sort((a,b)=>b.start-a.start))restored=restored.slice(0,e.start)+e.before+restored.slice(e.end);
  assert.equal(sha(restored),before.files[sourcePath],'Only approved numeric tokens changed in '+sourcePath);sourceAudits.push({path:sourcePath,edits,baselineRawSha256:before.files[sourcePath],restoredRawSha256:sha(restored),currentRawSha256:raw(sourcePath)});
 }
 const levelsPath='src/core/levels.ts';let oldText=fs.readFileSync(levelsPath,'utf8');
 const fragments=[['import { applyLevel70GeneratorRemake } from "./level70GeneratorRemake";\n',''],['\n// v1.93: only Lv70 gains two midgame generators and the verified 51-drag star target.\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE.map(applyLevel70GeneratorRemake);\n',''],['export const LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE: LevelSpec[] = LEVELS_BEFORE_FROZEN_FLIP.map((level) => (','export const LEVELS: LevelSpec[] = LEVELS_BEFORE_FROZEN_FLIP.map((level) => (']];
 for(const[a,b]of fragments){assert.equal(oldText.split(a).length,2,'One exact authorized wiring fragment');oldText=oldText.replace(a,b);}
 assert.equal(sha(oldText),before.files[levelsPath],'Only Lv70 import/stage/map wiring changed');
 sourceAudits.push({path:levelsPath,baselineRawSha256:before.files[levelsPath],restoredRawSha256:sha(oldText),currentRawSha256:raw(levelsPath),exactWiringFragments:fragments});
 const added=files.filter(p=>!(p in before.files));assert.deepEqual(added,['src/core/level70GeneratorRemake.ts']);assert.deepEqual(Object.keys(before.files).filter(p=>!files.includes(p)),[]);
 const changed=Object.keys(before.files).filter(p=>raw(p)!==before.files[p]).sort();assert.deepEqual(changed,sourceAudits.map(x=>x.path).sort());
 report.source={baselineFiles:Object.keys(before.files).length,currentFiles:files.length,added,changed,unchangedExisting:files.length-added.length-changed.length,sourceAudits,sharedRuntimeAndRenderingUnchanged:true};
 const oldById=new Map(before.level.blocks.map(b=>[b.id,b]));assert.equal(oldById.size,36);
 for(const b of levels[69].blocks){const old=oldById.get(b.id);assert(old);const strip=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['x','y','generatorId'].includes(k)));assert.deepEqual(strip(b),strip(old));}
 assert.deepEqual(levels[69].blocks.map(b=>b.id).sort(),before.level.blocks.map(b=>b.id).sort());
 const oldQueue=new Set(before.level.generators.flatMap(g=>g.queueBlockIds)),newQueue=new Set(levels[69].generators.flatMap(g=>g.queueBlockIds));assert.deepEqual([...newQueue].sort(),[...oldQueue].sort());assert.equal(newQueue.size,17);
 report.inventory={opening:19,queued:17,total:36,allIdsAndNonpositionalSourceAttributesPreserved:true,queueColors:auditGeneratorQueueColors(levels[69]),q0:levels[69].blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')})),art:api.auditCandidateBlockArt(levels[69])};
 assert(report.inventory.queueColors.passed&&report.inventory.art.passed);assert(report.inventory.q0.every(x=>x.match?.quarterTurns===0));
 report.route=api.replayRevisedRoute(levels[69],candidate.drags);assert(report.route.valid&&report.route.complete);assert.equal(report.route.clearEvents,36);assert.equal(report.route.nonClearingDrags,15);assert.equal(report.route.effectiveDrags,51);
 report.stars=api.levelStarTargets(levels[69]);assert.equal(report.stars.moveTarget,51);assert.equal(report.stars.timeTargetSeconds,129);
 report.historicalEvidence=historicalPaths.map(p=>{assert.equal(raw(p),oldEvidence.bindings[p]);return{path:p,sha256:raw(p),unchanged:true};});
 for(const p of [candidateFile,root+'/design-ice-light-1790509563742/candidate-4.json'])assert.equal(raw(p),frozen.bindings[p],'Frozen current and earlier candidate unchanged');
 report.frozenCandidateAndEarlierCandidateUnchanged=true;report.drift=Object.entries(bindings).filter(([p,h])=>raw(p)!==h);assert.deepEqual(report.drift,[]);report.status='FORMAL_LV70_AND_OTHER_199_PRESERVATION_PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);}
const output=root+'/design-formal-review-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const md=output.replace(/\.json$/,'.md');fs.writeFileSync(md,`# 第70关正式数据独审\n\n状态：${report.status}\n\n- 正式70精确等于冻结candidate0；相对新增前stage仅70对象更换，其它199引用/值保持：${report.other199ReferenceAndValuePreserved??false}。\n- 相对最初baseline另有v192/194/195共17个已授权评分变化；未泛称基线其它199全没变化。\n- 全src逐文件核验，现${report.source?.currentFiles??'?'}份；仅新增70模块、levels接线和三个评分模块的17个数字，逐token逆写恢复基线SHA。共享runtime/绘制不变。\n- 19开局+17货逐ID形色属性保持，q0/资源/队列异色通过；当前权威完整51拖=36清除+15多格腾挪，三星51/129。\n- 旧70四份历史源/路线/因果证据和两个本次候选的已存hash保持。下界、双屏与自然时钟由其它独立报告处理，本审计未重新宣称执行。\n\nJSON：${output}\n${report.error?'\n错误：'+report.error+'\n':''}`,{flag:'wx'});
console.log(JSON.stringify({output,md,status:report.status,error:report.error,source:report.source?{...report.source,sourceAudits:undefined}:undefined,levelSha256:report.formalCandidateSha256}));if(report.status==='FAIL')process.exitCode=1;
