import fs from 'node:fs';
import assert from 'node:assert/strict';
const from='tools/remake151-160',to='tools/star-targets151-160';
fs.mkdirSync(to,{recursive:true});
let browser=fs.readFileSync(from+'/browser.mjs','utf8');
browser=browser.replace("if(id<151||id>160)","if(![157,158].includes(id))");
browser=browser.replace('    if(overlay){if(overlay.id!==id)throw Error("Wrong overlay ID");for(const k of Object.keys(level))delete level[k];Object.assign(level,structuredClone(overlay));}',"    if(overlay)throw Error('Star target verification only allows unmodified formal LEVELS');");
fs.writeFileSync(to+'/browser.mjs',browser,{flag:'wx'});
fs.writeFileSync(to+'/pointer.html',fs.readFileSync(from+'/pointer.html','utf8').replaceAll('/tools/remake151-160/','/tools/star-targets151-160/').replace('151–160 正式关卡独立验收','157/158 三星目标正式验收'),{flag:'wx'});
fs.writeFileSync(to+'/observed-timing.mjs',fs.readFileSync(from+'/observed-timing.mjs'),{flag:'wx'});
let text=fs.readFileSync(from+'/pointer.mjs','utf8');
text=text.replace("import {api,baseline as captured,ROOT,ruleGate,audit} from './common.mjs';","import {api,baseline as captured,ROOT,ruleGate,audit,VERSION,expectedTargets} from './common.mjs';");
text=text.replace("const VERSION='1.102.0',BASELINE=ROOT+'/baseline.json',OUTPUT=ROOT;","const BASELINE=ROOT+'/before.json',OUTPUT=ROOT+'/pointer-support';");
text=text.replace("const candidateOnly=process.env.CANDIDATE_ONLY==='1';","assert(process.env.CANDIDATE_ONLY!=='1','This rating task is formal-only');\nconst candidateOnly=false;");
text=text.replace("const fullBatch=!candidateOnly&&requestedIds.length===10&&[...requestedIds].sort((a,b)=>a-b).every((id,i)=>id===151+i);","assert.deepEqual([...requestedIds].sort((a,b)=>a-b),[157,158],'Both and only changed rating levels');\nconst fullBatch=true;");
text=text.replaceAll('complete-ten-level-remake-batch','two-level-star-target-change');
text=text.replaceAll('tools/remake151-160/','tools/star-targets151-160/');
text=text.replaceAll('baseline.levels[id-1].starTargets','expectedTargets(id)');
text=text.replace('oldStarTargetsPreserved:true','changedMoveTargetsValidated:true,timeTargetsPreserved:true');
text=text.replace("assert.deepEqual(api.LEVELS[data.level.id-1],data.level)","assert.deepEqual(JSON.parse(JSON.stringify(api.LEVELS[data.level.id-1])),data.level)");
text=text.replace("assert.deepEqual(fresh.api.LEVELS[data.level.id-1],data.level", "assert.deepEqual(JSON.parse(JSON.stringify(fresh.api.LEVELS[data.level.id-1])),data.level");
text=text.replace("  assert.equal(result.screen,'win');", "  assert.equal(expectedStars,3,'New rating targets must produce actual three stars');\n  assert.equal(result.screen,'win');");
// Detect files created/deleted in src during a run as well as bytes changed in
// the already-bound full source tree. No concurrent-change bypass exists.
text=text.replace("const output=path.resolve(OUTPUT,", "const initialSourceFiles=Object.keys(bindings).filter(p=>p.startsWith('src/')).sort();\nconst output=path.resolve(OUTPUT,");
text=text.replace(" report.currentWorkspaceDrift=", " const currentSourceFiles=[];const listSource=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())listSource(p);else currentSourceFiles.push(p.split(path.sep).join('/'));}};listSource('src');assert.deepEqual(currentSourceFiles.sort(),initialSourceFiles,'Source file set changed during input');\n report.currentWorkspaceDrift=");
assert(text.includes("expectedStars,3"));assert(!text.includes("tools/remake151-160/"));
fs.writeFileSync(to+'/pointer.mjs',text,{flag:'wx'});
console.log('Prepared isolated formal-only score Pointer tools without changing historical tools.');
