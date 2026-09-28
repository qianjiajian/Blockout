import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import ts from 'typescript';
import {OUTPUT,ruleGate} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {computeWechatSourceFingerprint} from '../../../scripts/wechat-build-integrity.mjs';

const sourceTrees=['src','public','wechat','scripts'];
const requiredFiles=['package.json','pnpm-lock.yaml','vite.config.ts','tsconfig.json','project.config.json'];
const optionalFiles=['project.private.config.json','.npmrc'];
const toolEntries=['tools/verify-wechat-project.mjs','tools/wechat-layout-codec.mjs'];
const normalize=p=>p.replaceAll('\\','/');
export function inside(root,target){
 const rel=path.relative(path.resolve(root),path.resolve(target));
 assert(rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel),`Path must remain below ${root}: ${target}`);
 return path.resolve(target);
}
function filesIn(root,relative){
 const absolute=inside(root,path.resolve(root,relative)),stat=fs.lstatSync(absolute);
 assert(!stat.isSymbolicLink(),`Source symlinks are not copied: ${relative}`);
 if(stat.isFile())return[normalize(relative)];
 assert(stat.isDirectory(),`Unsupported source entry: ${relative}`);
 return fs.readdirSync(absolute).sort().flatMap(name=>filesIn(root,path.join(relative,name)));
}
function inputsFor(root){
 const selected=new Set(sourceTrees.flatMap(dir=>filesIn(root,dir)));
 for(const file of requiredFiles){assert(fs.existsSync(path.join(root,file)),`Missing build input ${file}`);selected.add(file);}
 for(const file of optionalFiles)if(fs.existsSync(path.join(root,file)))selected.add(file);
 for(const name of fs.readdirSync(root))if(name.endsWith('.html')&&fs.statSync(path.join(root,name)).isFile())selected.add(name);
 // Include only build/verify tool dependencies, never the whole tools tree or deliverables.
 const visited=new Set();
 function visit(file){
  file=normalize(file);if(visited.has(file))return;visited.add(file);selected.add(file);
  const absolute=inside(root,path.join(root,file));assert(fs.statSync(absolute).isFile());
  const parsed=ts.createSourceFile(file,fs.readFileSync(absolute,'utf8'),ts.ScriptTarget.Latest,true);
  for(const statement of parsed.statements){
   if(!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;
   const spec=statement.moduleSpecifier;if(!spec||!ts.isStringLiteral(spec)||!spec.text.startsWith('.'))continue;
   const target=inside(root,path.resolve(path.dirname(absolute),spec.text)),relative=normalize(path.relative(root,target));
   assert(/^(scripts|tools|src)\//.test(relative),`Unexpected build helper dependency: ${relative}`);
   if(fs.existsSync(target)&&fs.statSync(target).isFile())visit(relative);else throw Error(`Unresolved build helper dependency: ${relative}`);
  }
 }
 for(const file of toolEntries)visit(file);
 for(const file of [...selected].filter(p=>p.startsWith('scripts/')&&/\.[cm]?[jt]s$/.test(p)))visit(file);
 return [...selected].sort();
}
function fingerprint(root,files){return Object.fromEntries(files.map(file=>{const bytes=fs.readFileSync(path.join(root,file));return[file,{sha256:digest(bytes),bytes:bytes.length}];}));}
export function differences(before,after){
 return [...new Set([...Object.keys(before),...Object.keys(after)])].sort().flatMap(file=>{
  const a=before[file],b=after[file];return a?.sha256===b?.sha256?[]:[{path:file,before:a??null,after:b??null}];
 });
}
async function actualLevels(root){
 const bundle=await build({stdin:{resolveDir:root,contents:'export {LEVELS} from "./src/core/levels.ts";'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 return(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).LEVELS;
}
function assertSelected(levels,selected){
 assert.equal(levels.length,200);for(const item of selected)assert.deepEqual(levels[item.id-1],item.data.level,`Snapshot Lv${item.id} differs from summary-selected candidate`);
 return selected.map(item=>({id:item.id,levelSha256:digest(levels[item.id-1]),candidateSha256:item.sha256,routeSha256:digest(item.data.drags)}));
}

export async function main(){
 const lock=ruleGate(),root=fs.realpathSync(process.cwd()),stamp=`${Date.now()}-${process.pid}`;
 const snapshot=inside(path.join(root,'.codex-temp'),path.join(root,'.codex-temp',`lv061-070-build-snapshot-${stamp}`));
 const evidence=inside(path.join(root,OUTPUT),path.join(root,OUTPUT,`formal-build-snapshot-${stamp}`));
 assert(!fs.existsSync(snapshot)&&!fs.existsSync(evidence),'Snapshot/evidence paths must be new');
 fs.mkdirSync(snapshot,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
 const controlFiles=['tools/campaign-v145/lv061-070/check-formal-build-snapshot.mjs','tools/campaign-v145/lv061-070/remake61to70-v146.mjs','tools/revised-preview-validation-v160.mjs','tools/verify-rules-lock.mjs','docs/rules/manifest.json',`docs/mechanism-rules-v${lock.activeVersion}.md`];
 const report={status:'running',ruleVersion:lock.activeVersion,scope:'61–70 formal candidates within a private copy of the actual project',snapshot:normalize(path.relative(root,snapshot)),evidence:normalize(path.relative(root,evidence)),controlBindings:fingerprint(root,controlFiles),steps:[],sourceInputsStableDuringCopy:false,privateBuildInputsUnchanged:false,externalSourceChanges:[],published:false,playerSaveTouched:false};
 let before={},selected=[],sourceFiles=[];
 const write=(name,value)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 async function run(name,args,extraEnv={}){
  const log=path.join(evidence,`${name}.log`),stream=fs.createWriteStream(log,{flags:'wx'}),started=Date.now();
  const child=spawn(process.execPath,args,{cwd:snapshot,env:{...process.env,...extraEnv},stdio:['ignore','pipe','pipe'],windowsHide:true});
  child.stdout.on('data',bytes=>stream.write(bytes));child.stderr.on('data',bytes=>stream.write(bytes));
  let code,error;try{code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});}catch(cause){error=cause;}finally{await new Promise(resolve=>stream.end(resolve));}
  const row={name,command:[process.execPath,...args],cwd:report.snapshot,environment:extraEnv,exitCode:code??null,durationMs:Date.now()-started,log:normalize(path.relative(root,log)),...(error?{error:String(error)}:{})};report.steps.push(row);console.log(JSON.stringify(row));
  if(error)throw error;assert.equal(code,0,`${name} failed`);
 }
 try{
  const summaryPath=path.resolve(process.env.REMAKE_SUMMARY_PATH??path.join(root,OUTPUT,'summary.json')),summaryBytes=fs.readFileSync(summaryPath),summary=JSON.parse(summaryBytes);
  assert.deepEqual(summary.rows.map(row=>row.id).sort((a,b)=>a-b),Array.from({length:10},(_,i)=>61+i),'Summary must select all ten levels exactly once');
  fs.writeFileSync(path.join(evidence,'summary.json'),summaryBytes,{flag:'wx'});fs.mkdirSync(path.join(evidence,'expected-candidates'));
  selected=summary.rows.map(row=>{
   const file=inside(root,path.resolve(root,row.candidate.path)),bytes=fs.readFileSync(file),data=JSON.parse(bytes);
   assert.equal(data.level.id,row.id);assert.equal(digest(bytes),row.candidate.sha256);assert.equal(digest(data.level),row.candidate.levelSha256);assert.equal(digest(data.drags),row.candidate.routeSha256);
   fs.writeFileSync(path.join(evidence,'expected-candidates',`lv${row.id}.json`),bytes,{flag:'wx'});
   return{id:row.id,source:normalize(path.relative(root,file)),sha256:digest(bytes),data};
  });
  report.summary={source:normalize(path.relative(root,summaryPath)),sha256:digest(summaryBytes),copy:'summary.json'};
  sourceFiles=inputsFor(root);before=fingerprint(root,sourceFiles);write('source-inputs-before-copy.json',before);
  for(const file of sourceFiles){const destination=inside(snapshot,path.join(snapshot,file));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(root,file),destination,fs.constants.COPYFILE_EXCL);}
  const afterCopy=fingerprint(root,inputsFor(root)),privateCopied=fingerprint(snapshot,inputsFor(snapshot));
  report.copyDrift=differences(before,afterCopy);report.copyMismatch=differences(before,privateCopied);assert.deepEqual(report.copyDrift,[],'Live inputs changed during copy; this snapshot must not be built');assert.deepEqual(report.copyMismatch,[],'Private files do not match captured source bytes');
  report.sourceInputsStableDuringCopy=true;report.inputFileCount=sourceFiles.length;report.inputFingerprint=digest(before);write('snapshot-input-bindings.json',privateCopied);
  const dependencies=fs.realpathSync(path.join(root,'node_modules'));fs.symlinkSync(dependencies,path.join(snapshot,'node_modules'),process.platform==='win32'?'junction':'dir');
  report.dependencies={path:normalize(dependencies),mode:'shared dependency junction; no install or dependency mutation requested',copiedRecursively:false,packageSha256:before['package.json'].sha256,lockSha256:before['pnpm-lock.yaml'].sha256};
  report.formalSelectionBeforeBuild=assertSelected(await actualLevels(snapshot),selected);
  report.privateWechatSourceFingerprintBefore=await computeWechatSourceFingerprint(snapshot);
  const privateOutputs='.codex-temp/formal-build-output';
  const webOutput=inside(path.join(snapshot,'.codex-temp'),path.join(snapshot,privateOutputs,'web')),wechatOutput=inside(path.join(snapshot,'.codex-temp'),path.join(snapshot,privateOutputs,'wechat'));
  assert(!fs.existsSync(webOutput)&&!fs.existsSync(wechatOutput));report.outputs={web:normalize(path.relative(root,webOutput)),wechat:normalize(path.relative(root,wechatOutput))};
  // runner avoids Vite's bundled-config cache in the shared node_modules junction.
  await run('web',['node_modules/vite/bin/vite.js','build','--configLoader','runner','--outDir',`${privateOutputs}/web`]);
  const env={WECHAT_OUTPUT_DIR:`${privateOutputs}/wechat`};
  await run('wechat',['scripts/build-wechat.mjs'],env);
  await run('wechat-verify',['tools/verify-wechat-project.mjs'],env);
  const privateAfter=fingerprint(snapshot,inputsFor(snapshot));report.privateInputDrift=differences(before,privateAfter);assert.deepEqual(report.privateInputDrift,[],'Private build inputs changed');
  report.privateWechatSourceFingerprintAfter=await computeWechatSourceFingerprint(snapshot);assert.equal(report.privateWechatSourceFingerprintAfter,report.privateWechatSourceFingerprintBefore,'Private WeChat fingerprint changed');
  report.formalSelectionAfterBuild=assertSelected(await actualLevels(snapshot),selected);report.privateBuildInputsUnchanged=true;
  const manifestFile=`${wechatOutput}.build-manifest.json`,manifest=JSON.parse(fs.readFileSync(manifestFile));assert.equal(manifest.sourceFingerprint,report.privateWechatSourceFingerprintBefore);
  report.wechatManifest={path:normalize(path.relative(root,manifestFile)),sha256:digest(fs.readFileSync(manifestFile)),levelCompilation:manifest.levelCompilation};
  report.status='PASS';
 }catch(error){report.status='FAIL';report.error=String(error.stack??error);process.exitCode=1;}
 finally{
  try{const externalAfter=fingerprint(root,inputsFor(root));report.externalSourceChanges=differences(before,externalAfter);report.externalSourceChanged=report.externalSourceChanges.length>0;report.externalSourceUnchangedClaimed=false;write('live-source-inputs-after.json',externalAfter);}catch(error){report.externalObservationError=String(error);}
  if(report.summary){const liveSummary=path.resolve(root,report.summary.source);report.summaryChangedAfterCapture=!fs.existsSync(liveSummary)||digest(fs.readFileSync(liveSummary))!==report.summary.sha256;}
  report.expectedCandidateChanges=selected.filter(item=>!fs.existsSync(path.join(root,item.source))||digest(fs.readFileSync(path.join(root,item.source)))!==item.sha256).map(item=>item.id);
  report.controlDrift=differences(report.controlBindings,fingerprint(root,controlFiles));
  if(report.controlDrift.length||report.expectedCandidateChanges.length){report.status='FAIL';report.identityDriftError='Build orchestrator/rules or selected immutable candidate changed during validation';process.exitCode=1;}
  write('report.json',report);console.log(JSON.stringify({status:report.status,report:normalize(path.relative(root,path.join(evidence,'report.json'))),snapshot:report.snapshot,externalSourceChanges:report.externalSourceChanges.length,error:report.error}));
 }
 return report;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
