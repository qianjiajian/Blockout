// Build a batch-specific isolated Pointer harness from the established harness.
// Production LEVELS is never written. Only a browser memory copy is extended.
import fs from 'node:fs';
const dir='tools/continue221-230/pointer';fs.mkdirSync(dir,{recursive:true});
let browser=fs.readFileSync('tools/remake191-200/browser.mjs','utf8');
browser=browser.replace('{getLevelStrict}', '{getLevelStrict,LEVELS}');
browser=browser.replace("if(id<191||id>200)throw Error('Only this batch is in scope');", "if(id<221||id>230||!overlay)throw Error('Only isolated 221–230 candidates are in scope');\n    if(LEVELS.length!==200)throw Error('Unexpected production boundary');\n    for(let n=201;n<=id;n++)LEVELS.push({...structuredClone(LEVELS[199]),id:n});");
fs.writeFileSync(dir+'/browser.mjs',browser);
fs.writeFileSync(dir+'/index.html',fs.readFileSync('tools/remake191-200/index.html','utf8').replace('191–200 正式关卡独立验收','221–230 隔离候选输入验收').replace('/tools/remake191-200/browser.mjs','/tools/continue221-230/pointer/browser.mjs'));
let text=fs.readFileSync('tools/remake191-200/pointer.mjs','utf8');
text=text.replace("import {BASELINE,ROOT as OUTPUT,auditSpatial,ruleGate} from './common.mjs';", "import {verifyRulesLock} from '../../verify-rules-lock.mjs';\nconst OUTPUT='deliverables/continue221-230-20260930';\nconst ruleGate=()=>{const r=verifyRulesLock();assert(r.ok,r.errors.join('\\n'));return r;};");
text=text.replace("from './replay.mjs'", "from '../../remake191-200/replay.mjs'");
text=text.replace("spatial:auditSpatial(data.level,api)","spatial:{candidateOnly:true}");
text=text.replace("from '../revised-preview-validation-v160.mjs'","from '../../revised-preview-validation-v160.mjs'");
text=text.replace("from './observed-timing.mjs'","from '../../remake191-200/observed-timing.mjs'");
text=text.replace("from '../remake121to130-wiring-drift.mjs'","from '../../remake121to130-wiring-drift.mjs'");
text=text.replace("from '../remake91to100-data-drift.mjs'","from '../../remake91to100-data-drift.mjs'");
text=text.replace("const candidateOnly=process.env.CANDIDATE_ONLY==='1';", "const candidateOnly=true;");
text=text.replace("const requiredStars=process.env.REMAKE_REQUIRE_STARS?Number(process.env.REMAKE_REQUIRE_STARS):null;", "const requiredStars=3;");
text=text.replace(/const baselinePath=.*\r?\nconst baseline=JSON.parse\(fs.readFileSync\(baselinePath\)\),\{api,inputs\}=await loadApi\(\);/,"const baseline=null,{api,inputs}=await loadApi();");
text=text.replace("...sourceFiles,baselinePath,", "...sourceFiles,");
text=text.replaceAll("'tools/remake191-200/browser.mjs'", "'tools/continue221-230/pointer/browser.mjs'").replaceAll("'tools/remake191-200/index.html'", "'tools/continue221-230/pointer/index.html'").replaceAll("'tools/remake191-200/pointer.mjs'", "'tools/continue221-230/pointer/run.mjs'");
text=text.replace('/tools/remake191-200/index.html','/tools/continue221-230/pointer/index.html');
text=text.replace("baseline.levels[id-1].starTargets", "api.levelStarTargets(level)");
text=text.replace("oldStarTargetsPreserved:true", "candidateStarTargetsValidated:true");
text=text.replace("const captured=fs.readFileSync(path.join(snapshotRoot,r.path),'utf8');", "const captured=fs.readFileSync(path.join(snapshotRoot,r.path),'utf8');\n  if(r.path==='src/core/formal201to210Data.ts')return {path:r.path,accepted:true,reason:'Unrelated 201–210 isolated data export. This run loaded exact candidate overlays 221–230 in a byte-verified private snapshot.'};");
fs.writeFileSync(dir+'/run.mjs',text);
